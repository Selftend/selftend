# ACT Help Buttons, Wizard Removal & Program Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mirror CBT's per-tool help buttons in ACT, remove the wizard (tune) button from the ACT header, and keep the green program button accessible after dismissal.

**Architecture:** Two independent changes: (1) extend the help key registry with 5 ACT principle keys and add i18n content; (2) update `act-home-screen.tsx` to add `HelpButton` overlays on principle cards and strip all wizard wiring. No schema changes. No new files.

**Tech Stack:** React Native / Expo, NativeWind (Tailwind), react-i18next, TypeScript

---

## File Map

| File                                   | Change                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `src/features/help/help-content.ts`    | Add 5 new ACT help keys                                         |
| `src/i18n/locales/en/help.json`        | Add EN help text for 5 ACT principles                           |
| `src/i18n/locales/bg/help.json`        | Add BG help text for 5 ACT principles                           |
| `src/features/act/act-home-screen.tsx` | Add helpKey to PrincipleCard, overlay HelpButton, remove wizard |

---

## Task 1: Add ACT help keys + content

**Files:**

- Modify: `src/features/help/help-content.ts`
- Modify: `src/i18n/locales/en/help.json`
- Modify: `src/i18n/locales/bg/help.json`

- [ ] **Step 1: Add 5 new keys to HELP_KEYS in help-content.ts**

Replace the array in `src/features/help/help-content.ts` with:

```ts
export const HELP_KEYS = [
  "program",
  "thoughtRecords",
  "beliefs",
  "worry",
  "distortions",
  "goals",
  "values",
  "activities",
  "exposure",
  "tasks",
  "anger",
  "selfCare",
  "breathing",
  "mindfulness",
  "meditation",
  "grounding",
  "mood",
  "sleep",
  "journal",
  "gratitude",
  "habits",
  "defusion",
  "expansion",
  "connection",
  "observingSelf",
  "committedAction",
] as const;
```

Leave `HelpEntry`, `HELP_CONTENT`, and `HelpKey` untouched — they derive from the array automatically.

- [ ] **Step 2: Add EN help text to help.json**

In `src/i18n/locales/en/help.json`, add the following 5 entries **before the closing `}`** (after the `"habits"` block):

```json
  "defusion": {
    "title": "Defusion",
    "what": "A way to step back from unhelpful thoughts and see them as mental events rather than facts.",
    "how": "Notice the thought, name it (\"I'm having the thought that…\"), then use a technique to create distance — labelling, singing, or watching it like a passing cloud.",
    "why": "When fused with a thought it controls your behaviour. Defusion reduces its grip without arguing, fixing, or suppressing it."
  },
  "expansion": {
    "title": "Expansion",
    "what": "Making room for difficult emotions and sensations instead of fighting or avoiding them.",
    "how": "Locate the feeling in your body, breathe into it, and observe it with curiosity — its shape, size, weight — rather than trying to push it away.",
    "why": "Struggling against difficult feelings amplifies them. Expanding around them turns off the fight response and lets them pass naturally."
  },
  "connection": {
    "title": "Connection",
    "what": "Present-moment awareness — noticing what is happening right now rather than getting lost in the past or future.",
    "how": "Engage your five senses to anchor attention: notice what you can see, hear, feel, smell, and taste right now.",
    "why": "Most suffering happens in thoughts about past or future. Returning to the present interrupts rumination and creates a moment of calm."
  },
  "observingSelf": {
    "title": "Observing Self",
    "what": "The stable part of you that notices thoughts and feelings without being defined by them — your inner witness.",
    "how": "Step into the observer perspective: notice that you are the one who has thoughts, not the thoughts themselves.",
    "why": "Identifying with a constant observer reduces the power of fluctuating thoughts and feelings to dictate your sense of self."
  },
  "committedAction": {
    "title": "Committed Action",
    "what": "Taking values-guided steps even when discomfort, fear, or difficult feelings are present.",
    "how": "Choose a small, concrete action toward your values, commit to it, and follow through regardless of how you feel in the moment.",
    "why": "Waiting to feel ready means waiting forever. Small committed steps build momentum and prove values-guided living is possible even in difficulty."
  }
```

- [ ] **Step 3: Add BG help text to help.json**

In `src/i18n/locales/bg/help.json`, add these entries **before the closing `}`** (after the `"habits"` block):

```json
  "defusion": {
    "title": "Дефузия",
    "what": "Начин да се отдалечите от неполезни мисли и да ги видите като мисловни събития, а не факти.",
    "how": "Забележете мисълта, назовете я (\"Имам мисълта, че…\") и използвайте техника за дистанциране — етикетиране, пеене или наблюдение като преминаващ облак.",
    "why": "Когато сте слети с мисъл, тя управлява поведението ви. Дефузията намалява властта й, без да е нужно да спорите, поправяте или потискате."
  },
  "expansion": {
    "title": "Разширяване",
    "what": "Правене на място за трудни емоции и усещания, вместо да се борите с тях или да ги избягвате.",
    "how": "Открийте чувството в тялото си, дишайте към него и го наблюдавайте с любопитство — форма, размер, тежест — вместо да го отблъсквате.",
    "why": "Борбата с трудните чувства ги усилва. Разширяването около тях изключва реакцията на борба и им позволява да преминат естествено."
  },
  "connection": {
    "title": "Връзка",
    "what": "Осъзнатост към настоящия момент — забелязване на случващото се точно сега, вместо да се изгубите в миналото или бъдещето.",
    "how": "Използвайте петте сетива, за да закотвите вниманието: забележете какво виждате, чувате, усещате, помирисвате и вкусвате.",
    "why": "Повечето страдания се случват в мисли за минало или бъдеще. Връщането към настоящето прекъсва преживянето и създава момент на спокойствие."
  },
  "observingSelf": {
    "title": "Наблюдаващото аз",
    "what": "Стабилната страна от вас, която забелязва мисли и чувства, без да бъде определена от тях — вашият вътрешен свидетел.",
    "how": "Влезте в перспективата на наблюдателя: забележете, че вие сте този, който има мисли, а не самите мисли.",
    "why": "Идентифицирането с постоянен наблюдател намалява властта на непостоянните мисли и чувства да диктуват усещането ви за себе си."
  },
  "committedAction": {
    "title": "Ангажирано действие",
    "what": "Предприемане на стъпки, водени от ценностите, дори когато дискомфорт, страх или трудни чувства са налице.",
    "how": "Изберете малко, конкретно действие към ценностите си, поемете ангажимент и го следвайте независимо как се чувствате в момента.",
    "why": "Чакането да се почувствате готови означава чакане завинаги. Малките ангажирани стъпки изграждат инерция и доказват, че животът, воден от ценности, е възможен дори в трудни моменти."
  }
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If TS complains about missing keys in `help.json`, verify both locale files are saved correctly — the auto-generated `HELP_CONTENT` record derives keys from `HELP_KEYS` so only TS/JSON validity matters here.

- [ ] **Step 5: Commit**

```bash
git add src/features/help/help-content.ts src/i18n/locales/en/help.json src/i18n/locales/bg/help.json
git commit -m "feat(act): add help content for five ACT principles"
```

---

## Task 2: Update ACT home screen

**Files:**

- Modify: `src/features/act/act-home-screen.tsx`

This task does two things in one commit: strips the wizard and overlays `HelpButton` on principle cards. They touch the same file so combining them avoids a half-broken intermediate state.

- [ ] **Step 1: Replace imports at the top of act-home-screen.tsx**

Replace everything from line 1 to the last `import` line with:

```tsx
import { router, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { HelpButton } from "@/src/components/app/help-button";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { ActInfo } from "@/src/components/app/act-onboarding-modal";
import { ProgramHero } from "@/src/components/app/program-hero";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import { useDefusionLogs } from "@/src/features/act/queries";
import { useActProgram } from "@/src/features/act/use-act-program";
import type { ACTPrinciple } from "@/src/features/act/types";
import type { HelpKey } from "@/src/features/help/help-content";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";
```

Removed: `ActivityIndicator`, `ActWizard`, `ActWizardResult`, `useUpsertACTProgramState`, `useUpdateUserPreferences`, `useUserPreferences`, `mergeUserPreferences`.
Added: `HelpButton`, `HelpKey`.

- [ ] **Step 2: Update PrincipleCard interface and PRINCIPLE_CARDS constant**

Replace the `interface PrincipleCard` block and `PRINCIPLE_CARDS` array (lines 35–48 in the original) with:

```tsx
interface PrincipleCard {
  key: ACTPrinciple;
  icon: MaterialIconName;
  route: Href | null;
  helpKey: HelpKey;
}

const PRINCIPLE_CARDS: PrincipleCard[] = [
  { key: "defusion", icon: "filter-drama", route: "/modules/act/defusion", helpKey: "defusion" },
  { key: "expansion", icon: "open-in-full", route: "/modules/act/expansion", helpKey: "expansion" },
  {
    key: "connection",
    icon: "radio-button-checked",
    route: "/modules/act/connection",
    helpKey: "connection",
  },
  {
    key: "observingSelf",
    icon: "visibility",
    route: "/modules/act/observing-self",
    helpKey: "observingSelf",
  },
  { key: "values", icon: "explore", route: "/modules/act/values", helpKey: "values" },
  {
    key: "committedAction",
    icon: "directions-run",
    route: "/modules/act/committed-action",
    helpKey: "committedAction",
  },
];
```

- [ ] **Step 3: Replace ActHomeScreen function body**

Replace the entire `export default function ActHomeScreen()` function with:

```tsx
export default function ActHomeScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: defusionLogs } = useDefusionLogs(userId, 50);
  const recentLogs = defusionLogs?.slice(0, 3) ?? [];

  const {
    program,
    startProgram,
    dismissProgramPrompt,
    showProgramPrompt,
    abandonProgram,
    replayProgram,
    promptDismissedAt,
    isUpdating,
  } = useActProgram(user?.id ?? null);

  const [forceInfo, setForceInfo] = useState(false);
  const [graduationDismissed, setGraduationDismissed] = useState(false);
  const [abandonConfirmVisible, setAbandonConfirmVisible] = useState(false);

  return (
    <>
      <ConfirmDialog
        visible={abandonConfirmVisible}
        isPending={isUpdating}
        title={t("program.abandonTitle")}
        message={t("program.abandonDescription")}
        confirmLabel={t("program.abandonConfirm")}
        cancelLabel={t("program.abandonCancel")}
        onCancel={() => setAbandonConfirmVisible(false)}
        onConfirm={() => {
          abandonProgram();
          setAbandonConfirmVisible(false);
        }}
      />
      <ActInfo
        visible={forceInfo}
        onComplete={() => setForceInfo(false)}
        onDismiss={() => setForceInfo(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.subtitle")}
              </Text>
              <ModuleHomeHeader
                title={t("home.title")}
                actions={[
                  { type: "notifications", targetKey: "act" },
                  ...(program.status === "not_started"
                    ? [
                        {
                          type: "program" as const,
                          onPress: showProgramPrompt,
                          accessibilityLabel: t("program.showPromptLabel"),
                        },
                      ]
                    : []),
                  { type: "info", onPress: () => setForceInfo(true) },
                ]}
              />
              <Text variant="muted" className="max-w-[64ch]">
                {t("home.description")}
              </Text>
            </View>

            {program.status === "graduated" ? (
              <ProgramGraduation
                namespace="act"
                lines={[
                  t("program.statChoicePoints", { count: program.summaryStats.choicePoints }),
                  t("program.statDefusion", { count: program.summaryStats.defusionLogs }),
                  t("program.statExpansion", { count: program.summaryStats.expansionLogs }),
                  t("program.statActions", { count: program.summaryStats.committedActions }),
                ]}
                dismissed={graduationDismissed}
                onDismiss={() => setGraduationDismissed(true)}
                onReplay={replayProgram}
              />
            ) : program.status === "not_started" && promptDismissedAt ? null : (
              <ProgramHero
                namespace="act"
                isPending={isUpdating}
                program={program}
                onStart={startProgram}
                onDismissStart={program.status === "not_started" ? dismissProgramPrompt : undefined}
                onAbandon={
                  program.status === "in_progress"
                    ? () => setAbandonConfirmVisible(true)
                    : undefined
                }
              />
            )}

            {/* Quick actions */}
            <View className="gap-3">
              <Text variant="h3">{t("home.quickActionsTitle")}</Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button onPress={() => router.push("/modules/act/defusion/new")}>
                    <Icon name="filter-drama" className="size-4 text-primary-foreground" />
                    <Text>{t("home.defuseThought")}</Text>
                  </Button>
                </View>
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button
                    variant="secondary"
                    onPress={() => router.push("/tools/mood-tracker/new")}
                  >
                    <Text>{t("home.logMood")}</Text>
                  </Button>
                </View>
              </View>
            </View>

            {/* Six principles */}
            <View className="gap-3">
              <Text variant="h3">{t("home.principlesTitle")}</Text>
              <Text variant="muted" className="max-w-[64ch]">
                {t("home.principlesDescription")}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {PRINCIPLE_CARDS.map((card) => (
                  <PrincipleCardItem key={card.key} card={card} />
                ))}
              </View>
            </View>

            {/* Recent defusion logs */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("home.recentDefusionTitle")}
                </Text>
                {defusionLogs && defusionLogs.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => router.push("/modules/act/defusion")}
                  >
                    <Text className="text-sm text-act">{t("home.viewAllDefusion")}</Text>
                  </Pressable>
                ) : null}
              </View>

              {recentLogs.length === 0 ? (
                <Text variant="muted">{t("home.noDefusionLogs")}</Text>
              ) : (
                <View className="gap-2">
                  {recentLogs.map((log) => (
                    <View key={log.id} className="rounded-lg border border-border bg-card p-3">
                      <Text className="font-medium" numberOfLines={2}>
                        {log.fusedThought}
                      </Text>
                      <Text variant="muted" className="mt-1 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                        {log.fusionLevelBefore !== null && log.fusionLevelAfter !== null
                          ? `  ·  ${log.fusionLevelBefore} → ${log.fusionLevelAfter}`
                          : null}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <CrisisSupportCallout />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
```

- [ ] **Step 4: Replace PrincipleCardItem function**

Replace the entire `function PrincipleCardItem` at the bottom of the file with:

```tsx
function PrincipleCardItem({ card }: { card: PrincipleCard }) {
  const { t } = useTranslation("act");
  const available = card.route !== null;

  const cardContent = (
    <Card className={cn("flex-1", available ? "border-act/30" : "opacity-60")}>
      <CardHeader>
        <View className="mb-1 flex-row items-center gap-3">
          <View
            className={cn(
              "size-9 items-center justify-center rounded-lg",
              available ? "bg-act/15" : "bg-muted",
            )}
          >
            <Icon
              name={card.icon}
              className={cn("size-5", available ? "text-act" : "text-muted-foreground")}
            />
          </View>
          {!available ? (
            <Text className="text-xs text-muted-foreground">{t("home.comingSoon")}</Text>
          ) : null}
        </View>
        <CardTitle>{t(`principles.${card.key}.name`)}</CardTitle>
        <CardDescription>{t(`principles.${card.key}.desc`)}</CardDescription>
      </CardHeader>
    </Card>
  );

  return (
    <View className="relative min-w-[240px] flex-1 basis-[240px]">
      {available ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(`principles.${card.key}.name`)}
          accessibilityHint={t(`principles.${card.key}.desc`)}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => router.push(card.route!)}
          className="flex-1 active:opacity-80"
        >
          {cardContent}
        </Pressable>
      ) : (
        cardContent
      )}
      <View className="absolute right-1 top-1">
        <HelpButton helpKey={card.helpKey} size={18} />
      </View>
    </View>
  );
}
```

Note: `min-w-[240px] flex-1 basis-[240px]` moves from the inner Card/Pressable to the outer `View` wrapper. The `Card` and `Pressable` become `flex-1` to fill it.

- [ ] **Step 5: Delete parseHour and parseMinute helper functions**

These two standalone functions (between the `import` block and `ActHomeScreen`) were only used by `handleWizardComplete`. Delete them from `src/features/act/act-home-screen.tsx`:

```tsx
// DELETE these two functions entirely:
function parseHour(time: string): number {
  const [h] = time.split(":");
  const n = Number(h);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 19;
}

function parseMinute(time: string): number {
  const [, m] = time.split(":");
  const n = Number(m);
  return Number.isFinite(n) && n >= 0 && n <= 59 ? n : 0;
}
```

- [ ] **Step 6: Type-check and lint**

```bash
npx tsc --noEmit && npx eslint src/features/act/act-home-screen.tsx
```

Expected: no errors.

- [ ] **Step 7: Run tests**

```bash
npm test -- --testPathPattern="act|help" --forceExit
```

Expected: all pass (no ACT home screen test file exists; Jest will exit cleanly).

- [ ] **Step 8: Commit**

```bash
git add src/features/act/act-home-screen.tsx
git commit -m "feat(act): add help buttons to principle cards, remove wizard"
```
