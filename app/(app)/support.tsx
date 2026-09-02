import { Platform, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { requireSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { Section } from "@/src/components/app/section";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { DeleteAccountRow } from "@/src/features/settings/components/delete-account-row";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { SettingsRun } from "@/src/features/settings/components/settings-run";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { HOME_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";

/**
 * ☠️ `helped` is the one that is not a support request (#1614, decided in #1605).
 *
 * #1598 named "this helped" as the unnumbered half of the yardstick — the half
 * that speaks to the actual failure mode (the owner stopping) rather than to
 * sizing a segment. Without a label for it, someone moved to say it had to file
 * it as a bug, a suggestion, or a question.
 *
 * ⚠️ It is a DROPDOWN, never a prompt. Nobody is asked to praise anything; the
 * label exists for a person who has already decided to write. Turning it into an
 * invitation would be the retention nudge `AGENTS.md` forbids.
 *
 * The value travels to the edge function and into the Discord mirror as
 * `**[helped]**`. `validateFeedbackInput` takes any sanitized string within its
 * length limit, so there is no server-side allowlist to extend.
 */
type FeedbackCategory = "bug" | "suggestion" | "question" | "helped";

const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = [
  "bug",
  "suggestion",
  "question",
  "helped",
];

// Mirrors the function-side gate (resolveReplyTo in _shared/feedback.ts):
// simple on purpose - it gates a Reply-To header, not deliverability.
const REPLY_TO_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * only reminder. The form itself is left as shipped here apart from that card -
 * its chips, counter and toasts are #1727.
 */
export default function SupportScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation(["settings", "navigation"]);
  const { user } = useSession();
  const supportEmail = appEnv.supportEmail;
  const supportSubject = encodeURIComponent("Selftend support");

  // A registered user's reply address comes from their account on the server;
  // only a guest, who has no email anywhere, is offered one - optional,
  // guest-only, and used for nothing but replying (#1447). The email check
  // matters: a just-converted guest can still carry a stale is_anonymous
  // claim until token refresh (#1443), and offering them the field would take
  // an address the server then silently ignores in favour of their account
  // email.
  const isGuest = user?.is_anonymous === true && !user.email;

  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const canDo = asList(t("supportPage.canDo", { returnObjects: true }));
  const cantDo = asList(t("supportPage.cantDo", { returnObjects: true }));

  const handleFeedbackSubmit = async () => {
    const trimmed = feedbackMessage.trim();
    if (trimmed.length < 10) {
      setFeedbackError(t("feedback.messageTooShort"));
      return;
    }
    if (trimmed.length > 1000) {
      setFeedbackError(t("feedback.messageTooLong"));
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
      setSubmitSuccess(true);
      setFeedbackMessage("");
      setReplyToEmail("");
      setFeedbackCategory("suggestion");
    } catch {
      setFeedbackError(t("feedback.submitError"));
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

      {supportEmail ? (
        <Card>
          <CardHeader>
            {/*
              The form is the page's h2: the sections that follow are h3s, and
              the form is the one block a reader jumps to by name.
            */}
            <CardTitle aria-level={2}>{t("feedback.title")}</CardTitle>
            <CardDescription>{t("feedback.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="gap-2">
                <Label>{t("feedback.categoryLabel")}</Label>
                {/* ⚠️ `flex-wrap` is load-bearing since #1614 took this row to
                    four: "Bug · Suggestion · Question · This helped" does not
                    fit one line at 360dp, and without wrapping the last button
                    is clipped rather than moved. */}
                <View className="flex-row flex-wrap gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      onPress={() => setFeedbackCategory(cat)}
                      size="sm"
                      variant={feedbackCategory === cat ? "default" : "outline"}
                    >
                      <Text>{t(`feedback.category.${cat}`)}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <View className="gap-2">
                <Label>{t("feedback.messageLabel")}</Label>
                <Textarea
                  accessibilityLabel={t("feedback.messageLabel")}
                  numberOfLines={5}
                  onChangeText={(text) => {
                    setFeedbackMessage(text);
                    if (feedbackError) setFeedbackError("");
                  }}
                  placeholder={t("feedback.messagePlaceholder")}
                  value={feedbackMessage}
                />
                {feedbackError ? (
                  <Text className="text-sm text-destructive">{feedbackError}</Text>
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
              ) : null}

              {submitSuccess ? (
                <Text className="text-sm">{t("feedback.submitSuccess")}</Text>
              ) : (
                <Button disabled={isSubmitting} onPress={() => void handleFeedbackSubmit()}>
                  <Text>{isSubmitting ? t("feedback.submitting") : t("feedback.submit")}</Text>
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
      ) : null}

      {/*
        The Sections sit in a no-gap group: each carries its own py-6, so the
        column's gap-6 would compound into a 72px band between them (the
        grounding and gratitude homes wrap theirs for the same reason).
      */}
      <View>
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
            {Platform.OS === "web" ? (
              <SettingsRow
                icon="android"
                label={t("supportPage.getAndroid")}
                description={
                  appEnv.playStoreUrl
                    ? t("supportPage.playStore")
                    : t("navigation:getTheApp.comingSoon")
                }
                trailing={{ kind: "external" }}
                disabled={!appEnv.playStoreUrl}
                onPress={() => openExternalUrl(appEnv.playStoreUrl)}
                testID="support-row-android"
              />
            ) : null}
            {Platform.OS === "web" ? (
              <SettingsRow
                icon="phone-iphone"
                label={t("supportPage.getIos")}
                description={
                  appEnv.appStoreUrl
                    ? t("supportPage.appStore")
                    : t("navigation:getTheApp.comingSoon")
                }
                trailing={{ kind: "external" }}
                disabled={!appEnv.appStoreUrl}
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
