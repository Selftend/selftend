import { ActivityIndicator, Platform, Pressable, View } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, enterKeyActivationProps } from "@/src/lib/accessibility";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";

/**
 * What may sit in a settings row's trailing slot.
 *
 * The trailing slot is the row's whole contract (#958): **chevron navigates ·
 * switch _is_ the setting · spinner is acting now · open-in-new leaves the app ·
 * nothing acts in place.** No row has two meanings, which is what kills the
 * drawn chevron on `Sign out` and `Delete my account` - a chevron there would
 * promise a destination that does not exist.
 *
 * `"act"` is the empty slot, and it is a kind rather than an omission: it says
 * the press does the thing right here, so a reader who has learnt the marks can
 * also read their absence.
 *
 * `"external"` (#1725) is the one kind that changes the row's ROLE as well as
 * its mark: a press opens a mailbox, a browser tab, a store page - somewhere the
 * app is not - so the row is a `link`, not a button, and a chevron would lie
 * about there being a screen behind it.
 */
export type SettingsRowTrailing =
  | { kind: "chevron" }
  | {
      kind: "switch";
      checked: boolean;
      disabled?: boolean;
      onCheckedChange: (next: boolean) => void;
    }
  | { kind: "act" }
  | { kind: "external" };

interface SettingsRowProps {
  icon: MaterialIconName;
  label: string;
  /**
   * The row's second line. A state that PERSISTS belongs here rather than in a
   * toast - `appLockUnavailable` is the case that decided it, since a device
   * without biometrics stays without them after the toast has gone.
   */
  description?: string;
  trailing: SettingsRowTrailing;
  /**
   * True while THIS row's own action is running. It takes over the trailing slot,
   * so the control that is acting is the control that was pressed.
   */
  pending?: boolean;
  /** The spinner's accessible name: what is happening, not what was pressed. */
  pendingLabel?: string;
  disabled?: boolean;
  /**
   * A destructive row is `--destructive` ink and nothing else - no wash, no
   * border, no second warning glyph.
   */
  destructive?: boolean;
  /** Absent for a `switch` row: there, the switch is the whole interaction. */
  onPress?: () => void;
  testID?: string;
}

/**
 * One settings row: glyph · label · optional description · one trailing mark.
 *
 * Eleven of these across four labelled runs replace seven `SettingsSectionCard`
 * consumers. The grammar is deliberately narrower than the cards' was: a card
 * could hold a switch, two buttons and a link at once, which is how `Security`
 * ended up covering a device lock and a policy page in one box.
 */
export function SettingsRow({
  icon,
  label,
  description,
  trailing,
  pending = false,
  pendingLabel,
  disabled = false,
  destructive = false,
  onPress,
  testID,
}: SettingsRowProps) {
  const ink = destructive ? "text-destructive" : undefined;
  /**
   * The one question the kind decides beyond which mark to draw, asked once: a
   * switch row is NOT pressable as a whole. Wrapping it would give the row two
   * targets for one setting, and a stray tap on the label would silently flip a
   * device lock.
   */
  const pressableWhole = trailing.kind !== "switch";
  const inert = disabled || pending;

  const body = (
    <>
      <Icon name={icon} className={cn("size-5 shrink-0", destructive ? ink : CHROME_MARK)} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className={cn("text-[15px] font-semibold", ink)}>{label}</Text>
        {description ? (
          <Text variant="muted" className="text-[13px] leading-snug">
            {description}
          </Text>
        ) : null}
      </View>
      {/*
        One mark, chosen in one place. `pending` wins over every kind, including
        `switch`: a switch that is still off while a request is in flight would
        otherwise read as "this did nothing".
      */}
      {pending ? (
        <ActivityIndicator
          testID={testID ? `${testID}-pending` : undefined}
          accessibilityLabel={pendingLabel}
        />
      ) : trailing.kind === "chevron" || trailing.kind === "external" ? (
        // Both marks are decorative: the row's role (button, link) already tells
        // a screen-reader user what the press does.
        <Icon
          name={trailing.kind === "chevron" ? "chevron-right" : "open-in-new"}
          accessibilityElementsHidden
          importantForAccessibility="no"
          className={cn("size-5 shrink-0", CHROME_MARK)}
        />
      ) : trailing.kind === "switch" ? (
        <Switch
          accessibilityLabel={label}
          checked={trailing.checked}
          disabled={trailing.disabled}
          onCheckedChange={trailing.onCheckedChange}
        />
      ) : null}
    </>
  );

  if (!pressableWhole) {
    return (
      <View testID={testID} className="flex-row items-center gap-[14px] py-3.5">
        {body}
      </View>
    );
  }

  /**
   * A `link` activates on Enter and never on Space. react-native-web expects a
   * link to be a native anchor and leaves its Enter to the browser - which does
   * nothing with an href-less `<div role="link">` - so the external row brings
   * its own Enter handler. A button row must NOT get one: RNW already activates
   * buttons from the keyboard, and a second handler would fire the press twice.
   */
  const role = trailing.kind === "external" ? "link" : "button";
  const keyActivation =
    role === "link" && onPress && !inert ? enterKeyActivationProps(onPress) : {};

  return (
    <Pressable
      accessibilityRole={role}
      role={role}
      {...keyActivation}
      /**
       * The label alone, never label + description. Three e2e specs address these
       * rows by exact button name (`Show tips again`, `Export my data`,
       * `Delete my account`), and home's `"{name}, {stat}"` shape would break all
       * three - a stat is part of what one press acts on, a policy sentence is not.
       */
      accessibilityLabel={label}
      accessibilityHint={description}
      // `aria-disabled`, not `accessibilityState`: react-native-web drops the
      // latter, so a row that refuses presses would still announce as available.
      aria-disabled={inert}
      disabled={inert}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      testID={testID}
      className={cn(
        "flex-row items-center gap-[14px] rounded-xl py-3.5 active:bg-accent/60",
        Platform.select({ web: "hover:bg-accent/40" }),
        inert && "opacity-60",
      )}
    >
      {body}
    </Pressable>
  );
}
