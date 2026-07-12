import { LinearGradient } from "expo-linear-gradient";
import { Image, View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

interface ProfileIdentityRowProps {
  /** `profile?.avatarUrl ?? googleAvatarUrl ?? undefined` — nullish, verbatim. */
  avatarUri: string | undefined;
  /** `Boolean(profile?.avatarUrl || googleAvatarUrl)` — truthy, verbatim. */
  hasAvatar: boolean;
  /** `profile?.displayName ?? user?.email ?? ""`. */
  name: string;
  /** `Boolean(profile?.displayName)` — gates the email sub-line. */
  showEmail: boolean;
  /** `user?.email ?? ""`. */
  email: string;
  /** First letter of the display name, uppercased. */
  initial: string;
}

/**
 * Identity row: gradient avatar + name/email. Extracted verbatim from
 * `ProfilePictureCard`. Pure props — all derivations happen in the card so the
 * `||` vs `??` semantics of the original are preserved exactly.
 */
export function ProfileIdentityRow({
  avatarUri,
  hasAvatar,
  name,
  showEmail,
  email,
  initial,
}: ProfileIdentityRowProps) {
  return (
    <View className="flex-row items-center gap-4 rounded-xl border border-border p-3">
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        className="h-14 w-14 items-center justify-center overflow-hidden rounded-full"
      >
        <LinearGradient
          colors={["hsla(262, 62%, 56%, 0.18)", "hsla(280, 48%, 60%, 0.20)"]}
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
