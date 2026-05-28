import { Text, TextClassContext } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import type { TintToken } from "@/src/lib/design-tokens";
import { View } from "react-native";

const TINT_BG: Record<TintToken, string> = {
  primary: "bg-primary/[0.06] border-primary/30",
  act: "bg-[hsl(var(--act)/0.06)] border-[hsl(var(--act)/0.30)]",
  be: "bg-[hsl(var(--be)/0.06)] border-[hsl(var(--be)/0.30)]",
  think: "bg-[hsl(var(--think)/0.06)] border-[hsl(var(--think)/0.30)]",
  aqua: "bg-[hsl(var(--aqua)/0.06)] border-[hsl(var(--aqua)/0.30)]",
  iris: "bg-[hsl(var(--iris)/0.06)] border-[hsl(var(--iris)/0.30)]",
  ink: "bg-[hsl(var(--ink)/0.06)] border-[hsl(var(--ink)/0.30)]",
  clay: "bg-[hsl(var(--clay)/0.06)] border-[hsl(var(--clay)/0.30)]",
  mist: "bg-[hsl(var(--mist)/0.06)] border-[hsl(var(--mist)/0.30)]",
};

const SPINE_BG: Record<TintToken, string> = {
  primary: "bg-primary",
  act: "bg-[hsl(var(--act))]",
  be: "bg-[hsl(var(--be))]",
  think: "bg-[hsl(var(--think))]",
  aqua: "bg-[hsl(var(--aqua))]",
  iris: "bg-[hsl(var(--iris))]",
  ink: "bg-[hsl(var(--ink))]",
  clay: "bg-[hsl(var(--clay))]",
  mist: "bg-[hsl(var(--mist))]",
};

type CardProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    spine?: TintToken;
    tint?: TintToken;
  };

function Card({ className, spine, tint, children, ...props }: CardProps) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "bg-card border-border relative flex flex-col gap-6 overflow-hidden rounded-xl border py-6 shadow-sm shadow-black/5",
          tint && TINT_BG[tint],
          className,
        )}
        {...props}
      >
        {spine ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            className={cn("absolute left-0 top-0 bottom-0 w-[3px]", SPINE_BG[spine])}
          />
        ) : null}
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

function CardFooter({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn("flex flex-row items-center px-6", className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
