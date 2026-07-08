/* Builds the Selftend Discord server: roles, categories, channels, permission
 * overwrites, Community mode, AutoMod rules, welcome screen, onboarding,
 * pinned content, and the #changelog webhook for the GitHub release feed.
 *
 * Idempotent: existing roles/channels are matched by name and skipped, content
 * is only posted where the bot has no pinned message yet, so re-running is
 * safe and doubles as verification. Server structure is documented in
 * docs/discord-server.md; community copy lives in ./content.mjs.
 *
 * The bot ("Selftend Admin") is a setup-only admin tool — it is never hosted
 * and has no runtime behavior. Node 18+ (global fetch).
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... node scripts/discord/setup-server.mjs [--guild <id>]
 */
import { readFileSync } from "node:fs";
import {
  LINKS,
  rulesMessages,
  linksMessage,
  scopePosts,
  welcomeScreen,
  rulesScreening,
  onboardingPrompt,
} from "./content.mjs";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN env var is required.");
  process.exit(1);
}

const API = "https://discord.com/api/v10";

async function api(method, path, body) {
  for (;;) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${TOKEN}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const data = await res.json();
      const wait = (data.retry_after ?? 1) * 1000 + 100;
      console.log(`  (rate limited, waiting ${Math.round(wait)}ms)`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
    }
    return res.status === 204 ? null : res.json();
  }
}

// Permission bits (BigInt) — https://discord.com/developers/docs/topics/permissions
const P = {
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  MODERATE_MEMBERS: 1n << 40n,
};
const DENY_POSTING =
  P.SEND_MESSAGES | P.CREATE_PUBLIC_THREADS | P.CREATE_PRIVATE_THREADS | P.SEND_MESSAGES_IN_THREADS;

const ROLES = [
  { name: "Maintainer", color: 0xf59e0b, hoist: true, permissions: P.ADMINISTRATOR },
  {
    name: "Moderator",
    color: 0x3b82f6,
    hoist: true,
    permissions:
      P.KICK_MEMBERS | P.BAN_MEMBERS | P.MANAGE_MESSAGES | P.MANAGE_THREADS | P.MODERATE_MEMBERS,
  },
  { name: "Contributor", color: 0x8b5cf6, hoist: true, permissions: 0n },
  { name: "App User", color: 0x10b981, hoist: false, permissions: 0n },
  { name: "Practicing", color: 0x14b8a6, hoist: false, permissions: 0n },
];

const TEXT = 0;
const CATEGORY = 4;
const ANNOUNCEMENT = 5;
const FORUM = 15;

const STRUCTURE = [
  {
    category: "📌 Welcome",
    channels: [
      {
        name: "rules-and-safety",
        topic: "Community rules, boundaries, and crisis resources. Please read before posting.",
        readOnly: true,
      },
      {
        name: "announcements",
        topic: "Project announcements from the Selftend team.",
        readOnly: true,
        announce: true,
      },
      { name: "introductions", topic: "Say hi — who you are and what brought you here." },
      {
        // The permanent invite in the app (appEnv.discordUrl) targets this
        // channel's ID — never delete it; rename/repurpose only.
        name: "links",
        topic: "Every official Selftend link: web app, stores, GitHub, translations.",
        readOnly: true,
      },
    ],
  },
  {
    category: "💙 Selftend App",
    channels: [
      { name: "general", topic: "General chat about the Selftend app." },
      {
        name: "app-help",
        topic:
          "Stuck or something's broken? Open a post — include device/platform and what you expected to happen.",
        forum: true,
        tags: ["Bug", "Question", "Android", "Web", "Solved"],
      },
      {
        name: "feedback",
        topic: `Tell us what to improve — the third route besides in-app feedback and GitHub issues (${LINKS.github}/issues).`,
      },
      {
        name: "feature-ideas",
        topic: "One idea per post. Upvote with 👍; discuss in threads.",
        forum: true,
        tags: ["New module", "Improvement", "Mobile", "Web", "Accessibility"],
        upvoteEmoji: "👍",
      },
      {
        name: "changelog",
        topic: "Automatic feed of Selftend releases from GitHub.",
        readOnly: true,
        announce: true,
      },
    ],
  },
  {
    category: "🌱 Practice",
    channels: [
      {
        name: "cbt",
        topic: "CBT practice — thought records, thinking patterns, balanced thoughts.",
      },
      { name: "act", topic: "ACT practice — defusion, values, The Happiness Trap." },
      {
        name: "habits",
        topic: "Habits and routines — building them, breaking them, starting again.",
      },
      { name: "gratitude", topic: "Gratitude practice — share what's good, keep it fresh." },
      { name: "journaling", topic: "Journaling practice — prompts, techniques, momentum." },
      {
        name: "meditation",
        topic: "Meditation and grounding — sits, breathing, The Mind Illuminated.",
      },
      { name: "book-club", topic: "Reading together — suggest, quote, disagree kindly." },
    ],
  },
  {
    category: "🔧 Contributors",
    channels: [
      { name: "dev", topic: `Building Selftend — code, architecture, PRs. Repo: ${LINKS.github}` },
      { name: "design", topic: "UX, visual design, and accessibility work." },
      { name: "translation", topic: "Localization — Bulgarian today, more languages tomorrow." },
      { name: "qa-testing", topic: "Testing coordination, device coverage, bug triage." },
      { name: "moderators", topic: "Moderation coordination (private).", private: true },
    ],
  },
  {
    category: "☕ Community",
    channels: [
      { name: "off-topic", topic: "Everything else — within the rules." },
      { name: "wins", topic: "Small victories and big ones. Celebrate each other." },
    ],
  },
];

function log(msg) {
  console.log(msg);
}

const guildArgIdx = process.argv.indexOf("--guild");
const guilds = await api("GET", "/users/@me/guilds");
const guildId = guildArgIdx !== -1 ? process.argv[guildArgIdx + 1] : guilds[0]?.id;
if (!guildId) {
  console.error("Bot is not in any guild. Invite it first.");
  process.exit(1);
}
const me = await api("GET", "/users/@me");
const guild = await api("GET", `/guilds/${guildId}`);
log(`Setting up guild: ${guild.name} (${guildId})`);

// ---- 1. Roles ----------------------------------------------------------
log("\n[1/9] Roles");
const existingRoles = await api("GET", `/guilds/${guildId}/roles`);
const roleId = {};
for (const def of ROLES) {
  const found = existingRoles.find((r) => r.name === def.name);
  if (found) {
    roleId[def.name] = found.id;
    log(`  = @${def.name} exists`);
    continue;
  }
  const created = await api("POST", `/guilds/${guildId}/roles`, {
    name: def.name,
    color: def.color,
    hoist: def.hoist,
    permissions: def.permissions.toString(),
    mentionable: false,
  });
  roleId[def.name] = created.id;
  log(`  + @${def.name} created`);
}

// ---- 2. Categories and non-forum channels ------------------------------
log("\n[2/9] Categories and channels");
let channels = await api("GET", `/guilds/${guildId}/channels`);
const byName = (name, type) =>
  channels.find((c) => c.name === name && (type === undefined || c.type === type));

function overwritesFor(def) {
  const everyone = guildId; // @everyone role id === guild id
  const ow = [];
  if (def.readOnly) {
    ow.push({ id: everyone, type: 0, deny: DENY_POSTING.toString(), allow: "0" });
  }
  if (def.private) {
    ow.push({ id: everyone, type: 0, deny: P.VIEW_CHANNEL.toString(), allow: "0" });
    for (const r of ["Moderator", "Maintainer"]) {
      ow.push({ id: roleId[r], type: 0, allow: P.VIEW_CHANNEL.toString(), deny: "0" });
    }
    ow.push({ id: me.id, type: 1, allow: P.VIEW_CHANNEL.toString(), deny: "0" });
  }
  return ow;
}

async function ensureChannel(def, parentId, type) {
  const found = byName(def.name);
  if (found) {
    // Reconcile channels that predate the script (e.g. from a server template):
    // wrong category or missing read-only/private overwrites.
    const wantOw = overwritesFor(def);
    const owMissing = wantOw.some(
      (w) => !(found.permission_overwrites ?? []).some((h) => h.id === w.id),
    );
    if (found.parent_id !== parentId || owMissing) {
      const patched = await api("PATCH", `/channels/${found.id}`, {
        parent_id: parentId,
        ...(wantOw.length ? { permission_overwrites: wantOw } : {}),
      });
      channels = channels.map((c) => (c.id === patched.id ? patched : c));
      log(`  ~ #${def.name} reconciled (category/permissions)`);
      return patched;
    }
    log(`  = #${def.name} exists`);
    return found;
  }
  const created = await api("POST", `/guilds/${guildId}/channels`, {
    name: def.name,
    type,
    parent_id: parentId,
    topic: def.topic,
    permission_overwrites: overwritesFor(def),
  });
  channels.push(created);
  log(`  + #${def.name} created`);
  return created;
}

for (const group of STRUCTURE) {
  let cat = byName(group.category, CATEGORY);
  if (!cat) {
    cat = await api("POST", `/guilds/${guildId}/channels`, {
      name: group.category,
      type: CATEGORY,
    });
    channels.push(cat);
    log(`  + ${group.category} created`);
  } else {
    log(`  = ${group.category} exists`);
  }
  for (const def of group.channels) {
    if (def.forum) continue; // forums need Community mode; created in step 4
    await ensureChannel(def, cat.id, TEXT);
  }
}

// ---- 3. Community mode --------------------------------------------------
log("\n[3/9] Community mode");
if (guild.features.includes("COMMUNITY")) {
  log("  = already enabled");
} else {
  await api("PATCH", `/guilds/${guildId}`, {
    features: [...guild.features, "COMMUNITY"],
    verification_level: 2, // Medium: verified email
    explicit_content_filter: 2,
    default_message_notifications: 1, // mentions only
    rules_channel_id: byName("rules-and-safety").id,
    public_updates_channel_id: byName("moderators").id,
  });
  log("  + enabled (verification: medium, content filter: all members)");
}

// ---- 4. Forum channels and announcement conversion ----------------------
log("\n[4/9] Forum and announcement channels");
for (const group of STRUCTURE) {
  const cat = byName(group.category, CATEGORY);
  for (const def of group.channels) {
    if (def.forum) {
      const ch = await ensureChannel(def, cat.id, FORUM);
      if (def.tags && !(ch.available_tags ?? []).length) {
        const patched = await api("PATCH", `/channels/${ch.id}`, {
          available_tags: def.tags.map((name) => ({ name, moderated: false })),
          ...(def.upvoteEmoji
            ? { default_reaction_emoji: { emoji_id: null, emoji_name: def.upvoteEmoji } }
            : {}),
        });
        channels = channels.map((c) => (c.id === patched.id ? patched : c));
        log(`  ~ #${def.name} tags applied: ${def.tags.join(", ")}`);
      }
    }
    if (def.announce) {
      const ch = byName(def.name);
      if (ch.type === ANNOUNCEMENT) {
        log(`  = #${def.name} already announcement type`);
      } else {
        await api("PATCH", `/channels/${ch.id}`, { type: ANNOUNCEMENT });
        log(`  ~ #${def.name} converted to announcement channel`);
      }
    }
  }
}

// ---- 5. AutoMod ----------------------------------------------------------
log("\n[5/9] AutoMod rules");
// Block the message AND alert #moderators. Note: Discord's own pre-installed
// "Block Mention Spam" rule cannot be edited by bots — add its alert in the UI.
const autoModActions = [
  { type: 1 },
  { type: 2, metadata: { channel_id: byName("moderators").id } },
];
const autoModRules = [
  {
    name: "Block slurs and severe profanity",
    event_type: 1,
    trigger_type: 4, // keyword presets
    trigger_metadata: { presets: [1, 2, 3], allow_list: [] },
    actions: autoModActions,
    enabled: true,
  },
  {
    name: "Block suspected spam",
    event_type: 1,
    trigger_type: 3, // spam
    actions: autoModActions,
    enabled: true,
  },
  {
    name: "Block mention raids",
    event_type: 1,
    trigger_type: 5, // mention spam
    trigger_metadata: { mention_total_limit: 8 },
    actions: autoModActions,
    enabled: true,
  },
];
const existingAutoMod = await api("GET", `/guilds/${guildId}/auto-moderation/rules`);
for (const rule of autoModRules) {
  if (existingAutoMod.some((r) => r.trigger_type === rule.trigger_type)) {
    log(`  = "${rule.name}" (trigger exists)`);
    continue;
  }
  await api("POST", `/guilds/${guildId}/auto-moderation/rules`, rule);
  log(`  + "${rule.name}"`);
}

// ---- 6. Guild profile, system channel, emoji ------------------------------
log("\n[6/9] Guild profile");
await api("PATCH", `/guilds/${guildId}`, {
  description:
    "Free, open-source app for tending to your mental well-being. Community, support, and practice — not therapy or crisis care.",
  // Native join greetings ("X just landed") go to #general with a wave button —
  // this is the no-bot welcome-message mechanism.
  system_channel_id: byName("general").id,
  system_channel_flags: 0,
});
log("  + description and #general join-greetings configured");

const emojis = await api("GET", `/guilds/${guildId}/emojis`);
if (emojis.some((e) => e.name === "selftend")) {
  log("  = :selftend: emoji exists");
} else {
  const png = readFileSync(new URL("../../assets/favicon.png", import.meta.url));
  await api("POST", `/guilds/${guildId}/emojis`, {
    name: "selftend",
    image: `data:image/png;base64,${png.toString("base64")}`,
  });
  log("  + :selftend: emoji uploaded from assets/favicon.png");
}

// ---- 7. Content posts ----------------------------------------------------
log("\n[7/9] Content posts");
// Replace <#channel-name> placeholders with real <#id> mentions.
function resolveMentions(text) {
  return text.replace(/<#([a-z0-9-]+)>/g, (m, name) => {
    const ch = byName(name);
    return ch ? `<#${ch.id}>` : m;
  });
}

async function postAndPin(channelName, messages) {
  const ch = byName(channelName);
  const pins = await api("GET", `/channels/${ch.id}/pins`);
  if (pins.some((p) => p.author?.id === me.id)) {
    log(`  = #${channelName} already has pinned bot content`);
    return;
  }
  for (const msg of messages) {
    const posted = await api("POST", `/channels/${ch.id}/messages`, {
      content: resolveMentions(msg),
    });
    await api("PUT", `/channels/${ch.id}/pins/${posted.id}`);
  }
  log(`  + #${channelName}: ${messages.length} message(s) posted and pinned`);
}

await postAndPin("rules-and-safety", rulesMessages);
await postAndPin("links", [linksMessage]);
for (const [name, post] of Object.entries(scopePosts)) {
  await postAndPin(name, [post]);
}

// ---- 7. Welcome screen and onboarding ------------------------------------
log("\n[8/9] Welcome screen and onboarding");
await api("PATCH", `/guilds/${guildId}/welcome-screen`, {
  enabled: true,
  description: welcomeScreen.description,
  welcome_channels: welcomeScreen.channels.map((c) => ({
    channel_id: byName(c.name).id,
    description: c.description,
    emoji_id: null,
    emoji_name: null,
  })),
});
log("  + welcome screen configured");

await api("PATCH", `/guilds/${guildId}/member-verification`, {
  enabled: true,
  description: rulesScreening.description,
  form_fields: [
    {
      field_type: "TERMS",
      label: "Read and agree to the community rules",
      values: rulesScreening.values,
      required: true,
    },
  ],
});
log("  + rules screening configured");

try {
  await api("PUT", `/guilds/${guildId}/onboarding`, {
    prompts: [
      {
        id: "0",
        type: 0,
        title: onboardingPrompt.title,
        single_select: false,
        required: false,
        in_onboarding: true,
        options: onboardingPrompt.options.map((o) => ({
          title: o.title,
          description: o.description,
          role_ids: [roleId[o.role]],
          channel_ids: o.channels.map((n) => byName(n).id),
        })),
      },
    ],
    // Together with the question options this must cover every public channel,
    // or Discord shows a coverage warning in the onboarding settings.
    default_channel_ids: [
      "rules-and-safety",
      "announcements",
      "links",
      "introductions",
      "general",
      "feedback",
      "off-topic",
      "wins",
    ].map((n) => byName(n).id),
    enabled: true,
    mode: 0,
  });
  log("  + onboarding prompt configured");
} catch (err) {
  log(`  ! onboarding not applied via API (${err.message.slice(0, 200)})`);
  log("    -> configure manually: Server Settings > Onboarding (see docs/discord-server.md)");
}

// ---- 8. Changelog webhook -------------------------------------------------
log("\n[9/9] Changelog webhook");
const changelog = byName("changelog");
const hooks = await api("GET", `/channels/${changelog.id}/webhooks`);
let hook = hooks.find((h) => h.name === "GitHub Releases");
if (hook) {
  log("  = webhook exists");
} else {
  hook = await api("POST", `/channels/${changelog.id}/webhooks`, { name: "GitHub Releases" });
  log("  + webhook created");
}
log(`  GitHub webhook URL (add /github suffix when registering on GitHub):`);
log(`  https://discord.com/api/webhooks/${hook.id}/${hook.token}/github`);

log("\nDone. Manual steps that need the Discord UI (see docs/discord-server.md):");
log("  - Upload server icon/banner (Server Settings > Overview)");
log("  - Review onboarding flow (Server Settings > Onboarding) if step 7 warned");
log("  - Assign yourself the @Maintainer role");
