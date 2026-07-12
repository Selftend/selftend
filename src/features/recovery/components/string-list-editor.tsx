import { View } from "react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";

interface StringListEditorProps {
  label: string;
  hint: string;
  fieldName: string;
  items: string[];
  onUpdate: (index: number, value: string) => void;
  onAppend: () => void;
  onRemove: (index: number) => void;
  addLabel: string;
  removeLabel: string;
  placeholder: string;
}

/** A labeled add/remove editor for a list of free-text strings (min one row). */
export function StringListEditor({
  label,
  hint,
  fieldName,
  items,
  onUpdate,
  onAppend,
  onRemove,
  addLabel,
  removeLabel,
  placeholder,
}: StringListEditorProps) {
  return (
    <View className="gap-3">
      <Label>{label}</Label>
      <Text variant="muted">{hint}</Text>
      {items.map((value, index) => (
        <View key={`${fieldName}-${index}`} className="flex-row items-start gap-2">
          <View className="flex-1">
            <Input
              accessibilityLabel={`${label} ${index + 1}`}
              onChangeText={(text) => onUpdate(index, text)}
              placeholder={placeholder}
              value={value}
            />
          </View>
          {items.length > 1 ? (
            <Button onPress={() => onRemove(index)} size="sm" variant="ghost">
              <Text>{removeLabel}</Text>
            </Button>
          ) : null}
        </View>
      ))}
      <Button onPress={() => onAppend()} size="sm" variant="outline">
        <Text>{addLabel}</Text>
      </Button>
    </View>
  );
}
