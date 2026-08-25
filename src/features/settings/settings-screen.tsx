import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useTranslation } from "react-i18next";

import { KeyboardAwareScrollView } from "@/src/components/app/keyboard-aware-scroll-view";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { StylePicker } from "@/src/components/app/style-picker";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { AppLockRow } from "@/src/features/settings/components/app-lock-row";
import { DeleteAccountRow } from "@/src/features/settings/components/delete-account-row";
import { ExportDataRow } from "@/src/features/settings/components/export-data-row";
import { SettingsColophon } from "@/src/features/settings/components/settings-colophon";
import { SettingsHero } from "@/src/features/settings/components/settings-hero";
import { SettingsProfileBlock } from "@/src/features/settings/components/settings-profile-block";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { SettingsRun } from "@/src/features/settings/components/settings-run";
import { useOnboardingActions } from "@/src/features/settings/use-reset-onboarding";
import { useSignOut } from "@/src/features/auth/use-sign-out";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";

/**
 * Settings: identity header → palette → four labelled runs → colophon.
 *
 * Eleven rows and one grammar, in place of seven `SettingsSectionCard`s. Two of
 * the old cards each held two unrelated things and had to split - `Onboarding`
 * into `Replay introduction` + `Show tips again`, and `Privacy and cookies` into
 * two rows going to two routes - because one row cannot hold two buttons or
 * navigate to two places, and there is no hub here worth inventing.
 *
 * **No page-level `LoadingState`.** The eleven rows are known before any query
 * resolves, so a spinner over the whole page would hide a list nothing is waiting
 * for. `useUserPreferences` survives for exactly one reason -
 * `appOnboardingCompletedVia`, which the replay action has to preserve - so the
 * two onboarding rows are the only ones that wait.
 *
 * **No feedback banners.** The R7 pair died at zero cost: both of its writers
 * already called `showToast` beside it, and export has joined them. Transient
 * outcomes toast; a state that persists is shown where it lives, which is why
 * `appLockUnavailable` is a row description and the profile disclosures keep
 * their inline messages.
 *
 * **Chrome: `ScreenTopBar` carries the Escape (#1255).** The bespoke hero is
 * the page's own title, not chrome, so the Escape slot never reached this
 * screen - one of the escape spec's 11 red screens (W12). The bar sits above
 * the scroller, pinned rather than scrolling away, and the hero and runs below
 * are untouched. `/settings` is a one-crumb route, so the bar's trail hides and
 * the Escape announces "Back to Home".
 */
export default function SettingsScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const { data } = useUserPreferences(user?.id ?? null);

  const handleSignOut = useSignOut(user?.id ?? null);
  const {
    replayIntroduction,
    showTipsAgain,
    isPending: onboardingPending,
  } = useOnboardingActions(user, data?.appOnboardingCompletedVia);

  const onboardingDisabled = !data || onboardingPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScreenTopBar />
      {/* Keyboard avoidance for the display-name field (edge-to-edge Android
          gets no window resize, so the screen must pad itself). */}
      <KeyboardAvoidingView behavior={KEYBOARD_AVOIDING_BEHAVIOR} className="flex-1">
        <KeyboardAwareScrollView contentContainerClassName="grow p-4">
          <View testID="settings-layout" className="mx-auto w-full max-w-2xl gap-6">
            <SettingsHero />

            <SettingsProfileBlock user={user} />

            {/*
              The palette, above the runs and outside them: it is the one control
              on this page that shows its own state at a glance, and a row saying
              `Appearance ›` would hide a grid that fits.

              The eight per-item swatches are not a rule-1 violation. They are
              `hue encodes data, not identity` in its plainest form - each chip is
              read off the RESOLVED tokens of the palette it advertises, so what
              the user reads off the colour is the colour they would get. See the
              asked-and-refused note in `src/lib/theme/encoding.ts`.
            */}
            <View className="gap-2">
              <Text variant="muted" className="px-1 text-[13px]">
                {t("appearance.description")}
              </Text>
              <StylePicker itemClassName="w-1/2 md:w-1/4 p-1" heading={false} />
            </View>

            <SettingsRun label={t("runs.app")} testID="settings-run-app">
              <SettingsRow
                icon="notifications-active"
                label={t("reminders.title")}
                // The drawn `3 on` is dropped rather than fixed: it is the
                // undercounting master count again, and the row already says the
                // one thing that stays true - reminders are off by default.
                description={t("reminders.description")}
                trailing={{ kind: "chevron" }}
                onPress={() => pushWithOrigin("/notifications")}
                testID="settings-row-reminders"
              />
              {/* Native only, gated here rather than inside the row: a row that
                  returns `null` is still a child element, so `SettingsRun` would
                  keep its hairline and draw a stray rule on web. */}
              {Platform.OS === "web" ? null : <AppLockRow />}
              <SettingsRow
                icon="replay"
                label={t("onboardingSection.replayIntroduction")}
                trailing={{ kind: "act" }}
                disabled={onboardingDisabled}
                pending={onboardingPending}
                pendingLabel={t("onboarding.saving")}
                onPress={() => void replayIntroduction()}
                testID="settings-row-replay-introduction"
              />
              <SettingsRow
                icon="lightbulb"
                label={t("onboardingSection.showTipsAgain")}
                trailing={{ kind: "act" }}
                disabled={onboardingDisabled}
                pending={onboardingPending}
                pendingLabel={t("onboarding.saving")}
                onPress={() => void showTipsAgain()}
                testID="settings-row-show-tips-again"
              />
            </SettingsRun>

            <SettingsRun label={t("runs.data")} testID="settings-run-data">
              <ExportDataRow />
              <SettingsRow
                icon="shield"
                label={t("privacy.title")}
                // Not the drawn "…what never leaves your device": an
                // account-required product stores what you save on a server, and
                // the privacy page it opens says so.
                description={t("privacy.description")}
                trailing={{ kind: "chevron" }}
                onPress={() => pushWithOrigin("/privacy")}
                testID="settings-row-privacy"
              />
              {/* Web only: browser storage is the only thing a cookie preference
                  can be about. */}
              {Platform.OS === "web" ? (
                <SettingsRow
                  icon="cookie"
                  label={t("support.cookies")}
                  trailing={{ kind: "chevron" }}
                  onPress={() => pushWithOrigin("/cookies")}
                  testID="settings-row-cookies"
                />
              ) : null}
            </SettingsRun>

            <SettingsRun label={t("runs.help")} testID="settings-run-help">
              <SettingsRow
                icon="support-agent"
                label={t("support.support")}
                trailing={{ kind: "chevron" }}
                onPress={() => pushWithOrigin("/support")}
                testID="settings-row-support"
              />
              <SettingsRow
                icon="gavel"
                label={t("support.legal")}
                trailing={{ kind: "chevron" }}
                onPress={() => pushWithOrigin("/legal")}
                testID="settings-row-legal"
              />
            </SettingsRun>

            <SettingsRun label={t("runs.account")} testID="settings-run-account">
              {/*
                The drawn "You'll stay signed in on other devices." is back, and
                now true. It was deleted while `signOut()` still took supabase-js's
                `scope: 'global'` default, which made the sentence exactly backwards;
                #968 settled the scope as per-device, so the description says what
                the row does again.
              */}
              <SettingsRow
                icon="logout"
                label={t("account.signOut")}
                description={t("account.signOutHint")}
                trailing={{ kind: "act" }}
                onPress={() => void handleSignOut()}
                testID="settings-row-sign-out"
              />
              <DeleteAccountRow />
            </SettingsRun>

            <SettingsColophon />
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
