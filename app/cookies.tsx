import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { CookiePreferencesCard } from "@/src/components/app/cookie-consent-banner";
import { InfoScreen } from "@/src/features/policies/info-screen";

export default function CookiesScreen() {
  const { t } = useTranslation("policies");

  return (
    <InfoScreen
      sectionKey="cookies.sections"
      showLastUpdated
      subtitle={t("cookies.pageDescription")}
      title={t("cookies.pageTitle")}
    >
      {/* The door for WITHDRAWING consent (#969). The banner returns null once a choice
          is stored, so before this the analytics switch could be reached exactly once,
          on first visit, and never again.

          This page is the natural host: the banner links here, `/legal` links here, and
          the settings row that reads "Cookies" opens it — so every path that mentions
          cookies now ends somewhere the setting can actually be changed.

          Gated at the MOUNT POINT rather than inside the card: a component that renders
          null still occupies its slot, and `InfoScreen` lays its children out in flow —
          a self-hiding child would leave the spacing behind it on native, where there
          are no cookies to consent to at all. */}
      {Platform.OS === "web" ? <CookiePreferencesCard /> : null}
    </InfoScreen>
  );
}
