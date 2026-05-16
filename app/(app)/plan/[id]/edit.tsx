import { useLocalSearchParams } from "expo-router";

import { PlanItemFormScreen } from "@/src/features/plan/plan-item-form-screen";

export default function PlanEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanItemFormScreen mode="edit" itemId={id} />;
}
