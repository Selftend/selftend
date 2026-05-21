# Meditation Program Spec - Yates: The Mind Illuminated

**Source:** _The Mind Illuminated: A Complete Meditation Guide Integrating Buddhist Wisdom and Brain Science for Greater Mindfulness_ - John Yates (Culadasa) / Matthew Immergut / Jeremy Graves (Simon & Schuster, 2017, ISBN 9781501156984)
**Status:** Canonical spec for the meditation feature - not yet implemented
**Audience:** Developers and product contributors

---

## 1. Framework Overview

### The Ten Stages and Four Milestones

The book organizes meditative training as a sequence of **ten distinct, easy-to-identify Stages**, divided by **four Milestone Achievements** into four phases of practice. Each Stage is defined by the skills the practitioner is working to master and the obstacles they are working through; mastery of one Stage is a prerequisite for the next, and no Stage can be skipped.

| Phase              | Stages | Milestone reached at end                                         |
| ------------------ | ------ | ---------------------------------------------------------------- |
| **The Novice**     | 1–3    | Milestone One - Continuous Attention to the Object               |
| **The Skilled**    | 4–6    | Milestone Two - Sustained Exclusive Focus                        |
| **The Transition** | 7      | Milestone Three - Effortless Stability of Attention              |
| **The Adept**      | 8–10   | Milestone Four - Persistence of the Mental Qualities of an Adept |

Progression is **not linear**. A beginner may pass through Stages One and Two in a single sit; an adept may slip back to earlier Stages under stress. The product must therefore avoid streak language, "level up" framing, or any UI that treats a slip as failure. The book explicitly compares this to filling a leaky bucket: practice that does not infuse daily life never accumulates.

### Attention and Peripheral Awareness

The central conceptual distinction the book makes is between **attention** and **peripheral awareness** - two distinct modes of "knowing" that involve different brain processes. Both must be trained:

- **Attention** is selective, focused, and isolates one object (or a small group of objects) for closer inspection.
- **Peripheral awareness** is global, holistic, and provides the surrounding context. It includes outward sensory awareness and **introspective awareness** of one's own mental state.

The goal of the practice is **mindfulness**, defined here as the optimal interaction between **stable attention** and **powerful peripheral awareness**. Mindfulness is not "more focus" - it is balance.

### The Gardener's Mindset

Progress comes from clear intentions, not from force. The practitioner is a gardener: they cannot pull a sapling to make it grow. The product's voice should reflect this - patient, non-pushy, framing each sit as practice and not as performance.

### Core Principles

- **Practice-based** - the tool is a companion to a daily sit, not a substitute for it.
- **Self-paced** - the user decides which Stage they are working at; the tool never auto-advances them.
- **Present-focused** - every screen orients to the current sit and the current Stage, not to a global score.
- **Non-clinical** - no claims about therapeutic outcomes; no promises about Awakening, Enlightenment, or jhāna in UI copy. These terms appear only in deliberate glossary entries.
- **Stage-appropriate** - copy, prompts, and tools are tailored to the user's current Stage. A Stage 2 user is not shown Stage 7 content; a Stage 7 user is not shown introductory copy.

---

## 2. The Ten Stages

### Stage 1: Establishing a Practice

**What it is:** The work of developing a regular, consistent, and diligent meditation practice. Before any other skill matters, the practitioner must sit every day. The book is explicit: regardless of natural ability, Stage One must be mastered to make progress.

**Goal:** Develop a regular meditation practice.

**Obstacles:** Resistance, procrastination, fatigue, impatience, boredom, lack of motivation.

**Skills and methods:** Creating practice routines; setting specific practice goals; generating strong motivation; cultivating discipline and diligence. The book introduces two specific protocols at this Stage:

- **Six-Point Preparation for Meditation** - six brief intentions set before each sit: (1) Motivation, (2) Goals for this sit, (3) Expectations (realistic for this sit, not for the program), (4) Diligence, (5) Distractions (what's likely to pull at attention today), (6) Posture.
- **Four-Step Transition to the Meditation Object** - gradually narrowing attention into the breath: (1) attention rests in open peripheral awareness; (2) attention narrows to the body and bodily sensations; (3) attention narrows to breath sensations anywhere in the body; (4) attention rests on the breath at a chosen anchor point (typically the nostrils or upper lip).

**Mastery:** Never missing a daily practice session except when absolutely unavoidable.

**Tool features:**

- Stage 1 home card: today's sit slot, current streak shown _only as continuity-of-practice context_ (no fire emojis, no warnings), one-tap start.
- Six-Point Preparation as an opt-in pre-sit checklist; collapses to a single tap once the user marks it familiar.
- Four-Step Transition as an opt-in 30–60 s guided opener at the start of the timer.
- Routine builder: preferred time of day, preferred duration, optional quiet reminder.

**Key prompts (post-sit):**

- "Did you sit today?"
- "How long was the sit?"
- "Anything worth noting?"

---

### Stage 2: Interrupted Attention and Overcoming Mind-Wandering

**What it is:** Sitting and watching the breath turns out to be hard. Attention gets captured by distractions, the practitioner forgets the breath, and **mind-wandering** follows - sometimes for seconds, sometimes for the entire sit. The work at this Stage is on the last link of that chain: shortening mind-wandering when it happens.

**Goal:** Shorten the periods of mind-wandering and extend the periods of sustained attention to the breath.

**Obstacles:** Mind-wandering, monkey-mind, impatience.

**Skills and methods:** Reinforcing **spontaneous introspective awareness** - the "aha" moment when the practitioner suddenly realizes they were thinking about something else. Appreciating this moment (rather than judging it) trains the mind to produce it sooner and more often. Combined with **directed and redirected attention**: bring the attention back to the breath, again and again, without commentary.

**Mastery:** Attention can be sustained on the breath for **minutes** while mind-wandering lasts only **seconds**.

**Tool features:**

- Post-sit mind-wandering tally - optional integer field "About how many times did you notice you'd been off the breath?" (low-friction tap-to-increment, not exact bookkeeping).
- Stage 2 reflection prompt explicitly reframes catching mind-wandering as success, not failure.

**Key prompts (post-sit):**

- "About how many times did you catch yourself off the breath?"
- "Were the off-breath periods getting shorter through the sit?"
- "Anything that pulled you off particularly hard today?"

---

### Stage 3: Extended Continuity of Attention and Overcoming Forgetting

**What it is:** Stages Two and Three are similar, but the period of mind-wandering keeps shrinking until it stops being the main problem. What remains is **forgetting** the breath in the first place, and - frequently - **sleepiness**.

**Goal:** Overcome forgetting and falling asleep. End of Stage 3 reaches **Milestone One: Continuous Attention to the Meditation Object**.

**Obstacles:** Distractions, forgetting, mind-wandering, sleepiness.

**Skills and methods:** **Following the breath** (paying attention to the full arc of inhale and exhale, including the pauses) and **connecting** (comparing breaths, noting differences) - both methods sharpen attention enough to catch distractions before they become forgetting. Cultivating **continuous introspective awareness** through **labeling** (briefly noting what just pulled attention) and **checking in** (deliberately sampling the state of attention every so often).

**Mastery:** Rarely forgetting the breath or falling asleep.

**Tool features:**

- Stage 3 sit options offer Following and Connecting as selectable techniques in the pre-sit screen.
- Optional silent half-time bell (a single quiet chime) helps with the "check in" practice.
- Post-sit prompt to log whether sleepiness was present.

**Key prompts (post-sit):**

- "Did you lose the breath entirely at any point?"
- "Was sleepiness a factor?"
- "Did you check in on your attention during the sit?"

---

### Milestone One - Continuous Attention to the Meditation Object

Reaching the end of Stage 3 means the practitioner has crossed from being a person-who-meditates to being a **skilled meditator**. Forgetting, mind-wandering, and dozing off are largely behind them. Stable attention exists in a basic form, and the next three Stages build on it.

The tool marks this milestone with a quiet, non-celebratory acknowledgement - no badges, no confetti. The Mind Illuminated frames the path as ongoing, and the UI should match.

---

### Stage 4: Continuous Attention and Overcoming Gross Distraction and Strong Dullness

**What it is:** Attention can stay on the breath, but it still shifts rapidly between the breath and other objects. When a distraction becomes the primary focus of attention and pushes the breath into the background, that's **gross distraction**. When the mind calms down, the opposite problem can arise: **strong dullness**, where breath sensations fade or become distorted as the mind drifts toward sleep without the practitioner noticing.

**Goal:** Overcome gross distraction and strong dullness.

**Obstacles:** Distractions; pain and discomfort; intellectual insights (which can themselves become distracting); emotionally charged visions and memories.

**Skills and methods:** Developing **continuous introspective awareness** - a steady background monitoring of the state of mind, so that subtle distractions can be corrected before they become gross distractions and subtle dullness can be corrected before it becomes strong dullness. The book also introduces deliberate methods for **working with pain** (taking pain as a meditation object rather than fighting it) and acknowledges that this Stage tends to surface old psychological material as the mind quiets ("purification of the mind").

**Mastery:** Gross distractions no longer push the breath into the background, and breath sensations don't fade or become distorted due to strong dullness.

**Tool features:**

- Stage 4 pre-sit primer on working with pain (when it's information, when it's a meditation object, when it's a signal to adjust posture).
- Post-sit reflection includes optional dullness check ("none / subtle / strong") and a free-text field for charged content that came up - clearly labeled as private and never analyzed.
- Gentle reminder of crisis support copy on this Stage's intro screen - purification material can be intense.

**Key prompts (post-sit):**

- "Was there a distraction that took over the breath today?"
- "Did the breath ever feel faint, vague, or distorted?"
- "Did anything emotionally heavy surface during the sit?"

---

### Stage 5: Overcoming Subtle Dullness and Increasing Mindfulness

**What it is:** With gross distraction and strong dullness handled, a subtler problem emerges: **stable subtle dullness**. Breath sensations grow less vivid and peripheral awareness fades. It's hard to recognize because it looks like stable attention - and it's pleasant, which makes it seductive. Mistaking it for progress is a dead end.

**Goal:** Overcome subtle dullness and increase the power of mindfulness.

**Obstacles:** Subtle dullness is difficult to recognize, creates an illusion of stable attention, and is seductively pleasant.

**Skills and methods:** Cultivating stronger and more **vigilant introspective awareness** so subtle dullness can be detected and corrected. The book introduces a specific **body-scanning technique** at this Stage - periodically expanding the field of attention to scan the body in defined sections, then returning to the breath. The scan deliberately enlivens peripheral awareness and increases the power of mindfulness without sacrificing stability.

**Mastery:** Mindfulness can be sustained or even increased through the course of each meditation session.

**Tool features:**

- Stage 5 sit offers an optional body-scan helper (paced sections; user can choose 4-, 6-, or 12-segment scans).
- Post-sit prompt to log whether subtle dullness was present.

**Key prompts (post-sit):**

- "Were breath sensations as vivid at the end of the sit as at the start?"
- "Did peripheral awareness stay alive during the sit?"
- "Did you run a body scan today?"

---

### Stage 6: Subduing Subtle Distractions

**What it is:** Attention is now mostly stable on the breath but still alternates with **subtle distractions** in the background - fleeting thoughts and mental objects in peripheral awareness. The work is to refine the **scope of attention** so it falls entirely on the breath, and the rest fades from attention while remaining available to peripheral awareness.

**Goal:** Subdue subtle distractions and develop **metacognitive introspective awareness**. End of Stage 6 reaches **Milestone Two: Sustained Exclusive Focus of Attention**.

**Obstacles:** The tendency for attention to alternate to the continuous stream of distracting thoughts and other mental objects in peripheral awareness.

**Skills and methods:** Defining the **scope of attention** more precisely than before, and ignoring everything outside that scope until subtle distractions fade. Developing **metacognitive introspective awareness** - awareness of the mind itself, not just the breath. The book introduces a specific method called **"experiencing the whole body with the breath"**: attention rests on the breath, while peripheral awareness opens to the whole body and the rhythm of breath sensations across it.

**Mastery:** Subtle distractions have almost entirely disappeared, and attention is unwavering and exclusive together with vivid mindfulness.

**Tool features:**

- Stage 6 sit offers "Whole body with the breath" as a selectable variant of the timer.
- Post-sit prompt includes optional metacognitive check-in ("Were you aware of the mind itself during the sit?").

**Key prompts (post-sit):**

- "Did subtle thoughts fade entirely at any point?"
- "Could you sense the breath across the whole body?"

---

### Milestone Two - Sustained Exclusive Focus of Attention

With mastery of Stages 4–6, attention no longer alternates back and forth between the breath and distractions in the background. The practitioner can focus on the breath to the exclusion of everything else, and the scope of attention itself is stable. Dullness has completely disappeared, and mindfulness takes the form of a powerful metacognitive introspective awareness. The two major objectives of meditative training - stable attention and powerful mindfulness - have been achieved.

The tool marks this milestone the same way as Milestone One: a quiet acknowledgement, no fanfare.

---

### Stage 7: Exclusive Attention and Unifying the Mind

**What it is:** Stage 7 is a transition. The practitioner can now investigate any object with any chosen scope, but it still takes continuous **vigilance and effort** to keep subtle distractions and subtle dullness at bay. The work is to keep going until exclusive attention becomes automatic and effort is no longer needed.

**Goal:** Effortlessly sustained exclusive attention and powerful mindfulness. End of Stage 7 reaches **Milestone Three: Effortless Stability of Attention**.

**Obstacles:** Distractions and dullness return if effort stops. Boredom, restlessness, and doubt arise during the wait. Bizarre sensations and involuntary body movements can appear and distract. Knowing _when_ to drop the effort becomes its own obstacle - making effort has become a habit, and it's hard to stop.

**Skills and methods:** Practicing patiently and diligently until the threshold of effortlessness is reached. Periodically **relaxing effort on purpose** to test whether it's still needed - the drop-effort test. Once effort is no longer necessary, **letting go of the need to be in control**. Optional **Insight (vipassanā) practices** and **jhāna practices** add useful variety at this Stage (covered in the book's appendices; **outside MVP scope** for this module).

**Mastery:** Effort can be dropped entirely and the mind still maintains an unprecedented degree of stability and clarity (**mental pliancy**).

**Tool features:**

- Stage 7 sit offers a "test for effortlessness" prompt mid-sit - a one-tap reminder to deliberately relax effort and see what happens.
- Post-sit reflection includes a check on bizarre sensations / involuntary movements (so the user has a non-clinical place to note them).

**Key prompts (post-sit):**

- "Did you try dropping effort during this sit?"
- "What happened when you did?"
- "Were there sensations or movements that surprised you?"

---

### Milestone Three - Effortless Stability of Attention

Effortlessly sustained exclusive attention together with powerful mindfulness. This state is called **mental pliancy** and arises from the **complete pacification of the discriminating mind** - mental chatter and discursive analysis have stopped, and different parts of the mind no longer pull against each other (**unification of mind**). The practitioner has crossed from being a skilled meditator to being an **adept meditator**.

---

### Stage 8: Mental Pliancy and Pacifying the Senses

**What it is:** Mental pliancy is established, but physical pain and discomfort still limit how long the practitioner can sit. Bizarre sensations and involuntary movements from Stage 7 may continue or intensify. Continued unification of mind brings **pacification of the senses** - the five physical senses and the mind sense temporarily grow quiet during meditation - and **physical pliancy** follows.

**Goal:** Complete pacification of the senses and the full arising of **meditative joy**.

**Obstacles:** Being distracted or distressed by the variety of extraordinary experiences that arise: unusual sensations, involuntary movements, strong energy currents in the body, intense joy. The instruction is to simply let them be.

**Skills and methods:** Practicing effortless attention and continuous introspective awareness; allowing the process of unification, pacification, and the arising of meditative joy to unfold. The book describes two specific exercises at this Stage: **the compliant mind** (momentary concentration, choiceless attention) and **Meditating on the Mind**. Optional **Luminous jhānas** are mentioned but are **outside MVP scope**.

**Mastery:** When the eyes perceive only an inner light, the ears only an inner sound, the body is suffused with pleasure and comfort, and the mental state is one of intense joy - with mental and physical pliancy, the practitioner can sit for hours without dullness, distraction, or physical discomfort.

**Tool features:**

- Stage 8 sit primer normalizes the experiences listed under Obstacles, so the user does not interpret them as problems. Crisis copy is still one tap away.
- Longer-duration timer presets unlocked at user request (60, 90, 120 minutes) - no upsell, no gamification.
- Post-sit reflection has free-text space for noting extraordinary experiences privately.

**Key prompts (post-sit):**

- "Anything unusual to note from today?"
- "Did the body settle into a state of comfort?"

---

### Stage 9: Mental and Physical Pliancy and Calming the Intensity of Meditative Joy

**What it is:** Meditative joy is now stable, but its intensity itself becomes a distraction. The work is to let the excitement of joy fade, leaving behind **tranquility and equanimity**.

**Goal:** The maturation of meditative joy into tranquility and equanimity.

**Obstacles:** The intensity of meditative joy can perturb the mind, becoming a distraction and disrupting practice.

**Skills and methods:** Continued practice; allowing familiarity with meditative joy to soften its intensity. **Meditating on the Mind** as introduced at Stage 8.

**Mastery:** Consistently evoking mental and physical pliancy accompanied by profound tranquility and equanimity.

**Tool features:**

- Stage 9 post-sit prompt notes the shift the user is looking for (joy fading toward equanimity).

**Key prompts (post-sit):**

- "How did joy feel today - sharp, settled, or somewhere in between?"
- "Was there a sense of equanimity by the end of the sit?"

---

### Stage 10: Tranquility and Equanimity

**What it is:** Stage 10 begins with all the qualities of **śamatha** - effortlessly stable attention, mindfulness, joy, tranquility, and equanimity. At first these qualities fade after the sit ends. As practice continues, they persist longer and longer between sessions, eventually becoming the normal condition of the mind. End of Stage 10 reaches **Milestone Four: Persistence of the Mental Qualities of an Adept**.

**Goal:** Establish śamatha as the normal condition of the mind.

**Obstacles:** The qualities of śamatha fade after the meditation session ends.

**Skills and methods:** Continuing regular practice; practicing **mindfulness in daily life** so that śamatha does not erode between sessions (the leaky-bucket problem from the book's Overview chapter).

**Mastery:** The qualities of śamatha - stable attention, mindfulness, joy, tranquility, and equanimity - persist for many hours after rising from the cushion.

**Tool features:**

- Stage 10 home surfaces a "daily life mindfulness" log: not a checklist, just a one-line note per day about how the qualities of śamatha showed up off the cushion.

**Key prompts (post-sit / daily):**

- "Did anything from the sit carry into the rest of the day?"
- "What pulled you out of it, if anything?"

---

### Milestone Four - Persistence of the Mental Qualities of an Adept

The positive mental qualities the practitioner experiences during meditation are strongly present even between sessions; daily life itself becomes imbued with effortlessly stable attention, mindfulness, joy, tranquility, and equanimity. The book frames this state as **unsurpassable** and as the soil in which the seeds of Insight ripen. UI copy stops here; it does not make claims about what lies beyond.

---

## 3. Core Data Model

All entities use camelCase field names and are stored in Supabase. Every entity has implicit `id` (uuid), `userId` (foreign key), `createdAt`, and `updatedAt` fields unless noted. Field shapes and partial-save semantics mirror the patterns established by the CBT module.

```typescript
// One row per user - the user's place in the program.
MeditationProgramState {
  currentStage: integer           // 1–10
  assessedStage: integer          // 1–10, set during onboarding, kept for context
  milestonesReached: integer[]    // subset of [1, 2, 3, 4]
  onboardingCompletedAt: timestamp | null
  lastSessionAt: timestamp | null
  preferredDurationMinutes: integer | null
  preferredTimeOfDay: string | null   // 'HH:MM' local-time hint
}

// Extends the existing meditation_sessions row.
MeditationSession {
  stageAtSession: integer         // 1–10, captured at the time of the sit
  durationMinutes: integer
  completedAt: timestamp
  // All fields below optional at save - partial records permitted.
  mindWanderingEpisodes: integer | null   // Stage 2/3 prompt
  dullnessLevel: DullnessLevel | null     // 'none' | 'subtle' | 'strong'
  distractionLevel: DistractionLevel | null  // 'none' | 'subtle' | 'gross'
  obstacleTags: MeditationObstacleTag[]
  reflection: string              // optional free-text, private
  moodAfter: integer | null       // 1–10, optional
  techniqueUsed: TmiTechnique | null
}

// A long-form practice note tied to a Stage, optional.
StagePracticeNote {
  stage: integer                  // 1–10
  note: string                    // free-text, private
}
```

### Shared Enums

```typescript
type MeditationObstacleTag =
  | "resistance"
  | "procrastination"
  | "fatigue"
  | "impatience"
  | "boredom"
  | "mindWandering"
  | "monkeyMind"
  | "forgetting"
  | "sleepiness"
  | "grossDistraction"
  | "subtleDullness"
  | "strongDullness"
  | "pain"
  | "intellectualInsights"
  | "chargedMemories"
  | "subtleDistraction"
  | "restlessness"
  | "doubt"
  | "bizarreSensations"
  | "energyCurrents"
  | "meditativeJoyIntensity";

type DullnessLevel = "none" | "subtle" | "strong";
type DistractionLevel = "none" | "subtle" | "gross";

type TmiTechnique =
  | "breathAtNose"
  | "followingTheBreath"
  | "connecting"
  | "bodyScan"
  | "wholeBodyWithBreath"
  | "metacognitiveAwareness"
  | "effortlessness";
```

### Tables (planned, not yet migrated)

- `meditation_program_state` - one row per user; primary key `user_id`.
- `meditation_sessions` - extended with `stage_at_session`, `mind_wandering_episodes`, `dullness_level`, `distraction_level`, `obstacle_tags TEXT[]`, `reflection`, `mood_after`, `technique_used`. Existing rows backfill `stage_at_session` to 1.
- `stage_practice_notes` - optional long-form notes tied to a Stage.

All tables RLS owner-only, mirroring CBT.

---

## 4. Module Contract

This module follows the contract documented in `tools.md`:

- New `ModuleKey`: `"meditation"`. Added to the union in `src/features/modules/types.ts` alongside `"cbt"`. Default `enabledModules` stays `["cbt"]` - meditation is opt-in via the modules discovery screen.
- i18n namespace: `meditation:*`.
- Route group: `/modules/meditation/*` (see §6).
- New `user_preferences` fields, mirroring the CBT reminder fields:
  - `meditation_onboarding_completed: boolean`
  - `meditation_reminders_enabled: boolean`
  - `meditation_reminder_hour: integer` (0–23)
  - `meditation_reminder_minute: integer` (0–59)
  - `meditation_reminder_timezone: string | null`
- Reminders default off, single daily reminder at the chosen practice time, non-punitive copy. Same web-push / Expo Notifications path as CBT.
- Settings can reset the onboarding flag (same pattern as the app and CBT onboarding flags).
- The placeholder route at `/tools/meditation` becomes a compatibility redirect to `/modules/meditation`.

---

## 5. Routes

| Route                               | Purpose                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/modules/meditation`               | Home: today's practice card (current stage + suggested duration), recent sessions, stage progress strip. |
| `/modules/meditation/onboarding`    | Full-screen fallback for the onboarding modal (used when the modal is dismissed or revisited).           |
| `/modules/meditation/learn`         | First-visit primer: Attention vs. Awareness, Gardener's Mindset, non-linearity, safety.                  |
| `/modules/meditation/session/new`   | Pre-sit primer (Stage-aware) → timer → post-sit reflection. Wraps the existing timer UI.                 |
| `/modules/meditation/sessions`      | Private session history list.                                                                            |
| `/modules/meditation/sessions/[id]` | Session detail; edit reflection / archive.                                                               |
| `/modules/meditation/stages`        | Read-only library of all ten Stages.                                                                     |
| `/modules/meditation/stages/[n]`    | Single-Stage page: goals, obstacles, skills, prompts, "switch to this Stage" action.                     |
| `/tools/meditation`                 | Compatibility redirect to `/modules/meditation`.                                                         |

---

## 6. Onboarding Flow (Modal Wizard)

Mirrors `src/components/app/cbt-onboarding-modal.tsx`. Five steps; only Step 1 is mandatory. Completion is tracked via `meditation_onboarding_completed` on `user_preferences`. The full content is also available as a route (`/modules/meditation/onboarding`) so the user can revisit it.

1. **Welcome** - the "Path to Awakening" infographic + two sentences of framing. Emphasis: ten Stages, non-linear, this is a practice, not a finish line. No claims about Awakening.
2. **Attention vs. Peripheral Awareness** - paired bullseye/landscape illustration. One short paragraph each. The product's central concept; readers see it once during onboarding and revisit it via the Learn route.
3. **Where are you starting?** - five to seven self-assessment questions whose answers map to a starting Stage. The mapping is deliberately conservative - when in doubt, land the user one Stage earlier. Questions include:
   - "Do you have a daily sit habit?" → no = Stage 1; yes = Stage 2+
   - "How long can you usually stay with the breath before noticing you've drifted?" → seconds / about a minute / several minutes / continuously → Stages 2 / 3 / 3–4 / 4+
   - "Do you fall asleep when you meditate?" → yes = Stage 3 work
   - "Can you notice you've been distracted before you've fully forgotten the breath?" → no = Stage 2; yes = Stage 3+
   - "Have you ever experienced extended periods (minutes) of breath sensation with no thoughts at all?" → yes = Stage 4+ candidate
4. **The Gardener's Mindset** - compass + sitting-on-the-path illustrations. Three short bullets: _patience over force_, _intention over willpower_, _every sit is the right sit_. Anchors the tone of the rest of the product.
5. **Commit to a slot** - pick a daily time and duration (10 / 15 / 20 / 30 / custom). Optional reminder toggle (default off). Writes to `user_preferences` and creates the initial `meditation_program_state` row.

Onboarding can be skipped after Step 1; doing so lands the user on Stage 1 by default.

---

## 7. Daily / Session Flow

- **Pre-sit:** Stage-aware primer card. Stage 1 shows the Six-Point Preparation; later Stages show one or two relevant reminders ("test for effortlessness today" at Stage 7, "body scan at the midpoint?" at Stage 5). The pre-sit collapses to a single tap once the user marks it familiar.
- **Sit:** The existing timer UI (`src/features/meditation/meditation-screen.tsx`) is reused. Optional silent half-time bell (single soft chime) for the "check-in" practice introduced at Stage 3.
- **Post-sit reflection:** Two to four prompts pulled from the current Stage's prompt list. All optional. Mood-after (1–10) and free-text reflection always available.
- **Stage check-in:** After seven days at the current Stage, surface a non-pushy "Want to reassess where you are?" link. The tool **never auto-advances**.

---

## 8. Cross-Module Links

- The mindfulness library at `/tools/mindfulness/*` continues to host the seven exercises tied to CBT Strategy 5. The meditation module links to it as a list of **supporting practices** - Walking Meditation (Appendix A in the book), Loving-Kindness (Appendix C), and the rest. Sessions logged through `/tools/mindfulness` remain `mindfulness_sessions` and do **not** count as TMI sessions.
- CBT's Strategy 5 module link continues to point at `/tools/mindfulness`; meditation does not replace that path.
- Care plan (`src/features/plan/generate-plan.ts`): once this module ships, the `meditation` tool entry's `route` updates from `/tools/meditation` to `/modules/meditation`. The change is small and lives in the implementation PR, not this spec.

---

## 9. Cross-Cutting Features

### Stage Progress Display

A single horizontal strip on `/modules/meditation` showing Stages 1–10 with the current Stage highlighted. The strip is informational only - no "X% complete" framing, no time estimates, no comparison to other users. Milestones appear as small dividers between Stages.

### Insights (deferred to Phase 5)

- "On Stages 2 and 3, the average mind-wandering count drops over the first 14 days." - surfaced only after enough data exists, and never framed as performance.
- Stage-time distribution: a quiet summary of how long the user spent practicing at each Stage.

### Reminders

All notifications are explicit opt-in, quiet by default, and easy to disable. Allowed reminders for the meditation module:

- Daily practice reminder at the chosen time.
- Optional weekly review prompt (off by default).

Deferred or out of scope:

- Streak / habit-preservation reminders.
- Missed-day warnings.
- Milestone celebration pushes.
- Crisis or low-mood follow-up notifications.

### Safety

- Stage 4's "purification" content can surface intense emotional material. The Stage 4 primer screen displays the crisis-support copy used elsewhere in the app; crisis information is also reachable from the meditation home.
- The tool is explicitly not a substitute for professional help or a medical intervention. This disclaimer appears during onboarding and is accessible from settings at any time.
- No clinical diagnoses or clinical language in UI copy.

### Tone

- Second person, warm, non-clinical.
- No "level up" or game language. Stages are practice contexts, not achievement tiers.
- Slips and setbacks are described as part of the path. The book is explicit that this is normal.
- Buddhist and Pali / Sanskrit terms (śamatha, vipassanā, jhāna) appear only in the deliberate Glossary section (§11), never in primary UI copy. The UI uses plain-language synonyms ("tranquility," "insight," "absorption - outside this module's scope") and links to the Glossary on tap.

---

## 10. Non-Goals

- AI features.
- Community features.
- Jhāna / Insight practices as first-class flows (referenced as "Appendix D - outside this module's scope" where relevant; not implemented in MVP).
- Audio guidance (deferred - same posture as the CBT module's mindfulness exercises).
- Clinical diagnostic labels in UI copy.
- Claims about Awakening, Enlightenment, or therapeutic outcomes.
- Therapist or teacher portal (single-user in v1).
- Streak pressure, badges, "X days in a row" framing.

---

## 11. Glossary

| Term                                  | Definition as used in this tool                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Śamatha                               | The combined qualities of effortlessly stable attention, powerful mindfulness, joy, tranquility, and equanimity.                |
| Vipassanā / Insight                   | Direct experiential understanding of the nature of mind and experience. Insight practices are referenced but outside MVP scope. |
| Mindfulness                           | The optimal interaction between stable attention and powerful peripheral awareness.                                             |
| Attention                             | Selective, focused mode of "knowing" that isolates an object for closer inspection.                                             |
| Peripheral awareness                  | Global, holistic mode of "knowing" that provides context, including introspective awareness of one's own mental state.          |
| Introspective awareness               | Awareness of what the mind is currently doing.                                                                                  |
| Metacognitive introspective awareness | A refined, selective awareness of the mind itself - characteristic of Stage 6 and beyond.                                       |
| Gross distraction                     | A distraction that becomes the primary focus of attention and pushes the meditation object into the background.                 |
| Subtle distraction                    | A fleeting thought or mental object that remains in peripheral awareness without overtaking attention.                          |
| Strong dullness                       | A state where breath sensations fade or distort as the mind drifts toward sleep without the practitioner noticing.              |
| Subtle dullness                       | A pleasant but seductive state where attention seems stable but mindfulness has weakened - easy to mistake for progress.        |
| Forgetting                            | Losing track of the meditation object entirely, typically leading to mind-wandering.                                            |
| Mind-wandering                        | Extended, unrecognized thinking that has replaced attention on the meditation object.                                           |
| Mental pliancy                        | Effortlessly sustained exclusive attention with powerful mindfulness; the state of Milestone Three.                             |
| Physical pliancy                      | The state in which the body becomes quiet and comfortable enough to sit for extended periods without pain or distraction.       |
| Meditative joy                        | A unique mental state of pleasure and happiness that arises with deep unification of mind - characteristic of Stages 8–9.       |
| Pacification of the senses            | A temporary quieting of the five physical senses and the mind sense during deep meditation.                                     |
| Unification of mind                   | A state in which different mental processes coalesce around a single purpose rather than working at cross-purposes.             |
| Six-Point Preparation                 | A short pre-sit routine: motivation, goals, expectations, diligence, distractions, posture.                                     |
| Four-Step Transition                  | A gradual narrowing of attention into the breath at the start of a sit.                                                         |
| Following the breath                  | Paying attention to the full arc of inhale and exhale, including the pauses - a Stage 3 method.                                 |
| Connecting                            | Comparing breaths and noting differences - a Stage 3 method.                                                                    |
| Body scan                             | Periodically expanding the field of attention to scan body sections, then returning to the breath - a Stage 5 method.           |
| Whole body with the breath            | Resting attention on the breath while peripheral awareness opens to the whole body's breath sensations - a Stage 6 method.      |

---

## 12. Acceptance Bar

This spec is ready to drive implementation when:

- All ten Stages are documented with goals, obstacles, skills/methods, mastery criteria, tool features, and prompts.
- All four milestones are positioned correctly.
- The data model is sufficient for partial-save semantics matching the CBT module.
- The module contract maps cleanly onto the existing CBT module contract (ModuleKey, route group, settings flags, reminder fields, i18n namespace).
- Safety, tone, and non-goals explicitly rule out Awakening claims and clinical language in UI copy.
- The spec is reviewed and linked from `tools.md`.

The module itself is ready to ship its first phase when:

- Auth works across platforms (already true).
- `meditation_program_state` and the extended `meditation_sessions` rows persist safely under RLS.
- Onboarding lands a user at a Stage and records the slot they committed to.
- The Stage-aware pre-sit and post-sit flows work for at least Stages 1–3 (Foundation phase).
- Reminder defaults stay quiet.
- Accessibility baseline matches the CBT module's.
- Tests cover the program-state repository, the onboarding state machine, and one user-facing flow (e.g., post-sit reflection save).

---

## 13. Implementation Sequencing

| Phase                  | Modules                                                                                                                     | Notes                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **1 - Foundation**     | `meditation_program_state`, extended `meditation_sessions`, onboarding modal, `/modules/meditation` home, Stages 1–3 flows. | Mirrors CBT Phase 1. Lands the daily-practice loop and the basic Stage-aware pre-sit / post-sit primitives. |
| **2 - Skilled stages** | Stage 4–6 flows (body scan helper, whole-body-with-breath variant, dullness logging).                                       | Depends on Phase 1 being stable.                                                                            |
| **3 - Transition**     | Stage 7 flow (effortlessness test, bizarre-sensation private note).                                                         | Smallest phase - single Stage but conceptually distinct.                                                    |
| **4 - Adept stages**   | Stage 8–10 flows; extended-duration timer presets; daily-life mindfulness log.                                              | Most users won't reach this; ship behind the same module gate.                                              |
| **5 - Synthesis**      | Stage-time insights, cross-Stage history, export.                                                                           | Capstone - quiet, no badges.                                                                                |

---

## 14. Open Questions

| Question                                                                                                                      | Decision needed by               |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Are Pali / Sanskrit terms (śamatha, vipassanā, jhāna) acceptable in glossary entries? Spec assumes yes, plain-language in UI. | Before Phase 1 ships             |
| Should the onboarding self-assessment land users on a computed Stage, or always default to Stage 1 (most book-faithful)?      | Before onboarding implementation |
| Audio support for guided pre-sit / mid-sit cues.                                                                              | Phase 4 planning                 |
| Localization (i18n) coverage of the long-form Stage prose - do we ship English-only initially?                                | Before Phase 1 ships             |
