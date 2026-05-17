import { Image, type ImageSourcePropType } from "react-native";

interface OnboardingIllustrationProps {
  accessibilityLabel: string;
  height?: number;
  source: ImageSourcePropType;
  width?: number;
}

export function OnboardingIllustration({
  accessibilityLabel,
  height = 210,
  source,
  width = 240,
}: OnboardingIllustrationProps) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      source={source}
      style={{ alignSelf: "center", height, width }}
    />
  );
}
