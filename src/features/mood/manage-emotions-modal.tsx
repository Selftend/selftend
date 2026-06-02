import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import {
  useAddCustomEmotion,
  useRemoveEmotion,
  useReorderEmotions,
  useUpsertEmotionPreference,
} from "@/src/features/mood/emotion-preferences-queries";
import { useEmotionDisplay, type EmotionDisplay } from "@/src/features/mood/use-emotion-display";
import { EmojiPicker } from "@/src/components/app/emoji-picker";
import { useSession } from "@/src/providers/session-provider";

// ─── Editor modal ────────────────────────────────────────────────────────────

type EditorState = { mode: "add" } | { mode: "edit"; emotion: EmotionDisplay };

interface EmotionEditorModalProps {
  state: EditorState;
  /** Position to assign to a newly added custom emotion. */
  addPosition: number;
  onClose: () => void;
}

function EmotionEditorModal({ state, addPosition, onClose }: EmotionEditorModalProps) {
  const { t } = useTranslation("mood");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const upsertEmotion = useUpsertEmotionPreference(userId);
  const addEmotion = useAddCustomEmotion(userId);

  const [name, setName] = useState<string>(() => (state.mode === "edit" ? state.emotion.name : ""));
  const [emoji, setEmoji] = useState<string>(() =>
    state.mode === "edit" ? state.emotion.emoji : "",
  );

  const canSave = name.trim().length > 0 && emoji.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (state.mode === "edit") {
      upsertEmotion.mutate({
        emotionId: state.emotion.id,
        name: name.trim(),
        emoji: emoji.trim(),
      });
    } else {
      addEmotion.mutate({
        emotionId: `custom_${Date.now()}`,
        name: name.trim(),
        emoji: emoji.trim(),
        position: addPosition,
      });
    }
    onClose();
  };

  const title = state.mode === "add" ? t("emotions.manage.addTitle") : t("emotions.manage.edit");

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 p-6" onPress={onClose}>
        {/* Inner card - stops tap-through to backdrop */}
        <Pressable className="w-full max-w-[400px] rounded-2xl bg-card p-4" onPress={() => {}}>
          <Text variant="h3" className="mb-4">
            {title}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              {/* Emoji picker */}
              <View>
                <Text className="mb-2 text-xs text-muted-foreground">
                  {t("emotions.manage.emoji")}
                </Text>
                <EmojiPicker value={emoji} onSelect={setEmoji} />
              </View>

              {/* Name input */}
              <View>
                <Text className="mb-1 text-xs text-muted-foreground">
                  {t("emotions.manage.name")}
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder={t("emotions.manage.namePlaceholder")}
                  accessibilityLabel={t("emotions.manage.name")}
                />
              </View>

              {/* Footer buttons */}
              <View className="flex-row gap-2">
                <Button variant="ghost" onPress={onClose} className="flex-1">
                  <Text>{t("emotions.manage.cancel")}</Text>
                </Button>
                <Button onPress={handleSave} disabled={!canSave} className="flex-1">
                  <Text>
                    {state.mode === "add" ? t("emotions.manage.add") : t("emotions.manage.save")}
                  </Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

interface ManageEmotionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManageEmotionsModal({ visible, onClose }: ManageEmotionsModalProps) {
  const { t } = useTranslation("mood");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const { allEmotions, isLoading } = useEmotionDisplay();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const removeEmotion = useRemoveEmotion(userId);
  const reorderEmotions = useReorderEmotions(userId);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [editorState, setEditorState] = useState<EditorState | null>(null);

  const openEditor = useCallback((emotion: EmotionDisplay) => {
    setEditorState({ mode: "edit", emotion });
  }, []);

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  const renderEmotionRow = useCallback(
    ({ item: emotion }: { item: EmotionDisplay }) => (
      <View className="rounded-xl border border-border bg-card p-3">
        <View className="flex-row items-center gap-3">
          <Sortable.Handle>
            <Icon name="drag-indicator" className="size-5 text-muted-foreground" />
          </Sortable.Handle>
          <Text className="text-2xl">{emotion.emoji}</Text>
          <Text className="flex-1">{emotion.name}</Text>
          <View className="flex-row items-center gap-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("emotions.manage.edit")}
              onPress={() => openEditor(emotion)}
            >
              <Icon name="edit" className="size-5 text-muted-foreground" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("emotions.manage.delete")}
              onPress={() =>
                removeEmotion.mutate({ emotionId: emotion.id, isCustom: emotion.isCustom })
              }
              hitSlop={8}
            >
              <Icon name="delete-outline" className="size-5 text-destructive" />
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [openEditor, removeEmotion, t],
  );

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
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

          <Animated.ScrollView ref={scrollableRef} contentContainerClassName="p-4 gap-2 pb-8">
            {isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator />
              </View>
            ) : (
              <Sortable.Grid
                columns={1}
                data={allEmotions}
                keyExtractor={(e) => e.id}
                rowGap={8}
                scrollableRef={scrollableRef}
                customHandle
                dragActivationDelay={0}
                sortEnabled={editorState === null}
                onDragEnd={({ data }) => reorderEmotions.mutate(data.map((e) => e.id))}
                renderItem={renderEmotionRow}
              />
            )}

            <Button
              variant="outline"
              onPress={() => setEditorState({ mode: "add" })}
              className="mt-2"
            >
              <Icon name="add" className="size-4" />
              <Text>{t("emotions.manage.addButton")}</Text>
            </Button>
          </Animated.ScrollView>
        </View>

        {editorState ? (
          <EmotionEditorModal
            state={editorState}
            addPosition={allEmotions.length}
            onClose={closeEditor}
          />
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}
