/* All community-facing copy posted to the Selftend Discord server by
 * setup-server.mjs. Kept separate so wording changes are reviewable without
 * touching setup logic. Every string in `messages` arrays must stay under
 * Discord's 2000-character message limit.
 *
 * Crisis language mirrors src/features/policies/policy-content.ts — do not
 * add country-specific hotlines here without the same jurisdiction review.
 */

export const LINKS = {
  app: "https://selftend.org",
  github: "https://github.com/Selftend/selftend",
  helplineDirectory: "https://findahelpline.com",
};

export const rulesMessages = [
  `# Welcome to the Selftend community

Selftend is a free, open-source mental well-being app. This server is where people who use the app, build it, or simply care about tending to their mental health hang out.

**What this server is:** a peer community for practicing self-care tools — CBT thought records, habits, gratitude, journaling, meditation — and for shaping the app together.

**What this server is not:** therapy, medical care, diagnosis, treatment, crisis intervention, or emergency support. Nobody here is your clinician, and no channel is monitored by crisis responders.`,

  `## Rules

1. **Be kind and assume good faith.** People here may be having a hard day. No mocking, dogpiling, or "just get over it" responses.
2. **No medical advice.** Sharing what worked for *you* is welcome ("thought records helped me notice X"). Telling someone what they should do about their diagnosis or medication is not.
3. **Stay within the practice scope.** Practice channels are for working with the tools, not open-ended venting. If you need more support than a practice space can offer, please reach out to a professional — the resources below can help you find one.
4. **Respect privacy.** Don't share anyone else's story, screenshots of private conversations, or personal data. Think twice before sharing your own identifying details.
5. **Content warnings.** Put a spoiler tag (\\|\\|like this\\|\\|) over descriptions of self-harm, suicide, or abuse, with a short label before it.
6. **No spam, ads, or engagement bait.** This includes unsolicited DMs to members.
7. **English, for now.** So moderators can keep everyone safe. Other language channels may come later.
8. **Moderators have the final word.** If you're asked to take something to a different channel or drop a topic, please do.`,

  `## If you are in crisis

If you might hurt yourself or someone else, or anyone is in immediate danger, **contact your local emergency services now** (112 in the EU, 911 in North America).

- **United States:** call or text **988**, or chat at 988lifeline.org (988 Suicide & Crisis Lifeline)
- **Canada:** call or text **9-8-8** (Suicide Crisis Helpline)
- **Everywhere else:** ${"https://findahelpline.com"} maintains a reviewed directory of crisis and emotional-support services by country.

This server cannot provide emergency help, and messages here may not be seen in time. Please reach for the services above first — and come back when you're safe. We'll be glad to see you.`,

  `## Reporting and reaching moderators

- Report a message: right-click / long-press → **Apps → Report**, or DM a member with the **@Moderator** role.
- Sensitive concerns can also go to **support@selftend.org**.
- Security issues in the app: **security@selftend.org** (please don't post vulnerabilities publicly).

Thanks for helping keep this a place worth returning to. 💙`,
];

// First line is bold, not a # heading — see note on crisis-resources.
export const linksMessage = `**🔗 Official Selftend links**

**Selftend** is a free, open-source app for tending to your mental well-being — CBT tools, mood tracking, habits, gratitude, journaling, meditation, and more.

**The app**
- 🌐 Web app: ${LINKS.app} — works everywhere, installable as an app (PWA)
- 🤖 Android: in closed testing on Google Play — ask in <#general> to join; public release coming
- 🍎 iOS: not yet — it's on the roadmap

**The project**
- 🐙 Code, issues, and roadmap: ${LINKS.github}
- 🌍 Translations (no coding needed): https://hosted.weblate.org/projects/selftend/
- 💜 Invite a friend to this server: https://discord.gg/pdaAr9FhcQ

**Getting around**
- 📌 Rules, boundaries, and crisis resources: <#rules-and-safety>
- 👋 Say hi: <#introductions> · app help: <#app-help> · ideas: <#feature-ideas> · feedback: <#feedback>

This community is for practicing self-care tools together. It's not therapy or crisis support — <#rules-and-safety> lists real help for hard moments.`;

/* Pinned scope post per channel, keyed by channel name. Forum channels can't
 * take a pinned message this way — their `topic` acts as post guidelines. */
export const scopePosts = {
  // First line is bold, not a # heading: Server Guide resource-card previews
  // render bold but show heading markdown as literal "#".
  "crisis-resources": `**🚨 If you need help now**

If you might hurt yourself or someone else, or anyone is in immediate danger, **contact your local emergency services now** — **112** in the EU, **911** in North America.

**Crisis lines**
- 🇺🇸 **United States:** call or text **988**, or chat at 988lifeline.org (988 Suicide & Crisis Lifeline)
- 🇨🇦 **Canada:** call or text **9-8-8** (Suicide Crisis Helpline)
- 🌍 **Everywhere else:** https://findahelpline.com — a reviewed directory of crisis and emotional-support services, by country

**When it's heavy but not an emergency**
- Tell one person you trust how you're actually doing.
- Your doctor or GP is a real starting point for finding professional support.
- Come back to the community when you're safe — <#introductions> and <#general> will be glad to see you.

This server is a peer community. It is not monitored by crisis responders, and messages here may not be seen in time — please reach for the services above first.`,

  introductions: `**Say hi** 👋

A sentence is plenty. If you want a nudge: who you are, what brought you here, and one small thing that helps you on rough days.`,

  feedback: `**Three ways to tell us what to improve** 💬

1. **Right here** — just type. Rough thoughts welcome.
2. **In the app** — Support page → feedback form (works signed-in, private).
3. **On GitHub** — ${LINKS.github}/issues for trackable bugs and requests.

Everything gets read. If it's a bug, <#app-help> is even better — include your device and what you expected to happen.`,

  wins: `**What counts as a win?** 🎉

Anything. Did a thought record when you really didn't want to. Kept a three-day streak. Went for the walk. Shipped a PR. Said no to something. Post it — celebrating small steps is the whole point of this channel.`,

  dev: `**Building Selftend** 🛠️

- Repo: ${LINKS.github}
- Contributing guide: ${LINKS.github}/blob/main/.github/CONTRIBUTING.md
- Good first issues: ${LINKS.github}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

Stack: Expo / React Native (web + Android), Supabase, TypeScript. Ask anything here — architecture questions welcome before you write code.`,

  design: `**Design, UX, and accessibility** 🎨

Selftend aims to feel calm, clear, and safe — no dark patterns, no guilt mechanics. Mockups, critiques, and accessibility findings all belong here. See ${LINKS.github}/blob/main/docs/contributor-roles.md for how design contributions flow.`,

  translation: `**Localization** 🌍

Translation happens through Weblate: https://hosted.weblate.org/projects/selftend/ — no git knowledge needed. Bulgarian is live; new languages start with a conversation here. Wording questions and tone discussions welcome.`,

  "qa-testing": `**QA and testing** 🔍

Help us break things before users do: device coverage, regression checks before releases, and bug triage. Post what you tested and on what hardware. Reproducible bug? File it at ${LINKS.github}/issues too.`,

  cbt: `**What this channel is for** 🧠

Practicing CBT — thought records, spotting thinking patterns, building balanced thoughts. Share how an exercise went, ask how others handle a step you're stuck on, or discuss ideas from CBT books (we like Gillihan's *Retrain Your Brain* around here).

Selftend's Thought Record tool lives in the app: ${LINKS.app}

Keep it practice-focused: what you tried, what you noticed. This isn't a space for diagnosing each other or working through a crisis — see <#rules-and-safety> for support resources.`,

  act: `**What this channel is for** 🌊

Acceptance & Commitment Therapy practice — defusion, values work, expansion, and ideas from *The Happiness Trap*. Share exercises you've tried and what you noticed.

Practice-focused, not therapy — see <#rules-and-safety> for support resources.`,

  habits: `**What this channel is for** 🔁

Building and keeping habits and routines — tiny habits, streaks and streak-breaks, morning/evening routines, and how you use Selftend's habit tools. Wins and stumbles both welcome.`,

  gratitude: `**What this channel is for** 🙏

Gratitude practice. Share entries you're comfortable making public, ask about keeping the practice fresh, or just drop three good things from today.`,

  journaling: `**What this channel is for** ✍️

Journaling practice — prompts, techniques, keeping the habit alive. Share approaches rather than raw private entries; protect your own privacy and others'.`,

  meditation: `**What this channel is for** 🧘

Meditation and grounding — sits, breathing exercises, *The Mind Illuminated* discussion, restlessness, and everything in between. Beginners very welcome.`,

  "book-club": `**What this channel is for** 📚

Reading together. The shelf so far: *Retrain Your Brain* (Gillihan), *The Happiness Trap* (Harris), *The Mind Illuminated* (Culadasa). Suggest the next one, post passages that landed, disagree respectfully.`,
};

export const welcomeScreen = {
  description:
    "A community for tending to your mental well-being — around Selftend, the free open-source self-care app.",
  channels: [
    { name: "rules-and-safety", description: "Rules, boundaries, crisis resources" },
    { name: "introductions", description: "Say hi" },
    { name: "app-help", description: "Get help with the app" },
    { name: "general", description: "Hang out" },
  ],
};

/* Rules Screening: members must agree to these before participating. */
export const rulesScreening = {
  description:
    "A community for tending to your mental well-being — around Selftend, the free open-source self-care app.",
  values: [
    "Be kind and assume good faith",
    "No medical advice — share experiences, not prescriptions",
    "This is not therapy or crisis support; use the pinned crisis resources when needed",
    "Respect privacy — yours and others'",
    "Content warnings (spoiler tags) over heavy details",
  ],
};

export const onboardingPrompt = {
  title: "What brings you here?",
  options: [
    {
      title: "I use the Selftend app",
      description: "App talk, help, feedback, and testing",
      role: "App User",
      channels: ["app-help", "feature-ideas", "changelog"],
    },
    {
      title: "Working on my mental health",
      description: "Practice spaces: CBT, habits, gratitude, meditation…",
      role: "Practicing",
      channels: ["cbt", "act", "habits", "gratitude", "journaling", "meditation", "book-club"],
    },
    {
      title: "I want to contribute",
      description: "Code, design, translation, QA, docs",
      role: "Contributor",
      channels: ["dev", "design", "translation", "qa-testing"],
    },
  ],
};
