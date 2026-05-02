import { PolicyScreen } from "@/src/features/policies/policy-screen";
import { privacyPolicySections } from "@/src/features/policies/policy-content";

export default function PrivacyScreen() {
  return (
    <PolicyScreen
      notice="Replace pending organization and contact details before wider public launch. The policy also needs human/legal review because the app handles sensitive wellness content and may be available to minors."
      sections={privacyPolicySections}
      subtitle="How the MVP handles account, preference, reminder, and private CBT record data."
      title="Privacy policy"
    />
  );
}
