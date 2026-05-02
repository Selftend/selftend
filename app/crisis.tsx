import { crisisActions, crisisSections } from "@/src/features/policies/policy-content";
import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function CrisisScreen() {
  return (
    <PolicyScreen
      actions={crisisActions}
      notice="Crisis guidance must stay separate from self-help tools. Review jurisdiction-specific resources before public launch."
      sections={crisisSections}
      subtitle="This app is not emergency support and is not monitored by crisis responders."
      title="Crisis guidance"
    />
  );
}
