import { router, type Href } from "expo-router";
import { Pressable } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

/**
 * The one "show all" door in the product (#1375).
 *
 * It started as check-in's entrance to all-history (#696), was adopted by sleep
 * (#775) by copying the file, and both copies carried a docblock promising the two
 * would "never drift into two different words for the same door" - a promise two
 * byte-identical components could not keep, having already drifted into two
 * components. CBT and ACT adopting the same pattern would have made it four, so the
 * copies were folded into this one.
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
 * Navigation is `router.push`, not a `<Link>`, because every door is a forward push
 * into a list from a surface that stays in the stack behind it.
 */
export function ShowAllLink({ label, route }: { label: string; route: Href }) {
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(route)}
      className="flex-row items-center gap-1 active:opacity-70"
      role="link"
    >
      <Text className="text-[13px] font-semibold text-primary-ink">{label}</Text>
      {/* Decorative: `Icon` is aria-hidden, so the label alone is the accessible name. */}
      <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
    </Pressable>
  );
}
