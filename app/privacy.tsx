import { useTranslation } from "react-i18next";

import { LinkButton } from "@/src/components/app/link-button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { InfoScreen } from "@/src/features/policies/info-screen";
import { LEGAL_REVIEW_PENDING } from "@/src/features/policies/policy-content";
import { useRecordOrigin } from "@/src/lib/escape-origin";

/**
 * The two cross-links are ANCHORS, not buttons (#2476). A `Button` with a press
 * handler navigates for a mouse and is no edge at all for a crawler: `/security`
 * and `/account-deletion` were the site's two orphan pages for exactly that
 * reason, and the Health Score sat at 88 on them (`docs/search-operations.md`
 * § 3 and § 9 item 2). `LinkButton` renders react-native-web's real `<a href>`
 * with `role="link"`, the way the landing footer's links do.
 *
 * The Origin the old button recorded (#1267, clause O3) is kept on the anchor:
 * the Escape on the destination returns here rather than jumping Up to Home.
 * `useRecordOrigin` says why the record is safe beside a Link's own handler;
 * `policy-origin.test.tsx` pins the store and `privacy-cross-links.test.tsx`
 * pins the hrefs.
 *
 * No new copy: the security link keeps its string, and the deletion link reuses
 * the label the gated legal screen already gives the same destination - which
 * lives in the `settings` namespace, hence the namespaced key.
 */
export default function PrivacyScreen() {
  const recordOriginFor = useRecordOrigin();
  const { t } = useTranslation("policies");

  return (
    <InfoScreen
      notice={LEGAL_REVIEW_PENDING ? t("privacy.reviewBanner") : undefined}
      sectionKey="privacy.sections"
      showLastUpdated
      subtitle={t("privacy.pageDescription")}
      title={t("privacy.pageTitle")}
    >
      <LinkButton
        href="/security"
        variant="outline"
        className="justify-start"
        onPress={() => recordOriginFor("/security")}
      >
        <Icon name="shield" size={18} />
        <Text className="flex-1">{t("privacy.openSecurity")}</Text>
        <Icon name="chevron-right" size={18} className="text-muted-foreground" />
      </LinkButton>
      <LinkButton
        href="/account-deletion"
        variant="outline"
        className="justify-start"
        onPress={() => recordOriginFor("/account-deletion")}
      >
        <Icon name="person-remove" size={18} />
        <Text className="flex-1">{t("settings:legal.openDeletion")}</Text>
        <Icon name="chevron-right" size={18} className="text-muted-foreground" />
      </LinkButton>
    </InfoScreen>
  );
}
