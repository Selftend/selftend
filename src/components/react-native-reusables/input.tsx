import { cn } from "@/lib/utils";
import { getTextFontStyle } from "@/src/components/react-native-reusables/text";
import { useScrollIntoViewOnFocus } from "@/src/lib/use-scroll-into-view-on-focus";
import { Platform, TextInput } from "react-native";

function Input({
  className,
  style,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  // Web-only: keep the focused input visible above the on-screen keyboard.
  const keepVisible = useScrollIntoViewOnFocus();

  return (
    <TextInput
      className={cn(
        "dark:bg-input/30 border-input bg-background text-foreground flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 shadow-sm shadow-black/5 sm:h-9",
        props.editable === false &&
          cn(
            "opacity-50",
            Platform.select({ web: "disabled:pointer-events-none disabled:cursor-not-allowed" }),
          ),
        Platform.select({
          web: cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          ),
          native: "placeholder:text-muted-foreground/50",
        }),
        className,
      )}
      style={[getTextFontStyle([className]), style]}
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

export { Input };
