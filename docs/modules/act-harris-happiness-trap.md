# ACT Program Spec — Harris: The Happiness Trap

**Source:** _The Happiness Trap: How to Stop Struggling and Start Living_ — Russ Harris (Shambhala / Trumpeter, 2011)  
**Status:** Canonical spec for the ACT feature — not yet implemented  
**Audience:** Developers and product contributors

---

## 1. Framework Overview

### The Happiness Trap

Society holds four myths about happiness that make us miserable:

1. **Happiness is the natural state of human beings.** It is not — the mind evolved to scan for danger, compare, and judge. Negative thoughts and feelings are a built-in feature, not a malfunction.
2. **If you're not happy, something is wrong with you.** Unhappiness is a normal part of a full life, not evidence of defect.
3. **To have a good life you must get rid of negative feelings.** Trying to eliminate them traps you in a vicious cycle.
4. **You should be able to control your thoughts and feelings.** You can control your external behavior far more readily than you can control internal states.

These myths create the **Happiness Trap**: the harder we try to feel happy and avoid pain, the more we suffer. Two ineffective control strategies maintain the trap:

| Strategy                | Forms                                                                      |
| ----------------------- | -------------------------------------------------------------------------- |
| **Flight (Avoidance)**  | Distraction, "zoning out," hiding from situations, numbing with substances |
| **Fight (Suppression)** | Arguing with thoughts, self-bullying, forcing a "happy" state              |

Both strategies provide brief relief but increase long-term suffering. The technical term is **experiential avoidance**.

### The ACT Model

ACT stands for three core moves:

- **A** — Accept your thoughts and feelings, and be present
- **C** — Choose a valued direction
- **T** — Take effective action

The formula underlying the model: **Mindfulness + Values + Action = Psychological Flexibility**

Psychological flexibility — the ability to adapt with awareness, openness, and focus to take values-guided action, even when pain is present — is the overarching goal of the entire program.

### The Six Core Principles

The program has six inter-related principles. The first four constitute **ACT mindfulness**:

| Principle               | What it develops                                   |
| ----------------------- | -------------------------------------------------- |
| **1. Defusion**         | Unhooking from unhelpful thoughts                  |
| **2. Expansion**        | Making room for difficult feelings and sensations  |
| **3. Connection**       | Present-moment awareness                           |
| **4. Observing Self**   | Contact with the stable, non-judgmental witness    |
| **5. Values**           | Clarity about what matters most                    |
| **6. Committed Action** | Taking action aligned with values despite barriers |

Paired groupings from the model:

- **Defusion + Expansion** — the ACT mindfulness skills: unhook from thoughts, make room for feelings
- **Connection + Values** — stay present while moving toward what is truly significant
- **Committed Action + Observing Self** — take effective action while accessing the non-judgmental part of the mind

### Core Principles

- **Acceptance-based** — the goal is not to feel better but to get better at feeling; pain is inevitable, suffering is optional
- **Values-driven** — every principle ultimately serves the user's clarified values, not symptom reduction
- **Present-focused** — each exercise returns attention to what is happening now
- **Non-clinical tone** — second person, warm, no pathologizing language
- **Self-directed** — the user learns reusable skills that apply to any future situation

---

## 2. The Six Core Principles

### Principle 1: Defusion

**What it is:** The mind generates a continuous stream of thoughts — stories, judgments, memories, plans, and predictions. **Fusion** happens when we treat these thoughts as literal facts and allow them to dictate our behavior. **Defusion** is stepping back from the thought stream and seeing thoughts as mental events rather than objective reality.

**Key concepts from the book:**

- The mind is a "Great Storyteller" — our stories feel real and urgent but are just words
- Helpful thought: does acting on this thought help move toward your values? → keep it
- Unhelpful thought: does acting on this thought move you away from what matters? → defuse from it
- Defusion does not mean the thought disappears — it loses its grip
- Naming recurring thought patterns ("The Not Good Enough story," "The Catastrophe story") reduces their power

**Defusion techniques:**

| Technique                        | How to use                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------- |
| "I'm having the thought that..." | Prefix any thought with this phrase ("I'm having the thought that I'll fail")   |
| Musical Thoughts                 | Silently sing the thought to a silly tune (Happy Birthday, Jingle Bells)        |
| Naming Your Stories              | Label the recurring narrative ("There's the Not Good Enough story again")       |
| Thanking Your Mind               | "Thanks, mind, for that thought" — acknowledge without engaging                 |
| Silly Voices                     | Imagine the thought in a cartoon character's voice                              |
| Television Screen                | Imagine the thought appearing as text scrolling across a TV screen              |
| Subtitles                        | For distressing mental images — imagine foreign-language subtitles beneath them |

**Tool features:**

- Defusion log: capture a fused thought, choose a technique, note the shift
- Thought-type tagging to surface recurring story patterns after 3+ entries
- Fusion level before/after (0–100) to build personal evidence
- Technique library with brief instructions (shown on first use of each)

**User inputs:**

| Field               | Type          | Notes                                                                         |
| ------------------- | ------------- | ----------------------------------------------------------------------------- |
| `fusedThought`      | string        | The thought as it appeared                                                    |
| `thoughtCategory`   | enum          | `selfJudgment`, `worry`, `pastRegret`, `prediction`, `ruleStatement`, `other` |
| `fusionLevelBefore` | integer 0–100 | How much this thought had a hold                                              |
| `techniqueUsed`     | enum          | From the techniques above                                                     |
| `defusedVersion`    | string        | Optional — how it appeared after defusion                                     |
| `fusionLevelAfter`  | integer 0–100 |                                                                               |
| `notes`             | string        | Optional                                                                      |

**Key prompts:**

- "Is this a fact or a story your mind is telling?"
- "If you believed this thought less, what would you do differently?"
- "You've heard this one before — what is your mind calling it?"
- After technique: "Did that change how strongly the thought pulled you? Rate 0–100."

---

### Principle 2: Expansion

**What it is:** Difficult emotions and physical sensations cause suffering not because they are inherently painful but because we fight them. The **Struggle Switch** — when turned on, every unpleasant feeling generates a secondary layer of anxiety, anger, or self-judgment about having the feeling. Turning the Struggle Switch off means making room for the original sensation (**clean discomfort**) without amplifying it with struggle (**dirty discomfort**).

**The clean/dirty distinction:**

| Type                 | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| **Clean discomfort** | The original emotion as it naturally exists — pain, sadness, fear |
| **Dirty discomfort** | The secondary suffering created by fighting the original emotion  |

**Key concepts from the book:**

- An emotion is a cluster of physical changes (sensations, urges, movements, expressions)
- Emotions have three phases: trigger → physical changes → action urge
- The four steps of Expansion: Observe → Breathe → Create Space → Allow
- Urge surfing: treat urges as waves — they rise, peak, and fall; the goal is to surf them without acting

**The Four Steps of Expansion:**

1. **Observe** — locate the sensation in the body; describe its qualities (size, shape, weight, temperature, movement)
2. **Breathe** — breathe into the area where you feel it
3. **Create Space** — imagine space opening up around the sensation, giving it room to exist
4. **Allow** — let it be there; you don't have to like it, just stop fighting it

**The Five Steps of Urge Surfing:**

1. Notice the urge is present
2. Scan the body — where do you feel it most?
3. Observe the sensations without acting on them
4. Breathe into the area
5. Watch the urge rise and fall like an ocean wave; it will peak and subside

**Tool features:**

- Expansion exercise with guided four-step flow
- Struggle Switch check-in (before/after clean vs. dirty label)
- Urge surfing log for addiction and behavioral urges
- Emotion library: 9 basic emotions with body-sensation descriptions to aid observation
- Intensity before/after display as evidence that expansion works

**User inputs (Expansion):**

| Field              | Type          | Notes                                                                         |
| ------------------ | ------------- | ----------------------------------------------------------------------------- |
| `emotion`          | string        | What emotion is present                                                       |
| `bodySensation`    | string        | Where and how it feels                                                        |
| `intensityBefore`  | integer 0–100 |                                                                               |
| `struggleSwitchOn` | boolean       | Was I fighting it?                                                            |
| `discomfortType`   | enum          | `clean` / `dirty` — after reflection                                          |
| `techniqueUsed`    | enum          | `fourStepExpansion`, `urgeSurfing`, `acceptanceSelfTalk`, `acceptanceImagery` |
| `intensityAfter`   | integer 0–100 |                                                                               |
| `notes`            | string        | Optional                                                                      |

**User inputs (Urge Surfing):**

| Field             | Type          | Notes                    |
| ----------------- | ------------- | ------------------------ |
| `urgeDescription` | string        | What the urge is         |
| `trigger`         | string        | What preceded the urge   |
| `peakIntensity`   | integer 0–100 |                          |
| `surfingNotes`    | string        | What the wave felt like  |
| `urgeActedOn`     | boolean       | Did you act on the urge? |
| `completedAt`     | timestamp     |                          |

**Key prompts:**

- "Where do you feel this in your body right now?"
- "You don't have to like this feeling — just make room for it."
- "Is this clean discomfort, or are you adding a second layer of struggle?"
- During urge surfing: "The urge is a wave. What does it feel like right now?"
- After: "The urge rose and fell. You didn't have to act on it."

---

### Principle 3: Connection

**What it is:** The mind habitually travels to the past (regret, guilt, nostalgia) or the future (worry, planning, anticipation), missing the present moment. **Connection** is deliberately bringing full attention to what is happening right now — not as a technique to relax but as a way of fully engaging with life.

**Key concepts from the book:**

- Noticing without judging: observe what is present (sounds, sensations, smells, sights) without labeling it good or bad
- Connection does not require an empty mind — thoughts continue; you simply notice them and return to now
- Any activity can become a connection practice: eating, walking, listening to another person

**Primary technique — Notice Five Things:**

1. Pause and look around.
2. Notice five things you can see.
3. Notice four things you can hear.
4. Notice three things you can physically feel (temperature, texture, pressure).
5. Notice one thing you can smell or taste.

**Tool features:**

- Guided "Notice Five Things" exercise (text-based, timed)
- Post-connection mood rating
- Free-text field for what the user noticed — builds a personal library of grounding details
- Mindful engagement prompt for chosen daily activities

**User inputs:**

| Field               | Type         | Notes                                                   |
| ------------------- | ------------ | ------------------------------------------------------- |
| `technique`         | enum         | `noticeFiveThings`, `mindfulActivity`, `tenDeepBreaths` |
| `activityContext`   | string       | What the user was doing                                 |
| `noticesFromSenses` | string       | What they observed (optional free text)                 |
| `durationMinutes`   | integer      | How long the practice lasted                            |
| `moodAfter`         | integer 1–10 |                                                         |
| `notes`             | string       | Optional                                                |

**Key prompts:**

- "Before continuing, pause. What are five things you can see right now?"
- "Bring your full attention to what you're doing — not to what it means, just what it is."
- "You don't have to stop your thoughts — just notice they're there and return to now."

---

### Principle 4: The Observing Self

**What it is:** We all have two aspects of mind. The **Thinking Self** generates thoughts, feelings, memories, images, and sensations — the content of experience. The **Observing Self** is the part that notices that content — the stable, non-judgmental witness that is always present and can never be hurt.

**Key concepts from the book:**

- You cannot observe your own Observing Self — it is the observer, not the observed
- Unlike thoughts and feelings (which come and go), the Observing Self is continuous and unchanging throughout life
- The Chessboard metaphor: thoughts and feelings are pieces (white and black); you are the board — the board is not threatened by any piece
- Accessing the Observing Self creates a safe vantage point from which to do defusion and expansion work
- The "Ten Deep Breaths" exercise is a simple way to step into the Observing Self perspective

**Ten Deep Breaths exercise:**

1. Take a slow, deep breath — breathe right down into the belly.
2. As you breathe in, say to yourself: "I notice I'm having the feeling of \_\_\_."
3. As you breathe out, look around and notice five things you can see.
4. Repeat for ten breaths.

**Tool features:**

- Guided "Ten Deep Breaths" exercise with optional timer
- Reflection field: what did you observe from this vantage point?
- Chessboard metaphor display on first use
- Optional "Observing Self journal": a private space to note what was observed without evaluating it

**User inputs:**

| Field             | Type         | Notes                                                   |
| ----------------- | ------------ | ------------------------------------------------------- |
| `techniqueUsed`   | enum         | `tenDeepBreaths`, `observingFromBoard`, `bodyAwareness` |
| `whatWasObserved` | string       | Optional free-text — what came up                       |
| `durationMinutes` | integer      |                                                         |
| `moodAfter`       | integer 1–10 | Optional                                                |
| `notes`           | string       | Optional                                                |

**Key prompts:**

- "You are not your thoughts. You are the one noticing them."
- "From this perspective — the part of you that notices — what do you observe?"
- "The feeling is there. The part of you that notices the feeling is here too."

---

### Principle 5: Values

**What it is:** Values are not goals (destinations) — they are chosen directions of movement. They define how you want to act in the world, what kind of person you want to be, and what matters most to you. They cannot be completed or crossed off a list; they are always available to guide the next step.

**Key concepts from the book:**

- Values give meaning to committed action — without clarity on values, action is just busyness
- The **Bull's-Eye** tool maps current alignment across four life domains: Work/Education, Leisure, Relationships, Personal Growth/Health/Spirituality
- A bull's-eye in a domain means current actions closely match values; outer rings = drift
- Values ≠ morality: there is no "right" value; what matters is that it is genuinely your own and not others' expectations
- Values clarification questions: "What do I want to stand for?", "What sort of relationships do I want to build?", "What would I want people to say about me at my 80th birthday?"

**Bull's-Eye domains:**

| Domain                                    | Example values                                         |
| ----------------------------------------- | ------------------------------------------------------ |
| Work / Education                          | Learning, creativity, contribution, diligence, honesty |
| Leisure / Play                            | Adventure, pleasure, humor, connection with nature     |
| Relationships (family, friends, intimate) | Love, care, kindness, presence, honesty, reliability   |
| Personal Growth / Health / Spirituality   | Courage, self-care, mindfulness, faith, community      |

**Tool features:**

- Life Values Questionnaire (guided prompts per domain)
- Bull's-Eye interactive map: user rates current alignment 1–10 per domain
- Value statement builder per domain
- Alignment trend over time (monthly Bull's-Eye snapshots)
- Values card: a short, printable/shareable summary of the user's top values

**User inputs (Value Entry):**

| Field                    | Type         | Notes                                                |
| ------------------------ | ------------ | ---------------------------------------------------- |
| `lifeDomain`             | enum         | `work`, `leisure`, `relationships`, `personalGrowth` |
| `valueStatement`         | string       | e.g., "Be a caring, present parent"                  |
| `importanceRating`       | integer 1–10 | How much this value matters to you                   |
| `currentAlignmentRating` | integer 1–10 | Bull's-Eye position — 10 = bull's-eye                |
| `currentActionsNote`     | string       | What you are currently doing in this domain          |
| `desiredActionsNote`     | string       | What you would do if acting on this value            |
| `barriers`               | string       | What gets in the way                                 |

**User inputs (Bull's-Eye snapshot):**

| Field             | Type         | Notes                  |
| ----------------- | ------------ | ---------------------- |
| `domain`          | enum         | Same four domains      |
| `alignmentRating` | integer 1–10 | Current position       |
| `reviewedAt`      | timestamp    | One snapshot per month |

**Key prompts:**

- "In this area of your life, what do you want to stand for?"
- "If you could wave a magic wand, what kind of person would you be in this domain?"
- "How close is how you're living now to your Bull's-Eye?"
- "What is one small step that would move you even slightly toward your value?"

---

### Principle 6: Committed Action

**What it is:** Values without action remain wishes. Committed Action is setting goals and taking steps guided by values — not because you feel confident or ready, but because you are willing to bring discomfort along for the ride. The **Willingness-and-Action Plan** makes this concrete.

**Key concepts from the book:**

- Willingness = allowing inner barriers (uncomfortable thoughts, feelings, urges) to be present while acting
- Goals derived from values are SMART: specific, meaningful (connected to a value), adaptive (improves life quality), realistic, time-framed
- Two types of barriers: **inner barriers** (thoughts, feelings, memories) and **outer barriers** (practical obstacles, other people's behavior)
- The Demons on the Boat metaphor: your demons (inner barriers) cannot steer the boat — you can carry them while continuing your journey
- Even a tiny step in the valued direction is a committed action

**Willingness-and-Action Plan structure:**

1. The value this action serves
2. The specific action/goal (SMART)
3. The inner barriers I am willing to have while acting
4. The outer barriers and how to address them
5. Concrete steps with dates
6. Review date

**Tool features:**

- Action plan builder with values linkage
- Inner/outer barrier classification
- Step breakdown with target dates and completion tracking
- Willingness slider (0–100): "How willing are you to experience the inner barriers?"
- Weekly commitment review prompt
- Completed action archive as evidence that action despite discomfort is possible

**User inputs:**

| Field               | Type              | Notes                                              |
| ------------------- | ----------------- | -------------------------------------------------- |
| `actionDescription` | string            | What specifically will be done                     |
| `linkedValueId`     | string            | Foreign key to ValueEntry                          |
| `linkedDomain`      | enum              | Same four domains                                  |
| `willingnessLevel`  | integer 0–100     | How willing to bring inner barriers along          |
| `innerBarriers`     | string            | Thoughts/feelings that will arise                  |
| `outerBarriers`     | string            | Practical obstacles                                |
| `steps`             | ActionStep[]      | Specific steps with due dates                      |
| `targetDate`        | date \| null      |                                                    |
| `status`            | enum              | `active` \| `completed` \| `paused` \| `abandoned` |
| `reviewedAt`        | timestamp \| null |                                                    |

**ActionStep fields:** `description` (string), `dueDate` (date, optional), `completedAt` (timestamp, null until done)

**Key prompts:**

- "Which of your values does this action serve?"
- "What thoughts and feelings will show up when you try to do this?"
- "Are you willing to carry those feelings and act anyway?"
- "What is the smallest step you could take today — even five minutes?"
- On step completion: "You acted despite discomfort. What did you notice?"
- On completion: "This was an act of psychological flexibility. What did it cost, and what did it give you?"

---

## 3. Core Data Model

All entities use camelCase field names (TypeScript convention) and are stored in Supabase with RLS owner-only policies, mirroring the CBT module. Every entity has implicit `id` (uuid), `userId` (foreign key), `createdAt`, and `updatedAt` fields unless noted.

```typescript
// Program state — one row per user
ACTProgramState {
  activePrinciples: ACTPrinciple[]
  onboardingCompletedAt: timestamp | null
  primaryConcerns: ACTConcern[]           // set during onboarding
  mythsAcknowledged: boolean
  lastCheckInAt: timestamp | null
  preferredCheckInTime: string | null     // 'HH:MM' local-time hint
}

// Principle 1: Defusion
DefusionLog {
  fusedThought: string
  thoughtCategory: ThoughtCategory
  fusionLevelBefore: integer              // 0–100
  techniqueUsed: DefusionTechnique
  defusedVersion: string                  // optional
  fusionLevelAfter: integer               // 0–100
  notes: string
}

// Principle 2: Expansion
ExpansionLog {
  emotion: string
  bodySensation: string
  intensityBefore: integer                // 0–100
  struggleSwitchOn: boolean
  discomfortType: 'clean' | 'dirty'
  techniqueUsed: ExpansionTechnique
  intensityAfter: integer                 // 0–100
  notes: string
}

UrgeSurfLog {
  urgeDescription: string
  trigger: string
  peakIntensity: integer                  // 0–100
  surfingNotes: string
  urgeActedOn: boolean
  completedAt: timestamp
}

// Principle 3: Connection
ConnectionLog {
  technique: ConnectionTechnique
  activityContext: string
  noticesFromSenses: string               // optional free text
  durationMinutes: integer
  moodAfter: integer | null               // 1–10
  notes: string
}

// Principle 4: Observing Self
ObservingSelfSession {
  techniqueUsed: ObservingTechnique
  whatWasObserved: string                 // optional
  durationMinutes: integer
  moodAfter: integer | null               // 1–10
  notes: string
}

// Principle 5: Values
ValueEntry {
  lifeDomain: ACTLifeDomain
  valueStatement: string
  importanceRating: integer               // 1–10
  currentAlignmentRating: integer         // 1–10 (Bull's-Eye)
  currentActionsNote: string
  desiredActionsNote: string
  barriers: string
}

BullsEyeSnapshot {
  domain: ACTLifeDomain
  alignmentRating: integer                // 1–10
  reviewedAt: timestamp                   // one snapshot per month
}

// Principle 6: Committed Action
CommittedActionPlan {
  actionDescription: string
  linkedValueId: string                   // foreign key to ValueEntry
  linkedDomain: ACTLifeDomain
  willingnessLevel: integer               // 0–100
  innerBarriers: string
  outerBarriers: string
  steps: ActionStep[]
  targetDate: date | null
  status: 'active' | 'completed' | 'paused' | 'abandoned'
  reviewedAt: timestamp | null
}

ActionStep {
  planId: string
  description: string
  dueDate: date | null
  completedAt: timestamp | null
}

// Global
MoodLog {
  moodScore: integer                      // 1–10
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
  | "subtitles";

type ExpansionTechnique =
  | "fourStepExpansion"
  | "urgeSurfing"
  | "acceptanceSelfTalk"
  | "acceptanceImagery";

type ConnectionTechnique = "noticeFiveThings" | "mindfulActivity" | "tenDeepBreaths";

type ObservingTechnique = "tenDeepBreaths" | "observingFromBoard" | "bodyAwareness";
```

### Tables (planned, not yet migrated)

- `act_program_state` — one row per user; primary key `user_id`
- `act_defusion_logs` — RLS owner-only
- `act_expansion_logs` — RLS owner-only
- `act_urge_surf_logs` — RLS owner-only
- `act_connection_logs` — RLS owner-only
- `act_observing_self_sessions` — RLS owner-only
- `act_value_entries` — RLS owner-only
- `act_bulls_eye_snapshots` — RLS owner-only
- `act_committed_action_plans` — RLS owner-only
- `act_action_steps` — foreign key to `act_committed_action_plans`; RLS owner-only

All tables mirror the CBT module's RLS pattern.

---

## 4. Module Contract

This module follows the contract documented in `tools.md`:

- New `ModuleKey`: `"act"`. Added to the union in `src/features/modules/types.ts` alongside `"cbt"` and `"meditation"`. Default `enabledModules` stays `["cbt"]` — ACT is opt-in via the modules discovery screen.
- i18n namespace: `act:*`.
- Route group: `/modules/act/*` (see §5).
- New `user_preferences` fields, mirroring the CBT and meditation reminder fields:
  - `act_onboarding_completed: boolean`
  - `act_reminders_enabled: boolean`
  - `act_reminder_hour: integer` (0–23)
  - `act_reminder_minute: integer` (0–59)
  - `act_reminder_timezone: string | null`
- Reminders default off, single daily check-in at the chosen time, non-punitive copy.
- Settings can reset the onboarding flag (same pattern as CBT and meditation).
- The placeholder route at `/tools/act` becomes a compatibility redirect to `/modules/act`.

---

## 5. Routes

| Route                                 | Purpose                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/modules/act`                        | Home: daily check-in card, Bull's-Eye overview, active action plans, recent practice log.  |
| `/modules/act/onboarding`             | Full-screen fallback for the onboarding modal (used when modal is dismissed or revisited). |
| `/modules/act/learn`                  | Primer: The Happiness Trap, 4 myths, the ACT model overview.                               |
| `/modules/act/defusion`               | Defusion log entry, technique library, log history.                                        |
| `/modules/act/expansion`              | Expansion exercise (guided 4-step), Struggle Switch check-in, log history.                 |
| `/modules/act/expansion/urge-surfing` | Urge surfing guided flow and log.                                                          |
| `/modules/act/connection`             | "Notice Five Things" guided exercise, mindful activity log.                                |
| `/modules/act/observing-self`         | "Ten Deep Breaths" exercise, Observing Self session log.                                   |
| `/modules/act/values`                 | Values questionnaire, Bull's-Eye interactive map, value entries per domain.                |
| `/modules/act/values/bulls-eye`       | Full Bull's-Eye view with history snapshots.                                               |
| `/modules/act/committed-action`       | Action plan list, new plan builder, step completion tracker.                               |
| `/modules/act/committed-action/[id]`  | Single plan detail: steps, barriers, linked value, progress.                               |
| `/modules/act/log`                    | Unified practice history across all six principles.                                        |
| `/tools/act`                          | Compatibility redirect to `/modules/act`.                                                  |

---

## 6. Onboarding Flow (Modal Wizard)

Mirrors `src/components/app/cbt-onboarding-modal.tsx`. Five steps; only Step 1 is mandatory. Completion is tracked via `act_onboarding_completed` on `user_preferences`. The full content is also available at `/modules/act/onboarding`.

1. **Welcome — The Happiness Trap**
   - Infographic: "The Anatomy of the Happiness Trap" (Control Paradox + Experiential Avoidance → Fight/Flight strategies).
   - One paragraph on the four myths. Emphasis: your mind is not broken; it evolved for survival, not happiness.
   - This is not about fixing your feelings — it is about building a rich, full, meaningful life.

2. **The ACT Model**
   - Infographic: "The Path to Psychological Flexibility" (Defusion + Expansion → Mindfulness Skills; Connection + Values → Values-Guided Action; Committed Action + Observing Self).
   - The ACT acronym: Accept → Connect → Take action.
   - Formula: Mindfulness + Values + Action = Psychological Flexibility.
   - Brief one-sentence description of each of the six principles.

3. **What brings you here?**
   - Multi-select concern picker: Anxiety, Depression, Anger, Urges or addictive behaviors, Self-criticism, Procrastination, Grief or loss, Something else.
   - Selected concerns are stored on `act_program_state.primaryConcerns` and used to recommend a starting principle (see §11).
   - No clinical language; the labels in the UI are plain ("worry and anxiety," "low mood," "harsh self-talk").

4. **Your Values — a quick look**
   - Brief intro: "ACT is about moving toward what matters. Let's find out what that is for you."
   - Display the four Bull's-Eye domains. Ask the user to rate current alignment (1–10) for each domain — quick tap, no free text required yet.
   - Writes initial `BullsEyeSnapshot` rows.
   - Prompt: "You can come back and deepen this any time. We just need a starting direction."

5. **Your first practice**
   - Based on the concern selection and Bull's-Eye input, recommend one principle to start with.
   - User can accept or switch.
   - Optional daily check-in time and reminder toggle (default off).
   - Writes `act_program_state` and marks onboarding complete.

Onboarding can be skipped after Step 1; the user lands with all six principles available and defusion recommended as the default starting point.

---

## 7. Daily Flow

- **Morning check-in:** Mood log (1–10), one-line intention ("Today I will act on my value of \_\_\_"), Bull's-Eye domain highlight.
- **During-day (on-demand):** Defusion log when a sticky thought appears; expansion exercise for difficult emotions; urge surfing for behavioral urges; connection pause ("Notice Five Things") any time.
- **Evening check-in:** Mood log, one committed action taken today (even tiny), one thing noticed using the Observing Self.
- **Weekly review (user-configured day):**
  1. Mood trend chart (7-day)
  2. Bull's-Eye self-rating update
  3. Committed action plan review — steps completed?
  4. Defusion log patterns — any recurring story worth naming?
  5. Values alignment: any domain drifting? What would bring it closer?
  6. Open reflection: "What was your biggest act of psychological flexibility this week?"

### Program Milestones

| Milestone  | Conditions                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------- |
| Week 1     | Onboarding complete, first defusion log, first Bull's-Eye snapshot                             |
| Weeks 2–4  | At least one expansion log, one connection session, one committed action step completed        |
| Weeks 4–8  | Values entries for all four domains, active committed action plan, regular daily check-ins     |
| Weeks 8–12 | Second Bull's-Eye snapshot showing movement, multiple completed action steps, patterns visible |

---

## 8. Implementation Sequencing

| Phase              | Modules                                                                                                 | Notes                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **1 — Foundation** | `act_program_state`, onboarding modal, home screen, defusion log, mood logging, daily check-in skeleton | The daily hook and the most immediately usable skill  |
| **2 — Acceptance** | Expansion log (4-step), Struggle Switch, clean/dirty distinction, urge surfing log                      | Depends on Phase 1; enables the full mindfulness half |
| **3 — Presence**   | Connection log ("Notice Five Things"), Observing Self session ("Ten Deep Breaths"), Chessboard primer   | Lighter phase — two exercises with minimal data model |
| **4 — Values**     | Values questionnaire, value entries per domain, Bull's-Eye interactive map, snapshot history            | Central to committed action; must ship before Phase 5 |
| **5 — Action**     | Committed Action plan builder, step tracker, weekly commitment review, completed plan archive           | The capstone of the full program                      |
| **6 — Synthesis**  | Pattern detection (recurring stories, Bull's-Eye trends), cross-principle insights, values card export  | Deferred to when enough data exists to be meaningful  |

---

## 9. Cross-Cutting Features

### Mood Tracking (Global)

Mood is logged at morning and evening check-ins, after connection and Observing Self sessions, and optionally after defusion and expansion exercises. Dashboard shows 7-day and 30-day charts. A mood of 1–2 triggers a crisis support prompt.

### Dashboard

- Daily card: morning/evening check-in status, active action plan step, Bull's-Eye domain of the week
- Quick-access: log mood, defuse a thought, start expansion, Notice Five Things
- Bull's-Eye mini-map: current alignment per domain at a glance
- Recent practice: last three logs across all principles

### Notifications

All notifications are explicit opt-in, quiet by default, and easy to disable.

Allowed:

- Daily check-in reminder at the user's chosen time
- Weekly review prompt (off by default)
- Scheduled committed action step reminders (only when the user has set a step due date)

Out of scope for MVP:

- Default-on reminders
- Streak or habit-preservation reminders
- Missed-day warnings
- Milestone celebration pushes
- Crisis or low-mood follow-up notifications (crisis support stays in-app and user-initiated)

### Safety

- Mood of 1–2 → display crisis support message and local crisis line information
- The Expansion and Observing Self sections note that intense emotions may surface — a one-tap link to crisis support is always available
- The tool is not a substitute for professional help — disclaimer shown during onboarding and accessible from settings
- No clinical diagnostic labels in UI copy

### Tone

- Second person, warm, non-judgmental
- Avoid pathologizing language: say "a difficult feeling" not "a symptom"; "a sticky thought" not "a cognitive distortion"
- Normalize struggle: "Your mind is doing its job — it's trying to protect you"
- Celebrate small acts of willingness, not just completed tasks
- Never shame incomplete logs or abandoned plans

---

## 10. Non-Goals

- AI features
- Community or peer-sharing features
- Generic journaling mixed into the ACT flow
- Clinical diagnostic labels in UI copy
- PHQ-9 / GAD-7 or other scored clinical scales in MVP
- Therapist portal (single-user in v1)
- Streak pressure or habit-preservation language
- Claims that ACT will eliminate painful emotions

---

## 11. Concern → Principle Mapping

Reference table for implementing the onboarding assessment flow. When a user selects concerns during onboarding, use this table to recommend a starting principle and surface relevant examples.

| Concern                        | Primary Principle(s) to Recommend First | Why                                                                                                                                |
| ------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Anxiety / Worry**            | Defusion, then Expansion                | Anxiety is driven by fusion with "what if" stories and struggle against the accompanying sensations                                |
| **Depression / Low mood**      | Values, then Committed Action           | Depression involves disconnection from values and behavioral withdrawal; action in service of values breaks the cycle              |
| **Harsh self-criticism**       | Defusion, then Observing Self           | Self-criticism is a fused story ("I am a failure") seen from the Thinking Self; the Observing Self can witness it without being it |
| **Urges / Addictive patterns** | Expansion (Urge Surfing), then Values   | Urges are fought through avoidance; surfing the wave and reconnecting with values weakens the pull                                 |
| **Anger**                      | Defusion, then Connection               | Anger is fused with "I've been wronged" stories; defusion + present-moment grounding interrupt the cycle                           |
| **Procrastination**            | Committed Action, then Defusion         | Procrastination is permission-giving thoughts + avoidance of discomfort; willingness + small steps cut through both                |
| **Grief / Loss**               | Expansion, then Values                  | Grief requires making room for sorrow (expansion), not eliminating it; values reconnect to meaning ahead                           |

### How to use this table in code

- **Onboarding assessment**: present the concern options as multi-select. Store selections on `act_program_state.primaryConcerns`.
- **Starting principle recommendation**: map selected concerns to their recommended starting principle using the table. If multiple concerns are selected, the highest-priority principle is defusion (it underlies all the others).
- **Exercise pre-selection**: surface the relevant technique examples first — e.g., for self-criticism, open the Defusion log pre-filled with `thoughtCategory: "selfJudgment"`.
- **Values prompts**: for depression, seed the values questionnaire with domain-specific activation questions ("What did you used to care about in this area of life?").

---

## 12. Glossary

| Term                        | Definition as used in this tool                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ACT                         | Acceptance and Commitment Therapy. The acronym also describes the three moves: Accept → Connect → Take action                  |
| Psychological Flexibility   | The ability to adapt with awareness, openness, and focus to take values-guided action even when pain is present                |
| Experiential Avoidance      | Attempting to escape or suppress unwanted thoughts and feelings; the root cause of the Happiness Trap                          |
| The Happiness Trap          | The vicious cycle in which trying to avoid pain creates more suffering                                                         |
| Fusion                      | Treating thoughts as literal facts and allowing them to dictate behavior                                                       |
| Defusion                    | Stepping back from a thought and seeing it as a mental event rather than objective reality                                     |
| Expansion                   | Making room for difficult emotions and sensations rather than fighting them; also called acceptance                            |
| Struggle Switch             | The metaphorical switch that, when on, adds secondary suffering (anger, anxiety, self-judgment) on top of the original feeling |
| Clean Discomfort            | The natural emotion as it exists before struggle is added                                                                      |
| Dirty Discomfort            | The amplified suffering that results from fighting the original emotion                                                        |
| Connection                  | Deliberate present-moment awareness; one of the four ACT mindfulness principles                                                |
| Thinking Self               | The part of the mind that generates thoughts, feelings, images, memories, and sensations                                       |
| Observing Self              | The stable, non-judgmental part of the mind that notices experience; the chessboard rather than the pieces                     |
| Values                      | Chosen directions of movement that define how you want to act and what matters most; not goals                                 |
| Bull's-Eye                  | A four-domain self-rating tool showing alignment between current actions and values                                            |
| Committed Action            | Taking steps guided by values while willingly carrying inner barriers (thoughts, feelings, urges)                              |
| Willingness                 | Allowing inner barriers to be present while acting; not the same as wanting or liking them                                     |
| Urge Surfing                | Observing an urge as a wave — rising, peaking, and falling — without acting on it                                              |
| Inner Barriers              | Psychological obstacles to committed action: uncomfortable thoughts, feelings, memories, urges                                 |
| Outer Barriers              | Practical obstacles to committed action: time, money, other people's behavior                                                  |
| Willingness-and-Action Plan | A structured plan that names the value, the action, the inner barriers to be carried, and the concrete steps                   |

---

## 13. Open Questions

| Question                                                                                      | Decision needed by                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Should the Bull's-Eye use four domains (Harris) or the broader six-domain CBT LifeDomain set? | Before values module implementation        |
| Should defusion and expansion share a single "mindfulness" log entry or stay separate tables? | Before Phase 2 implementation              |
| Audio support for guided expansion and Observing Self exercises                               | Phase 3 planning                           |
| Multi-language support from v1 or later                                                       | Before Phase 1 ships                       |
| ACT and CBT modules share the `MoodLog` — single table or module-tagged rows?                 | Before Phase 1 ships; flag in architecture |

---

## 14. Acceptance Bar

This spec is ready to drive implementation when:

- All six principles are documented with concepts, techniques, user inputs, and prompts.
- The data model is sufficient for partial-save semantics matching the CBT module.
- The module contract maps cleanly onto the existing CBT and meditation module contract (ModuleKey, route group, settings flags, reminder fields, i18n namespace).
- The onboarding flow covers the four myths, the ACT model, concern selection, and a first Bull's-Eye snapshot.
- Safety, tone, and non-goals explicitly rule out clinical language and streak pressure in UI copy.
- The spec is reviewed and linked from `tools.md`.

The module itself is ready to ship its first phase when:

- Auth works across platforms (already true).
- `act_program_state` and `act_defusion_logs` persist safely under RLS.
- Onboarding lands a user with concerns captured, initial Bull's-Eye written, and a recommended starting principle.
- The daily check-in loop (morning mood + intention, evening reflection) works.
- The defusion log full flow (capture → technique → before/after rating) works end-to-end.
- Reminder defaults stay quiet.
- Accessibility baseline matches the CBT module's.
- Tests cover the program-state repository, the onboarding state machine, and the defusion log save flow.
