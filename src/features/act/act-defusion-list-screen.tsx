/**
 * PROTOTYPE HARNESS (#1515) - this file is modified on the throwaway branch
 * `prototype/1515-act-history-shapes` only. On `dev` it is the today-only list.
 *
 * Flip shapes with `?variant=A|B|C` on `/modules/act/defusion`, or the floating
 * bar / arrow keys. Data fetching stays exactly where it was; only the rendered
 * subtree changes.
 */
import { View } from "react-native";

import { ScreenLoading } from "@/src/components/app/screen-state";
import {
  PrototypeVariantSwitcher,
  useVariant,
} from "@/src/components/app/prototype-variant-switcher";
import {
  VARIANT_NAMES,
  VariantA,
  VariantB,
  VariantC,
  useDefusionNav,
} from "@/src/features/act/prototype-defusion-history-variants";
import { useDefusionLogs } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";

const VARIANTS = ["A", "B", "C"];

export default function ActDefusionListScreen() {
  const { user } = useSession();
  const variant = useVariant(VARIANTS);
  const nav = useDefusionNav();
  // 50, not the shipped 30: three of the five ACT lists share a cache entry
  // across limits (#1516), and the prototype should not be the thing that
  // decides the ceiling. Cross-day reach is what makes the shapes legible.
  const { data: logs, isLoading } = useDefusionLogs(user?.id ?? null, 50);

  if (isLoading) return <ScreenLoading title="Defusion logs" />;

  const props = {
    logs: logs ?? [],
    onNew: nav.onNew,
    onOpen: nav.onOpen,
    onShowAll: "/modules/act/defusion/history" as const,
  };

  return (
    <View className="flex-1">
      {variant === "A" ? <VariantA {...props} /> : null}
      {variant === "B" ? <VariantB {...props} /> : null}
      {variant === "C" ? <VariantC {...props} /> : null}
      <PrototypeVariantSwitcher variants={VARIANTS} current={variant} names={VARIANT_NAMES} />
    </View>
  );
}
