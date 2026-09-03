import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { countryName, searchCountries } from "@/src/features/auth/countries";
import { cn } from "@/lib/utils";

interface CountrySelectFieldProps {
  /** ISO 3166-1 alpha-2, or `""` while nothing is chosen. */
  value: string;
  /** Fires with a code on selection, and with `""` when the text is edited. */
  onChange: (code: string) => void;
}

/**
 * "Country of residence", as a type-to-find field rather than a list (#1764).
 *
 * There are 250 answers, which rules out a plain row of options and makes a
 * modal list the obvious alternative - and the obvious alternative is what this
 * deliberately is not. The app's `PickerSheet` centres a card inside its own
 * `ScrollView`, so a 250-row list inside one is a scroll view nested in a
 * scroll view: fine on web, a gesture fight on native. Typing three letters is
 * also simply faster than scrolling to Zimbabwe.
 *
 * **The text IS the query, and the selection is separate from it.** Choosing a
 * country writes its name into the field; editing that text clears the stored
 * code, because text that no longer names the selection must not leave a stale
 * code behind it. That is the one invariant here worth keeping: what the person
 * reads and what the gate will store never disagree.
 *
 * Search is ranked and short (`searchCountries`) - eight rows under a field,
 * not a scrollable list, so nothing here needs to scroll at all.
 */
export function CountrySelectField({ value, onChange }: CountrySelectFieldProps) {
  const { t, i18n } = useTranslation("auth");
  const selectedName = value ? countryName(value, i18n.language) : "";
  const [query, setQuery] = useState(selectedName);

  // Results stay hidden while the text still names the selection, so the list
  // does not sit there re-offering the country that was just chosen.
  const searching = query.trim().length > 0 && query !== selectedName;
  const results = useMemo(
    () => (searching ? searchCountries(i18n.language, query) : []),
    [searching, i18n.language, query],
  );

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (value) {
      onChange("");
    }
  };

  const handleSelect = (code: string) => {
    onChange(code);
    setQuery(countryName(code, i18n.language));
  };

  return (
    <View className="gap-2">
      <Label>{t("ageGate.countryLabel")}</Label>
      <View className="flex-row items-center gap-2">
        <Input
          accessibilityLabel={t("ageGate.countryLabel")}
          autoCapitalize="words"
          autoCorrect={false}
          className="flex-1"
          onChangeText={handleChangeText}
          placeholder={t("ageGate.countryUnset")}
          testID="age-gate-country"
          value={query}
        />
        {/* Confirmation that a code is actually held, not just that the field
            has text in it - the two can differ by one keystroke. */}
        {value ? (
          <Icon name="check" className="text-primary size-5" testID="age-gate-country-selected" />
        ) : null}
      </View>
      {searching && results.length === 0 ? (
        <Text className="text-muted-foreground text-sm">{t("countryPicker.empty")}</Text>
      ) : null}
      {results.length > 0 ? (
        <View className="border-border overflow-hidden rounded-md border">
          {results.map((country, index) => (
            <Pressable
              accessibilityRole="button"
              // The separator is indexed rather than `last:border-b-0`:
              // NativeWind does not implement the `last:` variant, so that
              // class compiles to nothing and the final row keeps a border
              // that doubles the container's own.
              className={cn(
                "active:bg-muted px-3 py-2",
                index < results.length - 1 && "border-border border-b",
              )}
              key={country.code}
              onPress={() => handleSelect(country.code)}
              testID={`age-gate-country-option-${country.code}`}
            >
              <Text className="text-sm">{country.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
