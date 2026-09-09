import { useQueryClient } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { OfflineBanner } from "@/src/components/app/offline-banner";
import { VerifyEmailBanner } from "@/src/components/app/verify-email-banner";
import { UpdatePopup } from "@/src/components/app/update-popup";
import { RoutineFab } from "@/src/components/app/routine-fab";
import { Text } from "@/src/components/react-native-reusables/text";
import { AuthLandingScreen } from "@/src/components/app/auth-landing-screen";
import { ConsentGate } from "@/src/components/app/consent-gate";
import { AgeGate } from "@/src/components/app/age-gate";
import { UnderFloorScreen } from "@/src/components/app/under-floor-screen";
import { PreferencesUnavailableScreen } from "@/src/components/app/preferences-unavailable-screen";
import { AppOnboardingWizard } from "@/src/components/app/app-onboarding-wizard";
import type { UserPreferences } from "@/src/features/modules/types";
import { policyVersion } from "@/src/features/policies/policy-content";
import { hasAcceptedPolicy } from "@/src/features/policies/policy-consent";
import { useUnderFloorBlock } from "@/src/features/auth/use-under-floor-block";
import {
  preferencesQueryKey,
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { useNotificationDeepLink } from "@/src/features/notifications/use-notification-deep-link";
import { useNotificationSync } from "@/src/features/notifications/use-notification-sync";
import { useRoutines } from "@/src/features/routines/queries";
import { useSettingsSync } from "@/src/features/settings/use-settings-sync";
import { useSession } from "@/src/providers/session-provider";
import { useIsOnline } from "@/src/lib/online-manager";
import { useUpdateAvailability } from "@/src/lib/use-update-availability";
import { INSET_LAYER, useInsetPublisher } from "@/src/stores/layered-inset-store";
import { WidgetSnapshotSync } from "@/src/features/widgets/widget-snapshot-sync";
import { AppLockGate } from "@/src/features/security/app-lock-gate";
import { useAppLockStore } from "@/src/features/security/app-lock-store";

/**
 * When meeting the age floor became a fact this product records, as an epoch
 * instant (#2227).
 *
 * ☠️☠️ The age gate's exemption for the existing install base USED to be read
 * off `policy_version_accepted === null` - "has not been through the consent
 * gate yet, so it must be brand new". That proxy is producible by a stale
 * client: shipped 0.17.0 carries the consent wall and no age gate at all, so an
 * account created on it writes a policy version and, once it updates, reads as
 * an exempt legacy account. Nothing ever writes that column back to NULL, so
 * the exemption could never lift - a one-release concession turned into a
 * permanent bypass that kept recruiting new members for as long as anyone had
 * not updated. "Has accepted a policy" and "has answered the age question" are
 * different facts, and only the second one is what the gate is scoped on.
 *
 * The account's own birthday is what separates the two, and this instant is
 * where the line goes: the migration that added `age_floor_met`
 * (`20260905000000_age_attestation.sql`). Nobody created before it can have
 * been asked, and everybody created at or after it belongs to the release this
 * gate ships in.
 *
 * ⚠️ Deliberately EARLY rather than pinned to the release date, which is not
 * knowable from here and can slip. Early over-includes: it asks a handful of
 * accounts created in the days before the release. That costs one person a
 * birth year and a country. The other direction admits somebody under their
 * country's floor with no attestation on file, which is the harm the gate
 * exists to prevent - so when the two are in tension, this errs towards asking.
 */
const AGE_GATE_INTRODUCED_AT = Date.parse("2026-09-05T00:00:00.000Z");

export default function ProtectedLayout() {
  const { t } = useTranslation("settings");
  const { session, status, user } = useSession();
  const queryClient = useQueryClient();
  // Read here, unconditionally, because it decides which face the block screen
  // below wears - see `prefsVerdictState`.
  const isOnline = useIsOnline();
  const {
    data: preferences,
    isLoading: prefsLoading,
    isError: prefsError,
    isPaused: prefsPaused,
    errorUpdateCount: prefsErrorCount,
    failureCount: prefsFailureCount,
    refetch: refetchPreferences,
  } = useUserPreferences(user?.id ?? null);
  const completeOnboarding = useUpdateOnboardingPreferences(user?.id ?? null);
  const [consentDismissed, setConsentDismissed] = useState(false);
  // ☠️☠️ The verdict, and WHOSE it is (#2195). A bare boolean was enough while
  // the exit read the current session for its target - and that is exactly what
  // made the block delete the next account signed in on the device inside the
  // 24h window, because the device flag holds an expiry and no identity. The id
  // is captured at the moment the gate returns its verdict, from the session
  // that answered it, and travels to the exit as the only account it may erase.
  // `null` in the object is a verdict for a session that had no user (which the
  // gate cannot produce, since it renders below the `!session` branch); `null`
  // for the whole object is "no verdict on this mount", which is every device
  // block that judged nobody.
  const [underFloorVerdict, setUnderFloorVerdict] = useState<{ userId: string | null } | null>(
    null,
  );
  const underFloor = underFloorVerdict !== null;
  const [ageAttested, setAgeAttested] = useState(false);
  // The device's own under-floor block (#1765). React state alone was #1764's
  // recorded gap: it lasted exactly as long as the screen stayed mounted, and
  // on native the next launch mints a fresh guest a second later.
  const deviceBlock = useUnderFloorBlock();
  const pathname = usePathname();

  const hydrateAppLock = useAppLockStore((s) => s.hydrate);
  // The update TRIGGER mounts once here in the shell (#1474, spec §1 on
  // #1142), not inside the offer surface: suppression must never unmount the
  // hook (that would reset its state), and a single mount is immune to the
  // shell's screen double-mount hazard (#989). The RENDER stays down inside
  // AppLockGate's children, so the offer can never sit over the lock screen.
  const updateAvailability = useUpdateAvailability();
  const insets = useSafeAreaInsets();
  // The strip is layer 1 of the bottom-inset ladder (#1339): it publishes its
  // own top edge, and the hook clears the entry when this layout unmounts, so a
  // stale inset cannot outlive the strip that measured it (sign-out).
  const { attachHost: attachStrip, onLayout: onStripLayout } = useInsetPublisher(INSET_LAYER.strip);
  // Measured height of the banner strip's CONTENT (the strip's safe-area
  // padding excluded); 0 while no banner renders. Drives the conditional
  // padding below - the published edge is measured, not derived from this.
  const [bannerContentHeight, setBannerContentHeight] = useState(0);

  useSettingsSync(user?.id ?? null, preferences);
  // Routine reminders live on routines rows (not user_preferences), so fold them into
  // the sync hook's "any reminder enabled" condition. Native-only fetch: the hook is a
  // no-op on web (the routine editor registers the web push channel at enable time).
  const { data: routines } = useRoutines(Platform.OS === "web" ? null : (user?.id ?? null));
  useNotificationSync(
    user?.id ?? null,
    preferences,
    routines?.some((routine) => routine.reminderEnabled) ?? false,
  );
  useNotificationDeepLink();

  useEffect(() => {
    // Read the device-local app-lock preference. Swallow storage-read failures so a
    // rejected hydrate isn't an unhandled rejection (mirrors useColorSchemeDriver).
    void hydrateAppLock().catch(() => {});
  }, [hydrateAppLock]);

  // Web signed-out redirect: mutating window.location is a side effect, so it
  // lives in an effect (the compiler's immutability rule forbids it in render);
  // the render below returns null for this state while the redirect kicks in.
  // ☠️ `&& !underFloor && !deviceBlock.blocked`. The under-floor exit deletes
  // the account and then signs out, which lands squarely in this condition - so
  // without the clause the web redirect would fire the moment the erasure
  // succeeded and bounce the person to the marketing landing, replacing the exit
  // screen with an invitation to start. The block owns the surface until it
  // lifts.
  //
  // ☠️☠️ And `underFloor` is the half that does the work on the mount that
  // matters, which is why BOTH are here. `deviceBlock` reads storage once, on
  // mount; the exit writes the flag after that read, so throughout the verdict's
  // own mount - the one where the sign-out actually happens - `blocked` is still
  // false. On web every under-floor person has a session (the `!session` branch
  // precedes the gate), so that mount is the normal path, not an edge case. The
  // React state is what is true in the same frame the person answers.
  const signedOutOnWeb =
    status !== "loading" &&
    !session &&
    Platform.OS === "web" &&
    !underFloor &&
    !deviceBlock.blocked;
  useEffect(() => {
    if (signedOutOnWeb && typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [signedOutOnWeb]);

  // ⚠️ The device flag is folded into the loading gate the session restore
  // already shows, rather than getting a spinner of its own: it arrives a tick
  // late from AsyncStorage, and rendering the shell on that tick would flash
  // the app at exactly the person the block exists to keep out. On a cold start
  // the storage read finishes well inside the session round trip, so this costs
  // nothing visible.
  if (status === "loading" || !deviceBlock.hydrated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">{t("common:loading")}</Text>
          <ActivityIndicator />
          <Text variant="muted">{t("common:restoringSession")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ☠️ ABOVE the `!session` branch, and that placement is the point. The exit
  // deletes the account and signs out, so by the time the erasure has landed
  // there IS no session - and the branch below would answer that with the auth
  // landing, i.e. a fresh way in, one tap after the block. The block outlives
  // the account it removed; the screen is what it renders, signed in or out.
  //
  // The React-state half (`underFloor`) is still needed beside the device flag:
  // it is what makes the verdict take effect in the same frame the person
  // answers, without waiting on a storage write.
  if (underFloor || deviceBlock.blocked) {
    // ☠️ `underFloorVerdict?.userId ?? null`, never `user?.id`. On the device
    // flag alone there is no verdict, so the screen is handed `null` and the
    // exit erases nothing - it still blocks (#2195).
    return <UnderFloorScreen verdictUserId={underFloorVerdict?.userId ?? null} />;
  }

  if (!session) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return null;
    }
    return <AuthLandingScreen />;
  }

  // No verification wall here any more (#489): under mailer_autoconfirm every
  // session arrives confirmed, and mailbox ownership is handled by the
  // VerifyEmailBanner below - sign-in is never blocked on it. Pre-flip
  // environments can't mint an unconfirmed session at all (GoTrue rejects
  // the sign-in), so nothing slips through while configs differ.

  // A preferences read that has produced NO ROW leaves BOTH legal verdicts -
  // the age attestation and the policy acceptance - UNKNOWN. When cached data
  // exists the state is known even if the latest refetch errored, so a stale
  // acceptance still gates; this is only the nothing-at-all case.
  //
  // ☠️☠️ IN FLIGHT is the same unknown as ERRORED (#2229). #2200 closed only the
  // errored half: `prefsUnknown` was `prefsError && !preferences`, so a query
  // still on the wire carried no error, took no early return, and killed all
  // three gates below through their shared `!prefsLoading` conjunct - leaving
  // the full app shell as the fall-through on every brand-new account's first
  // launch. The age gate was open for as long as the request took, and far
  // longer on one that hangs (`retry: 1`, and until #2251 `getUserPreferences`
  // had no timeout and dropped the AbortSignal). To a legal gate "we have not
  // been told yet" and "we were told nothing" are the same state, and it is not
  // the state to render the app in.
  //
  // ⚠️ Keyed on `!preferences`, which is what keeps this from becoming a
  // blocking spinner on every cold start: a cached or persisted row passes
  // straight through, and a failing background refetch over one never raises it.
  //
  // ☠️☠️ AND IT IS NOT AN ENUMERATION OF STATUSES ANY MORE. This read
  // `!preferences && (prefsError || prefsLoading || prefsReadAbandoned)`, with
  // `prefsReadAbandoned = isPaused && failureCount > 0` - the third state,
  // fenced by a failure count so an offline cold start (paused before it ever
  // ran, zero failures) still fell through. TanStack erases that fence itself:
  // the `"fetch"` action applies `fetchState`, which writes
  // `fetchFailureCount: 0` and, for a query with `data === undefined`, also
  // `error: null, status: "pending"`, while `fetchStatus` becomes `"paused"`
  // when the device is offline. So ANY re-dispatch of a data-less read while
  // offline reports paused / no error / not loading / zero failures - which is
  // exactly the shape the exemption was cut for - and three things dispatch it
  // with no tap at all: `onFocus` on return to the foreground (a data-less
  // query is unconditionally stale), a fresh mount of this layout, and the
  // block screen's own Retry. The guard erased itself, and the CONSENT gate
  // rendered over an unestablished age floor: `needsAgeAttestation` dies on its
  // `Boolean(preferences)` conjunct while `needsConsent` survives, which
  // INVERTS the ordering the comment below calls load-bearing. Worse, it does
  // not merely delay the age gate - for an account created before
  // `AGE_GATE_INTRODUCED_AT` that has never accepted a policy, accepting the
  // consent wrongly offered writes `policy_version_accepted`, `isExistingAccount`
  // flips true, and nothing ever writes that column back to NULL. One accept
  // and the floor is never asked again.
  //
  // ☠️☠️ So the verdict is UNKNOWN WHENEVER THERE IS NO ROW, full stop, and it
  // is derived from no library status flag at all. Every status a data-less
  // query can report - errored, loading, paused, idle, in any combination and
  // at any failure count - is the same fact to a statutory gate: nobody has
  // told us whether this person meets their age floor. A signal the library is
  // free to reset is not something to hang a legal gate on, and the flags below
  // are only ever used to decide WHAT TO SAY, never whether to let anyone past.
  //
  // ⚠️ THIS OVERRULES the offline pass-through `docs/age-floor.md` used to
  // record, and the ruling is written down there rather than only here: an
  // offline cold start with no cached row now meets the block screen instead of
  // the consent gate. The two requirements genuinely conflict once the failure
  // count is gone, and the age floor is statutory while the pass-through was a
  // convenience - one the person could not have spent anyway, since the consent
  // they were being offered could not be written without a network either. It
  // is not a lockout: the paused query resumes on its own the moment the
  // connection returns, the screen says so, and crisis guidance is on it.
  const prefsUnknown = !preferences;

  // ☠️☠️ Unknown fails CLOSED (#2200). This used to fall through: `prefsUnknown`
  // was a conjunct of both `needsAgeAttestation` and `needsConsent`, so on an
  // errored, empty preferences query both gates evaluated false and the full
  // app shell rendered. That let a person below their country's statutory floor
  // - the gate ships for the first time in this release - into the whole app
  // with no attestation on file, free to write thought records and journal
  // entries, which are GDPR Art. 9 special-category data. A fail-open on a
  // legal gate is not something to inherit from a comment.
  //
  // ⚠️ #164's objection to failing closed still stands and is answered rather
  // than overruled: what it forbade was showing a GATE on a transient error,
  // because a gate re-asks a person who already answered. This is not a gate.
  // It asks nothing, records nothing, and its only control re-runs the fetch,
  // so an already-attested user pays a tap and an unattested one cannot walk
  // past. TanStack's own retry/refocus refetch closes it too - the retry button
  // exists so the person is never waiting on that alone.
  //
  // ⚠️ It must stay BELOW the `!session` and under-floor branches above: a
  // signed-out person has no preferences row to fail on and belongs on the
  // landing, and a blocked device must see the block rather than a retry that
  // could never help it.
  if (prefsUnknown) {
    // ☠️☠️ A STICKY failure signal picks the half, never the live `isError`
    // flag alone (#2238). This branch only runs with `data === undefined`, and
    // for a query with no data TanStack's fetch reducer resets `status` to
    // `"pending"` and `error` to `null` the moment a refetch starts
    // (`query-core`'s `fetchState`: `...data === undefined && { error: null,
    // status: "pending" }`). So pressing Retry flipped `isError` OFF, this
    // switched to the loading half, and the loading half carries no control -
    // the button vanished at the exact moment it was pressed. If the retried
    // request then hung rather than erroring (a captive portal, dead air), the
    // person sat on a full-screen spinner with nothing to press until they
    // force-quit. The earlier comment here claimed the opposite; it described a
    // query that HAS data, which is exactly the population this branch excludes.
    //
    // `errorUpdateCount` only ever increments and is untouched by a fetch
    // dispatch, so once one read has failed the errored half - and its Retry -
    // stays for every later in-flight attempt. A fetch that has never failed
    // still gets the loading half, whose no-retry reasoning ("the fetch it
    // would re-run is already running") holds there.
    //
    // ☠️☠️ A second press has to CANCEL before it refetches (#2251). The comment
    // that stood here said `refetch()` does that on its own because
    // `cancelRefetch` defaults to true - and it does, for a query that HAS
    // data. For this branch's population (`data === undefined`) `Query#fetch`
    // never reaches the cancel arm: it returns the same pending promise, so a
    // second press on a hung request was absorbed with nothing to show for it,
    // and the person was back to a force-quit. `cancelQueries` rejects the
    // running fetch and reverts the query to its errored state (so the sticky
    // half above is untouched), the signal reaches the socket through
    // `getUserPreferences`, and only then does the refetch start a new one.
    //
    // ⚠️ PAUSED-AND-OFFLINE OUTRANKS BOTH, and this picks WHAT TO SAY rather
    // than who gets past: now that an offline read is held here rather than
    // waved through, somebody with no connection is a real population on this
    // screen, and neither of the other two faces tells them the truth. "Getting
    // your account ready" over a spinner is a lie about a request that is not
    // running, and a Retry is a control that cannot win - a refetch pauses on
    // the spot. The offline face says what is happening and what ends it, and
    // the query resumes on its own when the network returns.
    //
    // ☠️☠️ `&& !isOnline`, never `isPaused` alone: A PAUSED READ IS NOT THE SAME
    // THING AS AN OFFLINE ONE. query-core has two pause predicates, and only the
    // dispatch one (`canStart`) is about connectivity. The RETRY one is
    // `canContinue = () => focusManager.isFocused() && (networkMode === "always"
    // || onlineManager.isOnline()) && canRun()`, so a read that failed once on a
    // perfectly good connection pauses if its retry delay expires while the app
    // is not focused - which on native is ANY AppState other than `active`
    // (`app-providers.tsx` feeds `handleFocus(state === "active")`): an iOS
    // system banner, the pulled-down shade, the app switcher, iPad Slide Over,
    // Android split-screen; on web, a hidden tab. Keyed on the flag alone, that
    // person read "You're offline" about a connection that was fine AND LOST THE
    // RETRY with it - #2238's shape, on the legal gate.
    //
    // ☠️☠️ AND `errorUpdateCount` DOES NOT COVER THAT FALL-THROUGH. An earlier
    // version of this comment claimed an online focus-pause lands on the sticky
    // errored face because it "can only get there having failed at least once".
    // It conflates two counters. `errorUpdateCount` is incremented by the
    // `"error"` action ALONE - i.e. only once the retryer has REJECTED and the
    // query has given up. A single failed attempt dispatches `"failed"`, which
    // writes `fetchFailureCount`/`fetchFailureReason` and nothing else, and the
    // focus-pause happens strictly BETWEEN those two events: attempt fails ->
    // `onFail` -> sleep(retryDelay) -> `canContinue()` false -> `onPause`. With
    // `retry: 1` (`query-client.ts`) the one reachable focus-pause therefore
    // always sits at `errorUpdateCount === 0` with `error` still null, so the
    // predicate sent it to the LOADING face - a spinner and no control at all,
    // over a request that is not running, for as long as the app stays
    // non-`active`. The loading half's justification ("the fetch it would
    // re-run is already running") is the one thing that is not true there.
    //
    // ☠️ So the third disjunct, and it is fenced by `prefsPaused` on purpose.
    // `fetchFailureCount` alone would also fire during an ordinary online retry
    // backoff, where `fetchStatus` is `"fetching"` and the loading half's
    // reasoning does hold. Paused AND a non-zero failure count is exactly the
    // retry pause: TanStack's `"fetch"` action resets `fetchFailureCount` to 0,
    // so a connectivity dispatch-pause always reports zero, and the count can
    // only be non-zero here because an attempt already ran and failed. It also
    // keeps the sub-millisecond reconnect window honest - paused with the flag
    // already flipped online, zero failures - which stays on the loading face.
    //
    // ⚠️ It cannot re-open #2238's hole either: a Retry press while ONLINE
    // moves `fetchStatus` to `"fetching"`, not `"paused"`, so the sticky
    // errored face still owns that transition.
    const prefsHasFailed =
      prefsError || prefsErrorCount > 0 || (prefsPaused && prefsFailureCount > 0);
    const restartPreferencesRead = async () => {
      await queryClient.cancelQueries({ queryKey: preferencesQueryKey(user?.id ?? null) });
      await refetchPreferences();
    };
    const prefsVerdictState =
      prefsPaused && !isOnline ? "offline" : prefsHasFailed ? "error" : "loading";
    return (
      <PreferencesUnavailableScreen
        state={prefsVerdictState}
        onRetry={() => void restartPreferencesRead()}
      />
    );
  }
  // The age gate (#1764, spec #227 §3) sits ABOVE the consent gate in this same
  // slot, which is what gives it all four entry paths - email/password, Google,
  // Apple and the silent guest - instead of the two §3 was written against.
  //
  // ☠️ `=== true`, never a truthiness check. `ageFloorMet` has three states and
  // `null` means NEVER ASKED, which is where every account predating the gate
  // sits (#1762); `Boolean(...)` would read the same as an explicit failure.
  //
  // ☠️ And never-asked is NOT on its own a reason to ask. §7 is explicit that
  // existing users meet the one-time consent prompt WITHOUT being re-asked for
  // age or country, so the gate is scoped away from accounts that predate it.
  // Without that scoping the gate would fire for the entire install base on the
  // release that ships it.
  //
  // ☠️☠️ But "predates the gate" is read off the account's OWN AGE, never off
  // `policy_version_accepted === null` alone (#2227). That clause used to be the
  // whole test, on the reasoning that a brand-new account has not been through
  // the consent gate "at exactly the moment this runs". It is false: shipped
  // 0.17.0 has the consent wall and no age gate, so an account created there
  // fills the column in, and on updating it presents as an exempt legacy
  // account - permanently, because nothing writes that column back to NULL. The
  // exemption is meant for people who were already here; `AGE_GATE_INTRODUCED_AT`
  // above is where that line actually falls.
  //
  // ⚠️ Both halves are required, and the AND is what keeps this a superset of
  // who was asked before: an account that predates the instant but has still
  // never accepted a policy version is a person who has been through neither
  // gate, and they are asked, exactly as they were. Only "old AND already
  // consented" is exempt.
  //
  // ⚠️ An unreadable or absent `created_at` is treated as NOT predating - i.e.
  // asked. The field is required on Supabase's `User` and always present on a
  // real session, so this is a fallback rather than a path; it points the way it
  // does because being asked costs a birth year, and not being asked is the
  // thing the gate exists to prevent.
  //
  // ⚠️ The gate still depends on running ABOVE the consent gate: if the two ever
  // swapped, a new account would accept a policy version first. That is no
  // longer load-bearing for the exemption, but the ordering assertion in
  // `protected-layout.test.tsx` stays, because the gate a person meets first is
  // still the one they answer first.
  const neverAskedAge = preferences?.ageFloorMet !== true;
  const accountCreatedAt = Date.parse(user?.created_at ?? "");
  const predatesTheAgeGate =
    Number.isFinite(accountCreatedAt) && accountCreatedAt < AGE_GATE_INTRODUCED_AT;
  const isExistingAccount = predatesTheAgeGate && preferences?.policyVersionAccepted !== null;
  const needsAgeAttestation =
    !ageAttested &&
    !prefsLoading &&
    // Unreachable as false since #2200 - the early return above owns the
    // unknown state - and kept anyway, as the belt to that braces. This clause
    // is what USED to make the branch fail open, so if the return above is ever
    // moved or removed, the failure this restores is "the gate is skipped", not
    // "the gate is shown to someone who already answered". Do not delete it as
    // dead code without moving the guard, not after it.
    !prefsUnknown &&
    // Not redundant with the two above: the query is DISABLED while there is
    // no user id, and a disabled query is neither loading nor errored - it
    // just has no data. Without this, that state reads as "never attested".
    Boolean(preferences) &&
    neverAskedAge &&
    !isExistingAccount;
  // ☠️ NOT `!== policyVersion`. A stored version can legitimately be NEWER than
  // the one this build carries - web deploys within the release run while
  // Android sits behind Play review and iOS behind a manual promotion (#2217) -
  // and a strict inequality reads "accepted a later policy" as "accepted
  // nothing". Paired with the database's high-water guard
  // (20260911000000_policy_version_monotonic.sql), which declines the accept
  // that would lower the row, a strict inequality would raise this wall on
  // every cold start with no write able to clear it. Older, null and
  // unrankable still gate; only "already accepted more" does not.
  const needsConsent =
    !consentDismissed &&
    !prefsLoading &&
    !prefsUnknown &&
    !hasAcceptedPolicy(preferences?.policyVersionAccepted, policyVersion);
  const needsAppOnboarding =
    !needsAgeAttestation &&
    !needsConsent &&
    !prefsLoading &&
    Boolean(preferences) &&
    !preferences?.appOnboardingCompleted &&
    pathname === "/";
  const isIntroductionReplay = Boolean(preferences?.appOnboardingCompletedVia);

  // Onboarding completion is a plain preference write (#1958, spec #1885 §5.1);
  // the `apply_widget_recommendations` RPC that used to seed Home alongside it
  // is no longer called from the app. ☠️ A first completion writes all THREE
  // fields, never the flag alone: the flag alone is the GRANDFATHERED shape
  // (`via`/`_at` null, like seed.sql's alice), so a new user would read as one -
  // the introduction replay above would never fire for them, and the funnel
  // (scripts/analytics-onboarding.sql) would count them as pre-tracking. A
  // replay preserves the original path and time: Settings already re-armed the
  // flag while keeping `via` as the replay marker, so only the flag goes back.
  // `_at` is the device clock (the retired RPC stamped `now()` server-side): the
  // funnel reads it at day granularity, and every other `*_at` preference this
  // client writes is already stamped the same way.
  const finishAppOnboarding = async (
    mode: NonNullable<UserPreferences["appOnboardingCompletedVia"]>,
  ) => {
    if (!preferences) return;
    try {
      if (isIntroductionReplay) {
        await completeOnboarding.mutateAsync({ appOnboardingCompleted: true });
        return;
      }
      await completeOnboarding.mutateAsync({
        appOnboardingCompleted: true,
        appOnboardingCompletedVia: mode,
        appOnboardingCompletedAt: new Date().toISOString(),
      });
    } catch {
      // Error state is shown inside the wizard.
    }
  };

  // The under-floor return that used to sit here has moved above the `!session`
  // branch (#1765): the exit signs the person out, so a block checked only from
  // here would hand them the auth landing the moment it succeeded. It still
  // precedes the consent gate for the reason it always did - the floor decides
  // whether this person may be here at all, and consent to processing is only
  // worth collecting from someone who may.
  if (needsAgeAttestation) {
    return (
      // `onAttested` fires only after the write resolved, so the local flag can
      // never wave through an attestation that failed to persist. It exists
      // because the mutation's invalidate is the other half of the same
      // dismissal, and one of the two arriving late should not leave the person
      // staring at a form they already completed.
      <AgeGate
        onAttested={() => setAgeAttested(true)}
        onUnderFloor={() => setUnderFloorVerdict({ userId: user?.id ?? null })}
      />
    );
  }

  if (needsConsent) {
    return <ConsentGate onAccepted={() => setConsentDismissed(true)} />;
  }

  return (
    <AppLockGate>
      <WidgetSnapshotSync userId={user?.id ?? null} preferences={preferences} />
      {needsAppOnboarding ? (
        <AppOnboardingWizard
          visible
          isPending={completeOnboarding.isPending}
          errorMessage={completeOnboarding.isError ? t("onboarding.appSaveError") : undefined}
          onFinish={() => void finishAppOnboarding("finish")}
          onSkip={() => void finishAppOnboarding("skip")}
        />
      ) : null}
      <View className="flex-1 flex-row bg-background">
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              animationDuration: 220,
            }}
          >
            {/* `dangerouslySingular` on every non-dynamic screen (#1027).

                A screen pushed while it already sits deeper in the stack is mounted
                TWICE - both copies run every hook, the older one is hidden. The
                breadcrumb is the case a user hits without trying: its crumbs target an
                ANCESTOR, which is in the stack by definition, so every crumb tap used to
                duplicate the screen it returned to.

                TWO kinds of screen are deliberately left plain, and `nav-singular.test.ts`
                derives both rather than trusting this list:

                - `[id]` screens. Singular's id substitutes each dynamic segment with its
                  value, so marking them would keep `/goals/1` and `/goals/2` apart and
                  would be safe - but this change only claims what it measured, and
                  stacking two records is a real flow.
                - ☠️ CREATION screens (a `new` route) and anything keyed by a QUERY param.
                  Singular reuses the existing route rather than remounting it, so state
                  initialised at mount survives - an unsaved draft would reappear on a
                  later "new". `getSingularId` also reads path segments ONLY, so
                  `/modules/cbt/new?recordId=A` and `?recordId=B` share an id and would
                  collapse. `/modules/cbt/new` shows how quiet that is: its check-in
                  handoff is `useState(consumeThoughtRecordSeed)`, read once per MOUNT, so
                  a reused instance drops the seeded emotions with nothing failing.

                So the rule is: LIST and OVERVIEW screens are single-instance; screens that
                hold per-visit state - creation, editing, dynamic records - are not.

                ⚠️ Screen-level does NOT cover navigation that crosses a group boundary:
                #989 measured that the panel's `/(app)` links still duplicated Home with
                this prop set here, which is why those carry it on the `Link` instead.

                ☠️ It also covers only what this list DECLARES. An undeclared route is
                auto-registered with default options, so it is not single-instance and
                nothing says so - the guard iterates these declarations, so a route absent
                here is absent from its assertions too. Journal, grounding, habits,
                breathing and sleep were all missing, which is six of the eight
                destinations `SharedToolsRow` links to from the CBT home: pushing one from
                a module while it already sat deeper in the stack mounted it TWICE (#1216).

                So the list is COMPLETE now - every route file appears here, and
                `nav-singular.test.ts` fails until a new one does. Absence used to be a
                silent default; it is now a build error.

                ⚠️ That completeness added a THIRD exception the other two cannot derive:
                a screen holding the user's unsaved WORK must remount, or singular hands
                them back a half-finished exercise. `useState` is not the test - plenty of
                overview screens below hold benign view state and reuse it happily. One
                screen qualifies (urge surfing); it is marked plain inline and the guard's
                `MUST_REMOUNT` keeps it honest. The values check-in used to be the second:
                folding it onto the single-instance values screen (#1379) took the choice
                away, so its ratings moved to a draft store instead - reuse hands the user
                back their OWN numbers, and sign-out clears them.

                Meditation stays deliberately plain among them: it is keyed by `?practice=`
                and holds per-visit state, so it is the query-keyed exception above, not an
                oversight. */}
            <Stack.Screen name="index" dangerouslySingular />
            <Stack.Screen name="settings" dangerouslySingular />
            <Stack.Screen name="modules/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/learn" dangerouslySingular />
            <Stack.Screen name="modules/cbt/history/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/history/[id]" />
            <Stack.Screen name="modules/cbt/new" />
            <Stack.Screen name="modules/cbt/[id]" />
            <Stack.Screen name="modules/cbt/goals/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/goals/new" />
            <Stack.Screen name="modules/cbt/goals/[id]" />
            <Stack.Screen name="modules/cbt/activities/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/activities/new" />
            <Stack.Screen name="modules/cbt/activities/[id]" />
            <Stack.Screen name="modules/cbt/values" dangerouslySingular />
            <Stack.Screen name="modules/cbt/weekly-review" dangerouslySingular />
            <Stack.Screen name="modules/cbt/beliefs/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/beliefs/new" />
            <Stack.Screen name="modules/cbt/beliefs/[id]" />
            <Stack.Screen name="modules/cbt/exposure/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/exposure/new" />
            <Stack.Screen name="modules/cbt/exposure/[id]" />
            <Stack.Screen name="modules/cbt/worry/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/worry/new" />
            <Stack.Screen name="modules/cbt/tasks/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/tasks/new" />
            <Stack.Screen name="modules/cbt/tasks/[id]" />
            <Stack.Screen name="modules/cbt/anger/index" dangerouslySingular />
            <Stack.Screen name="modules/cbt/anger/new" />
            <Stack.Screen name="modules/cbt/anger/[id]" />
            <Stack.Screen name="modules/cbt/self-care" dangerouslySingular />
            <Stack.Screen name="modules/cbt/recovery" dangerouslySingular />
            <Stack.Screen name="modules/act/index" dangerouslySingular />
            <Stack.Screen name="modules/act/choice-point/index" dangerouslySingular />
            <Stack.Screen name="modules/act/choice-point/new" />
            <Stack.Screen name="modules/act/choice-point/[id]" />
            <Stack.Screen name="modules/act/committed-action/index" dangerouslySingular />
            <Stack.Screen name="modules/act/committed-action/new" />
            <Stack.Screen name="modules/act/committed-action/[id]" />
            <Stack.Screen name="modules/act/connection/index" dangerouslySingular />
            <Stack.Screen name="modules/act/connection/drop-anchor" dangerouslySingular />
            <Stack.Screen name="modules/act/connection/new" />
            <Stack.Screen name="modules/act/connection/[id]" />
            <Stack.Screen name="modules/act/defusion/index" dangerouslySingular />
            <Stack.Screen name="modules/act/defusion/new" />
            <Stack.Screen name="modules/act/defusion/[id]" />
            <Stack.Screen name="modules/act/expansion/index" dangerouslySingular />
            {/* Plain: a nine-state exercise, mid-practice. See HOLDS_UNSAVED_WORK. */}
            <Stack.Screen name="modules/act/expansion/urge-surfing/index" />
            <Stack.Screen name="modules/act/expansion/urge-surfing/[id]" />
            <Stack.Screen name="modules/act/expansion/new" />
            <Stack.Screen name="modules/act/expansion/[id]" />
            <Stack.Screen name="modules/act/observing-self/index" dangerouslySingular />
            <Stack.Screen name="modules/act/observing-self/new" />
            <Stack.Screen name="modules/act/observing-self/[id]" />
            <Stack.Screen name="modules/act/values/index" dangerouslySingular />
            {/* A `<Redirect>` stub since #1379 - marked like `tools/act`, the other
                pure redirect here. It never stays mounted, so singular is inert on it;
                it is stated rather than left blank so the guard's marking rules cover
                the route rather than excusing it. */}
            <Stack.Screen name="modules/act/values/bulls-eye" dangerouslySingular />
            <Stack.Screen name="modules/act/values/[domain]" />
            <Stack.Screen name="modules/dbt/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/learn/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/learn/[group]" />
            <Stack.Screen name="modules/dbt/coping-plan/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/coping-plan/edit" />
            <Stack.Screen name="modules/dbt/pause" />
            <Stack.Screen name="modules/dbt/sessions/muscle-relaxation" />
            <Stack.Screen name="modules/dbt/emotions/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/emotions/new" />
            <Stack.Screen name="modules/dbt/emotions/[id]" />
            <Stack.Screen name="modules/dbt/wise-mind/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/wise-mind/new" />
            <Stack.Screen name="modules/dbt/wise-mind/[id]" />
            <Stack.Screen name="modules/dbt/judgements/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/judgements/new" />
            <Stack.Screen name="modules/dbt/judgements/[id]" />
            <Stack.Screen name="modules/dbt/opposite-action/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/opposite-action/new" />
            <Stack.Screen name="modules/dbt/opposite-action/[id]" />
            <Stack.Screen name="modules/dbt/scripts/index" dangerouslySingular />
            <Stack.Screen name="modules/dbt/scripts/new" />
            <Stack.Screen name="modules/dbt/scripts/[id]" />
            <Stack.Screen name="tools/index" dangerouslySingular />
            <Stack.Screen name="tools/check-in/index" dangerouslySingular />
            <Stack.Screen name="tools/meditation/index" />
            <Stack.Screen name="tools/act" dangerouslySingular />
            <Stack.Screen name="tools/gratitude-log/index" dangerouslySingular />
            <Stack.Screen name="tools/journal/index" dangerouslySingular />
            <Stack.Screen name="tools/grounding/index" dangerouslySingular />
            <Stack.Screen name="tools/habits/index" dangerouslySingular />
            <Stack.Screen name="tools/breathing/index" dangerouslySingular />
            <Stack.Screen name="tools/sleep/index" dangerouslySingular />
            <Stack.Screen name="tools/journal/entries" dangerouslySingular />
            <Stack.Screen name="tools/journal/new" />
            <Stack.Screen name="tools/journal/[id]/index" />
            <Stack.Screen name="tools/journal/[id]/edit" />
            <Stack.Screen name="tools/grounding/history" dangerouslySingular />
            <Stack.Screen name="tools/grounding/[slug]" />
            <Stack.Screen name="tools/habits/history" dangerouslySingular />
            <Stack.Screen name="tools/habits/learn/index" dangerouslySingular />
            <Stack.Screen name="tools/habits/learn/[slug]" />
            <Stack.Screen name="tools/habits/new" />
            <Stack.Screen name="tools/habits/[id]/index" />
            <Stack.Screen name="tools/habits/[id]/edit" />
            <Stack.Screen name="tools/habits/[id]/log" />
            <Stack.Screen name="tools/breathing/history" dangerouslySingular />
            <Stack.Screen name="tools/breathing/new" />
            <Stack.Screen name="tools/breathing/session" />
            <Stack.Screen name="tools/sleep/history" dangerouslySingular />
            <Stack.Screen name="tools/sleep/new" />
            <Stack.Screen name="tools/sleep/[id]/index" />
            <Stack.Screen name="tools/sleep/[id]/edit" />
            <Stack.Screen name="tools/check-in/history" dangerouslySingular />
            <Stack.Screen name="tools/check-in/new" />
            <Stack.Screen name="tools/check-in/[id]/index" />
            <Stack.Screen name="tools/check-in/[id]/edit" />
            <Stack.Screen name="tools/gratitude-log/entries/index" dangerouslySingular />
            <Stack.Screen name="tools/gratitude-log/favorites" dangerouslySingular />
            <Stack.Screen name="tools/gratitude-log/new" />
            <Stack.Screen name="tools/gratitude-log/[id]/index" />
            <Stack.Screen name="tools/gratitude-log/[id]/edit" />
            <Stack.Screen name="tools/meditation/learn" dangerouslySingular />
            <Stack.Screen name="tools/meditation/daily-life" dangerouslySingular />
            <Stack.Screen name="tools/meditation/sessions/index" dangerouslySingular />
            <Stack.Screen name="tools/meditation/sessions/[id]" />
            <Stack.Screen name="tools/meditation/stages/index" dangerouslySingular />
            <Stack.Screen name="tools/meditation/stages/[n]" />
            <Stack.Screen name="tools/meditation/practices" />
            <Stack.Screen name="tools/meditation/session/index" />
            <Stack.Screen name="tools/mood-tracker/index" />
            <Stack.Screen name="tools/mood-tracker/new" />
            <Stack.Screen name="tools/mood-tracker/[id]/index" />
            <Stack.Screen name="tools/mood-tracker/[id]/edit" />
            <Stack.Screen name="routines/index" dangerouslySingular />
            <Stack.Screen name="routines/new" />
            <Stack.Screen name="routines/[id]/index" />
            <Stack.Screen name="routines/[id]/edit" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="modules/cbt/saved/[id]" />
            <Stack.Screen name="modules/cbt/worry/[id]" />
            <Stack.Screen name="support" dangerouslySingular />
            <Stack.Screen name="legal" dangerouslySingular />
            <Stack.Screen name="progress" dangerouslySingular />
          </Stack>
          {/* Banner strips anchor at the bottom of the content column (#660):
              the top of the screen belongs to the invisible header. The PADDED
              strip publishes its top edge into layer 1 of the inset ladder
              (#1339), so bottom-floating widgets (reminder prompt card;
              RoutineFab, #670) and the toast ride above visible banners
              instead of covering their controls.

              The home-indicator inset is reserved only while a banner is
              actually visible (#670): a blanket paddingBottom would hold
              empty inset-height space under the content column at all times.

              The publisher sits on the OUTER view so the measured edge covers
              that conditional padding too, and so the padding change itself
              triggers a fresh layout pass. The inner onLayout still supplies
              the CONTENT height, which is what decides the padding. */}
          <View
            onLayout={onStripLayout}
            ref={attachStrip}
            testID="bottom-banner-strip"
            style={{ paddingBottom: bannerContentHeight > 0 ? insets.bottom : 0 }}
          >
            <View
              testID="bottom-banner-strip-content"
              onLayout={(event) => setBannerContentHeight(event.nativeEvent.layout.height)}
            >
              <OfflineBanner />
              <VerifyEmailBanner />
            </View>
          </View>
          {/* Corner-floating routine-progress handle: authenticated shell only,
              bottom-right so it coexists with the bottom-center reminder prompt
              card by construction. Renders nothing while no routine step is open. */}
          <RoutineFab />
          {/* The update offer (#1142 spec §3, superseding #388 §3's banner).
              A Modal, so its position here is about the GATE, not layout: it
              must stay inside AppLockGate's children — the trigger is hoisted
              above the gate (#1474), but hoisting the RENDER would put the
              update dialog over the lock screen. */}
          <UpdatePopup
            available={updateAvailability.available}
            act={updateAvailability.act}
            dismiss={updateAvailability.dismiss}
          />
        </View>
      </View>
    </AppLockGate>
  );
}
