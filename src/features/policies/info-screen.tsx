import * as Linking from "expo-linking";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import type { PolicyAction } from "@/src/features/policies/policy-content";
import { policyLastUpdated } from "@/src/features/policies/policy-content";
import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";
import type { PolicySection } from "@/src/features/policies/policy-section-cards";
import { PolicySectionCards } from "@/src/features/policies/policy-section-cards";
import { contactEmails } from "@/src/lib/env";

interface InfoScreenProps extends PropsWithChildren {
  actions?: PolicyAction[];
  /** i18n key prefix for action labels (e.g. "crisis.actions") */
  notice?: string;
  /** i18n key for the sections array (e.g. "privacy.sections") */
  sectionKey: string;
  showLastUpdated?: boolean;
  subtitle: string;
  title: string;
}

/**
 * The six policy routes that share one shape: `/privacy`, `/terms`, `/cookies`,
 * `/crisis`, `/account-deletion` and `/faq`. (`/security` is the seventh policy
 * page and does NOT render through this - it hand-rolls the same structure
 * inline, and folds in on #2146.)
 *
 * ☠️ **This component's public interface is frozen by #2144.** The props below -
 * their names, their optionality, their defaults and their order - are the
 * entire guarantee that the routes this slice does not touch render exactly what
 * they rendered before. The body was rebuilt on `PolicyPageLayout` and
 * `PolicySectionCards`; the surface was not.
 */
export function InfoScreen({
  actions = [],
  children,
  notice,
  sectionKey,
  showLastUpdated = false,
  subtitle,
  title,
}: InfoScreenProps) {
  const { t } = useTranslation("policies");
  // i18next recurses into the object `returnObjects` returns, so a `{{var}}` in a
  // nested `body[]` string interpolates like any other. Supplied to every policy
  // screen rather than the FAQ alone: the addresses appear in `privacy`, `terms`,
  // `cookies` and `accountDeletion` too, and those move to placeholders on the
  // next `policyVersion` bump (#2131) - an unsupplied variable would render the
  // raw `{{privacyEmail}}` on a legal page, so the values arrive first.
  const sections = t(sectionKey, {
    returnObjects: true,
    ...contactEmails(),
  }) as PolicySection[];

  return (
    <PolicyPageLayout
      title={title}
      subtitle={
        /*
          ☠️ Passed as a FRAGMENT, not a concatenated string. These are two
          children of one `Text` today, and joining them into a single string
          would change the rendered node tree - enough to move an RNTL
          `getByText` on a page nothing in this slice is supposed to touch.
        */
        <>
          {subtitle}
          {showLastUpdated ? ` ${t("lastUpdated", { date: policyLastUpdated })}` : null}
        </>
      }
    >
      {notice ? (
        <Card>
          <CardHeader>
            <CardTitle aria-level={2}>{t("launchReview")}</CardTitle>
            <CardDescription>{notice}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {actions.length ? (
        <Card>
          <CardHeader>
            <CardTitle aria-level={2}>{t("helpfulLinks")}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {actions.map((action) => (
                <Button
                  key={action.url}
                  onPress={() => void Linking.openURL(action.url)}
                  variant="secondary"
                >
                  <Text>{action.label}</Text>
                </Button>
              ))}
            </View>
          </CardContent>
        </Card>
      ) : null}

      {children}

      {/*
        The guard stays with the caller, not inside `PolicySectionCards`:
        `t(key, { returnObjects: true })` returns a STRING when the key is
        missing, and the key is this component's to get wrong.
      */}
      {Array.isArray(sections) ? <PolicySectionCards sections={sections} /> : null}
    </PolicyPageLayout>
  );
}
