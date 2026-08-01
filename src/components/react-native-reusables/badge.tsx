import { TextClassContext } from "@/src/components/react-native-reusables/text";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { cn } from "@/lib/utils";
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
          // dark:bg-destructive/60 mirrors the Button's destructive variant: the raised
          // dark --destructive fails white-text contrast as a solid fill (3.35:1) but
          // passes composited at 60% over the dark background.
          "bg-destructive dark:bg-destructive/60 border-transparent",
          Platform.select({ web: "[a&]:hover:bg-destructive/90" }),
        ),
        outline: Platform.select({ web: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground" }),
      },
    },
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
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    asChild?: boolean;
    icon?: MaterialIconName;
  } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, icon, asChild, children, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props}>
        {/* The glyph inherits the badge's own text class through the provider
            above, which is what every non-tint variant already did. The old
            `tint` variant had to override it: its label took `text-<hue>-ink`
            while its glyph kept the published accent, because inking a mark
            reads as disabled (#421). With no hue on either, there are no longer
            two colours to keep apart. */}
        {icon ? <Icon name={icon} size={14} /> : null}
        {children}
      </Component>
    </TextClassContext.Provider>
  );
}

export { Badge };
