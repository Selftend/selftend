import { View } from "react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";

interface NumberRatingProps {
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number | null;
}

export function NumberRating({ max = 10, min = 1, onChange, value }: NumberRatingProps) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View className="flex-row flex-wrap gap-2">
      {numbers.map((n) => (
        <Button
          key={n}
          onPress={() => onChange(n)}
          size="sm"
          variant={value === n ? "default" : "outline"}
          className="w-10"
        >
          <Text>{String(n)}</Text>
        </Button>
      ))}
    </View>
  );
}
