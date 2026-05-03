import { LEGAL_REVIEW_PENDING, termsSections } from "@/src/features/policies/policy-content";
import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function TermsScreen() {
  return (
    <PolicyScreen
      notice={LEGAL_REVIEW_PENDING ? "These terms require final legal review before public launch." : undefined}
      sections={termsSections}
      subtitle="Terms of service for SelfTend, a free wellness and guided self-help product."
      title="Terms of service"
    />
  );
}
