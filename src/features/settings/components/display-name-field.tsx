import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";

interface DisplayNameFieldProps {
  value: string;
  setValue: (value: string) => void;
  save: () => void;
  isPending: boolean;
  message: string;
  error: string;
}

/**
 * Display-name input + save button + messages. Revealed by the `Edit name`
 * disclosure in `SettingsProfileBlock`; state wiring comes from `useDisplayName`.
 */
export function DisplayNameField({
  value,
  setValue,
  save,
  isPending,
  message,
  error,
}: DisplayNameFieldProps) {
  const { t } = useTranslation("settings");

  return (
    <View>
      <Label className="mb-1.5 text-sm font-semibold">{t("profile.displayNameLabel")}</Label>
      <View className="flex-row gap-2 mt-1.5">
        <Input
          accessibilityLabel={t("profile.displayNameLabel")}
          className="flex-1"
          value={value}
          onChangeText={setValue}
          placeholder={t("profile.namePlaceholder")}
          maxLength={100}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Button disabled={isPending} onPress={save}>
          {isPending ? <ActivityIndicator /> : null}
          <Text>{isPending ? t("profile.savingName") : t("profile.saveName")}</Text>
        </Button>
      </View>
      {message ? <Text className="mt-1.5 text-sm text-muted-foreground">{message}</Text> : null}
      {error ? <Text className="mt-1.5 text-sm text-destructive">{error}</Text> : null}
    </View>
  );
}
