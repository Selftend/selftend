# CBT Program Spec - Gillihan: Cognitive Behavioral Therapy Made Simple

**Source:** _Cognitive Behavioral Therapy Made Simple: 10 Strategies for Managing Anxiety, Depression, Anger, Panic, and Worry_ - Seth J. Gillihan PhD (Althea Press, 2018)  
**Status:** Canonical spec for the real CBT feature  
**Audience:** Developers and product contributors

---

## 1. Framework Overview

### The Think-Act-Be Model

The book organizes CBT around three mutually reinforcing pillars:

| Pillar    | Focus       | Approach                                                        |
| --------- | ----------- | --------------------------------------------------------------- |
| **Think** | Cognitive   | Identify and change unhelpful thoughts and core beliefs         |
| **Act**   | Behavioral  | Take action aligned with values; change behavior to change mood |
| **Be**    | Mindfulness | Present-moment awareness without judgment                       |

Positive change in any one pillar reinforces the others. The tool should surface which pillar each module belongs to so users build an integrated practice.

### The Cognitive Triangle

Thoughts, feelings, and behaviors are interconnected. Changing any one influences the others:

```
        Thoughts
       /        \
Feelings --- Behaviors
```

Examples:

- Anxious thoughts → anxiety → avoidance → reinforced anxiety
- Depressed thoughts → low mood → inactivity → worsened depression
- Angry thoughts → anger → aggressive behavior → damaged relationships

### The Three Waves of CBT

1. **Behavioral therapy** - change behavior to improve mood
2. **Cognitive therapy** - change thoughts to change feelings
3. **Mindfulness-based therapy** - change attention and acceptance to reduce suffering

### Core Principles

- **Collaborative and active** - the user defines goals and works toward them; the tool is a guide, not a prescriber
- **Goal-oriented** - every module ties back to a goal
- **Present-focused** - emphasize what can be changed now, not just what happened in the past
- **Self-therapy** - the user learns skills to apply independently and to future challenges
- **Relapse prevention** - the program builds toward a personal maintenance plan

---

## 2. The 10 Strategies

### Strategy 1: Goal Setting

**What it is:** Clear, compelling goals transform dissatisfaction into determination. Goals must be specific, measurable, and anchored to personal values - not vague statements like "feel better."

**Key concepts from the book:**

- Find the "right gear" - moderately challenging goals you can sustain (not too easy, not overwhelming)
- Goals should reflect what you want to do more of, less of, and how relationships and quality of life would improve
- Goals must align with personal values, not others' expectations
- Think marathon, not sprint

**Tool features:**

- Goal creation with life domain, type, and target date
- Milestone breakdown - at least one milestone required before a goal is considered active
- Progress indicator (milestones completed / total)
- Weekly review prompt to check goal status
- Goal can be paused or abandoned without data loss

**User inputs:**

| Field          | Type        | Notes                                                                   |
| -------------- | ----------- | ----------------------------------------------------------------------- |
| `title`        | string      | Short name for the goal                                                 |
| `description`  | string      | What achieving this looks like                                          |
| `lifeDomain`   | enum        | `work`, `relationships`, `health`, `leisure`, `personalGrowth`, `other` |
| `goalType`     | enum        | `doMore`, `doLess`, `improveRelationship`, `improveQuality`             |
| `targetDate`   | date        | Optional                                                                |
| `milestones[]` | Milestone[] | At least one required                                                   |

**Milestone fields:** `description` (string), `targetDate` (date, optional), `completedAt` (timestamp, null until done)

**Key prompts:**

- "What do you want to be doing more of in your life?"
- "What would you like to do less of?"
- "How would your relationships look if things were better?"
- "What's one concrete step you could take this week?"

---

### Strategy 2: Behavioral Activation

**What it is:** Action precedes motivation. Engaging in meaningful activities breaks the depression cycle - you don't wait to feel like doing something; you do it and the motivation follows. Avoidance provides short-term relief (negative reinforcement) but removes opportunities for reward, deepening low mood.

**Key concepts from the book:**

- William James: "By regulating the action, which is under the more direct control of the will, we can indirectly regulate the feeling."
- Balance **pleasure** (enjoyable activities) and **mastery** (accomplishment-based activities)
- Values clarification: identify what matters across life domains, then schedule activities that align with those values
- Mood tracking before and after activities builds personal evidence that action works

**Tool features:**

- Values clarification exercise (importance vs. satisfaction per domain)
- Activity scheduling with calendar view
- Mood-before / mood-after logging per activity
- Insight: average mood lift by activity category over time

**User inputs (values clarification):**

| Field                | Type        | Notes                        |
| -------------------- | ----------- | ---------------------------- |
| `lifeDomain`         | enum        | Same domains as Goal         |
| `importanceRating`   | integer 1-5 | How much this domain matters |
| `satisfactionRating` | integer 1-5 | Current level of fulfillment |
| `domainNote`         | string      | What matters in this domain  |

**User inputs (activity log):**

| Field          | Type         | Notes                 |
| -------------- | ------------ | --------------------- |
| `activityName` | string       |                       |
| `category`     | enum         | `pleasure`, `mastery` |
| `scheduledAt`  | timestamp    | When planned          |
| `completedAt`  | timestamp    | When done             |
| `moodBefore`   | integer 1-10 |                       |
| `moodAfter`    | integer 1-10 |                       |
| `notes`        | string       | Optional              |

**Key prompts:**

- "Which area of your life feels most out of balance right now?"
- "What's one thing you used to enjoy that you've been putting off?"
- "Schedule one small activity for tomorrow - something you can actually do."
- After activity: "How did that go? Rate your mood before and after."

---

### Strategy 3: Thought Records

**What it is:** Negative automatic thoughts arise effortlessly when we're triggered. They feel like facts but are often opinions or distortions. The Thought Record is the core CBT tool - a structured process to examine a thought and form a more balanced response.

**Key concepts from the book:**

- Our minds are biased toward negative interpretations, especially during emotional states
- A sudden shift toward negative emotion, persistent feelings, or physical tension signals an automatic thought worth examining
- Self-compassion: speak to yourself as you would to a good friend
- The goal is not forced positivity - it is a more accurate, balanced view

**The 5-step Thought Record (Gillihan model):**

1. **Situation** - what happened? (facts only, no interpretation)
2. **Automatic Thought** - what thought arose?
3. **Emotions** - what feelings came up, and how intense (0-100)?
4. **Likely Distortions** - which cognitive distortions apply?
5. **Balanced Thought** - given the evidence, what's a more accurate view?

**Cognitive distortions to present as selectable tags:**

| Distortion                 | Plain-language label                 |
| -------------------------- | ------------------------------------ |
| All-or-nothing thinking    | Black-and-white thinking             |
| Catastrophizing            | Assuming the worst                   |
| Mind reading               | Assuming you know what others think  |
| Fortune telling            | Predicting a negative outcome        |
| Emotional reasoning        | Feeling it means it's true           |
| Should statements          | Rigid rules about how things must be |
| Labeling                   | Defining yourself by one event       |
| Personalization            | Taking excessive blame               |
| Mental filter              | Focusing only on the negative        |
| Disqualifying the positive | Dismissing good things               |
| Overgeneralization         | "This always happens to me"          |
| Magnification/minimization | Blowing things out of proportion     |

**User inputs:**

| Field                    | Type          | Notes                                                |
| ------------------------ | ------------- | ---------------------------------------------------- |
| `situation`              | string        | Optional at save time                                |
| `automaticThought`       | string        | Optional at save time                                |
| `emotions`               | string[]      | Free text or tag selection; optional at save time    |
| `emotionIntensityBefore` | integer 0-100 |                                                      |
| `distortions`            | string[]      | Tag selection from list above; optional at save time |
| `evidenceFor`            | string        | Facts supporting the thought                         |
| `evidenceAgainst`        | string        | Facts against the thought                            |
| `balancedThought`        | string        | Optional at save time                                |
| `emotionIntensityAfter`  | integer 0-100 |                                                      |
| `outcomeNotes`           | string        | Optional reflection                                  |

**Prompts shown during evidence examination:**

- "Is this a fact or an opinion?"
- "What would you tell a close friend who had this thought?"
- "Have you faced this situation before? What actually happened?"
- "Are you holding yourself to a harsher standard than you would anyone else?"
- "What evidence argues against this thought?"

**Key insight display after completion:** Show the emotion intensity drop (before vs. after) as evidence that the exercise works.

**Implementation note:** The app shows the full thought record flow by default, including evidence, before/after intensity, and outcome notes. Fields are optional at save time so users can create a partial record and complete it later.

---

### Strategy 4: Core Beliefs

**What it is:** Automatic thoughts are not random - they cluster around deep-seated global beliefs that filter how we interpret reality. Core beliefs act like a radio station: the songs change but belong to the same genre. Changing core beliefs creates lasting change in thought patterns.

**Key concepts from the book:**

- Examples: "I am a failure," "I am unlovable," "People will judge me harshly," "The world is dangerous"
- Core beliefs form from early experience and operate as mental shortcuts
- Identify them by looking for recurring themes across multiple thought records
- Test with evidence, develop an alternative belief, and reinforce it through consistent new experiences

**Tool features:**

- Surface recurring themes automatically after 3+ thought records (optional pattern hint)
- Structured evidence examination (same format as thought records but for a belief)
- Track belief strength over time for both original and alternative belief
- Schedule review dates to reinforce progress

**User inputs:**

| Field                       | Type          | Notes                                            |
| --------------------------- | ------------- | ------------------------------------------------ |
| `beliefStatement`           | string        | e.g., "I am a failure"                           |
| `triggeringSituations`      | string        | When does this belief activate?                  |
| `evidenceFor`               | string        | What supports this belief?                       |
| `evidenceAgainst`           | string        | What contradicts it?                             |
| `alternativeBelief`         | string        | A more balanced belief statement                 |
| `originalBeliefStrength`    | integer 0-100 | How strongly believed (tracked over time)        |
| `alternativeBeliefStrength` | integer 0-100 | Tracked over time                                |
| `reinforcementPlan`         | string        | What experiences will help build the new belief? |
| `nextReviewDate`            | date          | Scheduled check-in                               |

**Key prompts:**

- "Complete this sentence: I am... / People are... / The world is..."
- "When does this belief get activated most strongly?"
- "What in your actual experience argues against this belief?"
- "What would you need to experience to believe the alternative?"

---

### Strategy 5: Mindfulness

**What it is:** Present-moment awareness without judgment. Two tendencies cause unnecessary suffering: focusing on the non-present (past regrets, future worries) and judging reality as good or bad, clinging to what we like and resisting what we dislike. Mindfulness reduces both.

**Key concepts from the book:**

- Mindfulness is not a separate activity - it's bringing full attention to what you're already doing
- Deliberate openness: observe without judgment or resistance
- Accept difficult emotions when they arise rather than fighting them
- Application: notice sensory details (colors, sounds, textures, smells) in routine activities

**Tool features:**

- Guided exercise library (text-based, v1; audio in later versions)
- Duration selection per session
- Practice streak / consistency calendar
- Post-session mood rating
- Brief psychoeducation shown on first access only

**Exercise library (minimum viable set):**

| Exercise                            | Duration options |
| ----------------------------------- | ---------------- |
| Mindful breathing                   | 2, 5, 10 min     |
| Body scan                           | 5, 10, 20 min    |
| 5-4-3-2-1 sensory grounding         | 5 min            |
| Observing thoughts without judgment | 5, 10 min        |
| Mindful walking (instructions)      | 10, 20 min       |
| Mindful eating (instructions)       | with a meal      |
| Loving-kindness meditation          | 10, 20 min       |

**User inputs:**

| Field             | Type         | Notes                      |
| ----------------- | ------------ | -------------------------- |
| `exerciseName`    | string       | From library               |
| `durationMinutes` | integer      | Selected at session start  |
| `completedAt`     | timestamp    |                            |
| `reflection`      | string       | Optional post-session note |
| `moodAfter`       | integer 1-10 |                            |

**Key prompts:**

- "Bring your full attention to what you can see right now."
- "Notice the thought, and let it pass like a cloud."
- "You don't have to make the feeling go away - just observe it."

---

### Strategy 6: Overcome Procrastination

**What it is:** Procrastination is maintained by negative reinforcement - the relief from avoidance feels like a reward, making avoidance more likely. It is driven by fear the task will be unpleasant, fear of not doing it well, and permission-giving thoughts ("I'll do it later").

**Key concepts from the book:**

- Don't wait to feel motivated; start despite discomfort
- Break large tasks into small, specific steps
- Reward progress, not just completion
- Address perfectionism - the belief that something must be done perfectly fuels avoidance

**Tool features:**

- Task entry with avoidance reason and fear-thought capture
- Lightweight thought challenge (2-3 prompts, not the full thought record)
- Step breakdown with time estimates
- Step-by-step completion with celebration on each step
- Completed task archive (positive reinforcement)

**User inputs:**

| Field               | Type       | Notes                                             |
| ------------------- | ---------- | ------------------------------------------------- |
| `taskDescription`   | string     | What is being avoided                             |
| `avoidanceReason`   | string     | What feels hard about starting                    |
| `fearThought`       | string     | What the user is afraid will happen               |
| `challengedThought` | string     | A more balanced view                              |
| `steps[]`           | TaskStep[] | Breakdown of the task                             |
| `deadline`          | date       | Optional                                          |
| `reward`            | string     | What to do after completing a step                |
| `status`            | enum       | `pending`, `inProgress`, `completed`, `abandoned` |

**TaskStep fields:** `description` (string), `estimatedMinutes` (integer, optional), `completedAt` (timestamp, null until done)

**Key prompts:**

- "What feels hard about getting started?"
- "What's the worst you imagine happening if you do this task?"
- "Is that fear realistic, or is your mind predicting disaster?"
- "What is the very first tiny step - so small you could do it in 2 minutes?"
- On step completion: "You did it. What did you notice?"

---

### Strategy 7: Anxiety and Exposure

**What it is:** Fear is a response to an actual, present threat. Anxiety is a response to an imagined threat. Avoidance maintains anxiety by preventing habituation - the natural reduction of anxiety that occurs during prolonged, repeated exposure. The treatment is graduated exposure: deliberately facing feared situations without using safety behaviors.

**Key concepts from the book:**

- **Yerkes-Dodson Law:** Optimal performance occurs at moderate anxiety. Too little or too much impairs it.
- **SUDS:** Subjective Units of Distress Scale (0-100) measures anxiety intensity
- **Safety behaviors** (reassurance-seeking, escape, checking) provide short-term relief but prevent long-term habituation - they must be reduced during exposure
- **Habituation:** anxiety peaks and then drops naturally during exposure; the user's job is to stay with it
- **ERP (Exposure and Response Prevention):** for OCD-type patterns, expose to the feared thought while preventing the compulsive response

**Anxiety types addressed:**

| Type            | Core feature                                              |
| --------------- | --------------------------------------------------------- |
| Specific phobia | Excessive, persistent fear of an object or situation      |
| Social anxiety  | Fear of evaluation, embarrassment in social situations    |
| Panic disorder  | Intense sudden anxiety with physical symptoms             |
| GAD             | Chronic worry across many life areas                      |
| PTSD            | Trauma-related intrusions, avoidance, hypervigilance      |
| OCD             | Obsessive thoughts with compulsive neutralizing behaviors |

**Sub-module A: Exposure Hierarchy Builder**

| Field         | Type           | Notes                  |
| ------------- | -------------- | ---------------------- |
| `title`       | string         | Theme of the hierarchy |
| `anxietyType` | enum           | From types above       |
| `items[]`     | ExposureItem[] | Sorted by SUDS rating  |

**ExposureItem fields:** `description` (string), `sudsRating` (integer 0-100), `completedAt` (timestamp, null until done)

**Sub-module B: Exposure Session Tracker**

| Field                       | Type          | Notes                                       |
| --------------------------- | ------------- | ------------------------------------------- |
| `exposureItemId`            | string        | Which item is being practiced               |
| `preSuds`                   | integer 0-100 |                                             |
| `postSuds`                  | integer 0-100 |                                             |
| `durationMinutes`           | integer       |                                             |
| `safetyBehaviorsUsed`       | boolean       | Flag; if true, note what and work to reduce |
| `safetyBehaviorDescription` | string        | Optional                                    |
| `notes`                     | string        | Session notes                               |
| `completedAt`               | timestamp     |                                             |

**Sub-module C: Worry Journal**

| Field                 | Type          | Notes                                     |
| --------------------- | ------------- | ----------------------------------------- |
| `worryStatement`      | string        |                                           |
| `worryCategory`       | enum          | `hypothetical` ("what if"), `realProblem` |
| `probabilityEstimate` | integer 0-100 | For hypothetical worries                  |
| `evidenceFor`         | string        |                                           |
| `evidenceAgainst`     | string        |                                           |
| `copingStatement`     | string        | For hypothetical worries                  |
| `actionSteps`         | string        | For real/current problems                 |
| `resolved`            | boolean       |                                           |

**Key prompts (exposure):**

- "Anxiety is temporary. It will peak and then drop. Your job is to stay with it."
- "What safety behaviors are you tempted to use? Resist them."
- SUDS check every 5 minutes during longer sessions
- After session: "Your SUDS went from X to Y. That's your brain learning it's safe."

**Key prompts (worry):**

- "Is this a 'what if' worry or a real problem you can act on?"
- "What is the realistic probability this will happen?"
- "What would you do to cope even if it did happen?"

---

### Strategy 8: Anger Management

**What it is:** Anger stems from the perception of having been wronged or treated unfairly. It involves physical arousal (elevated heart rate, tension) and a strong urge to retaliate. The CBT approach targets interpretation (changing the story told about the trigger) and arousal (reducing physical activation before responding).

**The Anger Cycle:**

```
Trigger → Interpretation → Physical Arousal → Urge → Behavior → Consequence
```

**Key concepts from the book:**

- The central feature of anger is the sense of having been wronged
- Catastrophic interpretations ("they're deliberately disrespecting me," "this is unbearable") escalate anger
- Time-out (cooling off) is a behavioral intervention; it prevents impulsive responses
- The goal is not suppression - it is responding to the actual problem effectively

**Tool features:**

- Full anger cycle log with all cycle fields
- Pattern insight: surface recurring triggers or interpretations
- Arousal level trend over time
- Psychoeducation (anger cycle diagram) shown on first access

**User inputs:**

| Field                       | Type         | Notes                                 |
| --------------------------- | ------------ | ------------------------------------- |
| `trigger`                   | string       | What happened                         |
| `interpretation`            | string       | What story did you tell yourself      |
| `arousalLevel`              | integer 1-10 | Peak arousal                          |
| `urge`                      | string       | What you felt like doing              |
| `behaviorChosen`            | string       | What you actually did                 |
| `consequence`               | string       | What happened as a result             |
| `timeOutTaken`              | boolean      | Did you take a cooling-off period     |
| `alternativeInterpretation` | string       | Another way to see the trigger        |
| `outcomeRating`             | integer 1-10 | How satisfied with how you handled it |
| `notes`                     | string       | Optional                              |

**Key prompts:**

- "What story did you tell yourself about what happened?"
- "Is there another explanation for why they acted that way?"
- "What was the actual problem that needed addressing?"
- "What would you do differently next time?"

---

### Strategy 9: Self-Care

**What it is:** Taking care of mind, body, and spirit breaks cycles that perpetuate depression and low mood. Strong evidence supports sleep, exercise, nutrition, social connection, and meaningful activity as protective factors for mental health.

**Key concepts from the book:**

- Sleep: 7-9 hours per night; consistent schedule; dark, cool room; limit screens before bed
- Exercise: proven antidepressant effects; 30+ minutes most days; walking counts
- Nutrition: structured meals; avoid relying on caffeine, sugar, or alcohol for emotional regulation
- Social connection: quality over quantity; regular contact with people who care about you
- Self-compassion: speak to yourself as you would a good friend; challenge self-criticism
- Gratitude: regular practice shifts attention toward what is working

**Tool features:**

- Evening daily log covering all domains
- Color-coded daily scorecard (do not rely on color alone - use icons)
- Weekly trend charts: sleep, exercise frequency, mood correlation
- Gratitude log archive
- Insight: "On days you exercise, your average mood is X vs. Y on days you don't"

**User inputs:**

| Field                  | Type         | Notes                   |
| ---------------------- | ------------ | ----------------------- |
| `date`                 | date         |                         |
| `sleepHours`           | float        |                         |
| `sleepQuality`         | integer 1-10 |                         |
| `exerciseDone`         | boolean      |                         |
| `exerciseMinutes`      | integer      | If done                 |
| `exerciseType`         | string       | Optional                |
| `mealsStructured`      | boolean      | Regular meals today     |
| `emotionalEating`      | boolean      |                         |
| `socialConnectionMade` | boolean      |                         |
| `socialNotes`          | string       | Optional                |
| `meaningfulActivity`   | string       |                         |
| `gratitude`            | string[3]    | Three gratitude entries |

**Key prompts:**

- "Three things from today, however small - what are you grateful for?"
- "Did you move your body today?"
- "Did you connect with someone who matters to you?"

---

### Strategy 10: Integration and Recovery Plan

**What it is:** After working through the other strategies, the user synthesizes what they've learned into a personal Recovery Plan - a living document capturing their recovery keys, personal slogan, anticipatory plans for future challenges, and maintenance commitments.

**Key concepts from the book:**

- Recovery keys: the specific behaviors and mindsets that help the user feel their best
- Personal slogan: a short phrase capturing the user's toolkit (e.g., "Think, Act, Be" or something personal)
- Virtuous circles: how strategies reinforce each other
- Planning for setbacks: anticipate likely future challenges and prepare responses in advance
- Ongoing maintenance: don't stop helpful practices when feeling better

**Tool features:**

- Recovery Plan document builder
- Timeline visualization of the user's journey (when they started each strategy, key milestones)
- Personal stats summary (thought records completed, exposures done, days logged, goals achieved)
- Personal slogan displayed as a dashboard widget
- Exportable as PDF or shareable link (optional, user-controlled)

**User inputs:**

| Field                      | Type                       | Notes                                                   |
| -------------------------- | -------------------------- | ------------------------------------------------------- |
| `recoveryKeys`             | string[]                   | What has helped most                                    |
| `personalSlogan`           | string                     | Short personal motto                                    |
| `strategyIntegrationNotes` | Record<strategyId, string> | For each active strategy: how it connects to the others |
| `challengePlans`           | ChallengePlan[]            | Anticipated challenges + coping steps                   |
| `maintenanceCommitments`   | string[]                   | Ongoing practices the user commits to                   |

**ChallengePlan fields:** `challengeDescription` (string), `copingSteps` (string[])

**Key prompts:**

- "What three to five things have helped you most in this process?"
- "What situations are most likely to test you in the future?"
- "What will you do when those situations arise?"
- "What is a short phrase that captures your approach to wellbeing?"

---

## 3. Core Data Model

All entities use camelCase field names (TypeScript convention) and are stored in Supabase. Every entity has implicit `id` (uuid), `userId` (foreign key), `createdAt`, and `updatedAt` fields unless noted.

```typescript
// Strategy 1
Goal {
  title: string
  description: string
  lifeDomain: LifeDomain       // enum
  goalType: GoalType           // enum
  targetDate: date | null
  status: GoalStatus           // 'active' | 'completed' | 'paused' | 'abandoned'
  milestones: Milestone[]
}

Milestone {
  goalId: string
  description: string
  targetDate: date | null
  completedAt: timestamp | null
}

// Strategy 2
ValuesProfile {
  lifeDomain: LifeDomain
  importanceRating: integer    // 1-5
  satisfactionRating: integer  // 1-5
  domainNote: string
}

ActivityLog {
  activityName: string
  category: 'pleasure' | 'mastery'
  scheduledAt: timestamp | null
  completedAt: timestamp | null
  moodBefore: integer | null   // 1-10
  moodAfter: integer | null    // 1-10
  notes: string
}

// Strategy 3
ThoughtRecord {
  situation: string
  automaticThought: string
  emotions: string[]
  emotionIntensityBefore: integer  // 0-100
  distortions: string[]
  evidenceFor: string
  evidenceAgainst: string
  balancedThought: string
  emotionIntensityAfter: integer   // 0-100
  outcomeNotes: string
}

// Strategy 4
CoreBelief {
  beliefStatement: string
  triggeringSituations: string
  evidenceFor: string
  evidenceAgainst: string
  alternativeBelief: string
  originalBeliefStrength: integer  // 0-100, tracked over time
  alternativeBeliefStrength: integer
  reinforcementPlan: string
  nextReviewDate: date | null
}

// Strategy 5
MindfulnessSession {
  exerciseName: string
  durationMinutes: integer
  completedAt: timestamp
  reflection: string
  moodAfter: integer  // 1-10
}

// Strategy 6
ProcrastinationTask {
  taskDescription: string
  avoidanceReason: string
  fearThought: string
  challengedThought: string
  steps: TaskStep[]
  deadline: date | null
  reward: string
  status: 'pending' | 'inProgress' | 'completed' | 'abandoned'
}

TaskStep {
  taskId: string
  description: string
  estimatedMinutes: integer | null
  completedAt: timestamp | null
}

// Strategy 7
ExposureHierarchy {
  title: string
  anxietyType: AnxietyType    // enum
  items: ExposureItem[]
}

ExposureItem {
  hierarchyId: string
  description: string
  sudsRating: integer         // 0-100
  completedAt: timestamp | null
}

ExposureSession {
  exposureItemId: string
  preSuds: integer
  postSuds: integer
  durationMinutes: integer
  safetyBehaviorsUsed: boolean
  safetyBehaviorDescription: string
  notes: string
  completedAt: timestamp
}

WorryEntry {
  worryStatement: string
  worryCategory: 'hypothetical' | 'realProblem'
  probabilityEstimate: integer | null  // 0-100, for hypothetical
  evidenceFor: string
  evidenceAgainst: string
  copingStatement: string
  actionSteps: string
  resolved: boolean
}

// Strategy 8
AngerLog {
  trigger: string
  interpretation: string
  arousalLevel: integer    // 1-10
  urge: string
  behaviorChosen: string
  consequence: string
  timeOutTaken: boolean
  alternativeInterpretation: string
  outcomeRating: integer   // 1-10
  notes: string
}

// Strategy 9
SelfCareLog {
  date: date                  // one entry per day
  sleepHours: float
  sleepQuality: integer       // 1-10
  exerciseDone: boolean
  exerciseMinutes: integer | null
  exerciseType: string
  mealsStructured: boolean
  emotionalEating: boolean
  socialConnectionMade: boolean
  socialNotes: string
  meaningfulActivity: string
  gratitude: string[3]
}

// Strategy 10
RecoveryPlan {
  recoveryKeys: string[]
  personalSlogan: string
  strategyIntegrationNotes: Record<string, string>
  challengePlans: ChallengePlan[]
  maintenanceCommitments: string[]
}

ChallengePlan {
  recoveryPlanId: string
  challengeDescription: string
  copingSteps: string[]
}

// Global
MoodLog {
  moodScore: integer        // 1-10
  emotions: string[]
  notes: string
  linkedStrategy: string | null
  loggedAt: timestamp
}
```

### Shared Enums

```typescript
type LifeDomain = "work" | "relationships" | "health" | "leisure" | "personalGrowth" | "other";

type GoalType = "doMore" | "doLess" | "improveRelationship" | "improveQuality";

type GoalStatus = "active" | "completed" | "paused" | "abandoned";

type AnxietyType =
  | "specificPhobia"
  | "socialAnxiety"
  | "panicDisorder"
  | "gad"
  | "ptsd"
  | "ocd"
  | "other";
```

---

## 4. Program Flow

### Onboarding

1. Welcome: explain the Think-Act-Be model; set expectation that this is a practice, not a quick fix
2. Brief self-report: which concerns apply? (anxiety, depression, anger, procrastination - multi-select)
3. Goal setting: create at least one goal before proceeding (enforces Strategy 1)
4. Values clarification: rate importance and satisfaction across life domains (feeds Strategy 2)
5. Strategy recommendation: suggest starting strategies based on self-report; user can override
6. Dashboard orientation

### Daily Flow

- **Morning check-in:** mood log, top intention for the day, review any scheduled activities
- **During-day (on-demand):** thought record, anger log, worry entry, procrastination task
- **Evening check-in:** self-care log, mood log, activity log completion, gratitude

### Weekly Review (prompted on a user-configured day)

1. Mood trend chart (7-day)
2. Activities completed vs. planned
3. Milestone review - prompt to mark any complete
4. Open thought records - any unresolved?
5. Exposure hierarchy progress - how many items habituated?
6. Reflection prompt tied to active strategies

### Program Milestones

| Milestone  | Conditions                                                               |
| ---------- | ------------------------------------------------------------------------ |
| Week 1     | Goal created, first activity scheduled, first thought record completed   |
| Weeks 2-4  | Exposure hierarchy started (if anxiety-focused), core beliefs identified |
| Weeks 4-8  | Regular daily check-ins; patterns visible in data                        |
| Weeks 8-12 | Recovery plan drafted; maintenance mode begins                           |

---

## 5. Implementation Sequencing

| Phase               | Modules                                                                 | Notes                                          |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| **1 - Foundation**  | Goal setting, behavioral activation, mood logging, values clarification | Daily scaffolding and the core motivation loop |
| **2 - Central CBT** | Thought records (full 5-step model), weekly review                      | The primary therapeutic tool                   |
| **3 - Deeper work** | Core beliefs, anxiety/exposure, worry journal                           | Depends on thought records being solid         |
| **4 - Supportive**  | Mindfulness, procrastination, anger management                          | Broadens the toolkit                           |
| **5 - Synthesis**   | Integration/recovery plan, pattern detection, insights, export          | Capstone of the full program                   |

---

## 6. Cross-Cutting Features

### Mood Tracking (Global)

Mood is logged at multiple points: morning check-in, after activities, after mindfulness sessions, evening check-in. Dashboard shows 7-day and 30-day charts. A mood of 1-2 triggers a crisis support prompt with local helpline information.

### Dashboard

- Daily summary: check-in status, scheduled activities, open tasks
- Quick-access buttons: log mood, record thought, start exposure session, log anger episode
- Gentle practice summaries: mindfulness practice, self-care log, daily check-ins
- Weekly progress card

### Notifications

All notifications are explicit opt-in, quiet by default, and easy to disable. They remind the user about a chosen supportive action; they do not track streaks, punish missed days, or use urgency/scarcity language.

Allowed CBT reminder extensions:

- Morning check-in
- Evening self-care log
- Weekly review prompt
- Scheduled activity reminders, only when the user has deliberately scheduled an activity

Deferred or out of scope for MVP notifications:

- Default-on reminders
- Streak, quest, or habit-preservation reminders
- Missed-day warnings
- Milestone celebration pushes
- Crisis or low-mood follow-up notifications; crisis support stays in-app and user-initiated

### Safety

- Mood of 1-2 → display crisis support message and local crisis line information
- Tool is not a substitute for professional help - disclaimer shown during onboarding and accessible from settings at any time
- No clinical diagnoses or clinical language in UI copy

### Tone

- Second person, warm, non-judgmental
- Avoid clinical labels (say "that thought," not "your cognitive distortion")
- Celebrate small wins; never shame incomplete logs

---

## 7. Non-Goals

- AI features
- Community features
- Generic journaling mixed into the CBT flow
- Clinical diagnostic labels in UI copy
- Diagnostic or scored anxiety/depression scales in the MVP app
- Therapist portal (flag for architecture consideration only - single-user in v1)

---

## 8. Open Questions

| Question                                                                         | Decision needed by                  |
| -------------------------------------------------------------------------------- | ----------------------------------- |
| PHQ-9 / GAD-7 licensing for onboarding vs. custom screening questions            | Before onboarding spec is finalized |
| Audio support for mindfulness exercises                                          | Phase 4 planning                    |
| Notification backend: extend existing Supabase Edge Function or separate service | Before Phase 1 ships                |
| Multi-language support from v1 or later                                          | Before Phase 1 ships                |

---

## 9. Glossary

| Term                 | Definition as used in this tool                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| ThoughtRecord        | Structured form: situation → automatic thought → emotions → evidence → distortions → balanced thought → outcome |
| AutomaticThought     | An immediate, unexamined thought arising in response to a situation                                             |
| CoreBelief           | A deep-seated global assumption about self, others, or the world                                                |
| SUDS                 | Subjective Units of Distress Scale, 0-100                                                                       |
| Exposure             | Planned, deliberate contact with a feared situation without using safety behaviors                              |
| SafetyBehavior       | An action taken during anxiety to reduce it short-term that prevents long-term habituation                      |
| BehavioralActivation | Scheduling meaningful activities to break the depression-inactivity cycle                                       |
| LifeDomain           | A category of life area: work, relationships, health, leisure, personal growth                                  |
| RecoveryKey          | A personally identified insight or practice that supports ongoing wellbeing                                     |
| Habituation          | The natural reduction of anxiety that occurs during prolonged, repeated exposure                                |
| ERP                  | Exposure and Response Prevention - used for OCD-type patterns                                                   |
| Think-Act-Be         | The three-pillar framework of the Gillihan model: cognitive, behavioral, mindfulness                            |

---

## 10. Concern → Strategy Mapping

Reference table for implementing the onboarding assessment flow. When a user selects one or more concerns during onboarding, use this table to:

- Recommend which of the 10 strategies to activate first
- Pre-select relevant cognitive distortions in the thought record distortion picker
- Surface the correct core belief examples during the Core Beliefs module

**Source:** CBT Strategies for Emotional Management (Gillihan supplementary material)

| Concern                 | Underlying Core Belief                                                    | Cognitive Distortions                                                     | Think Strategy                                                                                                            | Act Strategy                                                                                                                          | Be Strategy                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Depression**          | I am a failure; I am unlovable; I am inadequate.                          | Black-and-white thinking, discounting the positive, overgeneralisation.   | Cognitive restructuring: identify and test negative automatic thoughts for accuracy, replace with more balanced thoughts. | Behavioural activation: schedule and engage in enjoyable or important activities (pleasure and mastery) to break the downward spiral. | Mindful awareness: focus on the present with openness and curiosity; take thoughts less seriously and reduce rumination. |
| **Generalised Anxiety** | The world is a dangerous place; I am powerless to cope with threat.       | Catastrophising, fortune telling, emotional reasoning.                    | Reassess the likelihood and severity of danger; challenge the belief that worry is helpful for planning.                  | Reduce avoidance; drop safety behaviours that prevent new learning about safety.                                                      | Mindful breathing: slow the breath to calm the nervous system; ground in the present to release future-oriented worry.   |
| **Panic**               | I am vulnerable; physical sensations are dangerous.                       | Catastrophising (e.g. "I am having a heart attack"), emotional reasoning. | Test panic-related thoughts; re-evaluate physical symptoms as non-dangerous extreme anxiety.                              | Interoceptive exposure: deliberately induce feared physical sensations to reduce sensitivity to them.                                 | Controlled breathing: learn to manage the breath when feeling out of control; observe the panic wave without resisting.  |
| **Social Anxiety**      | I am unlikable; others will judge me harshly.                             | Mind reading, disqualifying the positive, personalisation.                | Predict social outcomes and record actual results to challenge the fear of embarrassment.                                 | Exposure therapy: gradually face feared social situations without using safety behaviours.                                            | Direct attention outward: focus on others and the environment rather than internal monitoring of anxiety symptoms.       |
| **Excessive Anger**     | Others are inconsiderate; I am being mistreated; I must be respected.     | Should statements, mind reading, personalisation.                         | Question "shoulds"; find kinder, more accurate explanations for others' behaviour.                                        | Postpone arguments until calm; assert needs constructively rather than aggressively; improve sleep to boost frustration tolerance.    | Breathe with the anger: observe the physical sensation of anger in the body without impulsive reaction.                  |
| **Procrastination**     | I must be perfect; I am incapable of the task; discomfort is intolerable. | Fortune telling, false sense of helplessness, should statements.          | Identify permission-giving thoughts; remind oneself of the costs of delay.                                                | Break down big tasks into small, manageable sub-tasks; use the Pomodoro technique (shorter focused work sessions).                    | Accept discomfort: be willing to feel uncomfortable in the service of completing a valued task.                          |

### How to use this table in code

- **Onboarding assessment**: present the 6 concerns as multi-select options. Store selected concerns on the user's profile.
- **Strategy recommendation**: after concern selection, activate the strategies whose Think/Act/Be approaches address the selected concerns (see Section 5 for sequencing).
- **Distortion pre-selection**: when a user creates a thought record, optionally pre-highlight the distortions most associated with their flagged concern (e.g., for Depression: surface all-or-nothing thinking, discounting the positive, overgeneralisation first).
- **Core belief prompts**: in the Core Beliefs module, seed the belief statement prompt with the example beliefs from the table matching the user's concern.
