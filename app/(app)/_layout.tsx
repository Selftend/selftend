import ProtectedLayout from "@/src/components/app/protected-layout";
import { SiteDocumentTitle } from "@/src/components/app/site-document-title";

/**
 * The gated tree. `SiteDocumentTitle` gives every signed-in web screen the
 * site name as its document title until the screens carry their own
 * (`docs/indexability.md` § 11, #2294); the layout itself is unchanged.
 */
export default function AppLayout() {
  return (
    <>
      <SiteDocumentTitle />
      <ProtectedLayout />
    </>
  );
}
