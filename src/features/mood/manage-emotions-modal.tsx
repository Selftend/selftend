import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";
import Sortable from "react-native-sortables";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { DEFAULT_INTERACTIVE_HIT_SLOP, useReduceMotionEnabled } from "@/src/lib/accessibility";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";
import {
  useAddCustomEmotion,
  useEmotionUsageCounts,
  useRemoveEmotion,
  useReorderEmotions,
  useUpsertEmotionPreference,
} from "@/src/features/mood/emotion-preferences-queries";
import { useEmotionDisplay, type EmotionDisplay } from "@/src/features/mood/use-emotion-display";
import { EmojiPicker } from "@/src/components/app/emoji-picker";
import { useSession } from "@/src/providers/session-provider";

type EditorState = { mode: "add" } | { mode: "edit"; emotion: EmotionDisplay };

// ─── Editor view ─────────────────────────────────────────────────────────────

interface EmotionEditorViewProps {
  state: EditorState;
  /** Position to assign to a newly added custom emotion. */
  addPosition: number;
  /** Lifetime uses of the emotion being edited, or null while the count is loading. */
  uses: number | null;
  onClose: () => void;
}

/**
 * The second view of the same modal (#743, decided on #702).
 *
 * It used to be a `Modal` inside a `Modal`. A nested modal is a second dismiss layer over
 * the first, which on a phone means two back gestures to get out of one task, and on web
 * two stacked focus traps.
 */
function EmotionEditorView({ state, addPosition, uses, onClose }: EmotionEditorViewProps) {
  const { t } = useTranslation("mood");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const upsertEmotion = useUpsertEmotionPreference(userId);
  const addEmotion = useAddCustomEmotion(userId);
  const removeEmotion = useRemoveEmotion(userId);

  const [name, setName] = useState<string>(() => (state.mode === "edit" ? state.emotion.name : ""));
  const [emoji, setEmoji] = useState<string>(() =>
    state.mode === "edit" ? state.emotion.emoji : "",
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const handleDelete = () => {
    if (state.mode !== "edit") return;
    removeEmotion.mutate({ emotionId: state.emotion.id, isCustom: state.emotion.isCustom });
    setConfirmDeleteOpen(false);
    onClose();
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text variant="h3">
          {state.mode === "add" ? t("emotions.manage.addTitle") : t("emotions.manage.edit")}
        </Text>
        <Pressable
          accessibilityLabel={t("emotions.manage.back")}
          accessibilityRole="button"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={onClose}
        >
          <Icon name="close" className="size-6 text-foreground" />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={KEYBOARD_AVOIDING_BEHAVIOR} className="flex-1">
        <AnimatedScrollView contentContainerClassName="p-4 gap-6 pb-8">
          {/* Name first, then the emoji picker - the design's order on `2e`. */}
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("emotions.manage.name")}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-foreground"
              placeholder={t("emotions.manage.namePlaceholder")}
              accessibilityLabel={t("emotions.manage.name")}
            />
          </View>

          <View className="gap-2.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("emotions.manage.emoji")}
            </Text>
            <EmojiPicker value={emoji} onSelect={setEmoji} />
          </View>

          {/* Delete lives here, not on the row. Moving it inside the editor is what takes
              a row from six hit targets down to two, and it puts the destructive action
              behind one deliberate step rather than beside a drag handle. */}
          {state.mode === "edit" ? (
            <View className="border-t border-border pt-4">
              <Button
                variant="ghost"
                onPress={() => setConfirmDeleteOpen(true)}
                className="self-start"
              >
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text className="text-destructive">{t("emotions.manage.delete")}</Text>
              </Button>
            </View>
          ) : null}
        </AnimatedScrollView>
      </KeyboardAvoidingView>

      <View className="flex-row gap-2 border-t border-border p-4">
        <Button variant="ghost" onPress={onClose} className="flex-1">
          <Text>{t("emotions.manage.cancel")}</Text>
        </Button>
        <Button onPress={handleSave} disabled={!canSave} className="flex-1">
          <Text>{state.mode === "add" ? t("emotions.manage.add") : t("emotions.manage.save")}</Text>
        </Button>
      </View>

      <ConfirmDialog
        cancelLabel={t("emotions.manage.cancel")}
        confirmLabel={t("emotions.manage.delete")}
        isPending={false}
        // The count's whole reason for existing: telling someone what they are about to
        // lose. While it is still loading the message falls back to the plain warning
        // rather than claiming a number it does not have.
        message={
          uses === null
            ? t("emotions.manage.confirmDelete.message")
            : t("emotions.manage.confirmDelete.messageWithUses", { count: uses })
        }
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("emotions.manage.confirmDelete.title")}
        visible={confirmDeleteOpen}
      />
    </View>
  );
}

// ─── List view ───────────────────────────────────────────────────────────────

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
  const reorderEmotions = useReorderEmotions(userId);
  const { data: usageCounts } = useEmotionUsageCounts(userId);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [editorState, setEditorState] = useState<EditorState | null>(null);

  const openEditor = useCallback((emotion: EmotionDisplay) => {
    setEditorState({ mode: "edit", emotion });
  }, []);

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  /**
   * Two hit targets, and that is the whole point (#702).
   *
   * The row used to carry a drag handle, an edit button and a delete button. Six targets
   * across a 22-row list did not fit 360dp, and the design's answer - reveal the actions
   * on hover - has no phone equivalent at all. Removing the buttons solves both: the
   * handle stays visible, the row itself opens the editor, and delete moves inside it.
   */
  const renderEmotionRow = useCallback(
    ({ item: emotion }: { item: EmotionDisplay }) => {
      const uses = usageCounts?.[emotion.id];
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("emotions.manage.editEmotion", { name: emotion.name })}
          onPress={() => openEditor(emotion)}
          className="flex-row items-center gap-3.5 border-t border-border px-1.5 py-2.5 active:bg-accent/30"
        >
          <Sortable.Handle>
            <Icon name="drag-indicator" className="size-4 text-muted-foreground opacity-50" />
          </Sortable.Handle>
          <Text className="text-lg leading-none">{emotion.emoji}</Text>
          <Text className="flex-1 text-sm font-medium">{emotion.name}</Text>
          {/* The one signal that aids curation without inviting comparison. A number on
              every row would be a leaderboard of someone's feelings; "unused" only ever
              says "nothing is lost if this goes". */}
          {uses === 0 ? (
            <Text className="text-xs text-muted-foreground">{t("emotions.manage.unused")}</Text>
          ) : null}
        </Pressable>
      );
    },
    [openEditor, t, usageCounts],
  );

  const editingUses =
    editorState?.mode === "edit" ? (usageCounts?.[editorState.emotion.id] ?? null) : null;

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={editorState ? closeEditor : onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {editorState ? (
          <EmotionEditorView
            state={editorState}
            addPosition={allEmotions.length}
            uses={editingUses}
            onClose={closeEditor}
          />
        ) : (
          <View className="flex-1 bg-background">
            <View className="flex-row items-start justify-between gap-6 border-b border-border px-4 py-3">
              <View className="flex-1 gap-1">
                <Text variant="h3">{t("emotions.manage.title")}</Text>
                <Text variant="muted" className="text-[13px]">
                  {t("emotions.manage.tagline")}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("emotions.manage.close")}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              >
                <Icon name="close" className="size-6 text-foreground" />
              </Pressable>
            </View>

            <AnimatedScrollView ref={scrollableRef} contentContainerClassName="p-4 gap-4 pb-8">
              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator />
                </View>
              ) : (
                <View>
                  {/* `Sortable.Grid columns={1}`, explicitly, never `Sortable.Flex`:
                      Flex drops sub-pixel re-measures, so a row can end up one pixel off
                      and never settle. */}
                  <Sortable.Grid
                    columns={1}
                    data={allEmotions}
                    keyExtractor={(e) => e.id}
                    rowGap={0}
                    scrollableRef={scrollableRef}
                    customHandle
                    dragActivationDelay={0}
                    onDragEnd={({ data }) => reorderEmotions.mutate(data.map((e) => e.id))}
                    renderItem={renderEmotionRow}
                  />
                  {/* Closing hairline: the rows are top-ruled, so the last needs a floor. */}
                  <View className="border-t border-border" />
                </View>
              )}

              <Button
                variant="outline"
                onPress={() => setEditorState({ mode: "add" })}
                className="self-start border-dashed"
              >
                <Icon name="add" className="size-4" />
                <Text>{t("emotions.manage.addButton")}</Text>
              </Button>
            </AnimatedScrollView>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}
