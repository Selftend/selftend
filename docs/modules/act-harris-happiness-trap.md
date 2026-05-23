# ACT Program Spec - Harris: The Happiness Trap

**Source:** _The Happiness Trap: How to Stop Struggling and Start Living_ - Russ Harris, **second edition** (Trumpeter / Shambhala, 2022)
**Status:** Canonical spec for the ACT module. The six core principle tools are implemented; this revision (a) reconciles the module to the second edition, and (b) adds a guided four-week program mirroring the CBT program.
**Audience:** Developers and product contributors

---

## 0. What This Revision Changes

The first edition of this spec described the 1st-edition hexaflex (six principles, `ACE = Accept / Connect / Take action`, Bull's-Eye). The second edition reorganizes ACT around the **Choice Point** and **three pillars** - **Be Present, Open Up, Do What Matters** - and foregrounds several signature tools the module does not yet have. This revision keeps the six implemented principle tools as the catalog and layers the second-edition framing on top.

**Added / changed in this revision:**

- **Foundation layer:** the Choice Point (toward/away moves, hooks, OBEY/STRUGGLE), a fillable Choice Point map, and a creative-hopelessness reflection.
- **Be Present:** Drop Anchor (the **ACE** formula), guided body scan.
- **Open Up:** expansion reframed as **TAME**; new defusion techniques (Name the Process, Play with Text, Adding a Soundtrack, Shifting Locations); a discrete **self-compassion** tool (kind hands + kind self-talk); a worry/rumination "dipping in and out of the stream" variant; healing-the-past reflection; savoring linked to the gratitude-log tool.
- **Do What Matters:** **willingness** and **HARD barriers** on committed action; the Challenge Formula / Values Square flow; **breaking bad habits** (5 questions); **difficult decisions** (10-step); a **maintenance plan** capstone (the 7 R's) that the program graduates on.
- **A four-week guided program** (`ACT_PROGRAM`) mirroring the CBT program machinery.

The implemented module already covers: defusion, expansion (1st-ed four-step), connection, observing self, values + Bull's-Eye, committed action, urge surfing, program-state, and onboarding scaffolding. Those remain; the items above extend or reframe them.

---

## 1. Framework Overview

### The Happiness Trap

Society holds several myths about happiness that keep us stuck. The most load-bearing for ACT:

1. **Happiness is the natural state of human beings.** It is not - the mind evolved to scan for danger, compare, and judge. Painful thoughts and feelings are a built-in feature, not a malfunction.
2. **If you're not happy, something is wrong with you.** Unhappiness is a normal part of a full life, not evidence of defect.
3. **You should be able to control what you think and feel.** We control external behavior far more readily than internal states; the harder we fight thoughts and feelings, the stronger their grip.

These create the **Happiness Trap**: the harder we try to feel good and avoid pain, the more we suffer. The technical term for the maintaining process is **experiential avoidance**.

### The Choice Point (the second-edition spine)

At any moment, the things we say and do are either **toward moves** (behaviors that take us toward the life and the person we want to be) or **away moves** (behaviors that keep us stuck or make life worse in the long term). Whether a given behavior is "toward" or "away" depends entirely on the situation and on the individual - the technical name for this is **workability**.

Difficult situations, thoughts, and feelings (collectively, **hooks**) tend to pull us into away moves. We get hooked in two overlapping modes:

| Mode         | What happens                                               | ACT technical term     |
| ------------ | ---------------------------------------------------------- | ---------------------- |
| **OBEY**     | Thoughts/feelings dominate attention or dictate action     | Fusion                 |
| **STRUGGLE** | We fight, avoid, suppress, or escape the thoughts/feelings | Experiential avoidance |

```
            TOWARD MOVES  (values-guided, life-enhancing)
                  ^
                  |
   hooked? ---- unhook ----  CHOICE POINT
                  |
                  v
            AWAY MOVES  (OBEY / STRUGGLE, life-diminishing)

   hooks (at the bottom): difficult situations, thoughts, feelings, urges, memories
```

**Unhooking skills** are what create the choice. Without them, the default is to get hooked and pulled into away moves. The whole program builds the ability to unhook and choose toward moves.

### The Three Pillars

The second edition groups the six core processes into three practical pillars:

| Pillar              | ACT processes it contains                         | One-line aim                                 |
| ------------------- | ------------------------------------------------- | -------------------------------------------- |
| **Be Present**      | Contact with the present moment + Observing Self  | Notice and engage with the here and now      |
| **Open Up**         | Defusion + Acceptance/Expansion (+ self-kindness) | Unhook from thoughts; make room for feelings |
| **Do What Matters** | Values + Committed Action                         | Clarify what counts and take guided action   |

The three-word summary used throughout the book and the UI: **Be Present, Open Up, Do What Matters.** The overarching goal is **psychological flexibility** - the ability to be present, open up, and do what matters, even when painful thoughts and feelings are present.

### Core Principles (tone and stance)

- **Acceptance-based** - the aim is not to feel better but to get better at feeling; pain is inevitable, struggle is optional.
- **Values-driven** - every tool ultimately serves the user's clarified values, not symptom reduction.
- **Present-focused** - each exercise returns attention to what is happening now.
- **Workability over truth** - we never debate whether a thought is "true"; we ask whether acting on it is a toward or away move.
- **Experiment and practice** - every tool is offered as an experiment; skills come from repeated practice, not reading.
- **Non-clinical tone** - second person, warm, no pathologizing language.

---

## 2. Tool Inventory & Gap Status

Audit of the second-edition tools against the implemented module (`src/features/act/types.ts` + routes). **Legend:** Have / Partial (exists but not in 2nd-ed form) / Missing.

### Foundation

| Tool (book ch.)                                        | Status  | Disposition                                               |
| ------------------------------------------------------ | ------- | --------------------------------------------------------- |
| Choice Point - toward/away, hooks, OBEY/STRUGGLE (2)   | Missing | Add primer + fillable map (`act_choice_points`)           |
| Happiness-trap myths (1, 3)                            | Partial | Reframe onboarding to 2nd-ed wording                      |
| Creative hopelessness - tried / worked? / cost? (3, 4) | Missing | Add 3-prompt reflection in onboarding + revisitable entry |

### Be Present

| Tool (book ch.)                             | Status  | Disposition                                             |
| ------------------------------------------- | ------- | ------------------------------------------------------- |
| Drop Anchor / **ACE** (5)                   | Missing | Add `dropAnchor` connection technique + guided ACE flow |
| Noticing env / body / breath / sounds (16)  | Have    | `connection: noticeFiveThings, mindfulActivity`         |
| Ten slow breaths (9)                        | Have    | `tenDeepBreaths`                                        |
| Reinhabiting the body / body scan (17)      | Partial | Add `bodyScan`; link to meditation tools                |
| Observing/Noticing Self, chessboard (9, 19) | Have    | `observing-self: observingFromBoard`                    |

### Open Up

| Tool (book ch.)                                            | Status  | Disposition                                              |
| ---------------------------------------------------------- | ------- | -------------------------------------------------------- |
| Defusion: having-the-thought, musical, name the story (6)  | Have    | -                                                        |
| Name the **Process** (6)                                   | Missing | Add to `DefusionTechnique`                               |
| Thank your mind, silly voices (7)                          | Have    | -                                                        |
| **Play with Text** (7)                                     | Missing | Add to `DefusionTechnique`                               |
| Images/memories: TV screen, subtitles (8)                  | Have    | -                                                        |
| Adding a Soundtrack, Shifting Locations (8)                | Missing | Add to `DefusionTechnique`                               |
| Expansion / Making Room -> **TAME** (14)                   | Partial | Rename `fourStepExpansion` -> `tame` (legacy alias kept) |
| Struggle Switch, clean/dirty (13)                          | Have    | `struggleSwitchOn`, `discomfortType`                     |
| Urge surfing (15)                                          | Have    | `UrgeSurfLog` + screen                                   |
| **Self-compassion** / kind hands / kind self-talk (11, 15) | Missing | Add discrete tool (`act_self_compassion_logs`)           |
| Emotions psychoeducation (12)                              | Partial | Add learn surface                                        |
| Worry/rumination - dipping in & out of the stream (18)     | Missing | Add as a defusion-technique variant                      |
| Healing the past - support the younger you (20)            | Missing | Guided reflection (reuses observing/connection entry)    |
| Appreciation / savoring (21)                               | Missing | Link to existing gratitude-log tool                      |

### Do What Matters

| Tool (book ch.)                             | Status  | Disposition                                     |
| ------------------------------------------- | ------- | ----------------------------------------------- |
| Values + Bull's-Eye, domains (10, 22)       | Have    | `ValueEntry`, `BullsEyeSnapshot`                |
| Values checklist (10, 22)                   | Partial | Add guided checklist                            |
| Challenge Formula, **Values Square** (23)   | Partial | Add guided flow feeding committed action        |
| Committed action / SMART goals + steps (23) | Have    | `CommittedAction` + `ActionStep`                |
| **Willingness** (23)                        | Partial | Add `willingnessLevel` to committed action      |
| **HARD barriers** (24)                      | Missing | Add structured `hardBarriers` + antidotes       |
| Difficult decisions - 10-step (25)          | Missing | Add `act_decisions` worksheet                   |
| Breaking bad habits - 5 questions (26)      | Missing | Add `act_habit_plans`; link `habits` feature    |
| Staying the distance - **7 R's** (27)       | Missing | Add `act_maintenance_plans` capstone            |
| Ups & downs / redefining success (28, 29)   | Missing | Maintenance/relapse content in capstone + learn |

---

## 3. The Pillars and Their Tools

Each tool below lists: what it is, key concepts, techniques, tool features, user inputs, and key prompts. The six implemented principle tools are described in their pillar; new tools are marked **(new)** or **(reframe)**.

### Foundation

#### 3.0.1 The Choice Point map **(new)**

**What it is:** The orienting tool for the whole module. The user maps their current life onto a Choice Point: the hooks at the bottom, the away moves they get pulled into, and the toward moves they want more of.

**Tool features:**

- Primer screen explaining toward/away moves, hooks, OBEY/STRUGGLE, and workability.
- Fillable map the user can create and revisit; later maps show movement over time.
- Becomes the onboarding centerpiece and the home-screen mental model.

**User inputs (`ChoicePoint`):**

| Field         | Type     | Notes                                                     |
| ------------- | -------- | --------------------------------------------------------- |
| `hooks`       | string[] | Difficult situations, thoughts, feelings, urges, memories |
| `awayMoves`   | string[] | What the user does in OBEY/STRUGGLE mode                  |
| `towardMoves` | string[] | Values-guided behaviors to do more of                     |
| `notes`       | string   | Optional reflection                                       |

**Key prompts:**

- "What hooks you - the situations, thoughts, and feelings that pull you off course?"
- "When you get hooked, what do you do that makes things worse in the long run?"
- "If you were unhooked, what would you do instead - the person you want to be?"

#### 3.0.2 Creative-hopelessness reflection **(new)**

**What it is:** A short, one-time-then-revisitable reflection that surfaces the cost of the struggle, opening willingness to a different approach.

**User inputs:** `triedStrategies` (string), `shortTermEffect` (string), `longTermResult` (string), `cost` (string). Persisted as a single revisitable entry (or folded into onboarding state).

**Key prompts:** "What have you tried to get rid of these feelings?" / "How has that worked in the long term?" / "What has the struggle cost you?"

### Be Present

#### 3.1.1 Drop Anchor - the ACE formula **(new)**

**What it is:** The foundational regulation skill of the second edition. When hooked or overwhelmed, the user "drops anchor" to steady themselves - not to make feelings go away, but to take back control of their actions while the emotional storm is present.

**The ACE formula:**

- **A - Acknowledge** your thoughts and feelings (notice and name them: "I'm noticing anxiety," "here's the I'm-not-good-enough story").
- **C - Connect** with your body (push feet into the floor, straighten the spine, stretch, breathe).
- **E - Engage** in what you're doing (notice where you are, what you can see/hear; refocus on the activity at hand).

Repeat the cycle as many times as needed. The goal is not relaxation or distraction - it is grounding so the user can choose a toward move.

**Tool features:** guided ACE flow with optional timer; can be run any length; logged as a `connection` entry with `technique: "dropAnchor"`.

**Key prompts:** "Acknowledge what showed up - silently name it." / "Press your feet into the floor; notice your body." / "Now look around - where are you, what's here with you?"

#### 3.1.2 Connection - noticing **(have)**

Present-moment awareness: noticing five things, mindful activity, ten deep breaths. Notice without judging; the mind keeps chattering and that's fine - just return to now. (`ConnectionTechnique: noticeFiveThings | mindfulActivity | tenDeepBreaths | dropAnchor | bodyScan`.)

#### 3.1.3 Body scan **(new technique)**

A brief guided pass through the body, reinhabiting physical sensation. Adds `bodyScan` to connection techniques and links to the existing meditation/mindfulness tools rather than rebuilding audio.

#### 3.1.4 The Observing (Noticing) Self **(have)**

The stable, non-judgmental part of mind that notices experience - the chessboard, not the pieces; the screen, not the movie. Techniques: `tenDeepBreaths`, `observingFromBoard` (chessboard), `bodyAwareness`. A safe vantage point from which to do defusion and expansion.

### Open Up

#### 3.2.1 Defusion **(have + new techniques)**

Unhooking from thoughts: seeing them as words and pictures, not commands or facts. We never ask whether a thought is true - only whether acting on it is workable.

**Techniques (`DefusionTechnique`):**

| Technique              | How to use                                                        | Status  |
| ---------------------- | ----------------------------------------------------------------- | ------- |
| `havingTheThoughtThat` | Prefix the thought: "I'm having the thought that..."              | have    |
| `musicalThoughts`      | Sing the thought to a silly tune                                  | have    |
| `namingTheStory`       | Name the recurring narrative ("the Not-Good-Enough story")        | have    |
| `thankingYourMind`     | "Thanks, mind, for that thought"                                  | have    |
| `sillyVoices`          | Hear the thought in a cartoon voice                               | have    |
| `televisionScreen`     | See the thought as scrolling text on a TV                         | have    |
| `subtitles`            | Put foreign-language subtitles under a distressing image          | have    |
| `nameTheProcess`       | Name what the mind is doing ("worrying," "judging," "rehearsing") | **new** |
| `playWithText`         | Change the font, color, or layout of the words in your mind       | **new** |
| `addingASoundtrack`    | Add a comedic soundtrack to a painful image/memory                | **new** |
| `shiftingLocations`    | Move a distressing mental image to a different place/screen       | **new** |

**Worry/rumination - "dipping in and out of the stream" (new variant):** for repetitive cognitive away moves (worrying, ruminating, obsessing), notice the process, name it, and practice dipping attention in and out rather than being swept along. Implemented as a defusion technique + prompt set, not a new table.

`DefusionLog` fields unchanged: `fusedThought`, `thoughtCategory`, `fusionLevelBefore`, `techniqueUsed`, `defusedVersion`, `fusionLevelAfter`, `notes`.

#### 3.2.2 Expansion -> TAME **(reframe)**

**What it is:** Making room for difficult emotions and sensations rather than fighting them. The **Struggle Switch**: when on, every unpleasant feeling generates a second layer of suffering. Clean discomfort = the original feeling; dirty discomfort = the struggle we add.

**TAME (replaces the 1st-ed four-step):**

1. **T - Take note** - observe and name the feeling; locate it in the body (size, shape, weight, temperature, movement).
2. **A - Allow** - let it be there; stop fighting it.
3. **M - Make room** - breathe into it; open up space around it.
4. **E - Expand awareness** - widen attention to include the feeling _and_ the world around you, then re-engage with a toward move.

Migration: `ExpansionTechnique` value `fourStepExpansion` is renamed to `tame`; `fourStepExpansion` is retained as a legacy alias so existing rows render. Other techniques unchanged (`acceptanceSelfTalk`, `acceptanceImagery`). `ExpansionLog` fields unchanged.

#### 3.2.3 Urge surfing **(have)**

Treat an urge as a wave - it rises, peaks, and falls. Notice it, scan the body, breathe into it, watch it pass without acting. `UrgeSurfLog`: `urgeDescription`, `trigger`, `peakIntensity`, `surfingNotes`, `urgeActedOn`, `completedAt`.

#### 3.2.4 Self-compassion - kind hands & kind self-talk **(new)**

**What it is:** The second edition treats kindness as central to opening up ("TAME it with kindness"). Treating yourself as you would a good friend who is struggling.

**Techniques:**

- **Kind hands** - place a hand where the feeling is most intense; let warmth and kindness flow through it (kind self-touch).
- **Kind self-talk** - acknowledge the difficulty and offer yourself supportive words.

**Tool features:** short guided exercise + log; surfaced after expansion. Common objections ("this isn't me," "it feels weird," "it stirs up self-criticism") addressed in copy.

**User inputs (`SelfCompassionLog`):** `technique` (`kindHands | kindSelfTalk`), `whatIsHard` (string), `kindWords` (string, optional), `intensityBefore` (0-100), `intensityAfter` (0-100), `notes`.

**Key prompts:** "What would you say to a good friend feeling this?" / "Place a kind hand where it hurts." / "You don't have to like this feeling - can you hold it kindly?"

#### 3.2.5 Healing the past **(new, light)**

A guided "support the younger you" reflection for painful memories. Reuses an observing/connection-style reflective entry; no new table. Always paired with a one-tap crisis-support link given the content.

#### 3.2.6 Savoring / appreciation **(new, link-out)**

Enjoy-but-don't-cling: deliberately savoring pleasant experiences. Links to the existing gratitude-log tool with an ACT-flavored savoring prompt rather than a new data model.

### Do What Matters

#### 3.3.1 Values + Bull's-Eye + Values Square **(have + guided flow)**

Values are chosen directions, not goals - they can't be completed, only lived. Four domains: Work/Education, Leisure, Relationships, Personal Growth/Health. The Bull's-Eye rates current alignment per domain over time. **Values Square / Challenge Formula (new guided flow):** pick a domain -> name the value -> set one small, specific step -> hand it to committed action. Mostly orchestration of existing `ValueEntry` + `BullsEyeSnapshot` data.

#### 3.3.2 Committed Action + Willingness + HARD barriers **(have + new fields)**

**What it is:** Values without action are wishes. Committed action = taking values-guided steps while _willingly_ carrying the inner barriers (uncomfortable thoughts, feelings, urges) along for the ride.

**Willingness (new field):** a 0-100 slider - "How willing are you to make room for the discomfort this will bring?" Willingness is not wanting or liking; it is allowing.

**HARD barriers (new):** when an action stalls, classify the barrier and apply the antidote:

| Barrier (HARD)                 | Antidote                                   |
| ------------------------------ | ------------------------------------------ |
| **H** - Hooked                 | Unhook (defusion, drop anchor)             |
| **A** - Avoiding discomfort    | Make room (TAME), willingness              |
| **R** - Remoteness from values | Reconnect to the value the action serves   |
| **D** - Doubtful goals         | Make the goal smaller, specific, realistic |

**Updated `CommittedAction` inputs:** existing (`lifeDomain`, `title`, `description`, `status`, `targetDate`) **plus** `willingnessLevel` (0-100, nullable) and `hardBarriers` (`HardBarrier[]`). `ActionStep` unchanged.

**Key prompts:** "Which value does this serve?" / "What discomfort will show up - are you willing to carry it?" / "What's the smallest step you could take today?"

#### 3.3.3 Breaking bad habits - 5 questions **(new)**

**What it is:** A structured plan for changing an away-move habit, using the book's five questions. Links to the existing `habits` feature.

**User inputs (`HabitPlan`):**

| Field                 | Type     | Question                                       |
| --------------------- | -------- | ---------------------------------------------- | --------- | ---------- |
| `habitDescription`    | string   | The away-move habit                            |
| `triggers`            | string   | Q1: What are the triggers?                     |
| `payoffs`             | string   | Q2a: What are the payoffs?                     |
| `costs`               | string   | Q2b: What are the costs?                       |
| `alternativeBehavior` | string   | Q3: A good alternative (toward move), and why? |
| `unhookingSkills`     | string[] | Q4: Which unhooking skills are needed?         |
| `supports`            | string   | Q5: What or who can help?                      |
| `status`              | enum     | `active                                        | completed | abandoned` |

#### 3.3.4 Difficult decisions - 10-step worksheet **(new, persisted)**

**What it is:** A worksheet for tough dilemmas, following the book's ten steps (acknowledge the dilemma; weigh costs/benefits and gather info; accept there's no perfect solution; recognize not choosing is itself a choice; acknowledge today's choice; take a stand; make time to reflect; name the story; open up and make room; self-compassion).

**User inputs (`DecisionWorksheet`):** `dilemma` (string), `optionA`/`optionB` (string), `costsBenefits` (string), `chosenStand` (string), `storyName` (string, optional), `notes` (string), `decidedAt` (timestamp, nullable). Light persistence - the user can save and return.

#### 3.3.5 Maintenance plan - the 7 R's **(new capstone)**

**What it is:** The ACT analogue of the CBT recovery plan and the artifact the program graduates on. A living document of what keeps the user moving toward their values and how they'll handle setbacks.

**User inputs (`MaintenancePlan`, one per user):**

| Field               | Type     | Notes                                                                                         |
| ------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `personalDirection` | string   | The user's short statement of the toward direction (the graduation key)                       |
| `recoveryKeys`      | string[] | What helps most                                                                               |
| `sevenRs`           | object   | Reminders, Records, Rewards, Routines, Relationships, Reflecting, Restructuring (string each) |
| `setbackPlan`       | string   | Anticipated challenges and the unhooking response                                             |

**Key prompts:** "What's the short version of the direction you want to keep moving in?" / "When you slip into an away move, what will you do?" / "Which of the 7 R's will keep your new behavior going?"

---

## 4. The Four-Week Program

Mirrors the CBT program (`src/features/cbt/program-definition.ts`, `derive-program.ts`, `use-cbt-program.ts`) exactly. One pillar per week; each week mixes one **recurring daily-practice** task (counted by distinct calendar days so it cannot be cleared in a single sitting) with one or two **milestone** tasks. The program **graduates** when all four weeks are complete; graduation latches once.

### Pillars

```typescript
type ProgramPillar = "foundation" | "bePresent" | "openUp" | "doWhatMatters";
```

### Weeks, tasks, and signals

The program follows the book's teaching order (Foundation: Choice Point + Dropping Anchor → Be Present → Open Up → Do What Matters). It deliberately contains **no mood-tracking task** - ACT teaches getting better at feeling, not monitoring or improving mood, so a daily mood check-in is a CBT convention, not an ACT one. The book's first daily skill is Dropping Anchor (Ch 5), which it instructs the reader to practice repeatedly throughout the day; that is the Foundation week's daily practice.

| Week | Pillar        | Task                                                | Signal (since program start)                                     | Target | Route                                 |
| ---- | ------------- | --------------------------------------------------- | ---------------------------------------------------------------- | ------ | ------------------------------------- |
| 1    | foundation    | _Daily:_ drop anchor (ACE) - Ch 5                   | distinct days with a `connection` log, technique `dropAnchor`    | 4      | `/modules/act/connection/drop-anchor` |
| 1    | foundation    | Map your Choice Point - Ch 2                        | `choicePoints` created                                           | 1      | `/modules/act/choice-point/new`       |
| 2    | bePresent     | _Daily:_ come back to the present - Ch 16-17        | distinct days with a `connection` log, technique != `dropAnchor` | 3      | `/modules/act/connection`             |
| 2    | bePresent     | Meet your Observing Self - Ch 9, 19                 | `observingSelfSessions` created                                  | 1      | `/modules/act/observing-self`         |
| 3    | openUp        | _Daily:_ unhook from a thought - Ch 6-8             | distinct days with a `defusion` log                              | 3      | `/modules/act/defusion`               |
| 3    | openUp        | Make room for a feeling, or surf an urge - Ch 12-15 | `expansionLogs` + `urgeSurfLogs` created                         | 1      | `/modules/act/expansion`              |
| 4    | doWhatMatters | _Daily:_ take a values-guided step - Ch 23          | distinct days with a completed `actionStep`                      | 4      | `/modules/act/committed-action`       |
| 4    | doWhatMatters | Clarify what matters - Ch 22                        | `valueEntries` updated                                           | 1      | `/modules/act/values`                 |
| 4    | doWhatMatters | Set a committed-action plan - Ch 23                 | `committedActions` created                                       | 1      | `/modules/act/committed-action/new`   |

Daily-practice targets (4, 3, 3, 4) keep the recurring practices achievable so a missed day is not punished. Phase 3 adds a maintenance-plan (7 R's) capstone to the Do What Matters week, and folds self-compassion (Ch 11) into the Week-3 "make room or surf an urge" task.

### Machinery

New files in `src/features/act/`, mirroring CBT:

- `program-definition.ts` - exports `ACT_PROGRAM: ProgramWeek[]`, the `ProgramPillar` type, `ActProgramSignalData` (choice points, connection/defusion/expansion/urge logs, observing sessions, value entries, committed actions, action steps - no mood logs), and shared helpers (`atOrAfter`, `countSince`, `distinctDays`, `DAILY_PRACTICE_TARGET`).
- `derive-act-program.ts` - `deriveActProgram(input): ActProgramView` with statuses `not_started | in_progress | graduated`, per-week/-task progress, `summaryStats`, `currentWeekIndex`.
- `use-act-program.ts` - reads the ACT queries + `useUserPreferences`; exposes `startProgram`, `dismissProgramPrompt`, `showProgramPrompt`, `abandonProgram`, `replayProgram`; latches graduation by persisting `actProgramCompletedAt` once when `allWeeksComplete`.

Preference flags on `user_preferences` (mirror `cbt_program_*`): `act_program_started_at`, `act_program_completed_at`, `act_program_prompt_dismissed_at`.

**Shared UI:** parameterize `src/components/app/program-hero.tsx` and `program-graduation.tsx` by module (labels, pillar names, and i18n namespace) so both CBT and ACT reuse one component rather than forking. The ACT home screen (`/modules/act`) renders the hero; the program prompt and graduation surfaces follow the CBT pattern.

### Program milestones (informational)

| Milestone  | Conditions                                                                          |
| ---------- | ----------------------------------------------------------------------------------- |
| Week 1     | Choice Point mapped; dropping anchor on several days                                |
| Week 2     | Present-moment practice on several days; an observing-self session                  |
| Week 3     | Defusion on several days; a feeling made room for, or an urge surfed                |
| Week 4     | A value clarified; a committed-action plan set; values-guided steps on several days |
| Graduation | All four weeks complete                                                             |

---

## 5. Core Data Model

camelCase fields, stored in Supabase with RLS owner-only policies, mirroring CBT. Every entity has implicit `id` (uuid), `userId`, `createdAt`, `updatedAt` unless noted.

```typescript
// Foundation (new)
ChoicePoint {
  hooks: string[]
  awayMoves: string[]
  towardMoves: string[]
  notes: string
}

CreativeHopelessnessEntry {        // single revisitable entry (or fold into program state)
  triedStrategies: string
  shortTermEffect: string
  longTermResult: string
  cost: string
}

// Be Present (existing, technique enums extended)
ConnectionLog {
  technique: ConnectionTechnique   // + dropAnchor, bodyScan
  activityContext: string
  noticesFromSenses: string
  durationMinutes: integer | null
  moodAfter: integer | null        // 1-10
  notes: string
}

ObservingSelfSession {
  techniqueUsed: ObservingTechnique
  whatWasObserved: string
  durationMinutes: integer | null
  moodAfter: integer | null
  notes: string
}

// Open Up
DefusionLog {                      // technique enum extended
  fusedThought: string
  thoughtCategory: ThoughtCategory
  fusionLevelBefore: integer | null   // 0-100
  techniqueUsed: DefusionTechnique
  defusedVersion: string
  fusionLevelAfter: integer | null    // 0-100
  notes: string
}

ExpansionLog {                     // techniqueUsed: 'tame' (was 'fourStepExpansion')
  emotion: string
  bodySensation: string
  intensityBefore: integer | null  // 0-100
  struggleSwitchOn: boolean | null
  discomfortType: 'clean' | 'dirty' | null
  techniqueUsed: ExpansionTechnique
  intensityAfter: integer | null
  notes: string
}

UrgeSurfLog {
  urgeDescription: string
  trigger: string
  peakIntensity: integer | null
  surfingNotes: string
  urgeActedOn: boolean
  completedAt: timestamp
}

SelfCompassionLog {                // new
  technique: 'kindHands' | 'kindSelfTalk'
  whatIsHard: string
  kindWords: string
  intensityBefore: integer | null  // 0-100
  intensityAfter: integer | null   // 0-100
  notes: string
}

// Do What Matters
ValueEntry {
  lifeDomain: ACTLifeDomain
  valueStatement: string
  importanceRating: integer | null        // 1-10
  currentAlignmentRating: integer | null   // 1-10 (Bull's-Eye)
  currentActionsNote: string
  desiredActionsNote: string
  barriers: string
}

BullsEyeSnapshot {
  domain: ACTLifeDomain
  alignmentRating: integer          // 1-10
  reviewedAt: timestamp
}

CommittedAction {                   // + willingnessLevel, hardBarriers
  lifeDomain: ACTLifeDomain
  title: string
  description: string
  status: 'active' | 'completed' | 'abandoned'
  targetDate: date | null
  willingnessLevel: integer | null  // 0-100  (new)
  hardBarriers: HardBarrier[]       // new
}

ActionStep {
  actionId: string
  description: string
  isCompleted: boolean
  completedAt: timestamp | null
}

HabitPlan {                         // new
  habitDescription: string
  triggers: string
  payoffs: string
  costs: string
  alternativeBehavior: string
  unhookingSkills: string[]
  supports: string
  status: 'active' | 'completed' | 'abandoned'
}

DecisionWorksheet {                 // new (light)
  dilemma: string
  optionA: string
  optionB: string
  costsBenefits: string
  chosenStand: string
  storyName: string
  notes: string
  decidedAt: timestamp | null
}

MaintenancePlan {                   // new, one per user
  personalDirection: string         // graduation key
  recoveryKeys: string[]
  sevenRs: {
    reminders: string
    records: string
    rewards: string
    routines: string
    relationships: string
    reflecting: string
    restructuring: string
  }
  setbackPlan: string
}

// Program state (existing) + new program flags live on user_preferences
ACTProgramState {
  activePrinciples: ACTPrinciple[]
  primaryConcerns: ACTConcern[]
  mythsAcknowledged: boolean
  onboardingCompletedAt: timestamp | null
  lastCheckInAt: timestamp | null
  preferredCheckInTime: string | null
}

// Global
MoodLog {
  moodScore: integer                // 1-10
  emotions: string[]
  notes: string
  linkedPrinciple: ACTPrinciple | null
  loggedAt: timestamp
}
```

### Shared Enums

```typescript
type ACTPrinciple =
  | "defusion"
  | "expansion"
  | "connection"
  | "observingSelf"
  | "values"
  | "committedAction";

type ProgramPillar = "foundation" | "bePresent" | "openUp" | "doWhatMatters";

type ACTLifeDomain = "work" | "leisure" | "relationships" | "personalGrowth";

type ACTConcern =
  | "anxiety"
  | "depression"
  | "anger"
  | "urgesAddiction"
  | "selfCriticism"
  | "procrastination"
  | "grief"
  | "other";

type ThoughtCategory =
  | "selfJudgment"
  | "worry"
  | "pastRegret"
  | "prediction"
  | "ruleStatement"
  | "other";

type DefusionTechnique =
  | "havingTheThoughtThat"
  | "musicalThoughts"
  | "namingTheStory"
  | "thankingYourMind"
  | "sillyVoices"
  | "televisionScreen"
  | "subtitles"
  | "nameTheProcess"
  | "playWithText"
  | "addingASoundtrack"
  | "shiftingLocations"; // new

type ExpansionTechnique = "tame" | "acceptanceSelfTalk" | "acceptanceImagery";
// legacy alias: "fourStepExpansion" maps to "tame" for existing rows

type ConnectionTechnique =
  | "noticeFiveThings"
  | "mindfulActivity"
  | "tenDeepBreaths"
  | "dropAnchor"
  | "bodyScan"; // new

type ObservingTechnique = "tenDeepBreaths" | "observingFromBoard" | "bodyAwareness";

type HardBarrier = "hooked" | "avoidingDiscomfort" | "remotenessFromValues" | "doubtfulGoals";
```

### Tables

Existing (RLS owner-only): `act_program_state`, `act_defusion_logs`, `act_expansion_logs`, `act_urge_surf_logs`, `act_connection_logs`, `act_observing_self_sessions`, `act_value_entries`, `act_bulls_eye_snapshots`, `act_committed_actions`, `act_action_steps`.

New (RLS owner-only): `act_choice_points`, `act_self_compassion_logs`, `act_habit_plans`, `act_decisions`, `act_maintenance_plans` (one row per user), and optionally `act_creative_hopelessness` (or fold into `act_program_state`).

Column additions: `act_committed_actions.willingness_level`, `act_committed_actions.hard_barriers`; `CHECK`-constraint updates for the extended `act_defusion_logs.technique_used`, `act_expansion_logs.technique_used`, and `act_connection_logs.technique`.

---

## 6. Module Contract

Follows the contract in `tools.md`:

- `ModuleKey: "act"` (already in the union). ACT is opt-in via the modules discovery screen; default `enabledModules` stays `["cbt"]`.
- i18n namespace: `act:*`. Program strings live under `act:program.*` (weeks, tasks, pillars), mirroring `cbt:program.*`.
- Route group: `/modules/act/*` (see §7).
- `user_preferences` fields: existing onboarding/reminder fields plus the three new program flags (`act_program_started_at`, `act_program_completed_at`, `act_program_prompt_dismissed_at`).
- Reminders default off; single daily check-in; non-punitive copy.
- Settings can reset the onboarding flag and abandon/replay the program (same pattern as CBT).

---

## 7. Routes

| Route                                 | Purpose                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `/modules/act`                        | Home: program hero, daily check-in, Bull's-Eye overview, recent practice |
| `/modules/act/onboarding`             | Full-screen onboarding fallback                                          |
| `/modules/act/learn`                  | Primer: happiness trap, Choice Point, three pillars, ACT overview        |
| `/modules/act/choice-point`           | Choice Point list **(new)**                                              |
| `/modules/act/choice-point/new`       | Create/edit a Choice Point map **(new)**                                 |
| `/modules/act/choice-point/[id]`      | Choice Point detail **(new)**                                            |
| `/modules/act/defusion`               | Defusion log + technique library                                         |
| `/modules/act/expansion`              | Expansion (TAME) + Struggle Switch                                       |
| `/modules/act/expansion/urge-surfing` | Urge surfing flow                                                        |
| `/modules/act/self-compassion`        | Kind hands / kind self-talk **(new)**                                    |
| `/modules/act/connection`             | Noticing + Drop Anchor (ACE) flow                                        |
| `/modules/act/observing-self`         | Ten Deep Breaths / chessboard                                            |
| `/modules/act/values`                 | Values questionnaire + Bull's-Eye + Values Square flow                   |
| `/modules/act/values/bulls-eye`       | Full Bull's-Eye with snapshot history                                    |
| `/modules/act/committed-action`       | Action plans (willingness + HARD barriers)                               |
| `/modules/act/committed-action/[id]`  | Plan detail                                                              |
| `/modules/act/break-habit`            | Breaking-habits 5-question plans **(new)**                               |
| `/modules/act/decisions`              | Difficult-decisions worksheets **(new)**                                 |
| `/modules/act/maintenance`            | Maintenance plan / 7 R's capstone **(new)**                              |
| `/tools/act`                          | Compatibility redirect to `/modules/act`                                 |

---

## 8. Onboarding Flow (Modal Wizard)

Mirrors `src/components/app/cbt-onboarding-modal.tsx`. Five steps; only Step 1 mandatory. Completion tracked via `act_onboarding_completed`. Full content also at `/modules/act/onboarding`.

1. **Welcome - The Happiness Trap.** The myths; your mind isn't broken, it evolved for survival. This is about building a rich, meaningful life, not fixing your feelings.
2. **The Choice Point + Three Pillars.** Toward/away moves, getting hooked (OBEY/STRUGGLE), and the three pillars (Be Present, Open Up, Do What Matters). Optionally fill a first Choice Point map.
3. **What brings you here?** Multi-select concern picker (plain language). Stored on `act_program_state.primaryConcerns`.
4. **Your values - a quick look.** Rate current alignment (1-10) per Bull's-Eye domain; writes initial `BullsEyeSnapshot` rows.
5. **Start the program or a first practice.** Offer to start the four-week program, or recommend one principle (see §11). Optional daily check-in time + reminder toggle (default off).

Skippable after Step 1; user lands with all six principle tools available and defusion as the default starting point.

---

## 9. Daily Flow

- **Morning check-in:** mood log (1-10), one-line intention ("Today I will act on my value of \_\_\_"), Bull's-Eye highlight.
- **During the day (on-demand):** drop anchor when overwhelmed; defusion for a sticky thought; TAME for a difficult feeling; urge surfing; self-compassion; a connection pause.
- **Evening check-in:** mood log, one committed action taken today (even tiny), one thing noticed from the Observing Self.
- **Weekly review (configurable day):** 7-day mood trend; Bull's-Eye update; committed-action review; recurring-story patterns; values drift; "What was your biggest act of psychological flexibility this week?"

---

## 10. Implementation Sequencing

| Phase                                  | Scope                                                                                                                                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 - Foundation & scaffolding**       | Choice Point primer + map, creative-hopelessness reflection, Drop Anchor/ACE, 2nd-ed onboarding & learn; program scaffolding (`program-definition`, `derive-act-program`, `use-act-program`); parameterize `program-hero`/`program-graduation` by module. |
| **2 - Open Up reconciliation**         | TAME rename (+ legacy alias), new defusion techniques, worry/rumination variant, self-compassion tool.                                                                                                                                                    |
| **3 - Do What Matters reconciliation** | Willingness + HARD barriers on committed action, Challenge Formula / Values Square flow, maintenance-plan capstone.                                                                                                                                       |
| **4 - Supplementary**                  | Break-habit 5-Q, difficult decisions, healing the past, savoring link.                                                                                                                                                                                    |
| **5 - Activate program**               | Wire `ACT_PROGRAM` weeks/tasks/signals to the above, graduation latch, home insights.                                                                                                                                                                     |

Phases 1-4 build the tools the program references; Phase 5 activates the program once the capstone (maintenance plan), Choice Point, and self-compassion exist.

---

## 11. Concern -> Starting Principle Mapping

Used in onboarding to recommend a first principle. Stored on `act_program_state.primaryConcerns`. (Matches the implemented `RECOMMENDED_PRINCIPLE` map.)

| Concern                    | Recommend first                       | Why                                                                                      |
| -------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Anxiety / worry            | Defusion, then Expansion              | Fusion with "what if" stories + struggle against the sensations                          |
| Depression / low mood      | Values, then Committed Action         | Disconnection from values + withdrawal; values-guided action breaks the cycle            |
| Harsh self-criticism       | Defusion, then Observing Self         | A fused "I am a failure" story; the Observing Self can witness it without being it       |
| Urges / addictive patterns | Expansion (urge surfing), then Values | Surfing the wave + reconnecting to values weakens the pull                               |
| Anger                      | Defusion, then Connection             | Fused "I've been wronged" stories; defusion + present-moment grounding interrupt it      |
| Procrastination            | Committed Action, then Defusion       | Permission-giving thoughts + discomfort avoidance; willingness + small steps cut through |
| Grief / loss               | Expansion, then Values                | Make room for sorrow (not eliminate it); values reconnect to meaning ahead               |

If multiple concerns are selected, default to defusion (it underlies the others). For depression, seed the values questionnaire with activation prompts.

---

## 12. Cross-Cutting Features

### Mood tracking (global)

Logged at morning/evening check-ins, after connection and observing sessions, optionally after defusion/expansion. Dashboard shows 7-day and 30-day charts. Mood of 1-2 triggers a crisis-support prompt.

### Dashboard (`/modules/act`)

Program hero (current week/tasks or prompt to start); daily check-in card; Bull's-Eye mini-map; quick-access (log mood, drop anchor, defuse a thought, TAME a feeling); recent practice across principles.

### Notifications

Explicit opt-in, quiet by default, easy to disable. Allowed: daily check-in reminder; weekly review prompt (off by default); committed-action step reminders when a due date is set. Out of scope: default-on reminders, streak/habit-preservation reminders, missed-day warnings, milestone pushes, crisis follow-ups.

### Safety

Mood 1-2 -> crisis support message + local crisis line. Expansion, observing-self, and healing-the-past surfaces note that intense emotions may surface and keep a one-tap crisis-support link. Not a substitute for professional help (disclaimer in onboarding + settings). No clinical diagnostic labels in UI copy.

### Tone

Second person, warm, non-judgmental. Avoid pathologizing language ("a difficult feeling," not "a symptom"; "a sticky thought," not "a distortion"). Normalize struggle ("your mind is doing its job"). Celebrate small acts of willingness, not just completed tasks. Never shame incomplete logs or abandoned plans or an abandoned program.

---

## 13. Non-Goals

- AI features.
- Community or peer-sharing features.
- Generic journaling mixed into the ACT flow.
- Clinical diagnostic labels in UI copy.
- PHQ-9 / GAD-7 or other scored clinical scales in MVP.
- Therapist portal (single-user in v1).
- Streak pressure or habit-preservation language.
- Claims that ACT will eliminate painful emotions.

---

## 14. Glossary

| Term                       | Definition as used in this tool                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| ACT                        | Acceptance and Commitment Therapy; pronounced "act"                                                  |
| Psychological flexibility  | Being present, opening up, and doing what matters even when pain is present                          |
| The Happiness Trap         | The vicious cycle where trying to avoid pain creates more suffering                                  |
| Experiential avoidance     | Trying to escape or suppress unwanted inner experiences (the STRUGGLE mode)                          |
| Choice Point               | The moment where we respond to a hook with a toward move or an away move                             |
| Toward move                | A behavior that takes you toward the life/person you want; "workable"                                |
| Away move                  | A behavior that keeps you stuck or makes life worse long term; "unworkable"                          |
| Hook                       | A difficult situation, thought, feeling, urge, or memory that pulls toward away moves                |
| OBEY mode                  | Letting thoughts/feelings dominate attention or dictate action (fusion)                              |
| STRUGGLE mode              | Fighting, avoiding, or suppressing thoughts/feelings (experiential avoidance)                        |
| Workability                | Whether a behavior moves you toward the life you want, in this situation                             |
| Be Present                 | Pillar: contact with the present moment + the Observing Self                                         |
| Open Up                    | Pillar: defusion + acceptance/expansion + self-kindness                                              |
| Do What Matters            | Pillar: values + committed action                                                                    |
| Drop Anchor / ACE          | Grounding skill: Acknowledge thoughts & feelings, Connect with the body, Engage in what you're doing |
| Fusion / Defusion          | Treating thoughts as facts/commands / seeing them as words and pictures                              |
| Expansion / TAME           | Making room for feelings: Take note, Allow, Make room, Expand awareness                              |
| Struggle Switch            | When on, adds a second layer of suffering on top of the original feeling                             |
| Clean / dirty discomfort   | The original feeling / the extra suffering added by struggling against it                            |
| Self-compassion            | Treating yourself as you would a struggling friend (kind hands, kind self-talk)                      |
| Observing (Noticing) Self  | The stable part of mind that notices experience; the chessboard, not the pieces                      |
| Values                     | Chosen directions of how you want to act; not goals                                                  |
| Bull's-Eye / Values Square | Self-rating of current alignment between actions and values across four domains                      |
| Committed action           | Values-guided steps taken while willingly carrying inner barriers                                    |
| Willingness                | Allowing inner barriers to be present while acting; not wanting or liking them                       |
| HARD barriers              | Hooked, Avoiding discomfort, Remoteness from values, Doubtful goals                                  |
| Urge surfing               | Observing an urge as a wave - rising, peaking, falling - without acting on it                        |
| The 7 R's                  | Maintenance: Reminders, Records, Rewards, Routines, Relationships, Reflecting, Restructuring         |

---

## 15. Open Questions

| Question                                                                                         | Decision needed by                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Creative-hopelessness: own table (`act_creative_hopelessness`) or fold into `act_program_state`? | Phase 1                             |
| Should the worry/rumination "stream" variant be a defusion technique or its own light tool?      | Phase 2                             |
| Healing-the-past: reuse an observing/connection entry, or a dedicated reflective table?          | Phase 4                             |
| Savoring: gratitude-log link only, or a distinct ACT savoring log?                               | Phase 4                             |
| ACT and CBT share `MoodLog` - single table or module-tagged rows?                                | Before Phase 1 ships (flag in arch) |
| Audio support for guided Drop Anchor / TAME / body scan                                          | Phase 1-2 planning                  |

---

## 16. Acceptance Bar

This spec is ready to drive implementation when:

- The three pillars and the Choice Point are documented, with the six principle tools mapped under them.
- Every new tool (Choice Point, Drop Anchor, self-compassion, TAME reframe, HARD barriers, breaking habits, decisions, maintenance plan) has concepts, inputs, and prompts.
- The four-week program is fully specified (pillars, weeks, tasks, signals, targets, graduation) and maps onto the CBT program machinery.
- The data model covers new entities/columns with partial-save semantics matching CBT.
- Safety, tone, and non-goals rule out clinical language and streak pressure.

The program is ready to activate (Phase 5) when:

- The Choice Point map, self-compassion tool, and maintenance-plan capstone persist under RLS.
- `ACT_PROGRAM`, `deriveActProgram`, and `useActProgram` exist and pass tests (program-state, week/task derivation, graduation latch).
- The shared program hero/graduation render for ACT.
- Reminder defaults stay quiet; accessibility baseline matches CBT.
