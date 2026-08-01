import { Text, TextClassContext } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { View } from "react-native";

// A card is a surface, not an identity (#588).
//
// Three hue maps lived here. TINT_BG washed a default card in `bg-<hue>/0.06`
// with a `/0.30` border, SOFT_SHADOW gave the soft variant a hue-tinted drop
// shadow so cards "read as lifted room surfaces, not gray boxes", and SPINE_BG
// painted a 3px left rule in the full accent.
//
// All three are the ruling's case (#558): they said which module you were
// looking at, on a card whose heading already said it. The soft shadow was the
// clearest of the three - a violet-tinted shadow under a violet-tinted card
// inside a violet room, three statements of one fact.
//
// SPINE_BG went with no call sites at all. The `spine` prop had none left when
// this batch found it, so its nine-entry map was pure carrying cost.
type CardProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    /**
     * "default" is the bordered card every surface renders today. "soft" is the
     * borderless room card: larger radius, soft elevation. It used to take a
     * `tint` that coloured its shadow; the shadow is neutral now, so the two
     * variants differ in shape alone.
     */
    variant?: "default" | "soft";
  };

function Card({ className, variant = "default", children, ...props }: CardProps) {
  const soft = variant === "soft";
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "bg-card relative flex flex-col gap-6 overflow-hidden py-6",
          // Dark elevation comes from the surface color alone: drop shadows on
          // dark read as smudges against the near-black background (#488).
          soft
            ? "rounded-3xl shadow-lg shadow-black/10 dark:shadow-none"
            : "border-border rounded-xl border shadow-sm shadow-black/5 dark:shadow-none",
          className,
        )}
        {...props}
      >
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn("flex flex-col gap-1.5 px-6", className)} {...props} />;
}

function CardTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
  return (
    <Text
      ref={ref}
      role="heading"
      aria-level={3}
      className={cn("font-semibold leading-none", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
  return <Text className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn("px-6", className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle };
