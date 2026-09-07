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
   * key `page.sections` - and folded into this component on #2146. A component
   * that took a key would have to know which namespace to read, which would have
   * made that fold-in impossible without a second prop only one caller ever sets.
   *
   * Callers resolve their own sections and hand over the array.
   */
  sections: PolicySection[];
  /**
   * Heading level for the card titles. Defaults to 2.
   *
   * The default is what leaves the six `InfoScreen` routes and `/security`
   * untouched by this prop existing - it is the level they already render, and
   * the one `policy-heading-outline.test.tsx` guards. `/faq` passes 3 because its
   * pinned answers sit under a level-2 `Section` eyebrow (#2147), and a level-2
   * card under a level-2 label is an outline running sideways rather than down.
   *
   * ☠️ It exists so `/faq` reuses this card rather than hand-rolling a second
   * copy of the same `Card` / `CardHeader` / `CardTitle` / `CardDescription`
   * shape. Two hand-maintained copies of one structure, with nothing asserting
   * the level on either, is exactly how #2133 shipped `/security` at h1 → h3.
   *
   * Typed as the six real heading levels rather than `number`: the default is a
   * default PARAMETER, so `level={0}` would survive it and reach the tree as an
   * invalid `aria-level`. Same narrowing as `Section` (#2142) and `Disclosure`
   * (#2143).
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * One card per policy section: the section title as a level-2 heading, then a
 * `CardDescription` per paragraph.
 *
 * Extracted from `info-screen.tsx` on #2144. ☠️ The level is not decoration -
 * `CardTitle` defaults to **3** (`card.tsx`), so a copy of this structure that
 * omits the override ships an h1 → h3 outline. That is exactly how `/security`
 * drifted (#2133): two hand-maintained copies of one structure, and nothing
 * asserting the level on either. This component is the single copy that ends
 * that, and `policy-heading-outline.test.tsx` is the guard.
 *
 * Which is why `/faq`'s pinned answers render through it too (#2147) at
 * `level={3}`, rather than hand-rolling the same card a third time.
 *
 * `Array.isArray` is checked by the caller rather than here: `t(key, {
 * returnObjects: true })` can return a string when a key is missing, and the
 * caller is the one holding the key that might be wrong.
 */
export function PolicySectionCards({ sections, level = 2 }: PolicySectionCardsProps) {
  return (
    <>
      {sections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle aria-level={level}>{section.title}</CardTitle>
            {section.body.map((paragraph, pIndex) => (
              <CardDescription key={pIndex}>{paragraph}</CardDescription>
            ))}
          </CardHeader>
        </Card>
      ))}
    </>
  );
}
