import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { cn } from "@/lib/utils";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { useEmotionsStore } from "@/src/stores/emotions-store";
import { useEmotionDisplay, type EmotionDisplay } from "@/src/features/mood/use-emotion-display";

interface ManageEmotionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManageEmotionsModal({ visible, onClose }: ManageEmotionsModalProps) {
  const { t } = useTranslation("mood");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const { allEmotions } = useEmotionDisplay();
  const addEmotion = useEmotionsStore((s) => s.addEmotion);
  const updateCustomEmotion = useEmotionsStore((s) => s.updateCustomEmotion);
  const removeCustomEmotion = useEmotionsStore((s) => s.removeCustomEmotion);
  const setEmojiOverride = useEmotionsStore((s) => s.setEmojiOverride);

  const [editing, setEditing] = useState<EmotionDisplay | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");

  const openEdit = (emotion: EmotionDisplay) => {
    setEditing(emotion);
    setEditName(emotion.name);
    setEditEmoji(emotion.emoji);
    setAddMode(false);
  };

  const saveEdit = () => {
    if (!editing) return;
    if (editing.isCustom) {
      updateCustomEmotion(editing.id, { name: editName.trim(), emoji: editEmoji.trim() });
    } else {
      if (
        editEmoji.trim() &&
        editEmoji.trim() !== DEFAULT_EMOTIONS.find((e) => e.id === editing.id)?.emoji
      ) {
        setEmojiOverride(editing.id, editEmoji.trim());
      }
    }
    setEditing(null);
  };

  const saveNew = () => {
    const name = newName.trim();
    const emoji = newEmoji.trim();
    if (!name || !emoji) return;
    const id = `custom_${Date.now()}`;
    addEmotion({ id, name, emoji });
    setNewName("");
    setNewEmoji("");
    setAddMode(false);
  };

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text variant="h3">{t("emotions.manage.title")}</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("emotions.manage.close")}
          >
            <Icon name="close" className="size-6 text-foreground" />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="p-4 gap-2 pb-8">
          {allEmotions.map((emotion) => {
            const isEditing = editing?.id === emotion.id;
            return (
              <View
                key={emotion.id}
                className={cn(
                  "rounded-xl border border-border bg-card p-3",
                  isEditing && "border-primary",
                )}
              >
                {isEditing ? (
                  <View className="gap-3">
                    <View className="flex-row gap-2">
                      <View className="w-20">
                        <Text className="mb-1 text-xs text-muted-foreground">
                          {t("emotions.manage.emoji")}
                        </Text>
                        <TextInput
                          value={editEmoji}
                          onChangeText={setEditEmoji}
                          className="rounded-lg border border-border bg-background px-2 py-2 text-center text-2xl text-foreground"
                          maxLength={2}
                          accessibilityLabel={t("emotions.manage.emoji")}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="mb-1 text-xs text-muted-foreground">
                          {t("emotions.manage.name")}
                        </Text>
                        <TextInput
                          value={editName}
                          onChangeText={setEditName}
                          editable={emotion.isCustom}
                          className={cn(
                            "rounded-lg border border-border bg-background px-3 py-2 text-foreground",
                            !emotion.isCustom && "opacity-50",
                          )}
                          placeholder={t("emotions.manage.namePlaceholder")}
                          accessibilityLabel={t("emotions.manage.name")}
                        />
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <Button variant="ghost" onPress={() => setEditing(null)} className="flex-1">
                        <Text>{t("emotions.manage.cancel")}</Text>
                      </Button>
                      <Button onPress={saveEdit} className="flex-1">
                        <Text>{t("emotions.manage.save")}</Text>
                      </Button>
                    </View>
                    {emotion.isCustom ? (
                      <Button
                        variant="ghost"
                        onPress={() => {
                          removeCustomEmotion(emotion.id);
                          setEditing(null);
                        }}
                      >
                        <Icon name="delete-outline" className="size-4 text-destructive" />
                        <Text className="text-destructive">{t("emotions.manage.delete")}</Text>
                      </Button>
                    ) : null}
                  </View>
                ) : (
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">{emotion.emoji}</Text>
                    <Text className="flex-1">{emotion.name}</Text>
                    {emotion.isCustom ? (
                      <View className="rounded-full border border-border px-2 py-0.5">
                        <Text className="text-[10px] text-muted-foreground">
                          {t("emotions.manage.custom")}
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => openEdit(emotion)}
                      accessibilityRole="button"
                      accessibilityLabel={t("emotions.manage.edit")}
                    >
                      <Icon name="edit" className="size-5 text-muted-foreground" />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {addMode ? (
            <View className="mt-2 rounded-xl border border-primary bg-card p-3 gap-3">
              <Text className="font-semibold">{t("emotions.manage.addTitle")}</Text>
              <View className="flex-row gap-2">
                <View className="w-20">
                  <Text className="mb-1 text-xs text-muted-foreground">
                    {t("emotions.manage.emoji")}
                  </Text>
                  <TextInput
                    value={newEmoji}
                    onChangeText={setNewEmoji}
                    className="rounded-lg border border-border bg-background px-2 py-2 text-center text-2xl text-foreground"
                    maxLength={2}
                    placeholder="😀"
                    accessibilityLabel={t("emotions.manage.emoji")}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-muted-foreground">
                    {t("emotions.manage.name")}
                  </Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    placeholder={t("emotions.manage.namePlaceholder")}
                    accessibilityLabel={t("emotions.manage.name")}
                  />
                </View>
              </View>
              <View className="flex-row gap-2">
                <Button
                  variant="ghost"
                  onPress={() => {
                    setAddMode(false);
                    setNewName("");
                    setNewEmoji("");
                  }}
                  className="flex-1"
                >
                  <Text>{t("emotions.manage.cancel")}</Text>
                </Button>
                <Button
                  onPress={saveNew}
                  disabled={!newName.trim() || !newEmoji.trim()}
                  className="flex-1"
                >
                  <Text>{t("emotions.manage.add")}</Text>
                </Button>
              </View>
            </View>
          ) : (
            <Button
              variant="outline"
              onPress={() => {
                setAddMode(true);
                setEditing(null);
              }}
              className="mt-2"
            >
              <Icon name="add" className="size-4" />
              <Text>{t("emotions.manage.addButton")}</Text>
            </Button>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
