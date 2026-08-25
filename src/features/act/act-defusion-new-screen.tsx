import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import type { TextInput } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { ProgressSegments } from "@/src/components/app/progress-segments";
import { useSaveDefusionLog } from "@/src/features/act/queries";
import {
  DEFUSION_TECHNIQUES,
  THOUGHT_CATEGORIES,
  type DefusionTechnique,
  type ThoughtCategory,
} from "@/src/features/act/types";
import { announceMessage, politeLiveRegionProps } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import {
  type ActDefusionLogDraft,
  useActDefusionLogDraftStore,
} from "@/src/stores/act-defusion-log-draft-store";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

/**
 * The five parts of the column, in the order they appear down the page. They are
 * PARTS, not steps: nothing here has to be done before anything else, and the
 * rail names them rather than counting them (#1380).
 */
const DEFUSION_PARTS = ["thought", "category", "before", "technique", "after"] as const;
type DefusionPart = (typeof DEFUSION_PARTS)[number];

/**
 * ☠️ The category and the technique start NULL, not at their column defaults.
 * `thought_category` and `technique_used` are both NOT NULL and the insert
 * trigger coalesces a null back to `other` / `havingTheThoughtThat` - so a form
 * that carried those defaults in its own state could not tell an answer from a
 * default, and the rail would light two of five segments before anything was
 * typed. The coalescing happens once, at save, where it belongs.
 */
const EMPTY_DRAFT: ActDefusionLogDraft = {
  fusedThought: "",
  thoughtCategory: null,
  fusionLevelBefore: null,
  techniqueUsed: null,
  defusedVersion: "",
  fusionLevelAfter: null,
  notes: "",
};

/** What the insert trigger would coalesce a null to; applied here so the saved row says it once. */
const CATEGORY_WHEN_UNANSWERED: ThoughtCategory = "other";
const TECHNIQUE_WHEN_UNANSWERED: DefusionTechnique = "havingTheThoughtThat";

/**
 * Which parts hold something the user put there.
 *
 * ☠️ Per part, never a prefix. A prefix count ("the furthest part reached")
 * lies the moment the form is filled out of order - which is the whole point of
 * a column - and it would report a form with only the last part filled as
 * finished. Each part answers for itself and nothing else.
 */
function filledParts(draft: ActDefusionLogDraft): Record<DefusionPart, boolean> {
  return {
    thought: draft.fusedThought.trim().length > 0,
    category: draft.thoughtCategory !== null,
    before: draft.fusionLevelBefore !== null,
    technique: draft.techniqueUsed !== null,
    // The last part carries three fields; any one of them counts.
    after:
      draft.defusedVersion.trim().length > 0 ||
      draft.fusionLevelAfter !== null ||
      draft.notes.trim().length > 0,
  };
}

/**
 * Defuse a thought, as ONE SCROLLING COLUMN.
 *
 * This screen used to be a five-step pill flow that hid how much was left and
 * refused to move until the current step was answered. It is now a column with
 * a sticky, read-only rail that NAMES its parts: a user can see the whole of
 * what is being asked before answering any of it, answer the last part first if
 * that is what they have words for, and save part-way (#1380).
 *
 * Nothing here is gated. The one piece of validation left - the thought itself -
 * runs at save and says so, rather than disabling a button with no explanation.
 *
 * ⚠️ The category chips and technique cards stay hand-rolled radiogroups on
 * `useRovingFocus`. The shared selectable chip hardcodes a checkbox role, has no
 * roving focus, no radio pair and a toggle-shaped handler, and all three of its
 * consumers are multi-select - moving these onto it would be an accessibility
 * regression, not a de-duplication.
 */
export default function ActDefusionNewScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveDefusionLog(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const draft = useActDefusionLogDraftStore((state) => state.values) ?? EMPTY_DRAFT;
  const hydrateDraft = useActDefusionLogDraftStore((state) => state.hydrate);
  const resetDraft = useActDefusionLogDraftStore((state) => state.reset);
  const setDraftValues = useActDefusionLogDraftStore((state) => state.setValues);

  const [submitError, setSubmitError] = useState("");
  const [thoughtError, setThoughtError] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  // The picker opens on the seven techniques and collapses onto the chosen one.
  // A draft restored with a technique already in it comes back collapsed.
  const [techniqueExpanded, setTechniqueExpanded] = useState(false);
  const thoughtInputRef = useRef<TextInput>(null);

  useEffect(() => {
    hydrateDraft();
  }, [hydrateDraft]);

  /**
   * The draft store IS the form state, so leaving the screen and coming back
   * restores what was typed without a save step ("Finish later").
   *
   * ☠️ Reads the CURRENT values off the store rather than closing over `draft`:
   * `setValues` takes a whole value, so two fields changed inside one render
   * pass would otherwise write the second on top of a stale copy of the first.
   */
  const updateDraft = useCallback(
    (patch: Partial<ActDefusionLogDraft>) => {
      const current = useActDefusionLogDraftStore.getState().values ?? EMPTY_DRAFT;
      setDraftValues({ ...current, ...patch });
    },
    [setDraftValues],
  );

  const filled = useMemo(() => filledParts(draft), [draft]);
  const filledCount = DEFUSION_PARTS.filter((part) => filled[part]).length;
  const stops = DEFUSION_PARTS.map((part) => ({
    label: t(`act:defusion.steps.${part}`),
    filled: filled[part],
  }));

  const categoryIndex = draft.thoughtCategory
    ? THOUGHT_CATEGORIES.indexOf(draft.thoughtCategory)
    : -1;
  const categoryRoving = useRovingFocus({
    count: THOUGHT_CATEGORIES.length,
    // Nothing chosen yet: the first chip is the one that takes the tab stop.
    activeIndex: categoryIndex < 0 ? 0 : categoryIndex,
    onActivate: (index) => updateDraft({ thoughtCategory: THOUGHT_CATEGORIES[index] }),
  });
  const techniqueIndex = draft.techniqueUsed
    ? DEFUSION_TECHNIQUES.indexOf(draft.techniqueUsed)
    : -1;
  const techniqueRoving = useRovingFocus({
    count: DEFUSION_TECHNIQUES.length,
    activeIndex: techniqueIndex < 0 ? 0 : techniqueIndex,
    onActivate: (index) => updateDraft({ techniqueUsed: DEFUSION_TECHNIQUES[index] }),
  });

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    setSubmitError("");
    const fusedThought = draft.fusedThought.trim();
    if (fusedThought.length === 0) {
      // The only thing that still blocks a save, and it blocks at the save
      // rather than by disabling the button: a form that will not move and will
      // not say why is what the column replaces.
      const message = t("act:defusion.thoughtRequired");
      setThoughtError(message);
      announceMessage(message);
      // Focusing also scrolls the field into view on web (shared Textarea behavior).
      thoughtInputRef.current?.focus();
      return;
    }
    try {
      await saveMutation.mutateAsync({
        fusedThought,
        thoughtCategory: draft.thoughtCategory ?? CATEGORY_WHEN_UNANSWERED,
        fusionLevelBefore: draft.fusionLevelBefore,
        techniqueUsed: draft.techniqueUsed ?? TECHNIQUE_WHEN_UNANSWERED,
        defusedVersion: draft.defusedVersion.trim(),
        fusionLevelAfter: draft.fusionLevelAfter,
        notes: draft.notes.trim(),
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      resetDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      setSubmitError(t("act:defusion.saveProblem"));
    }
  });

  return (
    <MobileFormScreen
      stickyHeader={
        <ProgressSegments
          stops={stops}
          note={t("act:defusion.railNote", {
            filled: filledCount,
            total: DEFUSION_PARTS.length,
          })}
        />
      }
      footer={
        <View className="gap-2">
          <Button
            disabled={saveMutation.isPending}
            onPress={() => setDiscardOpen(true)}
            variant="ghost"
          >
            <Text className="text-destructive">{t("common:draft.discardAction")}</Text>
          </Button>
          <View className="flex-row gap-3">
            <View className="flex-1">
              {/*
               * A labelled exit over the autosave that is already happening -
               * every keystroke is in the draft store - not a new mechanism.
               */}
              <Button
                disabled={saveMutation.isPending}
                onPress={() => router.back()}
                variant="ghost"
              >
                <Text>{t("act:defusion.finishLater")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button disabled={saveMutation.isPending} onPress={() => void handleSave()}>
                {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>
                  {saveMutation.isPending ? t("act:defusion.saving") : t("act:defusion.saveLog")}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("act:defusion.newTitle")} />
          <Text variant="muted">{t("act:defusion.newSubtitle")}</Text>
        </View>

        <CrisisSupportBar />

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:defusion.saveProblem")}</CardTitle>
              <CardDescription>{submitError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <ConfirmDialog
          visible={discardOpen}
          isPending={false}
          title={t("common:draft.discardTitle")}
          message={t("common:draft.discardMessage")}
          confirmLabel={t("common:draft.discardConfirm")}
          cancelLabel={t("common:cancel")}
          onCancel={() => setDiscardOpen(false)}
          onConfirm={() => {
            resetDraft();
            setDiscardOpen(false);
            router.back();
          }}
        />

        {/* Part 1: the thought */}
        <View className="gap-3">
          <View className="gap-1">
            <Label>{t("act:defusion.thoughtLabel")}</Label>
            <Text variant="muted" className="text-xs">
              {t("act:defusion.thoughtHint")}
            </Text>
          </View>
          <Textarea
            ref={thoughtInputRef}
            accessibilityLabel={t("act:defusion.thoughtLabel")}
            onChangeText={(value) => {
              updateDraft({ fusedThought: value });
              // The complaint is answered as soon as the user starts typing.
              if (thoughtError) setThoughtError("");
            }}
            placeholder={t("act:defusion.thoughtPlaceholder")}
            value={draft.fusedThought}
            autoFocus
          />
          {thoughtError ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {thoughtError}
            </Text>
          ) : null}
        </View>

        {/* Part 2: the category */}
        <View className="gap-3">
          <Label>{t("act:defusion.categoryLabel")}</Label>
          <View
            accessibilityLabel={t("act:defusion.categoryLabel")}
            accessibilityRole="radiogroup"
            className="flex-row flex-wrap gap-2"
            role="radiogroup"
          >
            {THOUGHT_CATEGORIES.map((cat, index) => {
              const selected = draft.thoughtCategory === cat;
              return (
                <Pressable
                  key={cat}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  role="radio"
                  onPress={() => updateDraft({ thoughtCategory: cat })}
                  className={cn(
                    "rounded-full border px-4 py-2",
                    selected ? "border-border bg-primary" : "border-border bg-card active:bg-muted",
                  )}
                  {...categoryRoving.getItemProps(index, () =>
                    updateDraft({ thoughtCategory: cat }),
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      selected ? "text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {t(`act:defusion.categories.${cat}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Part 3: how strongly it pulls now */}
        <View className="gap-3">
          <View className="gap-1">
            <Label>{t("act:defusion.fusionBeforeLabel")}</Label>
            <Text variant="muted" className="text-xs">
              {t("act:defusion.fusionBeforeHint")}
            </Text>
          </View>
          {/*
           * ⚠️ Both fusion ratings are on screen at once now, so "60" names two
           * buttons on the page. The end-to-end spec scopes by these testIDs
           * rather than by position - an index would silently retarget the other
           * rating the moment anything moves between them.
           */}
          <View testID="defusion-fusion-before">
            <NumberRating
              min={0}
              max={100}
              step={10}
              value={draft.fusionLevelBefore}
              onChange={(value) => updateDraft({ fusionLevelBefore: value })}
            />
          </View>
        </View>

        {/* Part 4: the technique */}
        <View className="gap-3">
          <View className="gap-1">
            <Label>{t("act:defusion.techniqueLabel")}</Label>
            <Text variant="muted" className="text-xs">
              {t("act:defusion.techniqueHint")}
            </Text>
          </View>
          {draft.techniqueUsed && !techniqueExpanded ? (
            // Collapsed onto the chosen technique: seven cards of instructions
            // are worth reading once, and worth getting out of the way after.
            <View className="gap-2">
              <View className="rounded-xl border border-border bg-muted p-4">
                <View className="gap-1">
                  <Text className="font-semibold text-foreground">
                    {t(`act:defusion.techniques.${draft.techniqueUsed}`)}
                  </Text>
                  <Text variant="muted" className="text-xs leading-snug">
                    {t(`act:defusion.techniqueDescriptions.${draft.techniqueUsed}`)}
                  </Text>
                </View>
              </View>
              <View className="flex-row">
                <Button onPress={() => setTechniqueExpanded(true)} size="sm" variant="outline">
                  <Text>{t("act:defusion.changeTechnique")}</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View
              accessibilityLabel={t("act:defusion.techniqueLabel")}
              accessibilityRole="radiogroup"
              className="gap-2"
              role="radiogroup"
            >
              {DEFUSION_TECHNIQUES.map((tech, index) => {
                const selected = draft.techniqueUsed === tech;
                const choose = () => {
                  updateDraft({ techniqueUsed: tech });
                  setTechniqueExpanded(false);
                };
                return (
                  <Pressable
                    key={tech}
                    accessibilityRole="radio"
                    aria-checked={selected}
                    role="radio"
                    onPress={choose}
                    className={cn(
                      "rounded-xl border p-4 active:bg-accent/40",
                      selected ? "border-border bg-muted" : "border-border bg-card",
                    )}
                    {...techniqueRoving.getItemProps(index, choose)}
                  >
                    <View className="gap-1">
                      <Text className={cn("font-semibold", selected && "text-foreground")}>
                        {t(`act:defusion.techniques.${tech}`)}
                      </Text>
                      <Text variant="muted" className="text-xs leading-snug">
                        {t(`act:defusion.techniqueDescriptions.${tech}`)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Part 5: after, and anything to note */}
        <View className="gap-6">
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:defusion.defusedVersionLabel")}</Label>
            </View>
            <Textarea
              accessibilityLabel={t("act:defusion.defusedVersionLabel")}
              onChangeText={(value) => updateDraft({ defusedVersion: value })}
              placeholder={t("act:defusion.defusedVersionPlaceholder")}
              value={draft.defusedVersion}
            />
          </View>

          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:defusion.fusionAfterLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:defusion.fusionAfterHint")}
              </Text>
            </View>
            <View testID="defusion-fusion-after">
              <NumberRating
                min={0}
                max={100}
                step={10}
                value={draft.fusionLevelAfter}
                onChange={(value) => updateDraft({ fusionLevelAfter: value })}
              />
            </View>
          </View>

          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:defusion.notesLabel")}</Label>
            </View>
            <Textarea
              accessibilityLabel={t("act:defusion.notesLabel")}
              onChangeText={(value) => updateDraft({ notes: value })}
              placeholder={t("act:defusion.notesPlaceholder")}
              value={draft.notes}
            />
          </View>
        </View>
      </View>
    </MobileFormScreen>
  );
}
