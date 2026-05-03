import { PolicyScreen } from "@/src/features/policies/policy-screen";
import { cookiePolicySections } from "@/src/features/policies/policy-content";

export default function CookiesScreen() {
  return (
    <PolicyScreen
      sections={cookiePolicySections}
      subtitle="How the web version of SelfTend uses browser storage."
      title="Cookie policy"
    />
  );
}
