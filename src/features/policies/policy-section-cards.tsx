import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";

export interface PolicySection {
  title: string;
  body: string[];
}

interface PolicySectionCardsProps {
  /**
   * ☠️ A RESOLVED array, never an i18n key, and that is the whole point of the
   * seam. `/security` reads a different namespace - `useTranslation("security")`,
   * key `page.sections` - and folds into this component on #2146. A component
   * that took a key would have to know which namespace to read, which makes that
   * fold-in impossible without a second prop that only one caller ever sets.
   *
   * Callers resolve their own sections and hand over the array.
   */
  sections: PolicySection[];
}

/**
 * One card per policy section: the section title as a level-2 heading, then a
 * `CardDescription` per paragraph.
 *
 * Extracted from `info-screen.tsx` on #2144. ☠️ `aria-level={2}` is not
 * decoration - `CardTitle` defaults to **3** (`card.tsx`), so a copy of this
 * structure that omits the override ships an h1 → h3 outline. That is exactly
 * how `/security` drifted (#2133): two hand-maintained copies of one structure,
 * and nothing asserting the level on either. This component is the single copy
 * that ends that, and `policy-heading-outline.test.tsx` is the guard.
 *
 * `Array.isArray` is checked by the caller rather than here: `t(key, {
 * returnObjects: true })` can return a string when a key is missing, and the
 * caller is the one holding the key that might be wrong.
 */
export function PolicySectionCards({ sections }: PolicySectionCardsProps) {
  return (
    <>
      {sections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle aria-level={2}>{section.title}</CardTitle>
            {section.body.map((paragraph, pIndex) => (
              <CardDescription key={pIndex}>{paragraph}</CardDescription>
            ))}
          </CardHeader>
        </Card>
      ))}
    </>
  );
}
