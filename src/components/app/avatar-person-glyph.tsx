import { View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";

/**
 * The avatar's stand-in when there is no photo AND no letter to take — i.e.
 * `getInitial` returned `null` (#1810).
 *
 * One component for both surfaces (the header's 32px `AvatarFallback` and
 * settings' 56px gradient circle) so the glyph, its testID and the caveat below
 * are stated once. It replaced the `?` that `getInitial` used as its
 * refusal-to-invent sentinel: `?` reads as an error, where the truth is only
 * *no photo yet*.
 *
 * ☠️ The testID sits on this View, not on the `Icon`. `MaterialIcons` drops
 * `testID` before the host element — it reaches composite nodes only — so
 * `getByTestId` can never find an icon directly.
 *
 * ⚠️ Callers that hide the whole circle from assistive tech (settings does, with
 * `aria-hidden`) put this out of reach of an ordinary RNTL query too: hidden
 * subtrees are excluded from EVERY query by default, `*ByTestId` included, so
 * such a test needs `includeHiddenElements`.
 */
export function AvatarPersonGlyph({ className, size }: { className?: string; size?: number }) {
  return (
    <View testID="profile-avatar-person">
      <Icon name="person" className={className} size={size} />
    </View>
  );
}
