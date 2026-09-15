import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { distortionDefinitions } from "@/src/constants/distortions";

/**
 * PROTOTYPE (#2404, never merged as is).
 *
 * The one source of the "Thinking patterns" explainer, read by two renderers:
 * the gated learn screen (`app/(app)/modules/cbt/learn.tsx`) and the public
 * page (`app/cbt.tsx`). #2403 ruled the content lives in BOTH places and must
 * share one source so the two cannot drift; this is that source.
 *
 * Deliberately chrome-free: no header, no escape, no scroll view, no head. Each
 * renderer supplies its own chrome, so the body never has to know which
 * audience it is rendering for - which is how the two-audiences trap the ticket
 * warns about (a component serving both through a defaulted prop) is avoided
 * without a prop at all. If the two renderers ever need the body to differ,
 * the difference is a REQUIRED prop here, never a default.
 *
 * The cards are byte-for-byte what the learn screen rendered before the move.
 * `CardTitle` keeps its default level (3) in both places; see the findings file
 * for what that does to the public page's outline.
 */
export function ThinkingPatternsBody() {
  const { t } = useTranslation("cbt");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("learn.useGently")}</CardTitle>
          <CardDescription>{t("learn.useGentlyDescription")}</CardDescription>
        </CardHeader>
      </Card>

      {/*
       * Pace and mode, in the framework's voice: the one place the over-use
       * answer is taught, static by ruling, with the professional door as the
       * last sentence and nothing behind it. Why static, and why here:
       * ADR-0004 § "The over-use obligation" (#1659 → #1671).
       */}
      <Card>
        <CardHeader>
          <CardTitle>{t("learn.pacing.title")}</CardTitle>
          <CardDescription>{t("learn.pacing.rhythm")}</CardDescription>
          <CardDescription>{t("learn.pacing.mode")}</CardDescription>
          <CardDescription>{t("learn.pacing.signs")}</CardDescription>
        </CardHeader>
      </Card>

      {distortionDefinitions.map((distortion) => (
        <Card key={distortion.key}>
          <CardHeader>
            <CardTitle>{t(`distortions.${distortion.key}.title`)}</CardTitle>
            <CardDescription>
              {t(`distortions.${distortion.key}.shortDescription`)}{" "}
              {t(`distortions.${distortion.key}.reflectionPrompt`)}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </>
  );
}
