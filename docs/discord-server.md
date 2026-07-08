# Discord Server

The Selftend community Discord (permanent invite: `https://discord.gg/pdaAr9FhcQ`,
wired into the app via `EXPO_PUBLIC_DISCORD_URL`). Design decisions are recorded
in [superpowers/specs/2026-07-08-discord-server-setup-design.md](superpowers/specs/2026-07-08-discord-server-setup-design.md);
community principles in [community.md](community.md).

## Purpose and boundaries

Three audiences: Selftend app users, contributors, and people practicing
self-care generally. Discussion is **practice-oriented** — working with the
tools (CBT, habits, gratitude, journaling, meditation), not open-ended venting
or peer crisis support.

Hard boundary, stated in `#rules-and-safety` and enforced by moderation: the
server is **not therapy, medical care, diagnosis, treatment, crisis
intervention, or emergency support**. Crisis language mirrors the app's policy
content (`src/features/policies/policy-content.ts`): 988 (US), 9-8-8 (Canada),
findahelpline.com directory, local emergency services. No country-specific
hotlines are added without the same jurisdiction review the app applies.

Deliberately absent: crisis-keyword auto-responders (automated replies to
someone in distress do more harm than a pinned resources post and a human),
vent channels, and any hosted bot.

## Administration model

- **"Selftend Admin" bot** (app ID `1524413519737520241`): setup-only admin
  tool driven via the Discord REST API by `scripts/discord/setup-server.mjs`.
  Never hosted, no runtime behavior. Token lives in the owner's password
  manager; exported as `DISCORD_BOT_TOKEN` only while running the script.
- **Ongoing duties** use native Discord features: Community onboarding +
  welcome screen (greeting), AutoMod (spam/slurs/mention raids), rules
  screening. The `#changelog` feed is a plain channel webhook that GitHub
  posts to natively — zero bots.
- Third-party bots (Carl-bot/Dyno) are deferred until member volume justifies
  them.

## Structure

```
📌 Welcome
 ├ #rules-and-safety      read-only · rules, boundaries, crisis resources (pinned)
 ├ #crisis-resources      read-only · emergency numbers and crisis lines; meant
                          to be a Server Guide resource page
 ├ #announcements         read-only, announcement type · project news
 ├ #introductions
 └ #links                 read-only · every official link (web, stores, GitHub,
                          Weblate); the app's permanent invite lands here —
                          never delete this channel, rename/repurpose only

💙 Selftend App
 ├ #general               join greetings (system channel) land here
 ├ #app-help              forum · support threads
 ├ #feedback              third feedback route besides in-app + GitHub issues
 ├ #feature-ideas         forum · one idea per post
 └ #changelog             read-only, announcement type · GitHub release webhook

🌱 Practice                each channel has a pinned scope post
 ├ #cbt  ├ #act  ├ #habits  ├ #gratitude
 ├ #journaling  ├ #meditation  └ #book-club

🔧 Contributors            publicly readable (open-source project)
 ├ #dev  ├ #design  ├ #translation  ├ #qa-testing
 └ #moderators            private: Moderator+ only

☕ Community
 ├ #off-topic  └ #wins
```

## Roles

| Role                       | Granted                                                            | Permissions                                                     |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `@Maintainer`              | owner                                                              | Administrator                                                   |
| `@Moderator`               | trusted members, by Maintainer                                     | kick, ban, timeout, manage messages/threads; sees `#moderators` |
| `@Contributor`             | active contributors ([contributor-roles.md](contributor-roles.md)) | cosmetic                                                        |
| `@App User`, `@Practicing` | self-assigned via onboarding                                       | cosmetic, channel highlights                                    |
| `@everyone`                | past rules screening                                               | baseline; cannot post in read-only channels                     |

## Server settings applied by the script

- Community mode: on (enables rules screening, welcome screen, forums)
- Verification level: Medium (verified email) · explicit content filter: all
  members · notifications default: mentions only
- Rules channel: `#rules-and-safety` · community updates: `#moderators`
- Rules Screening: members must agree to five rule summaries before
  participating (text in `content.mjs`)
- AutoMod: keyword presets (profanity/slurs/sexual content), spam,
  mention-spam (>8 mentions) — all block the message
- Onboarding: "What brings you here?" → App User / Practicing / Contributor
  roles + channel highlights; defaults + options cover all public channels
- Guild profile: server description set; native join greetings (with wave
  button) go to `#general` — this is the no-bot welcome-message mechanism
- Forum tags: `#app-help` (Bug/Question/Android/Web/Solved), `#feature-ideas`
  (New module/Improvement/Mobile/Web/Accessibility, 👍 default reaction)
- Custom `:selftend:` emoji uploaded from `assets/favicon.png`
- Every text channel has a pinned scope post (copy in `content.mjs`)
- Permanent invite `https://discord.gg/pdaAr9FhcQ` → `#links`; this is the
  app's default `discordUrl` in `src/lib/env.ts` — if the invite is ever
  regenerated, update both together. Invites die with their channel, so
  `#links` must never be deleted (rename/repurpose instead)

## Running the setup script

```bash
DISCORD_BOT_TOKEN=<token> node scripts/discord/setup-server.mjs
```

Idempotent: matches roles/channels by name and skips existing ones; content is
only posted where the bot has no pinned message. Re-running on an up-to-date
server prints `=` for every item — that is the verification pass. Copy changes
go in `scripts/discord/content.mjs`; structure changes in `setup-server.mjs`
(update this doc alongside).

The script prints the `#changelog` webhook URL. Register it on GitHub (once):

```bash
gh api repos/Selftend/selftend/hooks -f name=web -F active=true \
  -f 'events[]=release' -f config[url]='<printed-url>' \
  -f config[content_type]=json
```

## Manual checklist (Discord UI only)

- [ ] Assign `@Maintainer` to the owner account
- [ ] Set up the Server Guide (Server Settings → Onboarding → Server Guide) —
      bots cannot use that endpoint; paste the content below
- [ ] Review the onboarding flow end-to-end with a test account
      (Server Settings → Onboarding)
- [ ] Confirm the welcome screen reads well (Server Settings → Community)
- [ ] Server banner: `assets/branding/discord-banner.png` is ready, but
      Discord unlocks banners at boost level 2 (invite splash at level 1) —
      upload when the server gets there
- [ ] AutoMod "Block Mention Spam" is Discord's pre-installed rule and bots
      cannot edit it: Server Settings → AutoMod → Block Mention Spam → add
      "Send an alert" → `#moderators` (the two script-created rules already
      alert there)

### Server Guide content (paste into the UI)

**Welcome message** (author: server owner):

> Welcome! Glad you're here. Take a breath, look around, and say hi when
> you're ready. 💙

**New Member To-Dos** (max 5):

| Channel             | Title                          | Description                                                           |
| ------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `#rules-and-safety` | Read the rules and safety info | Two minutes — it covers what this place is and where real help lives. |
| `#introductions`    | Introduce yourself             | Who you are and what brought you here — a sentence is plenty.         |
| `#app-help`         | Get help with the app          | Stuck or found a bug? Open a post.                                    |
| `#gratitude`        | Drop three good things         | Start a tiny gratitude practice right here.                           |
| `#feedback`         | Tell us what to improve        | Ideas and rough edges — we read everything.                           |

**Resource Pages** (read-only channels become document-style pages at the top
of the server and leave the channel list — deliberate for these):

| Channel             | Title          | Description                           |
| ------------------- | -------------- | ------------------------------------- |
| `#rules-and-safety` | Rules & Safety | Community rules and boundaries        |
| `#crisis-resources` | Get Help Now   | Emergency numbers and crisis lines    |
| `#links`            | Official Links | Web app, stores, GitHub, translations |

Keep `#announcements` and `#changelog` as normal channels — they are feeds,
not documents. Note: the app's permanent invite targets `#links`; being a
resource page does not affect invites, but deleting the channel would.

## Occasional maintenance

The bot stays in the server, dormant — it "runs" only while a script or API
call is executing, so there is nothing to host or keep online. To make a
change later:

1. Get the bot token from the password manager (regenerate it at
   https://discord.com/developers/applications if it was ever exposed —
   the bot keeps its server membership and permissions across resets).
2. Edit `scripts/discord/content.mjs` (copy) or `setup-server.mjs`
   (structure/settings), then run
   `DISCORD_BOT_TOKEN=<token> node scripts/discord/setup-server.mjs`.
3. The script only adds what is missing — it never deletes. Renames and
   removals are one-off API calls or Discord UI actions; update this doc
   when structure changes.

For one-off changes the script doesn't cover, the bot is just an HTTP
credential — any Discord REST call works with
`-H "Authorization: Bot $DISCORD_BOT_TOKEN"`:

```bash
# List channels (find IDs)
curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  https://discord.com/api/v10/guilds/1524102844033142956/channels

# Rename a channel / change its topic (never delete #links — see Structure)
curl -s -X PATCH -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  -H "Content-Type: application/json" -d '{"topic":"New topic"}' \
  https://discord.com/api/v10/channels/<channel-id>

# Post a message as the bot
curl -s -X POST -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  -H "Content-Type: application/json" -d '{"content":"Hello"}' \
  https://discord.com/api/v10/channels/<channel-id>/messages
```

API reference: https://discord.com/developers/docs/resources/channel

The token itself must never be committed, pasted into the repo, or put in
`.env` files that could leak; env var for the duration of the run only.

## Moderation and crisis process

1. Reports arrive via Discord's report flow, `@Moderator` DMs, or
   `support@selftend.org`.
2. Rule violations: remove the message, DM the author with the reason;
   repeat or severe → timeout, then ban. Coordinate in `#moderators`.
3. Someone appears to be in crisis: reply once, warmly, pointing to the
   crisis resources pinned in `#rules-and-safety`; do not attempt to
   counsel. If they describe immediate danger, encourage contacting local
   emergency services. Discuss follow-up in `#moderators`.
4. Do not diagnose, do not give medical advice, do not argue about either —
   these are removable under rule 2.
