import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { isAppleSignInAvailable } from "@/src/features/auth/api";
import { useColorSchemeName } from "@/src/lib/color-scheme";

interface AppleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Sign in with Apple, required by App Store Guideline 4.8 because the app
 * offers Google Sign-In (see the decision on #540).
 *
 * Uses Apple's own `AppleAuthenticationButton` rather than a styled Button from
 * the design system. That is not a stylistic choice: Apple's Human Interface
 * Guidelines prescribe the button's appearance, and a hand-rolled lookalike is
 * a known review-rejection risk. It is the one control in the app that
 * deliberately does not match the rest.
 *
 * Renders nothing where the capability is absent - the module is iOS-only, and
 * availability is asked of the OS rather than assumed from the platform.
 */
export function AppleSignInButton({ onPress, disabled }: AppleSignInButtonProps) {
  const { t } = useTranslation("auth");
  const isDark = useColorSchemeName() === "dark";
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let active = true;

    // Only ever flips false -> true. Writing `false` over `false` would be a
    // redundant state update on every mount of every screen that renders this,
    // which shows up as an act() warning in each consumer's tests - noise that
    // has nothing to do with what those tests assert.
    void isAppleSignInAvailable().then((available) => {
      if (active && available) {
        setIsAvailable(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!isAvailable) {
    return null;
  }

  return (
    <View className="gap-2">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          isDark
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={8}
        style={{ height: 44, width: "100%" }}
        onPress={disabled ? () => {} : onPress}
      />
      {/*
        The hint that prevents the failure mode in #540: Apple offers Hide My
        Email, which issues a relay address matching no existing account, so a
        returning user who hides it lands in an empty duplicate. Deliberately a
        quiet hint rather than a warning - nothing alarming, since most people
        seeing it are signing up for the first time and have nothing to lose.
      */}
      <Text variant="muted" className="text-xs">
        {t("apple.shareEmailHint")}
      </Text>
    </View>
  );
}
