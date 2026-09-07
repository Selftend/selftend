import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Disclosure } from "@/src/components/app/disclosure";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { Section } from "@/src/components/app/section";
import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import type { FaqEntrySlug } from "@/src/features/policies/faq-layout";
import { FAQ_ENTRY_INDEX, FAQ_LAYOUT } from "@/src/features/policies/faq-layout";
import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";
import type { PolicySection } from "@/src/features/policies/policy-section-cards";
import { PolicySectionCards } from "@/src/features/policies/policy-section-cards";
import { contactEmails } from "@/src/lib/env";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

/**
 * The eight questions that collapse, in page order. Everything else on the page
 * - the crisis answer, the four "Start here" cards and the parents' letter -
 * renders open and stays open, so this is also the exact set *Expand all* acts on.
 */
const COLLAPSIBLE: readonly FaqEntrySlug[] = FAQ_LAYOUT.groups.flatMap((group) => group.entries);

/**
 * `/faq` as its own screen (#2147), off `PolicyPageLayout` rather than `InfoScreen`.
 *
 * The page used to render fourteen flat cards, every answer open. Half the answer
 * text - the eight group answers, ordinary operational prose - now sits behind a
 * row the reader opens. ☠️ **What does NOT collapse is the point of the design:**
 * every one of the fourteen questions is on the page as text at all times, the
 * crisis callout and the crisis answer are never hidden, and the parents' letter
 * is never hidden. Nothing a person in distress needs is behind a tap.
 *
 * ☠️ **Open state is keyed by the entry's slug from `FAQ_LAYOUT`, never by an
 * array index.** An index key is correct exactly until the list is filtered or
 * reordered, at which point it silently re-points the open row at a different
 * answer - the latent bug in the drawing this page comes from, not adopted here.
 * Rows are closed on every arrival and nothing is persisted: a reader returning
 * to the page meets the same short page they met the first time.
 *
 * ⚠️ *Expand all* sits in its own row ABOVE the four groups rather than in a
 * `Section`'s `action` slot. That is forced, not chosen - the slot is per-section,
 * so a control inside any one group would govern that group alone, and the
 * requirement is one tap for all eight.
 *
 * ☠️ The crisis block is **two things, not one**: `CrisisSupportCallout` exactly
 * as the other four call sites ship it - standing safety furniture, no new strings
 * and no colour decisions here - and then entry 1, which answers *Can it help in a
 * crisis?* in the FAQ's own voice. `docs/app-store-review-information.md` and
 * `docs/child-safety-review.md` both cite that entry when they say the boundary is
 * stated to users, so it is a pinned always-open answer rather than a row.
 *
 * The heading outline, end to end: h1 page title → h3 callout title → h3 crisis
 * question → h2 *Start here* → h3 ×4 pinned questions → h2 ×4 group labels →
 * h3 ×8 group questions → h2 parents' letter → h3 ×5 of its sub-heads (#2149).
 * The callout's own level 3 is left alone: `/support` already ships this exact
 * h1 → h3 → h2 order, so `/faq` inherits its sibling's outline instead of
 * inventing one (#2137 owns the cross-screen question, on all five call sites
 * at once).
 */
export function FaqScreen() {
  const { t } = useTranslation("policies");
  const pushWithOrigin = usePushWithOrigin();
  const [openRows, setOpenRows] = useState<ReadonlySet<FaqEntrySlug>>(() => new Set());

  // ☠️ The addresses are SUPPLIED, as they are in `InfoScreen` (#2150). Entries 9
  // and 13 interpolate `{{supportEmail}}` / `{{privacyEmail}}` / `{{securityEmail}}`,
  // and an unsupplied variable in i18next renders as the raw `{{supportEmail}}` -
  // silently, on the one page whose job is telling a reader how to reach a human.
  const sections = t("faq.sections", {
    returnObjects: true,
    ...contactEmails(),
  }) as PolicySection[];

  // The guard stays with the caller, as it does in `InfoScreen` and `/security`:
  // `t(key, { returnObjects: true })` returns a STRING when the key is missing.
  const entries = Array.isArray(sections) ? sections : [];

  // The parents' letter's five sub-heads (#2149), positionally aligned with that
  // entry's five paragraphs. Same missing-key guard as the corpus above.
  const parentsSubheads = t("faq.parentsSubheads", { returnObjects: true }) as string[];
  const subheads = Array.isArray(parentsSubheads) ? parentsSubheads : [];
  const entryOf = (slug: FaqEntrySlug): PolicySection | undefined => entries[FAQ_ENTRY_INDEX[slug]];
  /*
    Resolve a run of slugs, dropping any the corpus does not carry. The drop is
    the degenerate case only: `faq-layout.test.ts` pins fourteen entries in BOTH
    locales against the fourteen slugs, so a short corpus is a red build rather
    than a quietly shorter page.
  */
  const entriesOf = (slugs: readonly FaqEntrySlug[]): PolicySection[] =>
    slugs.map(entryOf).filter((entry): entry is PolicySection => entry !== undefined);

  const allOpen = COLLAPSIBLE.every((slug) => openRows.has(slug));

  const toggleRow = (slug: FaqEntrySlug) => {
    setOpenRows((open) => {
      const next = new Set(open);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });
  };

  const toggleAll = () => setOpenRows(allOpen ? new Set() : new Set(COLLAPSIBLE));

  const letter = entryOf(FAQ_LAYOUT.letter);

  return (
    <PolicyPageLayout title={t("faq.pageTitle")} subtitle={t("faq.pageDescription")}>
      <CrisisSupportCallout />

      {/*
        The always-open answers render through the SAME card the six `InfoScreen`
        routes and `/security` use, at level 3 rather than 2 (#2144's seam, given
        a `level` on #2147). ☠️ Not a local copy of the card shape: two
        hand-maintained copies of one structure, with nothing asserting the level
        on either, is precisely how #2133 shipped `/security` at h1 → h3.
      */}
      <PolicySectionCards level={3} sections={entriesOf([FAQ_LAYOUT.crisis])} />

      <Section title={t("faq.startHere")} level={2}>
        <PolicySectionCards level={3} sections={entriesOf(FAQ_LAYOUT.pinned)} />
      </Section>

      <View className="flex-row justify-end">
        {/*
          A utility, not an action. `ghost` keeps it from reading as a second
          primary button a few hundred pixels under the crisis callout's.
        */}
        <Button onPress={toggleAll} size="sm" variant="ghost">
          <Text>{allOpen ? t("faq.collapseAll") : t("faq.expandAll")}</Text>
        </Button>
      </View>

      {/*
        ONE no-gap group, the shape `/support` uses for the same reason: each
        `Section` carries its own `py-6` and its own top hairline, so the column's
        `gap-6` would compound into a 72px band between them.

        ☠️ Rules run BETWEEN the blocks, never around them - one `border-t` per
        `Section`, no per-row rule inside a group and no closing rule under the
        last block. A list of questions with a rule above and below reads as a
        panel; the page is one column, not seven panels.
      */}
      <View>
        {FAQ_LAYOUT.groups.map((group) => (
          <Section key={group.key} title={t(`faq.groups.${group.key}`)} level={2}>
            {group.entries.map((slug) => (
              <FaqDisclosureRow
                key={slug}
                entry={entryOf(slug)}
                expanded={openRows.has(slug)}
                onToggle={() => toggleRow(slug)}
                slug={slug}
              />
            ))}
          </Section>
        ))}

        {letter ? (
          <Section>
            {/*
              `/support`'s block heading, not the kit's 24px h2 (#1780/#2123): a
              19px title names a block a reader stops at, and this one introduces
              a letter rather than a question. The `gap-1` wrapper is that block's
              shape - it holds a sub-description on `/support`, and here the
              letter supplies none, so it holds the heading alone.

              ☠️ Hand-styled deliberately, and only because it is NOT a `Text`
              variant: `h1`/`h2` route to the display face, so `variant="h2"` here
              would render Nunito ExtraBold at 30px and take over the page.
            */}
            <View className="gap-1">
              <Text
                role="heading"
                aria-level={2}
                className="text-[19px] font-semibold tracking-tight text-foreground"
              >
                {letter.title}
              </Text>
            </View>
            <FaqLetterBody body={letter.body} subheads={subheads} />
          </Section>
        ) : null}
      </View>

      <View className="gap-2">
        <Text variant="muted">{t("faq.stillNotAnswered")}</Text>
        {/*
          ☠️ A plain `Button`, never `ShowAllLink`: that component's copy is fixed
          to a nine-noun door vocabulary `test/show-all-door-copy.test.ts` watches,
          and *Send a message* is not a door to a list.

          ☠️ No reply-time promise here. What to expect after writing is entry 13's
          answer and belongs in exactly one place.
        */}
        <Button onPress={() => pushWithOrigin("/support")} variant="secondary">
          <Text>{t("faq.sendMessage")}</Text>
        </Button>
      </View>
    </PolicyPageLayout>
  );
}

/** One collapsible group question. */
function FaqDisclosureRow({
  entry,
  expanded,
  onToggle,
  slug,
}: {
  entry: PolicySection | undefined;
  expanded: boolean;
  onToggle: () => void;
  slug: FaqEntrySlug;
}) {
  if (!entry) return null;

  return (
    <Disclosure
      expanded={expanded}
      headingLevel={3}
      id={`faq-${slug}`}
      label={entry.title}
      layout="row"
      onToggle={onToggle}
    >
      <FaqAnswerBody body={entry.body} />
    </Disclosure>
  );
}

/**
 * The parents' letter, as five labelled passages rather than five paragraphs (#2149).
 *
 * ☠️ **The sub-heads are not decoration — they are the labelling this entry used
 * to carry inline.** Two of its paragraphs opened `On data: ` / `On design: `,
 * which is why stripping those prefixes and rendering these headings had to be
 * one commit: either half alone leaves the longest single entry on the page -
 * and the one a guardian arrives specifically to read - *less* signposted than
 * it shipped.
 *
 * The zip is positional, and `parentsSubheads` is an array for exactly that
 * reason — `faq-layout.test.ts` asserts the two lengths are equal in **both**
 * locales, so neither a headless paragraph nor a bodiless sub-head can render.
 * Guarding the index here too is the belt to that braces: a locale that somehow
 * arrived short degrades to today's unlabelled paragraph rather than printing
 * `undefined` into a page about how to reach us.
 *
 * Level 3 under the letter's 19px h2, and quiet: same `text-sm` as the body it
 * introduces, separated by weight and by taking the foreground colour rather
 * than by size. A larger sub-head would out-shout the block heading above it.
 */
function FaqLetterBody({ body, subheads }: { body: string[]; subheads: string[] }) {
  return (
    <View className="gap-4">
      {body.map((paragraph, index) => (
        <View key={index} className="gap-1">
          {subheads[index] ? (
            <Text role="heading" aria-level={3} className="text-sm font-semibold text-foreground">
              {subheads[index]}
            </Text>
          ) : null}
          <Text variant="muted">{paragraph}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Answer paragraphs. `variant="muted"` is `text-muted-foreground text-sm` - the
 * same two classes `CardDescription` applies, so an answer reads identically
 * whether it arrived in a card or out of a row.
 */
function FaqAnswerBody({ body }: { body: string[] }) {
  return (
    <View className="gap-3">
      {body.map((paragraph, index) => (
        <Text key={index} variant="muted">
          {paragraph}
        </Text>
      ))}
    </View>
  );
}
