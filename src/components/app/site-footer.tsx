import type { Href } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { cn } from "@/lib/utils";

/** Which of the footer's slots a public route is listed in. */
type FooterRow = "crisis" | "explainers" | "policies";

interface SiteFooterLink {
  href: Href;
  /**
   * The i18n key of the destination page's H1 - the anchor-text rule
   * (docs/brand-result.md § 7.3): a link to a public page is labelled with the
   * same string its `<title>` and `<h1>` already carry, so no copy is written
   * for the footer and a new page arrives with its label already in both
   * locales. The one exemption is the crisis row, which keeps its imperative:
   * an affordance, not a table of contents.
   */
  label: string;
  row: FooterRow;
}

/**
 * Every public route except `/`, in the footer's order, each with the key its
 * link is labelled by. **This is the index list minus the root** -
 * `scripts/lib/index-list.js` - and `site-footer.test.tsx` asserts exactly
 * that, as ordered arrays (§ 7.6, the fourth pin on the list): a route added
 * to the index fails there until it is added here, so a public route cannot
 * ship orphaned, and a route listed here that the index does not carry fails
 * the same way.
 *
 * `/` is not listed because the header's brand mark links it on every page -
 * and that brand mark is also the explainer pages' only route into the app
 * (§ 7.2): a second entry beside it would be a call to action wearing a footer.
 *
 * The rows: the crisis row first (it IS the site's link to `/crisis`; the nav
 * list omits it), then the explainers (`/meditation` since #2469; `/habits`
 * arrives on #2470, and the three module explainers land with their modules'
 * return), then the policies. No headings over the rows: the order carries the
 * grouping, and a heading would be copy the list does not need.
 *
 * ☠️ `/meditation` is labelled `meditation:module.home.title` ("Meditation"),
 * NOT the learn screen's `module.learn.title` ("Learn the framework"). The
 * anchor-text rule takes the destination's H1, and that page's H1 is the
 * module's name precisely because an instruction would name no topic here, on
 * every public page (docs/brand-result.md § 3.2's one named exception).
 */
export const SITE_FOOTER_LINKS: readonly SiteFooterLink[] = [
  { href: "/crisis", label: "common:safety.openCrisis", row: "crisis" },
  { href: "/meditation", label: "meditation:module.home.title", row: "explainers" },
  { href: "/faq", label: "policies:faq.pageTitle", row: "policies" },
  { href: "/privacy", label: "policies:privacy.pageTitle", row: "policies" },
  { href: "/terms", label: "policies:terms.pageTitle", row: "policies" },
  { href: "/cookies", label: "policies:cookies.pageTitle", row: "policies" },
  { href: "/security", label: "security:page.pageTitle", row: "policies" },
  { href: "/account-deletion", label: "policies:accountDeletion.pageTitle", row: "policies" },
];

interface SiteFooterProps {
  className?: string;
}

/** One footer entry: a real anchor, labelled with its destination's H1 key. */
function FooterLink({ link }: { link: SiteFooterLink }) {
  // Every namespace the map above labels a row from, declared rather than
  // relied on: the footer's labels are keys belonging to other features, so an
  // explainer page arriving with its own namespace (#2470 and the module pages
  // after it) adds one entry here beside its row.
  const { t } = useTranslation(["common", "meditation", "policies", "security"]);

  return (
    <LinkButton href={link.href} variant="link" size="sm">
      <Text className="text-xs">{t(link.label)}</Text>
    </LinkButton>
  );
}

/**
 * The one footer every public page carries (#2467, docs/brand-result.md § 7).
 *
 * Rendered by `PolicyPageLayout` for every non-landing public route and by the
 * landing in place of the footer it used to own - one footer, so it lists the
 * same pages everywhere (two footers is how they drift). It carries, in order:
 * the safety description, the crisis row, the nav list, the social links.
 *
 * **The framing is navigability for a person**, not structure for a crawler.
 * Every public page is a page someone reaches with no session - from a store
 * listing, a Reddit thread, a shared link - and before this, six of the seven
 * non-landing pages gave that reader exactly one way out, the brand mark, while
 * `/security` and `/account-deletion` were reachable from nothing at all. The
 * test recorded beside the decision (#2411): no link in this set exists that a
 * signed-out reader on that page would not want.
 *
 * ☠️ **Every entry is a real anchor.** `LinkButton` goes through expo-router's
 * `Link asChild`, so react-native-web renders an `<a href>` - a crawler, a
 * middle-click, "copy link" and a screen reader all agree it is a link. A
 * `Pressable` with an `onPress` is not an edge in the link graph however it
 * behaves for a mouse, and that is exactly why the prototype's exported HTML
 * held no link to `/crisis` from any policy page.
 *
 * On web the outer `View` is a `<footer>` and the nav list a `<nav>` -
 * react-native-web maps `role="contentinfo"` and `role="navigation"` to those
 * elements - because that is what they are, for a screen reader's landmark
 * list. Nothing else on any page changes its element.
 *
 * Deliberately the quietest thing on the page (kept from the landing footer it
 * replaces): a hairline top border sets it off as closing material rather than
 * another pitch, and the tight gap keeps it from competing with the content
 * above. Link buttons wrap so a row never forces horizontal scroll.
 *
 * ☠️ The social rows take `header.joinReddit` and `header.watchYoutube`, NOT
 * the `header.openReddit` / `header.openYoutube` that also exist: those are the
 * accessible names of icon-only buttons in the nav panel and are phrased as
 * instructions. Visible text in a row of short labels needs the short form.
 */
export function SiteFooter({ className }: SiteFooterProps) {
  const { t } = useTranslation(["common", "navigation"]);

  const crisisRow = SITE_FOOTER_LINKS.filter((link) => link.row === "crisis");
  const explainers = SITE_FOOTER_LINKS.filter((link) => link.row === "explainers");
  const policies = SITE_FOOTER_LINKS.filter((link) => link.row === "policies");

  return (
    <View
      role="contentinfo"
      className={cn("items-center gap-3 border-t border-border pt-8", className)}
    >
      <Text className="max-w-xl text-center text-xs leading-[1.55] text-muted-foreground">
        {t("common:safety.description")}
      </Text>
      <View className="flex-row flex-wrap items-center justify-center">
        {crisisRow.map((link) => (
          <FooterLink key={String(link.href)} link={link} />
        ))}
      </View>
      <View role="navigation" className="items-center">
        {[explainers, policies]
          .filter((row) => row.length > 0)
          .map((row) => (
            <View key={row[0].row} className="flex-row flex-wrap items-center justify-center">
              {row.map((link) => (
                <FooterLink key={String(link.href)} link={link} />
              ))}
            </View>
          ))}
      </View>
      <View className="flex-row flex-wrap items-center justify-center">
        {appEnv.discordUrl ? (
          <Button onPress={() => openExternalUrl(appEnv.discordUrl)} variant="link" size="sm">
            <Text className="text-xs">{t("navigation:header.joinDiscord")}</Text>
          </Button>
        ) : null}
        {appEnv.redditUrl ? (
          <Button onPress={() => openExternalUrl(appEnv.redditUrl)} variant="link" size="sm">
            <Text className="text-xs">{t("navigation:header.joinReddit")}</Text>
          </Button>
        ) : null}
        {appEnv.youtubeUrl ? (
          <Button onPress={() => openExternalUrl(appEnv.youtubeUrl)} variant="link" size="sm">
            <Text className="text-xs">{t("navigation:header.watchYoutube")}</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}
