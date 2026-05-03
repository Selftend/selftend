import { PolicyScreen } from "@/src/features/policies/policy-screen";
import { LEGAL_REVIEW_PENDING, privacyPolicySections } from "@/src/features/policies/policy-content";

export default function PrivacyScreen() {
  return (
    <PolicyScreen
      notice={LEGAL_REVIEW_PENDING ? "This policy requires final legal review before public launch. Organization name placeholder must be replaced with the confirmed legal entity." : undefined}
      sections={privacyPolicySections}
      subtitle="How Selftend handles your account, preference, and private CBT record data."
      title="Privacy policy"
    />
  );
}
