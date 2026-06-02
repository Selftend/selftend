import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";

// Curated set aimed at naming feelings - positive/neutral/negative faces plus a few symbols.
const EMOJIS = [
  "😊",
  "😀",
  "😁",
  "😄",
  "🙂",
  "😌",
  "😍",
  "🥰",
  "😎",
  "🤗",
  "😋",
  "🤩",
  "🥳",
  "😇",
  "🙃",
  "😆",
  "😐",
  "😶",
  "😑",
  "🙄",
  "😏",
  "😔",
  "😟",
  "🙁",
  "😣",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "😰",
  "😨",
  "😱",
  "😥",
  "😓",
  "🤯",
  "😳",
  "😴",
  "😪",
  "🤔",
  "🤨",
  "😬",
  "🫠",
  "🥱",
  "😵‍💫",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "💔",
  "✨",
  "🌟",
  "🔥",
  "🌈",
  "☀️",
  "🌙",
  "💪",
  "🙏",
  "👍",
  "🫶",
  "💭",
];

interface EmojiPickerProps {
  value: string;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ value, onSelect }: EmojiPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {EMOJIS.map((emoji) => {
        const selected = emoji === value;
        return (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={emoji}
            accessibilityState={{ selected }}
            onPress={() => onSelect(emoji)}
            className={cn(
              "size-11 items-center justify-center rounded-xl border",
              selected ? "border-be bg-be/10" : "border-transparent active:bg-accent/50",
            )}
          >
            <Text className="text-2xl leading-none">{emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
