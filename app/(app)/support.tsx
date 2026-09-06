import { FunctionsHttpError } from "@supabase/supabase-js";
import { Platform, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { isGuestAccount } from "@/src/features/profile/guest";
import { appEnv } from "@/src/lib/env";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import { openExternalUrl } from "@/src/lib/linking";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { requireSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { Section } from "@/src/components/app/section";
import { ChipRun, SelectableChip } from "@/src/components/app/selectable-chip";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { DeleteAccountRow } from "@/src/features/settings/components/delete-account-row";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { SettingsRun } from "@/src/features/settings/components/settings-run";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { cn } from "@/lib/utils";

/**
 * ☠️ `helped` is the one that is not a support request (#1614, decided in #1605).
 *
 * #1598 named "this helped" as the unnumbered half of the yardstick — the half
 * that speaks to the actual failure mode (the owner stopping) rather than to
 * sizing a segment. Without a label for it, someone moved to say it had to file
 * it as a bug, an idea, or a question.
 *
 * ⚠️ It is one chip of four, never a prompt, and never pre-selected. Nobody is
 * asked to praise anything; the label exists for a person who has already
 * decided to write. Turning it into an invitation would be the retention nudge
 * `AGENTS.md` forbids.
 *
 * The value travels to the edge function and into the Discord mirror as
 * `**[helped]**`. `validateFeedbackInput` takes any sanitized string within its
 * length limit, so there is no server-side allowlist to extend - which is also
 * why `suggestion` could become `idea` (#1727) with no server change: the
 * mailbox subject is now `Selftend feedback [idea]`, and nothing filters on it.
 */
type FeedbackCategory = "bug" | "idea" | "question" | "helped";

const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = ["bug", "idea", "question", "helped"];

/**
 * `idea`, the second chip, as `suggestion` was before it: the widest of the
 * four, so a person who does not pick one still lands somewhere true. Never
 * `helped` - pre-selecting the praise chip would make the form a prompt for it.
 */
const DEFAULT_CATEGORY: FeedbackCategory = "idea";

/**
 * The textarea's `maxLength`: the old "1000 or fewer" error is unreachable now
 * that the field itself stops at the limit, so the counter is the only sign of it.
 */
const FEEDBACK_MAX_LENGTH = 1000;

/** Fewer than this after trimming is refused inline, before any request. */
const FEEDBACK_MIN_LENGTH = 10;

// Mirrors the function-side gate (resolveReplyTo in _shared/feedback.ts):
// simple on purpose - it gates a Reply-To header, not deliverability.
const REPLY_TO_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The function answers 429 past five messages in sixty minutes (hard-coded in
 * the fixed-threshold rate-limit migration). `functions.invoke` wraps any non-2xx
 * in a `FunctionsHttpError` whose `context` is the `Response`, so the status is
 * read from there - it is an expected outcome, told to the user and never
 * reported.
 */
function isRateLimited(error: unknown): boolean {
  return (
    error instanceof FunctionsHttpError &&
    (error.context as { status?: unknown } | undefined)?.status === 429
  );
}

/** A locale array, or nothing - never a string spread into characters. */
function asList(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/**
 * One of the two "what support can and can't do" lists (#1726, spec §1.5).
 *
 * The sub-heading is 13px semibold foreground, deliberately NOT a heading role:
 * the page's outline is one h1, the form's h2 and four h3 sections, and two h4s
 * under one of them would make this section read as deeper than its neighbours.
 * The marks are decorative - the list's title already says which list this is.
 */
function SupportList({
  title,
  items,
  mark,
  markClassName,
}: {
  title: string;
  items: string[];
  mark: MaterialIconName;
  markClassName: string;
}) {
  return (
    <View className="flex-1 gap-2">
      <Text className="text-[13px] font-semibold text-foreground">{title}</Text>
      <View role="list" className="gap-1.5">
        {items.map((item) => (
          // `accessible`: one item is one element to a screen reader, mark and
          // text together, rather than a hidden glyph and then a loose string.
          <View key={item} accessible role="listitem" className="flex-row items-start gap-2">
            {/* `Icon` is decorative by default - hidden from assistive tech already. */}
            <Icon name={mark} className={cn("mt-0.5 size-4 shrink-0", markClassName)} />
            <Text className="flex-1 text-[13px] leading-snug text-foreground">{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * `/support`, one column in the home width (#1726, design 13a, spec on #1719):
 * header → safety callout → the message form → Other ways to reach us → What
 * support can and can't do → The project → Policies → Delete my account.
 *
 * Seven cards became this column, and nothing shipping before is silently gone
 * (spec §2 lists every element's fate). The one crisis notice on the page is the
 * shared callout: the boundary card and the in-form red card both folded into
 * it, and the form's intro keeps the "leave out crisis details" sentence as its
 * only reminder.
 *
 * The form (#1727, spec §1.3 and §3) is chips → message with a counter → a
 * reply-to slot → footnote + Send. Sending, success, failure and the rate limit
 * are toasts; after a success the fields clear and **the Send button stays** -
 * the old success line replaced the button, so a second message had no way out
 * of the page (#1722).
 */
export default function SupportScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation(["settings", "navigation"]);
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const supportEmail = appEnv.supportEmail;
  const supportSubject = encodeURIComponent("Selftend support");

  // A registered user's reply address comes from their account on the server;
  // only a guest, who has no email anywhere, is offered one - optional,
  // guest-only, and used for nothing but replying (#1447). This surface
  // found the stale-flag window first, by ANDing the flag with `!user.email`;
  // #1896 moved that argument into `isGuestAccount`, the same predicate spelled
  // once. Offering the field to a just-converted guest would take an address the
  // server then silently ignores in favour of their account email. That same person sees the address line instead: the server will
  // use it, so it is the truthful thing to say.
  const isGuest = isGuestAccount(user);
  const accountEmail = isGuest ? "" : (user?.email ?? "");

  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>(DEFAULT_CATEGORY);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The chips are one radiogroup: on web, arrows move between them and Space
  // selects (the emoji picker's pattern). The item props REPLACE the chip's own
  // Space handler rather than stacking on it - stacked, Space would fire twice.
  const roving = useRovingFocus({
    count: FEEDBACK_CATEGORIES.length,
    activeIndex: FEEDBACK_CATEGORIES.indexOf(feedbackCategory),
    onActivate: (index) => setFeedbackCategory(FEEDBACK_CATEGORIES[index]),
  });

  const canDo = asList(t("supportPage.canDo", { returnObjects: true }));
  const cantDo = asList(t("supportPage.cantDo", { returnObjects: true }));

  const handleFeedbackSubmit = async () => {
    const trimmed = feedbackMessage.trim();
    if (trimmed.length < FEEDBACK_MIN_LENGTH) {
      setFeedbackError(t("feedback.messageTooShort"));
      return;
    }
    const replyTo = isGuest ? replyToEmail.trim() : "";
    if (replyTo && !REPLY_TO_PATTERN.test(replyTo)) {
      setFeedbackError(t("feedback.replyToInvalid"));
      return;
    }
    setFeedbackError("");
    setIsSubmitting(true);
    try {
      const { error } = await requireSupabase().functions.invoke("send-feedback", {
        body: {
          category: feedbackCategory,
          message: trimmed,
          ...(replyTo ? { replyTo } : {}),
        },
      });
      if (error) throw error;
      showToast({ title: t("feedback.submitSuccess"), tone: "success" });
      setFeedbackMessage("");
      setReplyToEmail("");
      setFeedbackCategory(DEFAULT_CATEGORY);
    } catch (error) {
      // The message stays in the box on every failure: the person can try again.
      if (isRateLimited(error)) {
        showToast({ title: t("feedback.rateLimited"), tone: "error" });
      } else {
        // This is a bare `functions.invoke`, not a TanStack mutation, so no
        // global reporter sees it - the capture here is the only one.
        // `isReportableError` drops the expected offline case.
        if (isReportableError(error)) {
          captureError(error);
        }
        showToast({ title: t("feedback.submitError"), tone: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileFormScreen contentClassName={cn(HOME_COLUMN, "gap-6")}>
      {/* No eyebrow, no back arrow: `/support` is a top-level route. */}
      <View className="gap-2">
        <ScreenHeader title={t("supportPage.title")} />
        <Text variant="muted">{t("supportPage.description")}</Text>
      </View>

      {/* The page's ONE crisis notice. No second card, no crisis row below. */}
      <CrisisSupportCallout />

      {/*
        The form and the four Sections sit in ONE no-gap group: each carries its
        own py-6 and its own top hairline, so the column's gap-6 would compound
        into a 72px band between them (the grounding and gratitude homes wrap
        theirs for the same reason).

        The form is a RULED BAND, not a card (design 13a). The page's whole
        premise is seven stacked cards becoming one column; a bordered, filled,
        rounded panel in the middle of that column reads as the one survivor of
        the stack rather than as the column's second block. Its bottom rule is
        the next Section's top rule - one hairline between blocks, never two.
      */}
      <View>
        {supportEmail ? (
          <Section>
            <View className="gap-1">
              {/*
                The form is the page's h2: the sections that follow are h3s, and
                the form is the one block a reader jumps to by name. It carries a
                19px title rather than a Section eyebrow because it names a block
                a reader acts IN, not one they skim past.
              */}
              <Text
                role="heading"
                aria-level={2}
                className="text-[19px] font-semibold tracking-tight text-foreground"
              >
                {t("feedback.title")}
              </Text>
              <Text variant="muted" className="text-sm">
                {t("feedback.description")}
              </Text>
            </View>
            <View className="gap-4">
              <View className="gap-2">
                <Label>{t("feedback.categoryLabel")}</Label>
                {/*
                  The chip cannot know its siblings, so the group is drawn here.
                  `ChipRun` wraps, which is what keeps the last chip from being
                  clipped rather than moved. The four fit on one row in the
                  column's full 312px at 360dp; they needed two back when the
                  form was a Card and its `px-6` left them 264px (#1778). The
                  wrap matters, the row count does not.
                */}
                <View
                  accessibilityLabel={t("feedback.categoryLabel")}
                  accessibilityRole="radiogroup"
                  role="radiogroup"
                >
                  <ChipRun>
                    {FEEDBACK_CATEGORIES.map((cat, index) => {
                      const select = () => setFeedbackCategory(cat);
                      return (
                        <SelectableChip
                          key={cat}
                          role="radio"
                          label={t(`feedback.category.${cat}`)}
                          selected={feedbackCategory === cat}
                          onToggle={select}
                          rovingProps={roving.getItemProps(index, select)}
                          testID={`support-category-${cat}`}
                        />
                      );
                    })}
                  </ChipRun>
                </View>
              </View>

              <View className="gap-2">
                {/*
                  The counter rides the label's own row, right- and
                  baseline-aligned with it (design 13a). It belongs to the field,
                  and under the box it shared a line with the inline error, where
                  the two competed for the same edge.
                */}
                <View className="flex-row items-baseline justify-between gap-3">
                  <Label>{t("feedback.messageLabel")}</Label>
                  <Text
                    // ☠️ `current`, never `count`: `count` is i18next's plural
                    // selector and the lookup would walk `counterLabel_one` first.
                    accessibilityLabel={t("feedback.counterLabel", {
                      current: feedbackMessage.length,
                      max: FEEDBACK_MAX_LENGTH,
                    })}
                    variant="muted"
                    className="shrink-0 text-xs tabular-nums"
                    testID="support-message-counter"
                  >
                    {`${feedbackMessage.length} / ${FEEDBACK_MAX_LENGTH}`}
                  </Text>
                </View>
                <Textarea
                  accessibilityLabel={t("feedback.messageLabel")}
                  maxLength={FEEDBACK_MAX_LENGTH}
                  numberOfLines={5}
                  onChangeText={(text) => {
                    setFeedbackMessage(text);
                    if (feedbackError) setFeedbackError("");
                  }}
                  placeholder={t(`feedback.placeholder.${feedbackCategory}`)}
                  value={feedbackMessage}
                />
                {feedbackError ? (
                  // A polite live region: the error appears on press, away from
                  // where focus is, so it is announced rather than found.
                  <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
                    {feedbackError}
                  </Text>
                ) : null}
              </View>

              {isGuest ? (
                <View className="gap-2">
                  <Label>{t("feedback.replyToLabel")}</Label>
                  <Input
                    accessibilityLabel={t("feedback.replyToLabel")}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={(text) => {
                      setReplyToEmail(text);
                      if (feedbackError) setFeedbackError("");
                    }}
                    placeholder={t("feedback.replyToPlaceholder")}
                    value={replyToEmail}
                  />
                  <Text variant="muted" className="text-xs">
                    {t("feedback.replyToHint")}
                  </Text>
                </View>
              ) : accountEmail ? (
                // No field for an account holder - the server resolves their
                // address - just the fact of where the reply will land.
                <Text variant="muted" className="text-xs">
                  {t("feedback.replyToAccount", { email: accountEmail })}
                </Text>
              ) : null}

              {/*
                Design 13a puts the footnote at the row's left and Send at its
                right; at 360dp the button is full-width with the footnote under
                it. Source order stays Button-then-footnote so the narrow column
                reads the action first, and `sm:flex-row-reverse` with
                `justify-between` swaps them into the drawn order from `sm:` up.
                `disabled` only while sending - a success never takes the button
                away (#1722).
              */}
              <View className="gap-3 sm:flex-row-reverse sm:items-center sm:justify-between sm:gap-4">
                <Button
                  className="sm:grow-0"
                  disabled={isSubmitting}
                  onPress={() => void handleFeedbackSubmit()}
                >
                  <Text>{isSubmitting ? t("feedback.submitting") : t("feedback.submit")}</Text>
                </Button>
                <Text variant="muted" className="min-w-0 text-xs sm:flex-1">
                  {t("feedback.attachNothing")}
                </Text>
              </View>
            </View>
          </Section>
        ) : null}

        <Section title={t("feedback.otherChannels")}>
          {/*
          A hairline run: the section already carries the chrome, and a card
          here would be a box inside a box. The Discord row is gated at the
          mount point (`Children.toArray` drops a null CHILD, not a child that
          renders null), so a blank URL leaves no rule behind.
        */}
          <SettingsRun surface="hairline">
            <SettingsRow
              icon="mail-outline"
              label={t("supportPage.emailSupport")}
              description={
                supportEmail
                  ? t("supportPage.emailSupportDescription", { email: supportEmail })
                  : t("supportPage.emailNotConfigured")
              }
              trailing={{ kind: "external" }}
              disabled={!supportEmail}
              onPress={() => openExternalUrl(`mailto:${supportEmail}?subject=${supportSubject}`)}
              testID="support-row-email"
            />
            <SettingsRow
              icon="bug-report"
              label={t("feedback.reportOnGitHub")}
              description={t("feedback.reportOnGitHubDescription")}
              trailing={{ kind: "external" }}
              onPress={() => openExternalUrl(`${appEnv.githubRepoUrl}/issues`)}
              testID="support-row-github"
            />
            {appEnv.discordUrl ? (
              <SettingsRow
                icon="forum"
                label={t("feedback.joinDiscord")}
                description={t("feedback.joinDiscordDescription")}
                trailing={{ kind: "external" }}
                onPress={() => openExternalUrl(appEnv.discordUrl)}
                testID="support-row-discord"
              />
            ) : null}
          </SettingsRun>
        </Section>

        <Section title={t("supportPage.handles")}>
          {/* Two columns from `sm:` up, stacked below it. */}
          <View className="gap-4 sm:flex-row sm:gap-6">
            <SupportList
              title={t("supportPage.canDoTitle")}
              items={canDo}
              mark="check"
              markClassName="text-primary"
            />
            <SupportList
              title={t("supportPage.cantDoTitle")}
              items={cantDo}
              mark="remove"
              markClassName="text-muted-foreground"
            />
          </View>
          <ShowAllLink label={t("supportPage.openFaq")} route="/faq" />
        </Section>

        <Section title={t("supportPage.projectLinks")}>
          <SettingsRun surface="hairline">
            <SettingsRow
              icon="code"
              label={t("supportPage.openRepo")}
              description={t("supportPage.repoMeta")}
              trailing={{ kind: "external" }}
              onPress={() => openExternalUrl(appEnv.githubRepoUrl)}
              testID="support-row-repo"
            />
            <SettingsRow
              icon="volunteer-activism"
              label={t("supportPage.openContributing")}
              trailing={{ kind: "external" }}
              onPress={() =>
                openExternalUrl(`${appEnv.githubRepoUrl}/blob/main/.github/CONTRIBUTING.md`)
              }
              testID="support-row-contributing"
            />
            {/*
            Store referral is a web-only surface: advertising the Android app
            inside the Android app is noise. Gated here, at the mount point, for
            the same `Children.toArray` reason as the Discord row.
          */}
            {Platform.OS === "web" && appEnv.playStoreUrl ? (
              <SettingsRow
                icon="android"
                label={t("supportPage.getAndroid")}
                description={t("supportPage.playStore")}
                trailing={{ kind: "external" }}
                onPress={() => openExternalUrl(appEnv.playStoreUrl)}
                testID="support-row-android"
              />
            ) : null}
            {Platform.OS === "web" && appEnv.appStoreUrl ? (
              <SettingsRow
                icon="phone-iphone"
                label={t("supportPage.getIos")}
                description={t("supportPage.appStore")}
                trailing={{ kind: "external" }}
                onPress={() => openExternalUrl(appEnv.appStoreUrl)}
                testID="support-row-ios"
              />
            ) : null}
          </SettingsRun>
        </Section>

        {/* No crisis row: the callout above is the page's crisis door. */}
        <Section title={t("supportPage.policiesAndSafety")}>
          <SettingsRun surface="hairline">
            <SettingsRow
              icon="shield"
              label={t("supportPage.openPrivacy")}
              trailing={{ kind: "chevron" }}
              onPress={() => pushWithOrigin("/privacy")}
              testID="support-row-privacy"
            />
            <SettingsRow
              icon="gavel"
              label={t("supportPage.openTerms")}
              trailing={{ kind: "chevron" }}
              onPress={() => pushWithOrigin("/terms")}
              testID="support-row-terms"
            />
          </SettingsRun>
        </Section>

        {/*
        Title-less and ruled: the row is its own name. Guests see it too, for
        Settings' reason. The `/account-deletion` route stays public and linked
        from `/legal` and the store forms; it just no longer needs a door here.
      */}
        <Section>
          <DeleteAccountRow />
        </Section>
      </View>
    </MobileFormScreen>
  );
}
