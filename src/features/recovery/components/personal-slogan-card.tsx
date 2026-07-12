import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import type { RecoveryPlanFormSchema } from "@/src/features/recovery/schemas";

interface PersonalSloganCardProps {
  control: Control<RecoveryPlanFormSchema>;
}

/** Free-text personal recovery slogan, bound to the form. */
export function PersonalSloganCard({ control }: PersonalSloganCardProps) {
  const { t } = useTranslation("cbt");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recovery.personalSlogan")}</CardTitle>
        <CardDescription>{t("recovery.personalSloganHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Controller
          control={control}
          name="personalSlogan"
          render={({ field: { onBlur, onChange, value } }) => (
            <Textarea
              accessibilityLabel={t("recovery.personalSlogan")}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={t("recovery.personalSloganPlaceholder")}
              value={value}
            />
          )}
        />
      </CardContent>
    </Card>
  );
}
