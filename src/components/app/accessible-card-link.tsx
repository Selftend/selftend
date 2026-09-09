import { Pressable } from "react-native";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface AccessibleCardLinkProps {
  className?: string;
  description?: string;
  onPress: () => void;
  title: string;
}

/**
 * A card that is also a link. Six consumers are CBT **index** screens:
 * `activities`, `anger`, `beliefs`, `exposure`, `goals`, `tasks`. The seventh
 * is the recovery-plan door on Looking back (#1905) - not an index, but the
 * same shape: a card-sized target whose title fully names where it goes, on a
 * screen that is otherwise all reading.
 *
 * ⚠️ **The divergence is deliberate and recorded here (#1386).** Three former
 * consumers left for `HairlineRow` - the overview's recent records, the
 * overview's active goals, and the thought-record history behind their door -
 * because the redesign made those three one continuous list grammar, and a card
 * per item directly beneath a hairline `Section` reads as a panel inside a list.
 * The six index screens are their own screens rather than sections of one, so
 * they keep the card and are NOT a to-do.
 *
 * ☠️ Know what this component costs before adding a consumer: `description`
 * becomes an `accessibilityHint`, which **react-native-web never implements**,
 * and the explicit `accessibilityLabel` hides the rendered children from
 * assistive tech - so anything in `description` is silent on the web. That pair
 * of facts is why a row carrying a read value (a belief pair, a timestamp)
 * cannot use this; `HairlineRow` lets its children be its accessible name
 * instead.
 */
export function AccessibleCardLink({
  className,
  description,
  onPress,
  title,
}: AccessibleCardLinkProps) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      className={cn("rounded-xl", className)}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      role="button"
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      </Card>
    </Pressable>
  );
}
