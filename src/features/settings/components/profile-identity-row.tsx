import { LinearGradient } from "expo-linear-gradient";
import { Image, View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useAccentHsl } from "@/src/lib/theme-palette";

interface ProfileIdentityRowProps {
  /** `resolveAvatarUrl(profile, user) ?? undefined`. */
  avatarUri: string | undefined;
  /** Whether that resolved to a photo. */
  hasAvatar: boolean;
  /**
   * The most specific thing known about the person:
   * `name || email || t("navigation:userMenu.guest")`.
   */
  name: string;
  /** `Boolean(name && email)` — gates the email sub-line, so a guest has none. */
  showEmail: boolean;
  /** `user?.email` — only rendered when `showEmail`. */
  email: string;
  /**
   * `getInitial(name, email)`, or `null` when there is no letter to honestly
   * take — which draws a person glyph instead.
   */
  initial: string | null;
}

/**
 * Identity row: gradient avatar + name/email — the settings page's identity
 * header.
 *
 * Pure props: every derivation happens in `SettingsProfileBlock` through the
 * helpers the header also uses (#1829), so the two surfaces cannot answer the
 * same question differently the way they used to.
 */
export function ProfileIdentityRow({
  avatarUri,
  hasAvatar,
  name,
  showEmail,
  email,
  initial,
}: ProfileIdentityRowProps) {
  const accent = useAccentHsl();
  return (
    // A band, not a box (#1800, design 14a): rules above and below, no side
    // borders and no radius, so the row sits flush in the column like every
    // group under it. A rounded, bordered panel here made the identity read as
    // the one card on a page that has none.
    <View className="flex-row items-center gap-4 border-b border-t border-border py-5">
      {/*
        ☠️ `aria-hidden` is the one of these three that works on web.
        react-native-web implements neither `accessibilityElementsHidden` nor
        `importantForAccessibility`, so without it the circle's contents are
        announced — today the initial, and after #1810 a person glyph — ahead of
        the name that says the same thing one element over. The circle is
        decorative: it restates its neighbour.
      */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        aria-hidden
        className="h-14 w-14 items-center justify-center overflow-hidden rounded-full"
      >
        {/*
          A wash of the ACTIVE accent, not two hand-written violet literals.
          The pair that used to sit here was `hsla(262, 62%, 56%, …)` - the
          default palette's accent, copied by hand out of PRIMARY_TRIPLES - so
          this circle stayed violet on every other palette while the avatar
          initial inside it (text-primary) followed the style. The two read as
          one element, so only one of them following the palette is the visible
          bug that was reported.
        */}
        <LinearGradient
          testID="profile-avatar-wash"
          colors={[accent(0.18), accent(0.2)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {hasAvatar ? (
          <Image
            source={{ uri: avatarUri }}
            style={{ width: 56, height: 56 }}
            accessibilityIgnoresInvertColors
          />
        ) : initial === null ? (
          // No letter to take, so the circle says *no photo yet* rather than
          // showing `getInitial`'s old `?` sentinel, which read as an error
          // (#1810). Asserted by testID, since the circle is `aria-hidden` —
          // ☠️ and the testID sits on the View because `MaterialIcons` drops it
          // before the host element, putting it out of `getByTestId`'s reach.
          <View testID="profile-avatar-person">
            <Icon name="person" size={28} className="text-primary" />
          </View>
        ) : (
          <Text className="text-2xl font-bold text-primary">{initial}</Text>
        )}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {name}
        </Text>
        {showEmail ? (
          <View className="mt-1 flex-row items-center gap-1.5">
            <Icon name="mail" size={13} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {email}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
