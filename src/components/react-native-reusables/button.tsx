import { TextClassContext } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import type { TintToken } from "@/src/lib/design-tokens";
import { cva, type VariantProps } from "class-variance-authority";
import { Platform, Pressable } from "react-native";

const buttonVariants = cva(
  cn(
    "group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none",
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary active:bg-primary/90 shadow-sm shadow-black/5",
          Platform.select({ web: "hover:bg-primary/90" }),
        ),
        destructive: cn(
          "bg-destructive active:bg-destructive/90 dark:bg-destructive/60 shadow-sm shadow-black/5",
          Platform.select({
            web: "hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          }),
        ),
        outline: cn(
          "border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border shadow-sm shadow-black/5",
          Platform.select({
            web: "hover:bg-accent dark:hover:bg-input/50",
          }),
        ),
        secondary: cn(
          "bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5",
          Platform.select({ web: "hover:bg-secondary/80" }),
        ),
        ghost: cn(
          "active:bg-accent dark:active:bg-accent/50",
          Platform.select({ web: "hover:bg-accent dark:hover:bg-accent/50" }),
        ),
        link: "",
        tinted: "border",
      },
      size: {
        default: cn("h-10 px-4 py-2 sm:h-9", Platform.select({ web: "has-[>svg]:px-3" })),
        sm: cn("h-9 gap-1.5 rounded-md px-3 sm:h-8", Platform.select({ web: "has-[>svg]:px-2.5" })),
        lg: cn("h-11 rounded-md px-6 sm:h-10", Platform.select({ web: "has-[>svg]:px-4" })),
        icon: "h-10 w-10 sm:h-9 sm:w-9",
      },
      tint: {
        primary: "",
        act: "",
        be: "",
        think: "",
        aqua: "",
        iris: "",
        ink: "",
        clay: "",
        mist: "",
      },
    },
    compoundVariants: [
      { variant: "tinted", tint: "primary", className: "bg-primary/[0.08] border-primary/30" },
      {
        variant: "tinted",
        tint: "act",
        className: "bg-[hsl(var(--act)/0.08)] border-[hsl(var(--act)/0.30)]",
      },
      {
        variant: "tinted",
        tint: "be",
        className: "bg-[hsl(var(--be)/0.08)] border-[hsl(var(--be)/0.30)]",
      },
      {
        variant: "tinted",
        tint: "think",
        className: "bg-[hsl(var(--think)/0.08)] border-[hsl(var(--think)/0.30)]",
      },
      {
        variant: "tinted",
        tint: "aqua",
        className: "bg-[hsl(var(--aqua)/0.08)] border-[hsl(var(--aqua)/0.30)]",
      },
      {
        variant: "tinted",
        tint: "iris",
        className: "bg-[hsl(var(--iris)/0.08)] border-[hsl(var(--iris)/0.30)]",
      },
      {
        variant: "tinted",
        tint: "ink",
        className: "bg-[hsl(var(--ink)/0.08)] border-[hsl(var(--ink)/0.30)]",
      },
      {
        variant: "tinted",
        tint: "clay",
        className: "bg-[hsl(var(--clay)/0.08)] border-[hsl(var(--clay)/0.30)]",
      },
      {
        variant: "tinted",
        tint: "mist",
        className: "bg-[hsl(var(--mist)/0.08)] border-[hsl(var(--mist)/0.30)]",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const buttonTextVariants = cva(
  cn(
    "text-foreground text-sm font-medium",
    Platform.select({ web: "pointer-events-none transition-colors" }),
  ),
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-white",
        outline: cn(
          "group-active:text-accent-foreground",
          Platform.select({ web: "group-hover:text-accent-foreground" }),
        ),
        secondary: "text-secondary-foreground",
        ghost: "group-active:text-accent-foreground",
        link: cn(
          "text-primary group-active:underline",
          Platform.select({ web: "underline-offset-4 hover:underline group-hover:underline" }),
        ),
        tinted: "",
      },
      size: {
        default: "",
        sm: "",
        lg: "",
        icon: "",
      },
      tint: {
        primary: "",
        act: "",
        be: "",
        think: "",
        aqua: "",
        iris: "",
        ink: "",
        clay: "",
        mist: "",
      },
    },
    compoundVariants: [
      { variant: "tinted", tint: "primary", className: "text-primary" },
      { variant: "tinted", tint: "act", className: "text-[hsl(var(--act))]" },
      { variant: "tinted", tint: "be", className: "text-[hsl(var(--be))]" },
      { variant: "tinted", tint: "think", className: "text-[hsl(var(--think))]" },
      { variant: "tinted", tint: "aqua", className: "text-[hsl(var(--aqua))]" },
      { variant: "tinted", tint: "iris", className: "text-[hsl(var(--iris))]" },
      { variant: "tinted", tint: "ink", className: "text-[hsl(var(--ink))]" },
      { variant: "tinted", tint: "clay", className: "text-[hsl(var(--clay))]" },
      { variant: "tinted", tint: "mist", className: "text-[hsl(var(--mist))]" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    tint?: TintToken;
  };

function Button({
  accessibilityRole = "button",
  accessibilityState,
  className,
  hitSlop = DEFAULT_INTERACTIVE_HIT_SLOP,
  role = "button",
  variant,
  size,
  tint,
  ...props
}: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size, tint })}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityState={{
          disabled: props.disabled ?? undefined,
          ...accessibilityState,
        }}
        className={cn(
          props.disabled && "opacity-50",
          buttonVariants({ variant, size, tint }),
          className,
        )}
        hitSlop={hitSlop}
        role={role}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button };
export type { ButtonProps };
