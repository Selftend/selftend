import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";
import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";
import type { PolicySection } from "@/src/features/policies/policy-section-cards";
import { PolicySectionCards } from "@/src/features/policies/policy-section-cards";
import { contactEmails } from "@/src/lib/env";
import { useRecordOrigin } from "@/src/lib/escape-origin";

/**
 * The seventh policy page, and the one that used to hand-roll the layout the
 * other six get from `InfoScreen`. It renders through the shared chrome now
 * (#2146) without going through `InfoScreen` itself, because it cannot: the six
 * read the `policies` namespace, which `InfoScreen` hardcodes, while this page
 * reads `security` and the key `page.sections`.
 *
 * ☠️ That is exactly why `PolicySectionCards` takes a RESOLVED array rather than
 * a key (#2144). This screen resolves its own sections in its own namespace and
 * hands the array over - the seam that made this fold-in possible at all.
 *
 * ☠️ The `aria-level={2}` on the section titles is INHERITED here, not re-made.
 * It shipped inline on #2133 after two hand-maintained copies of one structure
 * drifted and this page went out at h1 → h3. There is one copy of the structure
 * now, so the level cannot drift again; `policy-heading-outline.test.tsx` is the
 * guard, and it renders this screen beside `/privacy` to prove they agree.
 *
 * The two trailing controls are this page's own and both stay: nothing else in
 * the body links a reader from the security summary to the full policy, and the
 * security contact is the address a reporter is meant to use. The first is a
 * real anchor since #2467 (docs/brand-result.md § 7.4) - it was a `Button` with
 * a press handler and no `href`, so `/privacy` ↔ `/security` looked linked to a
 * mouse and was no edge at all to a crawler. It still records the Origin on
 * press, so the Escape on `/privacy` keeps returning here. The second opens
 * `mailto:`, not a route, and stays a `Button`.
 */
export default function SecurityScreen() {
  const recordOriginFor = useRecordOrigin();
  const { t } = useTranslation("security");
  const sections = t("page.sections", { returnObjects: true }) as PolicySection[];

  // Was this file's own `|| "security@selftend.org"` literal. The fallback rule
  // is unchanged; it just lives in one place now, beside the address it falls
  // back to and the policy copy that publishes the same one (#2131).
  const { securityEmail } = contactEmails();

  return (
    <PolicyPageLayout
      title={t("page.pageTitle")}
      description={t("page.pageDescription")}
      subtitle={t("page.pageDescription")}
    >
      {/*
        The guard stays with the caller, as it does in `InfoScreen`: `t(key, {
        returnObjects: true })` returns a STRING when the key is missing, and the
        key is this screen's to get wrong.
      */}
      {Array.isArray(sections) ? <PolicySectionCards sections={sections} /> : null}

      {/* Link to full Privacy Policy */}
      <LinkButton
        href="/privacy"
        variant="outline"
        className="justify-start"
        onPress={() => recordOriginFor("/privacy")}
      >
        <Icon name="privacy-tip" size={18} />
        <Text className="flex-1">{t("page.privacyPolicyLink")}</Text>
        <Icon name="chevron-right" size={18} className="text-muted-foreground" />
      </LinkButton>

      {/* Security contact */}
      <Button
        variant="outline"
        className="justify-start"
        onPress={() => void Linking.openURL(`mailto:${securityEmail}`)}
      >
        <Icon name="shield" size={18} />
        <Text className="flex-1">{t("page.securityContactLabel")}</Text>
        <Icon name="open-in-new" size={18} className="text-muted-foreground" />
      </Button>
    </PolicyPageLayout>
  );
}
