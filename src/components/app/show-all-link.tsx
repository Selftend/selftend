import { type Href } from "expo-router";
import { Pressable } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, enterKeyActivationProps } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

/**
 * The shared "show all" door (#1375). Eight call sites so far: check-in's three,
 * sleep's two, gratitude's two and breathing's one.
 *
 * It started as check-in's entrance to all-history (#696), was adopted by sleep
 * (#775) by copying the file, and both copies carried a docblock promising the two
 * would "never drift into two different words for the same door" - a promise two
 * byte-identical components could not keep, having already drifted into two
 * components. CBT and ACT adopting the same pattern would have made it four, so the
 * copies were folded into this one.
 *
 * ⚠️ It is not yet every door. Grounding, journal (twice) and meditation (twice)
 * still roll their own, in different type sizes. #1375 scoped this change to the
 * component plus the arrow fixes, so those adopt it as their screens are redesigned -
 * `test/show-all-door-copy.test.ts` already watches their strings. ACT's defusion
 * door, the one that said a bare "All logs", came through with #1388.
 *
 * **The arrow is this component's job and never part of the string.** Two shipped
 * strings baked it into the translated value - breathing's "Show all sessions →" and
 * gratitude's "Show all entries →" - which renders two arrows the moment the door
 * comes through here, and hands translators a glyph to get wrong. Both were fixed
 * with this extraction, and `test/show-all-door-copy.test.ts` keeps a third from
 * appearing.
 *
 * The door vocabulary is nine nouns, one per thing a user can have a list of:
 *
 * - **sessions** - breathing and grounding
 * - **entries** - journal and gratitude
 * - **history** - check-in
 * - **steps** - the wizard step list
 * - **sits** - meditation
 * - **nights** - sleep
 * - **records** - CBT thought records
 * - **logs** - ACT defusion logs
 * - **goals** - CBT's active goals
 *
 * The shipped **"Show all …"** verb form is kept over the redesign's bare "All …":
 * six strings already say it, and redesigning two screens is not a reason to reword
 * six others.
 *
 * Navigation is a push, not a `<Link>`, because every door is a forward push into a
 * list from a surface that stays in the stack behind it.
 *
 * A push without an `href` is a `<div role="link">` on web, and react-native-web
 * hands a link's Enter to the browser expecting a native anchor - which the div
 * is not - so the door brings its own Enter handler (#1730, #1734). Space is left
 * alone: a link never activates on Space.
 *
 * ⚠️ Through `usePushWithOrigin`, never a bare `router.push` (#1269, and the two
 * per-module copies this replaces had already been migrated on `dev` before this
 * branch merged). Every one of these doors is a cross-hierarchy arrival — a list
 * screen reached from an overview — which is exactly the case where an Origin-less
 * push leaves the arrival showing "Up" instead of the way back. `eslint.config.js`
 * bans the bare call, and `test/bare-router-push-ban.test.ts` keeps the exemption
 * list honest, so this is enforced rather than remembered.
 */
export function ShowAllLink({ label, route }: { label: string; route: Href }) {
  const pushWithOrigin = usePushWithOrigin();
  const open = () => pushWithOrigin(route);

  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={open}
      {...enterKeyActivationProps(open)}
      className="flex-row items-center gap-1 active:opacity-70"
      role="link"
    >
      <Text className="text-[13px] font-semibold text-primary-ink">{label}</Text>
      {/* Decorative: `Icon` is aria-hidden, so the label alone is the accessible name. */}
      <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
    </Pressable>
  );
}
