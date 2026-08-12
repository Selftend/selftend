import { cn } from "@/lib/utils";
import { useScrollIntoViewOnFocus } from "@/src/lib/use-scroll-into-view-on-focus";
import { useState } from "react";
import { Platform, TextInput } from "react-native";

// Auto-grow band, shared across platforms: the field starts at min-h-16 (64px)
// and grows with the text up to max-h-52 (208px ≈ 8 lines of text-base copy at
// 24px line-height plus py-2 and the hairline border), then scrolls internally.
// Web grows via CSS `field-sizing: content`; native via onContentSizeChange,
// because react-native-web measures scrollHeight of the live node, which never
// shrinks below a JS-set height — CSS is the only web mechanism that shrinks.
const MIN_HEIGHT = 64;
const MAX_HEIGHT = 208;
// py-2 (16px) + 1px border top and bottom: native contentSize reports the text
// box alone, so the chrome is added back before clamping.
const VERTICAL_CHROME = 18;

function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2 }), // Fallback floor for web engines without field-sizing; on Android a consumer's value still sets the pre-measure height.
  placeholderClassName,
  onFocus,
  onBlur,
  onContentSizeChange,
  style,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  // Keep the focused textarea visible above the on-screen keyboard (web via
  // scrollIntoView; native via the enclosing KeyboardAwareScrollView).
  const keepVisible = useScrollIntoViewOnFocus();
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  return (
    <TextInput
      className={cn(
        "text-foreground border-input dark:bg-input/30 flex max-h-52 min-h-16 w-full flex-row rounded-md border bg-transparent px-3 py-2 text-base shadow-sm shadow-black/5 md:text-sm",
        Platform.select({
          web: "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive [field-sizing:content] resize-y supports-[field-sizing:content]:resize-none outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed",
        }),
        props.editable === false && "opacity-50",
        className,
      )}
      style={[
        Platform.OS !== "web" && contentHeight != null
          ? {
              height: Math.min(Math.max(contentHeight + VERTICAL_CHROME, MIN_HEIGHT), MAX_HEIGHT),
            }
          : null,
        style,
      ]}
      placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      onContentSizeChange={(event) => {
        if (Platform.OS !== "web") {
          setContentHeight(event.nativeEvent.contentSize.height);
        }
        onContentSizeChange?.(event);
      }}
      onFocus={(event) => {
        keepVisible.onFocus(event);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        keepVisible.onBlur();
        onBlur?.(event);
      }}
      {...props}
    />
  );
}

export { Textarea };
