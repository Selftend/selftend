import { breathingPatterns } from "@/src/constants/breathing";
import { LibraryWidget } from "@/src/features/home/widgets/library-widget";

export function BreathingLibraryWidget({ userId: _userId }: { userId: string }) {
  return (
    <LibraryWidget
      accentBgClass="bg-aqua/10"
      accentTextClass="text-aqua"
      i18nPrefix="home.widgets.breathingLibrary"
      count={breathingPatterns.length}
      route="/tools/breathing"
    />
  );
}
