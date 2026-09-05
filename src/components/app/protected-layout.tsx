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
import { AppOnboardingWizard } from "@/src/components/app/app-onboarding-wizard";
import type { UserPreferences } from "@/src/features/modules/types";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useUnderFloorBlock } from "@/src/features/auth/use-under-floor-block";
import {
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { useNotificationDeepLink } from "@/src/features/notifications/use-notification-deep-link";
import { useNotificationSync } from "@/src/features/notifications/use-notification-sync";
import { useRoutines } from "@/src/features/routines/queries";
import { useSettingsSync } from "@/src/features/settings/use-settings-sync";
import { useSession } from "@/src/providers/session-provider";
import { useUpdateAvailability } from "@/src/lib/use-update-availability";
import { INSET_LAYER, useInsetPublisher } from "@/src/stores/layered-inset-store";
import { WidgetSnapshotSync } from "@/src/features/widgets/widget-snapshot-sync";
import { AppLockGate } from "@/src/features/security/app-lock-gate";
import { useAppLockStore } from "@/src/features/security/app-lock-store";

export default function ProtectedLayout() {
  const { t } = useTranslation("settings");
  const { session, status, user } = useSession();
  const {
    data: preferences,
    isLoading: prefsLoading,
    isError: prefsError,
  } = useUserPreferences(user?.id ?? null);
  const completeOnboarding = useUpdateOnboardingPreferences(user?.id ?? null);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [underFloor, setUnderFloor] = useState(false);
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
    return <UnderFloorScreen />;
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

  // A failed preferences fetch WITH nothing cached leaves the acceptance state
  // UNKNOWN — gating on it would re-prompt users who already accepted (#164:
  // transient network errors flashed the gate). Fail open only then; TanStack's
  // retry/refocus refetch re-evaluates once a load succeeds. When cached data
  // exists the state is known even if the latest refetch errored, so a stale
  // acceptance still gates.
  const prefsUnknown = prefsError && !preferences;
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
  // age or country, so the gate is scoped to accounts that have never accepted
  // a policy version - i.e. accounts that have not been through the consent
  // gate yet, which for a brand-new account (guest included) is true at exactly
  // the moment this runs, and for every existing account is false forever.
  // Without this clause the gate would fire for the entire install base on the
  // release that ships it.
  //
  // ⚠️ That makes the age gate depend on running ABOVE the consent gate: if the
  // two ever swapped, a new account would accept a policy version first and
  // then never be asked its age. The order is not left to comments -
  // `protected-layout.test.tsx` asserts a brand-new account sees the age gate
  // while the consent gate is absent, which fails the moment the order flips.
  const neverAskedAge = preferences?.ageFloorMet !== true;
  const isNewAccount = preferences?.policyVersionAccepted === null;
  const needsAgeAttestation =
    !ageAttested &&
    !prefsLoading &&
    // ⚠️ Fail-open, and it is worth naming rather than inheriting silently: on
    // a preferences error with nothing cached, the attestation state is
    // UNKNOWN and this lets the person through until a fetch succeeds. Failing
    // closed instead would block every user whose first fetch of a cold start
    // failed, since nothing in that state distinguishes a new guest from a
    // ten-month user. The consent gate below makes the same call for the same
    // reason (#164), so this is no weaker than the legal gate beside it - but
    // it is a gap, and it is recorded in docs/age-floor.md rather than only
    // here.
    !prefsUnknown &&
    // Not redundant with the two above: the query is DISABLED while there is
    // no user id, and a disabled query is neither loading nor errored - it
    // just has no data. Without this, that state reads as "never attested".
    Boolean(preferences) &&
    neverAskedAge &&
    isNewAccount;
  const needsConsent =
    !consentDismissed &&
    !prefsLoading &&
    !prefsUnknown &&
    preferences?.policyVersionAccepted !== policyVersion;
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
      <AgeGate onAttested={() => setAgeAttested(true)} onUnderFloor={() => setUnderFloor(true)} />
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
