import { TextClassContext } from "@/src/components/react-native-reusables/text";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { cn } from "@/lib/utils";
import type { TintToken } from "@/src/lib/design-tokens";
import { Slot } from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Platform, View } from "react-native";

const badgeVariants = cva(
  cn(
    "border-border group shrink-0 flex-row items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5",
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary border-transparent",
          Platform.select({ web: "[a&]:hover:bg-primary/90" }),
        ),
        secondary: cn(
          "bg-secondary border-transparent",
          Platform.select({ web: "[a&]:hover:bg-secondary/90" }),
        ),
        destructive: cn(
          "bg-destructive border-transparent",
          Platform.select({ web: "[a&]:hover:bg-destructive/90" }),
        ),
        outline: Platform.select({ web: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground" }),
        tint: "border-transparent",
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
      { variant: "tint", tint: "primary", className: "bg-primary/10" },
      { variant: "tint", tint: "act", className: "bg-[hsl(var(--act)/0.10)]" },
      { variant: "tint", tint: "be", className: "bg-[hsl(var(--be)/0.10)]" },
      { variant: "tint", tint: "think", className: "bg-[hsl(var(--think)/0.10)]" },
      { variant: "tint", tint: "aqua", className: "bg-[hsl(var(--aqua)/0.10)]" },
      { variant: "tint", tint: "iris", className: "bg-[hsl(var(--iris)/0.10)]" },
      { variant: "tint", tint: "ink", className: "bg-[hsl(var(--ink)/0.10)]" },
      { variant: "tint", tint: "clay", className: "bg-[hsl(var(--clay)/0.10)]" },
      { variant: "tint", tint: "mist", className: "bg-[hsl(var(--mist)/0.10)]" },
    ],
    defaultVariants: {
      variant: "default",
    },
  },
);

const badgeTextVariants = cva("text-xs font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-white",
      outline: "text-foreground",
      tint: "",
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
    { variant: "tint", tint: "primary", className: "text-primary" },
    { variant: "tint", tint: "act", className: "text-[hsl(var(--act))]" },
    { variant: "tint", tint: "be", className: "text-[hsl(var(--be))]" },
    { variant: "tint", tint: "think", className: "text-[hsl(var(--think))]" },
    { variant: "tint", tint: "aqua", className: "text-[hsl(var(--aqua))]" },
    { variant: "tint", tint: "iris", className: "text-[hsl(var(--iris))]" },
    { variant: "tint", tint: "ink", className: "text-[hsl(var(--ink))]" },
    { variant: "tint", tint: "clay", className: "text-[hsl(var(--clay))]" },
    { variant: "tint", tint: "mist", className: "text-[hsl(var(--mist))]" },
  ],
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    asChild?: boolean;
    tint?: TintToken;
    icon?: MaterialIconName;
  } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, tint, icon, asChild, children, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant, tint })}>
      <Component className={cn(badgeVariants({ variant, tint }), className)} {...props}>
        {icon ? <Icon name={icon} size={14} /> : null}
        {children}
      </Component>
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
