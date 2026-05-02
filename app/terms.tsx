import { termsSections } from "@/src/features/policies/policy-content";
import { PolicyScreen } from "@/src/features/policies/policy-screen";

export default function TermsScreen() {
  return (
    <PolicyScreen
      notice="These terms capture the product boundaries for implementation. They still need final organization details and legal review before public launch."
      sections={termsSections}
      subtitle="Use boundaries for a free wellness and guided self-help product."
      title="Terms and boundaries"
    />
  );
}
