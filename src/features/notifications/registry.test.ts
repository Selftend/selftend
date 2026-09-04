import {
  getNotificationTarget,
  NOTIFICATION_TARGETS,
  type NotificationTargetKey,
  readEnabled,
  readHour,
  readMinute,
} from "@/src/features/notifications/registry";
import { WIDGET_META } from "@/src/features/home/widget-registry";
import { defaultUserPreferences } from "@/src/features/modules/types";

/**
 * ☠️☠️ **EVERY NOTIFICATION TARGET IS A PRACTICE TARGET - something the
 * person DOES - and never an announcement, update, news or promotion channel**
 * (#1928, from #1852).
 *
 * Push is **the only channel Selftend owns that can send with no project
 * event.** Every other way we reach someone - GitHub release watchers, YouTube,
 * Weblate, r/Selftend, Discord - fires only when the project ships something,
 * so ADR-0004's *nothing on any channel is triggered by non-use* is enforced
 * there by the channel's own shape. This registry is not: it sends whenever we
 * tell it to.
 *
 * ☠️ **The refusal is not that a clean in-app announcement is impossible.**
 * ADR-0003 proves one is. It is that **a marketing document which can reach the
 * app's surfaces routes around product review** - so this door may only ever be
 * opened deliberately, by product review, and never by a growth argument.
 *
 * ⚠️ **`notificationsEnabledGlobal` defaults to `true`.** A new key would
 * inherit a master switch that is already on, so the per-target opt-in is the
 * ONLY thing standing between it and a send. That is why the gate is here, on
 * what a target may BE, rather than on how it is delivered.
 *
 * ☠️ **Why the order test above was not enough.** It pins the registry to the
 * dashboard catalogue, so a target cannot be added to the registry alone. It
 * says nothing about what a target is allowed to *be*: an `announcements` key
 * added to BOTH the catalogue and the registry passed every assertion in this
 * file, and nothing anywhere stated why that is forbidden. #1852 closed with
 * the boundary in prose only, and ADR-0004 faced the same prose-vs-guard choice
 * and rejected prose - *"a fresh audit of a product this careful still filed
 * four issues; the vocabulary regrows."*
 *
 * **Adding a real tool reminder is one line here, and that conscious moment is
 * the point.** Adding a broadcast target means editing a rule that explains why
 * you should not.
 */
const PRACTICE_TARGETS: NotificationTargetKey[] = [
  "cbt",
  "act",
  "meditation",
  "gratitude",
  "mood",
  "journal",
  "breathing",
  "grounding",
  "sleep",
  "habits",
];

describe("NOTIFICATION_TARGETS", () => {
  it("contains all expected keys exactly once", () => {
    const keys = NOTIFICATION_TARGETS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of PRACTICE_TARGETS) {
      expect(keys).toContain(k);
    }
  });

  it("no longer contains the stale mindfulness target", () => {
    expect(NOTIFICATION_TARGETS.map((t) => String(t.key))).not.toContain("mindfulness");
  });

  /**
   * DERIVED, not restated (#981): the expected order is computed from the dashboard
   * catalogue, so adding a widget id ahead of another reorders this screen too rather than
   * quietly disagreeing with home. A hand-written expected array would pass forever while the
   * two screens drifted, which is the failure shape #807 recorded.
   */
  it("is ordered by the dashboard catalogue, so home and reminders agree", () => {
    const reminderKeys = new Set<string>(PRACTICE_TARGETS);
    const seen = new Set<string>();
    const catalogueOrder: string[] = [];
    for (const meta of Object.values(WIDGET_META)) {
      if (meta.tier !== "tool") continue;
      if (!reminderKeys.has(meta.toolKey) || seen.has(meta.toolKey)) continue;
      seen.add(meta.toolKey);
      catalogueOrder.push(meta.toolKey);
    }

    // Every reminder target is a dashboard tool, so the catalogue names all ten.
    expect(catalogueOrder).toHaveLength(PRACTICE_TARGETS.length);
    expect(NOTIFICATION_TARGETS.map((t) => t.key)).toEqual(catalogueOrder);
  });

  it.each(PRACTICE_TARGETS)("%s names all four preference columns", (key) => {
    const target = getNotificationTarget(key);
    expect(target.enabledField).toBe(`${key}RemindersEnabled`);
    expect(target.hourField).toBe(`${key}ReminderHour`);
    expect(target.minuteField).toBe(`${key}ReminderMinute`);
    expect(target.timezoneField).toBe(`${key}ReminderTimezone`);
  });

  /**
   * The gate itself (#1928). Set equality, so it fails in BOTH directions: a
   * broadcast key added to the registry is caught, and a practice target
   * quietly dropped from the registry is caught too.
   */
  it("carries only practice targets - nothing that could broadcast", () => {
    expect([...NOTIFICATION_TARGETS.map((t) => t.key)].sort()).toEqual(
      [...PRACTICE_TARGETS].sort(),
    );
  });

  /**
   * The second lock, and the one the allowlist alone cannot provide: every
   * target names a **catalogue tool with somewhere to go**. The allowlist is
   * deliberately a one-line edit, so padding it is the obvious lazy fix; this
   * is what makes padding insufficient, because a fake entry would have to
   * invent a widget and a destination too. Mutation-tested in exactly that
   * shape.
   *
   * ☠️ **It asserts a route EXISTS, not where the route points, and the
   * difference matters.** The first draft required `/tools/` or `/modules/`,
   * which is wrong: `routines` is a `tier: "tool"` widget routed at
   * **`/routines`**, with a comment in `widget-registry.tsx` saying so on
   * purpose - *"Not `/tools/routines` - routines live at the top level of the
   * router."* A routine reminder is the most plausible next target of all, and
   * that draft would have blocked it with a guard whose docblock says tripping
   * it means you are doing something forbidden. A false alarm on a legitimate
   * practice teaches people to edit the rule, which is the one thing this file
   * must not teach.
   *
   * ⚠️ Derived from `WIDGET_META`, so it follows the catalogue rather than
   * pinning routes that go stale.
   */
  it.each(PRACTICE_TARGETS)("%s is a catalogue tool with somewhere to go", (key) => {
    const widgets = Object.values(WIDGET_META).filter(
      (meta) => meta.tier === "tool" && meta.toolKey === key,
    );

    expect(widgets.length).toBeGreaterThan(0);
    for (const widget of widgets) {
      expect(typeof widget.route).toBe("string");
      expect(widget.route.length).toBeGreaterThan(1);
    }
  });

  /**
   * The third lock: the vocabulary. Even a broadcast target that faked a widget
   * and a destination has to name itself something, and these are the names it
   * would reach for.
   *
   * ☠️ **EVERY stem carries its OWN probe**, the `positioning-copy.test.ts`
   * mechanism. The first draft had eleven stems and four probes - six of them
   * (`offer`, `promo`, `marketing`, `campaign`, `digest`, `survey`) were
   * matched by no probe at all, so a typo in any one would have passed forever
   * while the docblock cited the very convention it was breaking.
   *
   * ⚠️ **The stems are narrowed to compound forms on purpose.** Bare
   * `release`, `update` and `survey` are ordinary practice words - progressive
   * muscle RELEASE is a standard relaxation exercise, and CBT is largely about
   * UPDATING a belief. A guard that blocks `progressiveRelease` while trying to
   * block `releaseNotes` is the over-sweep `restraint-copy` keeps bare
   * "pressure" legal to avoid.
   */
  const BROADCAST: { stem: RegExp; probe: string }[] = [
    { stem: /announce/i, probe: "announcements" },
    { stem: /\bnews\b|newsletter/i, probe: "newsletter" },
    { stem: /productUpdate/i, probe: "productUpdates" },
    { stem: /releaseNote/i, probe: "releaseNotes" },
    { stem: /promo/i, probe: "promotions" },
    { stem: /marketing/i, probe: "marketingTips" },
    { stem: /campaign/i, probe: "campaignPush" },
    { stem: /digest/i, probe: "weeklyDigest" },
    { stem: /specialOffer/i, probe: "specialOffers" },
  ];

  it.each(BROADCAST)("the $stem rule matches its own probe", ({ stem, probe }) => {
    expect(stem.test(probe)).toBe(true);
  });

  it("refuses broadcast vocabulary in a target key", () => {
    for (const target of NOTIFICATION_TARGETS) {
      const hit = BROADCAST.find((rule) => rule.stem.test(target.key));
      expect({ key: target.key, matched: hit?.stem.source ?? null }).toEqual({
        key: target.key,
        matched: null,
      });
    }
  });

  /**
   * The mirror, and the reason the stems are narrow: a plausible FUTURE
   * practice must stay sayable. `routines` is the likeliest next target;
   * progressive muscle release and belief-updating are real techniques whose
   * keys would trip a looser list.
   */
  it.each(["routines", "progressiveRelease", "beliefUpdate", "bodyScan", "selfCare"])(
    "leaves the plausible practice key %s alone",
    (key) => {
      const hit = BROADCAST.find((rule) => rule.stem.test(key));
      expect({ key, matched: hit?.stem.source ?? null }).toEqual({ key, matched: null });
    },
  );

  it("carries no placeholder status and no description key", () => {
    for (const target of NOTIFICATION_TARGETS) {
      // Both were dead: `status: "placeholder"` was never used, and all ten descriptions
      // restated their own labels (#981). Asserted as absence so a revert is loud.
      expect(target).not.toHaveProperty("status");
      expect(target).not.toHaveProperty("descriptionKey");
    }
  });
});

describe("getNotificationTarget", () => {
  it("returns the target for a known key", () => {
    expect(getNotificationTarget("cbt").key).toBe("cbt");
  });

  it("throws for an unknown key", () => {
    expect(() => getNotificationTarget("nope" as never)).toThrow(/Unknown notification target/);
  });
});

describe("readEnabled / readHour / readMinute", () => {
  it("readEnabled returns false for a disabled target", () => {
    const mood = getNotificationTarget("mood");
    expect(readEnabled(defaultUserPreferences, mood)).toBe(false);
  });

  it("readEnabled reflects the preferences value", () => {
    const cbt = getNotificationTarget("cbt");
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: true }, cbt)).toBe(true);
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: false }, cbt)).toBe(false);
  });

  it("readHour returns each target's stored value", () => {
    expect(
      readHour({ ...defaultUserPreferences, cbtReminderHour: 8 }, getNotificationTarget("cbt")),
    ).toBe(8);
    // mood's staggered default lands at 12:00.
    expect(readHour(defaultUserPreferences, getNotificationTarget("mood"))).toBe(12);
  });

  it("readMinute returns each target's stored value", () => {
    expect(readMinute(defaultUserPreferences, getNotificationTarget("mood"))).toBe(0);
    expect(
      readMinute(
        { ...defaultUserPreferences, meditationReminderMinute: 45 },
        getNotificationTarget("meditation"),
      ),
    ).toBe(45);
  });
});
