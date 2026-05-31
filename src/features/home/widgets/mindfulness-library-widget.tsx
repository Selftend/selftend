import { mindfulnessExercises } from "@/src/constants/mindfulness";
import { LibraryWidget } from "@/src/features/home/widgets/library-widget";

export function MindfulnessLibraryWidget({ userId: _userId }: { userId: string }) {
  return (
    <LibraryWidget
      accentBgClass="bg-mist/10"
      accentTextClass="text-mist"
      i18nPrefix="home.widgets.mindfulnessLibrary"
      count={mindfulnessExercises.length}
      route="/tools/mindfulness"
    />
  );
}
