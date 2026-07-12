import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import type { ChallengeDraft } from "@/src/features/recovery/challenge-draft";

interface ChallengeDraftEditorProps {
  draft: ChallengeDraft;
  onChangeDescription: (value: string) => void;
  onUpdateCoping: (index: number, value: string) => void;
  onAddCoping: () => void;
  onRemoveCoping: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

/** Editor for creating/updating a single challenge plan draft. */
export function ChallengeDraftEditor({
  draft,
  onChangeDescription,
  onUpdateCoping,
  onAddCoping,
  onRemoveCoping,
  onSave,
  onCancel,
  isSaving,
}: ChallengeDraftEditorProps) {
  const { t } = useTranslation("cbt");

  return (
    <View className="gap-4 rounded-md border border-border p-4">
      <View className="gap-2">
        <Label>{t("recovery.challengeDescription")}</Label>
        <Textarea
          accessibilityLabel={t("recovery.challengeDescription")}
          onChangeText={(value) => onChangeDescription(value)}
          placeholder={t("recovery.challengeDescriptionPlaceholder")}
          value={draft.challengeDescription}
        />
      </View>

      <View className="gap-3">
        <Label>{t("recovery.copingSteps")}</Label>
        {draft.copingSteps.map((value, index) => (
          <View key={`coping-${index}`} className="flex-row items-start gap-2">
            <View className="flex-1">
              <Input
                accessibilityLabel={`${t("recovery.copingSteps")} ${index + 1}`}
                onChangeText={(text) => onUpdateCoping(index, text)}
                placeholder={t("recovery.copingStepPlaceholder")}
                value={value}
              />
            </View>
            {draft.copingSteps.length > 1 ? (
              <Button onPress={() => onRemoveCoping(index)} size="sm" variant="ghost">
                <Text>{t("recovery.removeCopingStep")}</Text>
              </Button>
            ) : null}
          </View>
        ))}
        <Button onPress={onAddCoping} size="sm" variant="outline">
          <Text>{t("recovery.addCopingStep")}</Text>
        </Button>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button disabled={isSaving} onPress={() => void onSave()} size="sm">
          {isSaving ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{t("recovery.saveChallenge")}</Text>
        </Button>
        <Button onPress={() => onCancel()} size="sm" variant="ghost">
          <Text>{t("recovery.cancelChallenge")}</Text>
        </Button>
      </View>
    </View>
  );
}
