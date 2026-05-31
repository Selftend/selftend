import { groundingTechniques } from "@/src/constants/grounding";
import { LibraryWidget } from "@/src/features/home/widgets/library-widget";

export function GroundingLibraryWidget({ userId: _userId }: { userId: string }) {
  return (
    <LibraryWidget
      accentBgClass="bg-clay/10"
      accentTextClass="text-clay"
      i18nPrefix="home.widgets.groundingLibrary"
      count={groundingTechniques.length}
      route="/tools/grounding"
    />
  );
}
