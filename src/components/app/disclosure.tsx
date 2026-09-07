import { useId, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface DisclosureProps {
  /** The trigger's text. Callers may vary it with context - see `#760`'s kind-conditional label. */
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  testID?: string;
  /**
   * `"inline"` (the default) is the form-section control of #760: a compact
   * `self-start` trigger with a leading chevron, sized to its label.
   *
   * `"row"` is the FAQ row of #2143: full width, label left, chevron right. A
   * list of questions reads as a list only if the rows share an edge, and a
   * chevron that sits wherever the question happens to end reads as punctuation
   * rather than as a control.
   */
  layout?: "inline" | "row";
  /**
   * Puts the trigger in the page's heading outline at this level.
   *
   * Omitted by default, because a form section's *More options* is a control and
   * not a heading. An FAQ row's label is a question, which is - so `/faq` passes
   * 3 and the eight rows become the level-3 run under their group's level-2
   * eyebrow.
   *
   * The level goes on a wrapper, never on the `Pressable`. The accordion pattern
   * is a heading *containing* a button: one node cannot carry both roles, and
   * moving `role="heading"` onto the trigger would cost it `role="button"` and
   * with it the whole expanded/collapsed announcement.
   *
   * ☠️ The wrapper deliberately carries **no `accessible`**. Setting it would
   * merge the whole subtree into one native accessibility element, swallowing
   * the button's own focus stop - so on iOS the heading trait is not exposed,
   * and the outline is a web and Android guarantee rather than a universal one.
   * That is the cheaper half of the trade: a missing heading trait costs a
   * VoiceOver user a navigation shortcut, while a merged element costs them the
   * control itself. It also means RNTL's `*ByRole` cannot see this node - assert
   * it by props, as `disclosure.test.tsx` does.
   */
  headingLevel?: number;
  /**
   * A stable identity for this disclosure, for a caller that keys open state by
   * id rather than by an array index - which is what a filtered or reordered
   * list quietly breaks.
   *
   * Inside the component it fixes the content region's id (`<id>-content`) in
   * place of React's generated one, so the `aria-controls` edge is deterministic
   * rather than a `useId` counter that moves with render order. It is
   * deliberately not put on the wrapper as well: with the prop omitted the
   * rendered tree must be exactly today's, and an always-present `nativeID` -
   * `undefined` or not - is not that.
   */
  id?: string;
}

/**
 * A labelled show/hide section, for forms that hold more than their common case
 * needs (#760), and - in `layout="row"` - the FAQ row of #2143.
 *
 * Content is **unmounted** when collapsed rather than hidden with a style. A
 * hidden-but-mounted subtree keeps its fields in the tab order and in the
 * accessibility tree, which is the usual way a disclosure turns into a trap:
 * the form looks short and tabs through twelve invisible inputs.
 *
 * Deliberately unanimated. The habits redesign's motion decision (#716) admits
 * no animation, and a height transition here would be the kind that has to
 * measure its content - which is exactly the sort that misbehaves under
 * reduce-motion and on first paint. The FAQ drawing's 200ms chevron rotation is
 * not adopted for the same reason.
 *
 * All three of `layout`, `headingLevel` and `id` are additive and default to the
 * form-section behaviour, so the three shipped call sites - the habit editor,
 * the habits home and the settings profile block - are untouched by #2143.
 */
export function Disclosure({
  label,
  expanded,
  onToggle,
  children,
  className,
  testID,
  layout = "inline",
  headingLevel,
  id,
}: DisclosureProps) {
  const generatedId = useId();
  const contentId = id ? `${id}-content` : generatedId;
  const isRow = layout === "row";

  const chevron = (
    <Icon
      name={expanded ? "expand-less" : "expand-more"}
      className="size-5 text-muted-foreground"
    />
  );

  const trigger = (
    /*
      No `spaceKeyActivationProps` here, unlike the checkbox and radio
      Pressables around the app. React Native Web already activates
      `role="button"` on Space - on keyUP - so adding the helper's keyDown
      handler toggles twice per press: open on the way down, closed on the way
      up, leaving the section exactly as it was for a keyboard user.
    */
    <Pressable
      accessibilityRole="button"
      aria-expanded={expanded}
      aria-controls={contentId}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onToggle}
      className={cn(
        "flex-row items-center gap-2 active:opacity-70",
        isRow ? "w-full justify-between" : "self-start",
      )}
      role="button"
      testID={testID}
    >
      {isRow ? null : chevron}
      {/*
        14/600 in both layouts. It is the kit's mobile question size, and #2123's
        own table calls the 0.5px delta to its desktop 14.5 noise - the
        alternatives being an arbitrary `text-[14.5px]` or a responsive type step
        the app does not have.

        `flex-1` only in row layout, so a question that wraps to two lines pushes
        the chevron to the right edge rather than off it.
      */}
      <Text className={cn("text-sm font-semibold", isRow && "flex-1")}>{label}</Text>
      {isRow ? chevron : null}
    </Pressable>
  );

  return (
    <View className={cn("gap-4", className)}>
      {headingLevel === undefined ? (
        trigger
      ) : (
        <View role="heading" aria-level={headingLevel}>
          {trigger}
        </View>
      )}
      {expanded ? (
        <View nativeID={contentId} className="gap-6">
          {children}
        </View>
      ) : null}
    </View>
  );
}
