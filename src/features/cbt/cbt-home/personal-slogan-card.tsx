import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";

interface PersonalSloganCardProps {
  slogan: string;
}

export function PersonalSloganCard({ slogan }: PersonalSloganCardProps) {
  const { t } = useTranslation("cbt");

  if (!slogan) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.sloganTitle")}</CardTitle>
        <CardDescription className="italic">{`"${slogan}"`}</CardDescription>
      </CardHeader>
    </Card>
  );
}
