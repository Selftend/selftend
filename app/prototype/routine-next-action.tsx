// PROTOTYPE ONLY - throwaway, answers wayfinder ticket #27 (Selftend/selftend).
// Question: how does the "next routine action" affordance look and behave right
// after a user completes a routine step? Three radically different variants,
// switchable via ?variant=A|B|C (floating bar, bottom). Live controls (top-right)
// move between step 1 / step 2 / last step, and toggle whether the one-time
// reminder prompt card is eligible - so the contested post-save moment (reminder
// card at bottom, toast at top, router.replace to a detail screen) is visible.
//
// Nothing here persists or mutates. Fold the winning variant into real code and
// bin the rest per the /prototype skill. Reachable at:
//   /prototype/routine-next-action?variant=A
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { PrototypeSwitcher, useVariant } from "@/src/components/prototype/prototype-switcher";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

// --- Mock routine (no data model exists yet; this is stubbed) ---------------
const ROUTINE_NAME = "Morning wind-down";
const ROUTINE_TINT = "iris"; // routines get their own tint; iris keeps them distinct from habits (act/green)

type Step = { key: string; label: string; icon: MaterialIconName };
const STEPS: Step[] = [
  { key: "mood", label: "Mood check-in", icon: "sentiment-satisfied-alt" },
  { key: "breathing", label: "Breathing", icon: "air" },
  { key: "journal", label: "Journal", icon: "edit-note" },
];

const VARIANTS = ["A", "B", "C", "D"];
const LABELS = {
  A: "Bottom card (precedence)",
  B: "Top snackbar (coexist)",
  C: "Full sheet (takeover)",
  D: "Floating button → sheet (on demand)",
};

export default function RoutineNextActionPrototype() {
  const variant = useVariant(VARIANTS);
  // Which step the user just completed (0,1,2). Step 2 is the last step.
  const [justCompleted, setJustCompleted] = useState(0);
  // Is the one-time reminder prompt card eligible to fire on this save?
  const [reminderEligible, setReminderEligible] = useState(true);

  const next = STEPS[justCompleted + 1] ?? null;
  const isLast = next === null;
  const doneCount = justCompleted + 1;

  const ctx = {
    routineName: ROUTINE_NAME,
    steps: STEPS,
    justCompleted: STEPS[justCompleted],
    next,
    isLast,
    doneCount,
    total: STEPS.length,
  };

  // Coexistence rules being prototyped:
  //  A - routine card takes the bottom slot; reminder prompt is DEFERRED.
  //  B - routine nudge sits at the top; reminder card still shows at the bottom.
  //  C - the sheet owns the moment; reminder prompt is SUPPRESSED while open.
  //  D - nothing takes over; a floating button opens the sheet on demand, so
  //      the reminder card is free to show (like B).
  const reminderShows = reminderEligible && (variant === "B" || variant === "D");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      {/* Faithful-ish mock of the screen the user lands on after a save. */}
      <MockDetailBackground justCompleted={ctx.justCompleted} />

      {/* The one-time reminder prompt card, mounted at the bottom like the real
          app. Whether it shows depends on the variant's coexistence rule. */}
      {reminderShows ? <MockReminderPromptCard /> : null}

      {variant === "A" ? <VariantA {...ctx} /> : null}
      {variant === "B" ? <VariantB {...ctx} reminderEligible={reminderEligible} /> : null}
      {variant === "C" ? <VariantC key={justCompleted} {...ctx} /> : null}
      {variant === "D" ? <VariantD {...ctx} /> : null}

      <PrototypeControls
        justCompleted={justCompleted}
        setJustCompleted={setJustCompleted}
        reminderEligible={reminderEligible}
        setReminderEligible={setReminderEligible}
        variant={variant}
      />
      <PrototypeSwitcher variants={VARIANTS} labels={LABELS} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Shared context type for variants
// ---------------------------------------------------------------------------
interface Ctx {
  routineName: string;
  steps: Step[];
  justCompleted: Step;
  next: Step | null;
  isLast: boolean;
  doneCount: number;
  total: number;
}

// ---------------------------------------------------------------------------
// VARIANT A - Bottom "next step" card. Takes the same bottom slot the reminder
// prompt uses; when a routine step was just completed, the routine wins and the
// reminder prompt is deferred to a later, non-routine save.
// ---------------------------------------------------------------------------
function VariantA(ctx: Ctx) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute inset-x-0 z-[72] items-center px-4"
      style={{ pointerEvents: "box-none", bottom: insets.bottom + 16 }}
    >
      <Card tint={ROUTINE_TINT} spine={ROUTINE_TINT} className="w-full max-w-xl shadow-md">
        <CardHeader className="gap-2">
          <View className="flex-row items-center gap-3">
            <View className="size-9 items-center justify-center rounded-lg bg-[hsl(var(--iris)/0.12)]">
              <Icon
                name={ctx.isLast ? "check-circle" : "auto-awesome"}
                className="size-5 text-[hsl(var(--iris))]"
              />
            </View>
            <View className="flex-1 gap-0.5">
              <Text variant="eyebrow" className="text-[hsl(var(--iris))]">
                {ctx.routineName}
              </Text>
              <CardTitle>{ctx.isLast ? "Routine complete" : `Next: ${ctx.next?.label}`}</CardTitle>
            </View>
            <ProgressDots done={ctx.doneCount} total={ctx.total} />
          </View>
        </CardHeader>
        <CardContent className="gap-3">
          {ctx.isLast ? (
            <>
              <Text variant="muted" className="text-sm">
                All {ctx.total} steps done today. Nothing more to do — see you tomorrow.
              </Text>
              <Button variant="ghost" onPress={() => {}}>
                <Text className="text-muted-foreground">Done</Text>
              </Button>
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                <Icon name={ctx.next!.icon} className="size-5 text-muted-foreground" />
                <Text className="flex-1 text-sm">{ctx.next!.label}</Text>
              </View>
              <View className="flex-row gap-3">
                <Button className="flex-1" tint={ROUTINE_TINT} variant="tinted" onPress={() => {}}>
                  <Text className="text-[hsl(var(--iris))]">Start {ctx.next!.label}</Text>
                  <Icon name="arrow-forward" className="size-4 text-[hsl(var(--iris))]" />
                </Button>
                <Button variant="ghost" onPress={() => {}}>
                  <Text className="text-muted-foreground">Not now</Text>
                </Button>
              </View>
              <Text variant="muted" className="text-[11px]">
                Reminder prompt deferred — the routine owns this moment.
              </Text>
            </>
          )}
        </CardContent>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// VARIANT B - Top progress snackbar. Sits in the toast zone at the top, so it
// coexists spatially with the reminder prompt card at the bottom (both can show
// at once). Lightweight: progress + next step + one inline action.
// ---------------------------------------------------------------------------
function VariantB(ctx: Ctx & { reminderEligible: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute inset-x-0 z-[79] items-center px-4"
      style={{ pointerEvents: "box-none", top: insets.top + 12 }}
    >
      <View className="w-full max-w-xl flex-row items-center gap-3 rounded-xl border border-[hsl(var(--iris)/0.30)] bg-card px-4 py-3 shadow-md">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <ProgressDots done={ctx.doneCount} total={ctx.total} />
            <Text className="text-xs font-semibold">
              {ctx.isLast
                ? `${ctx.routineName} complete`
                : `${ctx.doneCount} of ${ctx.total} · ${ctx.routineName}`}
            </Text>
          </View>
          <Text variant="muted" className="text-xs" numberOfLines={1}>
            {ctx.isLast ? "Every step done today. Nice." : `Next: ${ctx.next?.label}`}
          </Text>
        </View>
        {ctx.isLast ? (
          <Icon name="check-circle" className="size-5 text-[hsl(var(--iris))]" />
        ) : (
          <Button size="sm" tint={ROUTINE_TINT} variant="tinted" onPress={() => {}}>
            <Text className="text-[hsl(var(--iris))]">Continue</Text>
          </Button>
        )}
        <Pressable onPress={() => {}} hitSlop={8} className="p-1">
          <Icon name="close" className="size-4 text-muted-foreground" />
        </Pressable>
      </View>
      {ctx.reminderEligible ? (
        <Text variant="muted" className="mt-2 text-[11px]">
          (Reminder prompt still shows at the bottom — they don&apos;t collide.)
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// VARIANT C - Full "continue your routine" bottom sheet. A routine-centric
// interstitial that takes over the post-save moment: it lists every step, marks
// what's done, and offers the next one. It suppresses the reminder prompt while
// open; on the last step it becomes a completion sheet that can offer the
// routine's OWN opt-in reminder.
// ---------------------------------------------------------------------------
function VariantC(ctx: Ctx) {
  // Auto-opens (takeover) as soon as a step completes.
  const [open, setOpen] = useState(true);
  return <RoutineSheet ctx={ctx} open={open} onClose={() => setOpen(false)} />;
}

// ---------------------------------------------------------------------------
// VARIANT D - Floating button that opens the C sheet on demand. Nothing takes
// over the post-save moment: a persistent progress FAB sits in the corner, the
// reminder card is free to show, and the rich step list is a *pull*, not a
// push. Tapping the FAB opens the same sheet as C.
// ---------------------------------------------------------------------------
function VariantD(ctx: Ctx) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  return (
    <>
      <View
        className="absolute right-4 z-[72]"
        style={{ pointerEvents: "box-none", bottom: insets.bottom + 20 }}
      >
        <Pressable
          onPress={() => setOpen(true)}
          className="flex-row items-center gap-2 rounded-full border border-[hsl(var(--iris)/0.30)] bg-[hsl(var(--iris)/0.12)] py-2.5 pl-3 pr-4 shadow-md"
          accessibilityLabel={`Open ${ctx.routineName}, ${ctx.doneCount} of ${ctx.total} done`}
        >
          <View className="size-8 items-center justify-center rounded-full bg-background">
            <Icon
              name={ctx.isLast ? "check-circle" : "playlist-play"}
              className="size-5 text-[hsl(var(--iris))]"
            />
          </View>
          {ctx.isLast ? (
            <Text className="text-sm font-semibold text-[hsl(var(--iris))]">Done</Text>
          ) : (
            <View className="gap-1">
              <Text className="text-xs font-semibold text-[hsl(var(--iris))]">
                {ctx.doneCount}/{ctx.total}
              </Text>
              <ProgressDots done={ctx.doneCount} total={ctx.total} />
            </View>
          )}
        </Pressable>
      </View>
      <RoutineSheet ctx={ctx} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// The "continue your routine" sheet body, shared by C (auto-opens) and D
// (opens from the floating button). Whole step list + next + completion.
function RoutineSheet({ ctx, open, onClose }: { ctx: Ctx; open: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={onClose}>
      {/* Backdrop and panel are siblings, not nested (Android touch bug). */}
      <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
      <View className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-background p-5 pb-8">
        <View className="mb-4 items-center">
          <View className="h-1 w-10 rounded-full bg-muted" />
        </View>
        <View className="mb-4 flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-xl bg-[hsl(var(--iris)/0.12)]">
            <Icon
              name={ctx.isLast ? "celebration" : "playlist-play"}
              className="size-6 text-[hsl(var(--iris))]"
            />
          </View>
          <View className="flex-1">
            <Text variant="eyebrow" className="text-[hsl(var(--iris))]">
              {ctx.routineName}
            </Text>
            <Text variant="h3">
              {ctx.isLast ? "You finished your routine" : "Keep your routine going"}
            </Text>
          </View>
          <Text variant="muted" className="text-sm">
            {ctx.doneCount}/{ctx.total}
          </Text>
        </View>

        <View className="gap-1">
          {ctx.steps.map((step, i) => {
            const done = i < ctx.doneCount;
            const isNext = !ctx.isLast && i === ctx.doneCount;
            return (
              <View
                key={step.key}
                className={`flex-row items-center gap-3 rounded-lg px-3 py-2.5 ${
                  isNext ? "bg-[hsl(var(--iris)/0.08)]" : ""
                }`}
              >
                <Icon
                  name={done ? "check-circle" : "radio-button-unchecked"}
                  className={`size-5 ${done ? "text-[hsl(var(--iris))]" : "text-muted-foreground"}`}
                />
                <Icon name={step.icon} className="size-4 text-muted-foreground" />
                <Text
                  className={`flex-1 text-sm ${done ? "text-muted-foreground line-through" : ""}`}
                >
                  {step.label}
                </Text>
                {isNext ? (
                  <Text variant="eyebrow" className="text-[hsl(var(--iris))]">
                    Next
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="mt-5 gap-2">
          {ctx.isLast ? (
            <>
              <Button variant="tinted" tint={ROUTINE_TINT} onPress={onClose}>
                <Icon name="notifications-none" className="size-4 text-[hsl(var(--iris))]" />
                <Text className="text-[hsl(var(--iris))]">Remind me daily</Text>
              </Button>
              <Button variant="ghost" onPress={onClose}>
                <Text className="text-muted-foreground">Close</Text>
              </Button>
            </>
          ) : (
            <>
              <Button onPress={onClose}>
                <Text>Do next step: {ctx.next?.label}</Text>
                <Icon name="arrow-forward" className="size-4 text-primary-foreground" />
              </Button>
              <Button variant="ghost" onPress={onClose}>
                <Text className="text-muted-foreground">Not now</Text>
              </Button>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------
function ProgressDots({ done, total }: { done: number; total: number }) {
  return (
    <View className="flex-row items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`size-1.5 rounded-full ${
            i < done ? "bg-[hsl(var(--iris))]" : "bg-muted-foreground/30"
          }`}
        />
      ))}
    </View>
  );
}

// A stripped mock of the mood detail screen the user lands on via router.replace
// after saving a mood log — just enough real chrome to judge density against.
function MockDetailBackground({ justCompleted }: { justCompleted: Step }) {
  return (
    <ScrollView contentContainerClassName="p-5 gap-4" className="flex-1">
      <View className="gap-1">
        <Text variant="eyebrow" className="text-muted-foreground">
          Tools / {justCompleted.label}
        </Text>
        <Text variant="h1">{justCompleted.label}</Text>
      </View>
      <Card>
        <CardHeader>
          <CardTitle>Saved just now</CardTitle>
          <CardDescription>Today, 8:14 AM</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="flex-row items-center gap-3">
            <View className="size-12 items-center justify-center rounded-xl bg-muted">
              <Icon name={justCompleted.icon} className="size-6 text-muted-foreground" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold">Calm · 4/5</Text>
              <Text variant="muted" className="text-sm">
                Woke up rested, coffee on the balcony.
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
      <Text variant="muted" className="text-xs">
        ↑ mock background: the detail screen a tool router.replace-es to on save.
      </Text>
    </ScrollView>
  );
}

// Faithful-looking (but inert) copy of ReminderPromptCard so the collision at
// the bottom of the screen is visible. No preferences, scheduling, or writes.
function MockReminderPromptCard() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute inset-x-0 z-[70] items-center px-4"
      style={{ pointerEvents: "box-none", bottom: insets.bottom + 16 }}
    >
      <Card className="w-full max-w-xl shadow-md">
        <CardHeader className="gap-1">
          <View className="flex-row items-center gap-3">
            <View className="size-9 items-center justify-center rounded-lg bg-muted">
              <Icon name="notifications-none" className="size-5 text-muted-foreground" />
            </View>
            <View className="flex-1 gap-1">
              <CardTitle>Want a daily reminder?</CardTitle>
              <CardDescription>We can nudge you to check your mood each day.</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent className="gap-4">
          <View className="flex-row items-center justify-between rounded-lg border border-border px-4 py-3">
            <Text className="text-sm">Remind me at</Text>
            <Text className="font-semibold">8:00 AM</Text>
          </View>
          <View className="flex-row gap-3">
            <Button className="flex-1" onPress={() => {}}>
              <Text>Yes, remind me</Text>
            </Button>
            <Button className="flex-1" variant="outline" onPress={() => {}}>
              <Text>No thanks</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Prototype chrome: live controls (NOT part of the design under evaluation).
// ---------------------------------------------------------------------------
function PrototypeControls({
  justCompleted,
  setJustCompleted,
  reminderEligible,
  setReminderEligible,
  variant,
}: {
  justCompleted: number;
  setJustCompleted: (n: number) => void;
  reminderEligible: boolean;
  setReminderEligible: (b: boolean) => void;
  variant: string;
}) {
  const insets = useSafeAreaInsets();
  const stepLabels = ["Step 1", "Step 2", "Last step"];
  return (
    <View
      className="absolute right-3 z-[101] w-56 gap-2 rounded-xl border border-dashed border-border bg-background/95 p-3 shadow-lg"
      style={{ top: insets.top + 12 }}
    >
      <Text variant="eyebrow" className="text-muted-foreground">
        Prototype controls
      </Text>
      <Text variant="muted" className="text-[11px]">
        Just completed:
      </Text>
      <View className="flex-row gap-1">
        {stepLabels.map((label, i) => (
          <Pressable
            key={label}
            onPress={() => setJustCompleted(i)}
            className={`flex-1 items-center rounded-md border px-1 py-1.5 ${
              justCompleted === i ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <Text className="text-[10px] font-semibold">{label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => setReminderEligible(!reminderEligible)}
        className="mt-1 flex-row items-center justify-between rounded-md border border-border px-2 py-1.5"
      >
        <Text className="text-[11px]">Reminder eligible</Text>
        <View
          className={`size-4 items-center justify-center rounded ${
            reminderEligible ? "bg-primary" : "bg-muted"
          }`}
        >
          {reminderEligible ? (
            <Icon name="check" className="size-3 text-primary-foreground" />
          ) : null}
        </View>
      </Pressable>
      <Text variant="muted" className="text-[10px] leading-tight">
        {variant === "A"
          ? "A: routine card takes the bottom slot; reminder deferred."
          : variant === "B"
            ? "B: nudge at top; reminder card still shows at bottom."
            : variant === "C"
              ? "C: sheet takes over; reminder suppressed while open."
              : "D: floating button opens the sheet on demand; nothing takes over; reminder free to show."}
      </Text>
    </View>
  );
}
