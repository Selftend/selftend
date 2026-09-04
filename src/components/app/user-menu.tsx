import { router, usePathname } from "expo-router";
import * as React from "react";
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GetTheAppSection } from "@/src/components/app/get-the-app-section";
import { ProfileAvatar } from "@/src/components/app/profile-avatar";
import { SchemePicker } from "@/src/components/app/scheme-picker";
import { SocialConnections } from "@/src/components/app/social-connections";
import { StylePicker } from "@/src/components/app/style-picker";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/react-native-reusables/popover";
import { Text } from "@/src/components/react-native-reusables/text";
import { useSignOut } from "@/src/features/auth/use-sign-out";
import { resolveAvatarUrl } from "@/src/features/profile/avatar-url";
import { resolveDisplayName } from "@/src/features/profile/display-name";
import { useUserProfile } from "@/src/features/profile/queries";
import { supportedLanguages } from "@/src/i18n";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useLanguage } from "@/src/providers/i18n-provider";
import { useSession } from "@/src/providers/session-provider";
import { useStyleName } from "@/src/lib/style";
import { STYLE_LABELS } from "@/src/lib/theme/styles";
import type { TriggerRef } from "@rn-primitives/popover";

/** Which view the menu body is showing. See `pane` in `UserMenu` for why. */
type MenuPane = "root" | "palette";

/**
 * `.focus()` on whatever a `Pressable`'s ref hands back.
 *
 * Native gives a `View` with no `focus`, react-native-web gives the DOM node
 * that does - so the call is optional at both hops rather than cast to one
 * platform's shape. `calendar-roving-focus.ts` reaches for a node the same way.
 */
function focusNode(node: unknown) {
  (node as { focus?: () => void } | null)?.focus?.();
}

export function UserMenu() {
  const { t } = useTranslation("navigation");
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  // The menu lives in the header, which persists across routes - navigating
  // via a sidebar/breadcrumb link left it hanging open over the new screen
  // (#491). Any route change dismisses it.
  const pathname = usePathname();
  const prevPathname = React.useRef(pathname);
  React.useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      popoverTriggerRef.current?.close();
    }
  }, [pathname]);
  // The palette grid added four rows of cards to a menu that already carried
  // identity, language, appearance, the app promo, socials and three actions.
  // On a short or landscape phone that runs past the bottom of the screen, and
  // a popover does not scroll on its own - so sign-out, Settings and the lower
  // palettes simply became unreachable. Bounding the body to a fraction of the
  // viewport and letting it scroll keeps every row reachable at any height,
  // and costs nothing on a tall screen where the content already fits.
  //
  // The bound stays now that the grid has moved behind a row (#1774): the grid
  // is still tall once its pane is open, and this is still a phone.
  const { height: windowHeight } = useWindowDimensions();
  const menuMaxHeight = Math.round(windowHeight * 0.7);

  // #1774: eight palette cards were about 470px of a 288px-wide popover,
  // against roughly 180px for language and appearance together - the single
  // largest thing in the menu, and the reason the scroller above exists. The
  // grid collapses to one row, and opens as a pane that REPLACES the body.
  //
  // A view swap, not a nested popover. #583 put the control in this menu
  // precisely because there was "only one popover" to reason about (#561), and
  // that invariant is not worth spending to save a tap.
  const [pane, setPane] = React.useState<MenuPane>("root");
  const activeStyle = useStyleName();
  const paletteRowRef = React.useRef<unknown>(null);
  const paletteBackRef = React.useRef<unknown>(null);

  // Swapping the body unmounts whichever row the keyboard was on, and on the
  // web an unmounted focus owner drops focus to `document.body` - out of the
  // popover entirely. Hand it to the row that replaces it, in both directions.
  const previousPane = React.useRef(pane);
  React.useEffect(() => {
    if (previousPane.current === pane) {
      // First render. Opening the menu must not steal focus from the trigger,
      // whose own restore the popover primitive already owns.
      return;
    }
    previousPane.current = pane;
    if (Platform.OS !== "web") {
      return;
    }
    // On close both refs are null - the content is gone - so this is a no-op
    // and never fights the primitive's focus restore.
    focusNode(pane === "palette" ? paletteBackRef.current : paletteRowRef.current);
  }, [pane]);

  const { session, user } = useSession();
  const isSignedIn = Boolean(session);
  const { data: profile } = useUserProfile(user);
  const { language, setLanguage } = useLanguage();

  const email = user?.email;
  // One expression, shared with settings (#970) - the header used to omit the OAuth
  // fallback, so the same `Remove photo` tap changed this and not that.
  const avatarUrl = resolveAvatarUrl(profile, user);
  const displayName = resolveDisplayName(profile, user);
  /*
    The same two expressions the settings identity row derives (#1829), not a
    second answer to the same question — sharing only `resolveDisplayName` and
    writing the fallback twice is the #970 divergence re-created in the act of
    closing it.

    ☠️ `||` at every step, never `??`: an anonymous user's `email` is `""` and
    the type is `email?: string`, so `??` typechecks and walks straight past it.
    That is why `userMenu.account` never rendered for anyone.

    ☠️ `showEmail` is what keeps a guest to ONE line. Writing the fallback into
    the SUB-line instead would give a guest who has saved a name both their name
    and the word `Guest` — a second guest-status signal on one surface, which
    #1784 and #1805 refused, and which #1810 pins as an unchanged row.
  */
  const primaryLine = displayName || email || t("userMenu.guest");
  const showEmail = Boolean(displayName && email);
  /*
    ☠️ Absence-driven, never a bare `is_anonymous` (#1869). `convertGuestWithPassword`
    flips the flag server-side, but the live JWT keeps claiming `is_anonymous: true`
    until the token is minted again - so in that window a REGISTERED person carries a
    true flag, and a flag-based door would offer them a way to sign in to the account
    they are already signed in to. `app/(app)/support.tsx` guards the same window by
    ANDing the flag with `!user.email`; here the email carries it alone.

    `!email` implies guest structurally: every registered identity attaches one
    (password, Google, and Apple's private relay) and there is no phone auth, so the
    door withdraws the moment conversion gives them an email - stale flag and all.

    ⚠️ This is NOT `useSignOut`'s `canSignOut`, which is the flag alone. The two
    disagree only inside that same stale window, where a converted user gets
    neither control - a known `canSignOut` staleness that predates this row and
    belongs to conversion, not to the door.
  */
  const isGuest = isSignedIn && !email;

  const languageIndex = supportedLanguages.indexOf(language);
  const languageRoving = useRovingFocus({
    count: supportedLanguages.length,
    activeIndex: languageIndex < 0 ? 0 : languageIndex,
    onActivate: (index) => void setLanguage(supportedLanguages[index]),
  });

  function openExternal(url: string) {
    popoverTriggerRef.current?.close();
    openExternalUrl(url);
  }

  // The same handler the settings row uses (#1053): the menu used to re-implement
  // its body and, having no try/catch, swallowed every failure - it closed, said
  // nothing, and left the user signed in. The hook reports through the toast,
  // which is the only surface that outlives a dismissed menu. `canSignOut` is
  // the hook's shared guest guard (#1442).
  const { canSignOut, signOut: handleSignOut } = useSignOut(user);

  function onSignOut() {
    // Closing is the menu's own business, so it stays here rather than in the hook.
    popoverTriggerRef.current?.close();
    void handleSignOut();
  }

  return (
    <Popover
      // Every close path lands here, including the imperative
      // `popoverTriggerRef.current.close()` used by a route change and by the
      // actions below - the trigger's `close` calls `onOpenChange(false)`. So
      // reopening the menu always lands on the root view, never mid-pane.
      onOpenChange={(open) => {
        if (!open) {
          setPane("root");
        }
      }}
    >
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button
          accessibilityLabel={t("userMenu.openMenu")}
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
        >
          {isSignedIn ? (
            <ProfileAvatar avatarUrl={avatarUrl} email={email} name={displayName} />
          ) : (
            <Icon name="more-vert" className="size-6 text-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-72 p-0">
        <ScrollView
          testID="user-menu-scroll"
          style={{ maxHeight: menuMaxHeight }}
          contentContainerClassName="gap-3 p-3"
          // The menu is short on a tall screen; the bar should not imply the
          // content is cut off when it is not.
          showsVerticalScrollIndicator={false}
        >
          {pane === "palette" ? (
            <>
              {/* The pane replaces the body rather than expanding inside it: an
              accordion would leave the grid competing with six other sections
              in a 288px column, which is the shape being retired. */}
              <Pressable
                // "Back" is the whole meaning; the visible "Palette" beside it is
                // the pane's title. An explicit label hides a Pressable's children
                // from assistive tech on the web (see `HairlineRow`), so anything
                // the name needs has to be IN the name.
                accessibilityLabel={t("styleToggle.back")}
                accessibilityRole="button"
                className="flex-row items-center gap-2 rounded-sm px-2 py-2 active:bg-accent"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => setPane("root")}
                ref={(node) => {
                  paletteBackRef.current = node;
                }}
                role="button"
                testID="user-menu-palette-back"
              >
                <Icon name="arrow-back" className="size-4 text-foreground" />
                <Text className="text-sm font-medium">{t("styleToggle.toggle")}</Text>
              </Pressable>
              {/* No caption: the back row above already says Palette, and the
                  picker keeps its radiogroup name either way.

                  Choosing a palette applies it and STAYS in the pane. Picking a
                  palette is comparative - you want to see two or three against
                  the same screen - and bouncing to the root view after each tap
                  would make that a four-tap loop. The back row is the exit. */}
              <StylePicker heading={false} />
            </>
          ) : (
            <>
              {isSignedIn ? (
                <View className="flex-row items-center gap-3">
                  <ProfileAvatar
                    avatarUrl={avatarUrl}
                    email={email}
                    name={displayName}
                    className="size-10"
                  />
                  <View className="flex-1">
                    {/*
                      The name slot always renders now: it holds the name, or the
                      email, or the word for having neither. It used to be
                      conditional with the email pinned below it, which left a
                      guest with two empty lines and no way to say what they were.
                    */}
                    <Text className="text-sm font-medium leading-5" numberOfLines={1}>
                      {primaryLine}
                    </Text>
                    {showEmail ? (
                      <Text
                        className="text-sm text-muted-foreground font-normal leading-4"
                        numberOfLines={1}
                      >
                        {email}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/*
                #1869: a guest's only way back into their own account. Sign-out is
                hidden for them (#1442), `app/index.tsx` bounces any session past
                the landing screen's Sign in, and native has no URL bar - so
                before this row the only in-app route to the sign-in form was
                deleting the account.

                Its own row directly beneath the identity row, in the Palette
                row's shape (label · chevron, no leading icon): label-plus-chevron
                is this menu's grammar for NAVIGATION, which is the only basis
                #1809 permitted the door on. Not the action row - the menu
                already overflows its own 70% cap for everyone (#1862), so the
                actions are its least reachable region (#1811).

                ☠️ NO `accessibilityLabel` (#1863). One `Text` child means the
                label IS the accessible name; an explicit one would hide that
                child from assistive tech on the web. The Palette row composes a
                name only because it has a value to fold in.

                ☠️ The Palette shape's middle value slot stays EMPTY, by decision
                and not omission - do not fill it with a hint about the
                warn-and-abandon confirm. `guardSignIn` passes an empty guest
                straight through with no warning at all, so a static caution is
                false for exactly the newest guests, and a content-aware one
                costs the whole `export_user_data` RPC on every menu open. #1863
                carries the rest of the argument. The pre-submit gap is real and
                is #1865's, on `/sign-in`, which can afford the check on mount.
              */}
              {isGuest ? (
                <Pressable
                  accessibilityRole="button"
                  className="flex-row items-center gap-3 rounded-sm px-2 py-2 active:bg-accent"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => {
                    popoverTriggerRef.current?.close();
                    // ☠️ No `dangerouslySingular` here, unlike the two `(app)`
                    // lateral jumps below: `sign-in` already declares it in
                    // `app/(auth)/_layout.tsx`, so passing it would be a second
                    // answer to a settled question.
                    //
                    // ☠️ Bare, and it must stay bare: this whole menu is a
                    // declared Origin opt-out (#1261/#1265), enforced by
                    // `nav-chrome-origin.test.ts` - which scans this file's
                    // SOURCE, so even naming the recording helper in a comment
                    // fails it. The argument holds here too: the sign-in
                    // screen's top bar leads to `/` by design, so a recorded
                    // origin would never be read.
                    router.push("/(auth)/sign-in");
                  }}
                  // ☠️ `role="button"`, never `role="link"`: react-native-web
                  // skips `onPress` on Enter for an href-less link role, the
                  // keyboard-dead failure the #1730 chain closed. And no
                  // `spaceKeyActivationProps` - on `role="button"` it
                  // double-activates.
                  role="button"
                  testID="user-menu-sign-in-row"
                >
                  <Text className="flex-1 text-sm">{t("userMenu.signIn")}</Text>
                  <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground" />
                </Pressable>
              ) : null}

              <View
                accessibilityLabel={t("languageToggle.toggle")}
                accessibilityRole="radiogroup"
                role="radiogroup"
              >
                <Text className="text-xs font-medium text-muted-foreground px-2 pb-1">
                  {t("languageToggle.toggle")}
                </Text>
                {supportedLanguages.map((code, index) => (
                  <Pressable
                    accessibilityLabel={t(`languageToggle.${code}`)}
                    accessibilityRole="radio"
                    aria-checked={language === code}
                    key={code}
                    className="flex-row items-center gap-3 rounded-sm px-2 py-2 active:bg-accent"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => void setLanguage(code)}
                    role="radio"
                    {...languageRoving.getItemProps(index, () => void setLanguage(code))}
                  >
                    <View className="size-4 items-center justify-center">
                      {language === code ? (
                        <Icon name="check" className="size-4 text-foreground" />
                      ) : null}
                    </View>
                    <Text className="text-sm">{t(`languageToggle.${code}`)}</Text>
                  </Pressable>
                ))}
              </View>

              {/* The appearance axis, now the same component Settings mounts
                  (#1827) - the menu was the only UI implementing one, and it
                  was the outlier on shape: a vertical radio list where #583 and
                  the design both specify a segmented track. It keeps the
                  visible caption here, which is the component's default. */}
              <SchemePicker />

              {/* One row where eight cards were. The palette name is a proper noun
              and stays untranslated (#561); the section word around it does not. */}
              <Pressable
                // Both halves live in the name because the explicit label hides the
                // two Texts below it from assistive tech on the web, and
                // `accessibilityHint` - the only other home for the value - is a
                // prop react-native-web never implements.
                accessibilityLabel={`${t("styleToggle.toggle")}, ${STYLE_LABELS[activeStyle]}`}
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-sm px-2 py-2 active:bg-accent"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => setPane("palette")}
                ref={(node) => {
                  paletteRowRef.current = node;
                }}
                role="button"
                testID="user-menu-palette-row"
              >
                <Text className="flex-1 text-sm">{t("styleToggle.toggle")}</Text>
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {STYLE_LABELS[activeStyle]}
                </Text>
                <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground" />
              </Pressable>

              <GetTheAppSection compact />
              {/* Community links (#668): this social row is the app's only
              community surface. Community spaces first in order of
              interactivity, GitHub last as the transparency door. Each
              community link hides when its URL is configured empty; GitHub
              is unconditional. */}
              <SocialConnections
                connections={[
                  ...(appEnv.discordUrl
                    ? [
                        {
                          id: "discord",
                          icon: "logo-discord" as const,
                          accessibilityLabel: t("header.joinDiscord"),
                          onPress: () => openExternal(appEnv.discordUrl),
                        },
                      ]
                    : []),
                  ...(appEnv.redditUrl
                    ? [
                        {
                          id: "reddit",
                          icon: "logo-reddit" as const,
                          accessibilityLabel: t("header.openReddit"),
                          onPress: () => openExternal(appEnv.redditUrl),
                        },
                      ]
                    : []),
                  ...(appEnv.youtubeUrl
                    ? [
                        {
                          id: "youtube",
                          icon: "logo-youtube" as const,
                          accessibilityLabel: t("header.openYoutube"),
                          onPress: () => openExternal(appEnv.youtubeUrl),
                        },
                      ]
                    : []),
                  {
                    id: "github",
                    icon: "logo-github" as const,
                    accessibilityLabel: t("header.viewGithub"),
                    onPress: () => openExternal(appEnv.githubRepoUrl),
                  },
                ]}
              />

              {isSignedIn ? (
                <View className="flex-row flex-wrap gap-3 py-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      popoverTriggerRef.current?.close();
                      router.push("/(app)/settings", { dangerouslySingular: true }); // lateral jump (#1027)
                    }}
                  >
                    <Icon name="settings" className="size-4" />
                    <Text>{t("userMenu.settings")}</Text>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      popoverTriggerRef.current?.close();
                      router.push("/(app)/support", { dangerouslySingular: true }); // lateral jump (#1027)
                    }}
                  >
                    <Icon name="feedback" className="size-4" />
                    <Text>{t("userMenu.sendFeedback")}</Text>
                  </Button>
                  {/*
                `grow basis-auto`, not `flex-1`: flex-1's zero basis lets this button
                "fit" whatever sliver the first two leave on the line, so it never
                wraps - Bulgarian's longer labels crushed it to ~32px with its text
                overlapping the feedback button. An auto basis wraps it to its own
                full-width line instead when the row runs out.
              */}
                  {canSignOut ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="grow basis-auto"
                      onPress={onSignOut}
                    >
                      <Icon name="logout" className="size-4" />
                      <Text>{t("userMenu.signOut")}</Text>
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </PopoverContent>
    </Popover>
  );
}
