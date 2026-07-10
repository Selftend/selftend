import { Link, type Href } from "expo-router";

import { Button, type ButtonProps } from "@/src/components/react-native-reusables/button";

type LinkButtonProps = Omit<ButtonProps, "role" | "accessibilityRole"> & {
  href: Href;
};

/**
 * A Button that navigates: expo-router's Link with asChild forwards the href
 * to the Button's Pressable, which react-native-web renders as a real <a> -
 * so nav actions get link semantics (middle-click, copy address, role="link")
 * while keeping Button styling. Use for navigation; keep plain Buttons for
 * actions.
 */
export function LinkButton({ href, ...props }: LinkButtonProps) {
  return (
    <Link href={href} asChild>
      <Button accessibilityRole="link" role="link" {...props} />
    </Link>
  );
}
