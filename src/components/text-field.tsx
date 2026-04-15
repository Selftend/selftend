import { TextInput } from "react-native";

import { classNames } from "@/src/utils/class-names";

interface TextFieldProps {
  autoCapitalize?: "characters" | "none" | "sentences" | "words";
  autoCorrect?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  multiline?: boolean;
  onBlur?: () => void;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value?: string;
}

export function TextField({
  autoCapitalize = "sentences",
  autoCorrect = true,
  keyboardType = "default",
  multiline = false,
  onBlur,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: TextFieldProps) {
  return (
    <TextInput
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      className={classNames(
        "rounded-2xl border border-black/10 bg-sand px-4 py-3 text-base text-ink",
        multiline && "min-h-28",
      )}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 5 : 1}
      onBlur={onBlur}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#6f7a74"
      secureTextEntry={secureTextEntry}
      style={{ textAlignVertical: multiline ? "top" : "center" }}
      value={value}
    />
  );
}
