# Program Cogwheel Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Important:** Do NOT commit. Leave all commits to the user.

**Goal:** Add a cogwheel icon to the in-progress `ProgramHero` header that opens a Popover menu with a single "Abandon program" action, replacing the existing standalone abandon button.

**Architecture:** Single shared component (`ProgramHero`) used by both CBT and ACT programs. The cogwheel renders only when `onAbandon` is provided. Uses the existing `Popover`/`PopoverTrigger`/`PopoverContent` primitives — same pattern as `UserMenu`. One new i18n key (`manageLabel`) in both locales.

**Tech Stack:** React Native, `@rn-primitives/popover`, react-i18next, Jest + React Native Testing Library.

---

## File Map

| Action | Path                                       |
| ------ | ------------------------------------------ |
| Modify | `src/i18n/locales/en/cbt.json`             |
| Modify | `src/i18n/locales/bg/cbt.json`             |
| Modify | `src/components/app/program-hero.test.tsx` |
| Modify | `src/components/app/program-hero.tsx`      |

---

## Task 1: i18n + Test (TDD)

**Files:**

- Modify: `src/i18n/locales/en/cbt.json`
- Modify: `src/i18n/locales/bg/cbt.json`
- Modify: `src/components/app/program-hero.test.tsx`

- [ ] **Step 1: Add `manageLabel` to English locale**

In `src/i18n/locales/en/cbt.json`, inside the `"program"` object, add after `"abandon"`:

```json
"manageLabel": "Program options"
```

- [ ] **Step 2: Add `manageLabel` to Bulgarian locale**

In `src/i18n/locales/bg/cbt.json`, inside the `"program"` object, add after `"abandon"`:

```json
"manageLabel": "Опции на програмата"
```

- [ ] **Step 3: Write the failing test**

In `src/components/app/program-hero.test.tsx`, replace the existing `"calls onAbandon from the expanded other-weeks area"` test with:

```typescript
it("calls onAbandon via the cogwheel menu", () => {
  const onAbandon = jest.fn();
  renderWithProviders(
    <ProgramHero program={view({})} onAbandon={onAbandon} onStart={jest.fn()} />,
  );
  // Abandon option not visible until menu is opened
  expect(screen.queryByText("Abandon program")).toBeNull();
  // Open the cogwheel menu
  fireEvent.press(screen.getByLabelText("Program options"));
  // Abandon option now visible; press it
  fireEvent.press(screen.getByText("Abandon program"));
  expect(onAbandon).toHaveBeenCalled();
});
```

- [ ] **Step 4: Run test — expect failure**

```bash
npx jest --no-coverage --testPathPattern="program-hero"
```

Expected: `FAIL` — `getByLabelText("Program options")` not found (element doesn't exist yet).

---

## Task 2: Implementation

**Files:**

- Modify: `src/components/app/program-hero.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/app/program-hero.tsx` in full before editing. The key sections are:

- Imports at the top
- The `in_progress` return block starting around line 107
- The header `<View className="flex-row items-start gap-2">` containing `HelpButton`
- The standalone abandon `Button` near the bottom of the `in_progress` return

- [ ] **Step 2: Add imports**

Add to the existing imports:

```typescript
import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/react-native-reusables/popover";
import type { TriggerRef } from "@rn-primitives/popover";
```

- [ ] **Step 3: Replace the `in_progress` return block**

Replace the entire `in_progress` return (from `return (` after `const doneCount = ...` to the end of the function) with:

```typescript
  const triggerRef = React.useRef<TriggerRef>(null);

  return (
    <View className="gap-3 rounded-2xl border border-act/30 bg-act/5 p-5">
      <View className="gap-1">
        <View className="flex-row items-start gap-2">
          <Text variant="h3" className="flex-1 text-act">
            {t("program.heroTitle")} - {t(current.themeLabelKey)}
          </Text>
          {onAbandon ? (
            <Popover>
              <PopoverTrigger asChild ref={triggerRef}>
                <Pressable
                  accessibilityLabel={t("program.manageLabel")}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  className="-mr-1 -mt-1 size-8 items-center justify-center rounded-full active:bg-act/10"
                  role="button"
                >
                  <Icon name="settings" className="size-[18px] text-muted-foreground" />
                </Pressable>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" className="w-52 p-1">
                <Pressable
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => {
                    triggerRef.current?.close();
                    onAbandon();
                  }}
                  className="flex-row items-center gap-3 rounded-sm px-3 py-2 active:bg-accent"
                  role="button"
                >
                  <Icon name="warning" className="size-4 text-destructive" />
                  <Text className="text-sm text-destructive">{t("program.abandon")}</Text>
                </Pressable>
              </PopoverContent>
            </Popover>
          ) : null}
          <HelpButton helpKey={programHelpKey} size={18} />
        </View>
        <Text variant="muted" className="text-sm">
          {t("program.weekProgress", {
            current: program.currentWeekIndex + 1,
            total: program.totalWeeks,
          })}
          {" - "}
          {t("program.weekTasksDone", { done: doneCount, total: current.tasks.length })}
        </Text>
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-2 rounded-full bg-act"
          style={{ width: `${(program.weeksComplete / program.totalWeeks) * 100}%` }}
        />
      </View>

      <View className="gap-2">
        {current.tasks.map((task) => (
          <TaskRow key={task.key} task={task} namespace={namespace} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={() => setShowOthers((prev) => !prev)}
        className="flex-row items-center gap-2"
        role="button"
      >
        <Icon
          name={showOthers ? "expand-less" : "expand-more"}
          className="size-5 text-muted-foreground"
        />
        <Text variant="muted" className="text-sm">
          {t("program.otherWeeks")}
        </Text>
      </Pressable>

      {showOthers ? (
        <View className="gap-2">
          {otherWeeks.map((week) => (
            <View key={week.key} className="gap-2 rounded-lg border border-border p-3">
              <Text className="text-sm font-semibold">{t(week.themeLabelKey)}</Text>
              {week.tasks.map((task) => (
                <TaskRow key={task.key} task={task} namespace={namespace} />
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
```

Note: `triggerRef` must be declared inside the function body but outside any conditionals. Since the component already has `const current = ...` etc. declared before the return, add `const triggerRef = React.useRef<TriggerRef>(null);` alongside those declarations (before the `return`).

- [ ] **Step 4: Run tests — expect pass**

```bash
npx jest --no-coverage --testPathPattern="program-hero"
```

Expected: `PASS` — all 7 tests green.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

---

**When done, stage and commit:**

```
src/i18n/locales/en/cbt.json
src/i18n/locales/bg/cbt.json
src/components/app/program-hero.tsx
src/components/app/program-hero.test.tsx
```

Suggested message: `feat: add cogwheel menu to program hero with abandon action`
