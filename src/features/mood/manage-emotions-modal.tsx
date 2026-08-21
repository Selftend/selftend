import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";
import Sortable from "react-native-sortables";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { cn } from "@/lib/utils";
import { NARROW_STEP_INDICATOR_BREAKPOINT } from "@/src/constants/layout";
import { FORM_COLUMN } from "@/src/lib/layout";
import { DEFAULT_INTERACTIVE_HIT_SLOP, reorderMoveProps } from "@/src/lib/accessibility";
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

/**
 * How every write on this surface reports itself (#1335, spec §10).
 *
 * ☠️ Not a toast, and it cannot become one. This modal is an opaque `pageSheet` that
 * stays OPEN across all four writes, and on Android there is no mechanism that lifts a
 * toast over a native modal: `FullWindowOverlay` is iOS-only, and giving the toast its
 * own Android `Modal` would block every touch below it, which the inert-body rule
 * disqualifies. The mutations opt out of the global toast for the same reason.
 *
 * ⚠️ Both callbacks resolve to state on the LIST view, never on the editor, and that is
 * structural. The editor fires its write and closes itself in the same handler, so it is
 * already unmounted by the time any of these fail. MEASURED: a mutate-level `onError`
 * still runs after its caller unmounts, which is what lets the editor's failures land on
 * the list that outlived it.
 */
interface WriteReporter {
  /** Clears the previous failure, so a retry never shows a stale one. */
  onStart: () => void;
  /** Raises this write's failure where the surface can actually show it. */
  onError: () => void;
}

/**
 * On web the surface lives in a self-styled panel that hugs its content (#905, design
 * 2E), so every level between the panel and the scroll view must be allowed to shrink:
 * `flex-1` has flex-basis 0 and would collapse to nothing inside a content-sized panel,
 * while the default `shrink-0` would let long content push the footer off screen.
 * Native keeps `flex-1` — there the modal is a full sheet with a definite height.
 */
const VIEW_SIZING = Platform.select({ web: "min-h-0 shrink", default: "flex-1" });

/** The panel paints `popover` (the elevated surface, per 2E); the native sheet stays
    `background`. */
const VIEW_SURFACE = Platform.select({ web: "bg-popover", default: "bg-background" });

// ─── Editor view ─────────────────────────────────────────────────────────────

interface EmotionEditorViewProps {
  state: EditorState;
  /** Position to assign to a newly added custom emotion. */
  addPosition: number;
  /** Lifetime uses of the emotion being edited, or null while the count is loading. */
  uses: number | null;
  /** Raises this view's failures to the list, which outlives its own unmount. */
  write: WriteReporter;
  onClose: () => void;
}

/**
 * The second view of the same modal (#743, decided on #702).
 *
 * It used to be a `Modal` inside a `Modal`. A nested modal is a second dismiss layer over
 * the first, which on a phone means two back gestures to get out of one task, and on web
 * two stacked focus traps.
 */
function EmotionEditorView({ state, addPosition, uses, write, onClose }: EmotionEditorViewProps) {
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

  // ⚠️ Every `mutate` below carries `write.onError` and closes this view straight after,
  // optimistically. The failure therefore surfaces on the list, not here - see
  // `WriteReporter`, and do not "fix" it by keeping the editor open: the write is
  // optimistic, so the change is already on screen behind it.
  const handleSave = () => {
    if (!canSave) return;
    write.onStart();
    if (state.mode === "edit") {
      upsertEmotion.mutate(
        {
          emotionId: state.emotion.id,
          name: name.trim(),
          emoji: emoji.trim(),
        },
        { onError: write.onError },
      );
    } else {
      addEmotion.mutate(
        {
          emotionId: `custom_${Date.now()}`,
          name: name.trim(),
          emoji: emoji.trim(),
          position: addPosition,
        },
        { onError: write.onError },
      );
    }
    onClose();
  };

  const handleDelete = () => {
    if (state.mode !== "edit") return;
    write.onStart();
    removeEmotion.mutate(
      { emotionId: state.emotion.id, isCustom: state.emotion.isCustom },
      { onError: write.onError },
    );
    setConfirmDeleteOpen(false);
    onClose();
  };

  return (
    <View className={cn(VIEW_SIZING, VIEW_SURFACE)}>
      {/* Same form column as the list view (#872): the hairlines span the
          sheet, the content does not. */}
      <View className="border-b border-border px-4 py-3">
        <View className={cn(FORM_COLUMN, "flex-row items-center justify-between")}>
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
      </View>

      <KeyboardAvoidingView behavior={KEYBOARD_AVOIDING_BEHAVIOR} className={VIEW_SIZING}>
        <AnimatedScrollView contentContainerClassName="p-4 pb-8">
          <View className={cn(FORM_COLUMN, "gap-6")}>
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
          </View>
        </AnimatedScrollView>
      </KeyboardAvoidingView>

      <View className="border-t border-border p-4">
        <View className={cn(FORM_COLUMN, "flex-row gap-2")}>
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

// ─── Reorder handle ──────────────────────────────────────────────────────────

interface EmotionReorderHandleProps {
  emotion: EmotionDisplay;
  /**
   * Structural only, and list-level rather than row-level: false when the list is too
   * short to reorder at all. Never "a write is in flight" (see `reorderMoveProps`). The
   * first and last rows therefore still offer both moves, one of which no-ops - the same
   * shape `arrange-screen` ships, and preferable to a handle whose action set changes as
   * rows move past it.
   */
  canMove: boolean;
  onMove: (offset: -1 | 1) => void;
}

/**
 * The drag handle, and the non-drag path with it (#965).
 *
 * Order is the whole point of this surface - it decides the picker's arrangement - and
 * a drag was the only way to change it, which fails WCAG 2.2 SC 2.5.7 (Dragging
 * Movements, AA). The same two moves home's arrange row carries now ride here too: named
 * `accessibilityActions` for screen readers, Up/Down keys for keyboard.
 *
 * Stated honestly: this closes the screen-reader and keyboard cases. A pointer-only user
 * with no keyboard still has drag alone, so it remains a PARTIAL answer to SC 2.5.7.
 *
 * The two moves come from `reorderMoveProps`, which carries both halves and the ☠️ warning
 * about what `canMove` may and may not mean; the in-flight guard lives in `moveEmotion`.
 * `accessible` is set here rather than there, because only the call site knows this is a
 * leaf and not a group wrapper that would collapse its children into one node.
 *
 * The row deliberately does NOT grow the arrange screen's `size-9` pill: six hit targets
 * across a 22-row list is what #702 removed from here, and per-row chrome is what it cost
 * to fit 360dp. The web focus ring is the affordance instead - it costs no width and only
 * paints while the handle is focused.
 */
function EmotionReorderHandle({ emotion, canMove, onMove }: EmotionReorderHandleProps) {
  const { t } = useTranslation("mood");

  return (
    <Sortable.Handle>
      <View
        accessible
        accessibilityLabel={t("emotions.manage.reorderEmotion", { name: emotion.name })}
        // ⚠️ The hint names no keys, deliberately. react-native-web does not implement
        // `accessibilityHint` at all, so this string reaches ONLY native AT - where
        // VoiceOver and TalkBack drive the rotor actions and there are no arrow keys to
        // press. It states the outcome, which is true on both platforms.
        //
        // Withheld on a lone list, where `reorderMoveProps` withholds every move: a hint is
        // read AFTER the label, and an outcome nothing can produce is worse there than
        // silence, since native AT is the one listener that hears it at all (#1049).
        accessibilityHint={canMove ? t("emotions.manage.reorderHint") : undefined}
        {...reorderMoveProps({
          canMove,
          earlierLabel: t("emotions.manage.moveEarlier", { name: emotion.name }),
          laterLabel: t("emotions.manage.moveLater", { name: emotion.name }),
          onMove,
        })}
        testID={`emotion-reorder-handle-${emotion.id}`}
        className={cn(
          "rounded-md py-2.5",
          !canMove && "opacity-40",
          Platform.select({ web: "focus-visible:ring-[3px] focus-visible:ring-ring/50" }),
        )}
      >
        <Icon name="drag-indicator" className="size-4 text-muted-foreground opacity-50" />
      </View>
    </Sortable.Handle>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

interface ManageEmotionsShellProps {
  isDesktopWeb: boolean;
  isWeb: boolean;
  /** The editor-aware close the Modal's own `onRequestClose` uses. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * The presentation fork (#905). Native renders the children straight into the Modal's
 * sheet. Web wraps them in a self-styled panel over a pressable scrim — a centered card
 * at desktop widths (design 2E), a bottom drawer with a grab handle below the
 * breakpoint. `GestureHandlerRootView` sits inside either way: RN `Modal` hosts a
 * separate native container, so Sortable's gestures need their own root here.
 */
function ManageEmotionsShell({ isDesktopWeb, isWeb, onClose, children }: ManageEmotionsShellProps) {
  const inner = (
    // The same shrink-not-flex reasoning as VIEW_SIZING; gesture-handler's root takes
    // a style object, not a className.
    <GestureHandlerRootView style={isWeb ? { flexShrink: 1, minHeight: 0 } : { flex: 1 }}>
      {children}
    </GestureHandlerRootView>
  );

  if (!isWeb) return inner;

  return (
    <View
      className={cn(
        "flex-1",
        isDesktopWeb ? "items-center justify-center p-6" : "justify-end pt-12",
      )}
    >
      {/* Kept out of the tab order: keyboard users dismiss with Escape or the panel's
          own close button; the scrim is a pointer affordance. */}
      <Pressable
        className="absolute inset-0 bg-black/50"
        focusable={false}
        onPress={onClose}
        testID="manage-emotions-backdrop"
      />
      <View
        className={cn(
          "min-h-0 w-full shrink overflow-hidden bg-popover",
          isDesktopWeb
            ? "max-w-[460px] rounded-[14px] border border-border shadow-lg"
            : "rounded-t-[20px] border-t border-border",
        )}
      >
        {isDesktopWeb ? null : (
          <View className="items-center pt-3">
            <View className="h-1 w-[38px] rounded-full bg-muted-foreground/35" />
          </View>
        )}
        {inner}
      </View>
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
  const { allEmotions, isLoading } = useEmotionDisplay();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const reorderEmotions = useReorderEmotions(userId);
  // Gated on `visible`: the check-in editor mounts this modal unconditionally and merely
  // hides it, so an ungated query would run the lifetime aggregate on every create and
  // edit screen for a number only this modal shows.
  const { data: usageCounts } = useEmotionUsageCounts(userId, visible);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The one place a failed write on this surface can be seen at all - see `WriteReporter`
  // for why it is here and not a toast, and why it is the list rather than the editor.
  const write = useMemo<WriteReporter>(
    () => ({
      onStart: () => setErrorMessage(null),
      onError: () => setErrorMessage(t("emotions.manage.saveError")),
    }),
    [t],
  );

  const openEditor = useCallback((emotion: EmotionDisplay) => {
    setEditorState({ mode: "edit", emotion });
  }, []);

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  /**
   * The non-drag half of reordering: swap with the neighbour and write the whole order,
   * exactly what `onDragEnd` writes.
   *
   * ⚠️ Refused while a write is in flight, and that guard is not decorative.
   * `setEmotionOrder` writes the WHOLE order as one upsert per row, so two of them racing
   * are resolved per row by arrival time - the later press can be overwritten by the
   * earlier one's rows and the list settles on an order the user never asked for. The
   * mutation is optimistic, so the row has already moved on screen and a refused press
   * costs a press, not a wrong order. This guard must never reach `canMove` - see
   * `EmotionReorderHandle`.
   */
  const moveEmotion = useCallback(
    (emotionId: string, offset: -1 | 1) => {
      if (reorderEmotions.isPending) return;
      const ids = allEmotions.map((e) => e.id);
      const currentIndex = ids.indexOf(emotionId);
      const nextIndex = currentIndex + offset;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
      [ids[currentIndex], ids[nextIndex]] = [ids[nextIndex], ids[currentIndex]];
      write.onStart();
      reorderEmotions.mutate(ids, { onError: write.onError });
    },
    [allEmotions, reorderEmotions, write],
  );

  /**
   * Two hit targets, and that is the whole point (#702).
   *
   * The row used to carry a drag handle, an edit button and a delete button. Six targets
   * across a 22-row list did not fit 360dp, and the design's answer - reveal the actions
   * on hover - has no phone equivalent at all. Removing the buttons solves both: the
   * handle stays visible, the row itself opens the editor, and delete moves inside it.
   *
   * The handle sits BESIDE the press target, never inside it (#915): on web,
   * gesture-handler's pan does not cancel an enclosing Pressable the way native gesture
   * arbitration does, and the dragged row travels with the cursor, so a drag that starts
   * on a handle inside the Pressable also fires the row press on release. That still holds
   * now the handle is interactive (#965) - if anything more so, since a focusable control
   * nested in a Pressable is also a second announcement of the same row.
   */
  const renderEmotionRow = useCallback(
    ({ item: emotion }: { item: EmotionDisplay }) => {
      return (
        <View className="flex-row items-center gap-3.5 border-t border-border px-1.5">
          <EmotionReorderHandle
            emotion={emotion}
            canMove={allEmotions.length > 1}
            onMove={(offset) => moveEmotion(emotion.id, offset)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("emotions.manage.editEmotion", { name: emotion.name })}
            onPress={() => openEditor(emotion)}
            className="flex-1 flex-row items-center gap-3.5 py-2.5 active:bg-accent/30"
          >
            <Text className="text-lg leading-none">{emotion.emoji}</Text>
            <Text className="flex-1 text-sm font-medium">{emotion.name}</Text>
            {/* No usage signal on the row — not even "unused" (#903 reversed #702's tag).
                The lifetime count surfaces only inside the delete confirmation. */}
          </Pressable>
        </View>
      );
    },
    [allEmotions.length, moveEmotion, openEditor, t],
  );

  // ⚠️ The RPC returns no row for an emotion with no uses, so a missing key means zero —
  // but only once the query has loaded. `null` before then is "unknown", and the delete
  // confirmation falls back to its plain wording rather than claiming a count.
  const editingUses =
    editorState?.mode === "edit" && usageCounts ? (usageCounts[editorState.emotion.id] ?? 0) : null;

  // Web re-houses the surface per design 2E (#905): react-native-web's Modal never reads
  // `presentationStyle` and paints full-viewport, so the web shell goes `transparent` and
  // styles its own panel — a centered card at desktop widths, a bottom drawer below the
  // breakpoint. Native is untouched: `pageSheet` on iOS is already a real native sheet,
  // and `transparent` would force it to `overFullScreen` and destroy it (#904) — the two
  // presentations are mutually exclusive, so this fork must stay per-platform.
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= NARROW_STEP_INDICATOR_BREAKPOINT;

  // The backdrop and the web Escape handler dismiss exactly like the native back
  // gesture: the editor peels first, the surface itself only closes from the list (#743).
  const handleRequestClose = editorState ? closeEditor : onClose;

  return (
    // PressShieldModal owns the #1054 web-unmount gate, and only its own
    // render is gated — `editorState` and the rest of this component's state
    // survive a close on both platforms, exactly as with the per-site gate
    // this surface used to carry (it is the most focus-sensitive of the
    // #1054 sweep: its rows carry a keyboard reorder path, #965/#1046).
    <PressShieldModal
      animation={isDesktopWeb ? "fade" : "slide"}
      onRequestClose={handleRequestClose}
      presentationStyle={isWeb ? undefined : "pageSheet"}
      // Neither platform presents this full-screen — `pageSheet` on native, a
      // card or drawer over its own backdrop on web — and it already pins its
      // X above the scroller on both, which is the shape the modal rule names
      // as the one to copy (#1165). So it declines the wrapper's row rather
      // than growing a second header above its own (#1252).
      surface="sheet"
      transparent={isWeb}
      visible={visible}
    >
      <ManageEmotionsShell isDesktopWeb={isDesktopWeb} isWeb={isWeb} onClose={handleRequestClose}>
        {editorState ? (
          <EmotionEditorView
            state={editorState}
            addPosition={allEmotions.length}
            uses={editingUses}
            write={write}
            onClose={closeEditor}
          />
        ) : (
          <View className={cn(VIEW_SIZING, VIEW_SURFACE)}>
            {/* The hairline spans the sheet, but the header content and the
                rows below sit on the 620px form column (#872, decided on #690:
                widths ride with the shell — this surface is 2d's form screen). */}
            <View className="border-b border-border px-4 py-3">
              <View className={cn(FORM_COLUMN, "flex-row items-start justify-between gap-6")}>
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
            </View>

            {/* Pinned between the header and the scroller, never inside it: a failure
                reported from a list scrolled halfway down would otherwise be raised
                somewhere the user is not looking. */}
            {errorMessage ? (
              <View className="border-b border-border px-4 py-3">
                <View className={FORM_COLUMN}>
                  <Text className="text-sm text-destructive" role="alert">
                    {errorMessage}
                  </Text>
                </View>
              </View>
            ) : null}

            <AnimatedScrollView ref={scrollableRef} contentContainerClassName="p-4 pb-8">
              <View className={cn(FORM_COLUMN, "gap-4")}>
                {isLoading ? (
                  <View className="items-center py-8">
                    <ActivityIndicator />
                  </View>
                ) : (
                  <View>
                    {/* `Sortable.Grid columns={1}`, explicitly, never `Sortable.Flex`:
                        Flex drops sub-pixel re-measures, so a row can end up one pixel off
                        and never settle.

                        ☠️ There is deliberately NO `sortEnabled={!reorderEmotions.isPending}`
                        here, though `arrange-screen` carries the equivalent and a reviewer
                        will suggest it. MEASURED, not reasoned: adding it makes the second
                        keyboard move stop writing - `manage-emotions-reorder.e2e` fails on
                        exactly the "and AGAIN, without re-focusing" press, and passes with
                        the prop removed and nothing else changed. Binding `sortEnabled` to a
                        flag that flips on every write re-renders the grid mid-move, and the
                        handle element Sortable is holding goes stale (the same family as the
                        stale-prop duplicate #975 hit). Jest cannot see any of this: the
                        Sortable mock renders each row exactly once.

                        The window this leaves open is a DRAG that lands while a keyboard
                        write is settling. That is worth strictly less than the keyboard path
                        working at all, and the keyboard guard in `moveEmotion` stays. */}
                    <Sortable.Grid
                      columns={1}
                      data={allEmotions}
                      keyExtractor={(e) => e.id}
                      rowGap={0}
                      scrollableRef={scrollableRef}
                      customHandle
                      dragActivationDelay={0}
                      onDragEnd={({ data }) => {
                        write.onStart();
                        reorderEmotions.mutate(
                          data.map((e) => e.id),
                          { onError: write.onError },
                        );
                      }}
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
              </View>
            </AnimatedScrollView>
          </View>
        )}
      </ManageEmotionsShell>
    </PressShieldModal>
  );
}
