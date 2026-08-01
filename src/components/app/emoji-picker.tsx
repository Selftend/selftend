import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { useRovingFocus } from "@/src/lib/roving-focus";

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
  const { t } = useTranslation("mood");
  const selectedIndex = EMOJIS.indexOf(value);
  const roving = useRovingFocus({
    count: EMOJIS.length,
    // No selection yet: treat the first tile as active so the group stays tab-reachable.
    activeIndex: selectedIndex < 0 ? 0 : selectedIndex,
    onActivate: (index) => onSelect(EMOJIS[index]),
  });

  return (
    <View
      accessibilityLabel={t("emotions.manage.emoji")}
      accessibilityRole="radiogroup"
      className="flex-row flex-wrap gap-1.5"
      role="radiogroup"
    >
      {EMOJIS.map((emoji, index) => {
        const selected = emoji === value;
        return (
          <Pressable
            key={emoji}
            accessibilityRole="radio"
            accessibilityLabel={emoji}
            aria-checked={selected}
            onPress={() => onSelect(emoji)}
            role="radio"
            className={cn(
              "size-11 items-center justify-center rounded-xl border",
              selected ? "border-border bg-muted" : "border-transparent active:bg-accent/50",
            )}
            {...roving.getItemProps(index, () => onSelect(emoji))}
          >
            <Text className="text-2xl leading-none">{emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
