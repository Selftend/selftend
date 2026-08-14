import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { InvisibleHeader } from "@/src/components/app/invisible-header";
import { SidebarNav } from "@/src/components/app/sidebar-nav";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useModalPanelKeyboard } from "@/src/lib/use-modal-panel-keyboard";
import { useSession } from "@/src/providers/session-provider";
import { useSidebarStore } from "@/src/stores/sidebar-store";

export function AppShell() {
  const { t } = useTranslation("navigation");
  const { session } = useSession();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const toggle = useSidebarStore((s) => s.toggle);
  const close = useSidebarStore((s) => s.close);
  // One chrome everywhere (#667/#669): the invisible header on every surface,
  // signed in and out. Signed out there is no nav, so the header renders a
  // same-size spacer in the hamburger slot and the brand links to "/".
  const signedIn = Boolean(session);

  useEffect(() => {
    if (!signedIn) {
      close();
    }
  }, [close, signedIn]);

  const overlayOpen = signedIn && isOpen;
  // Web modal keyboard story (#671): Escape closes, focus is trapped in the
  // panel, and the opener (hamburger) regains focus on any close path.
  const { panelRef } = useModalPanelKeyboard({ open: overlayOpen, onClose: close });

  return (
    <View className="flex-1 bg-background">
      {/* While the panel is open the page behind is pointer-blocked by the
          backdrop; aria-hidden extends that to assistive tech (the keyboard
          side is the focus trap above). */}
      <View testID="app-shell-page" className="flex-1" aria-hidden={overlayOpen}>
        <InvisibleHeader
          homeHref={signedIn ? "/(app)" : "/"}
          onMenuPress={signedIn ? toggle : undefined}
        />
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            {/* `dangerouslySingular` on every screen but `index` (#1027).

                expo-router's NAVIGATE reuses only the route it is ALREADY on, so pushing
                a screen that already sits deeper in the stack mounts a SECOND copy of it.
                Both run every hook; the older one is hidden, which is why nothing looks
                wrong. These policy pages cross-link to each other - privacy pushes
                security, security pushes privacy, legal and support push all of them - so
                the duplicates were unbounded.

                Declared per screen rather than per call site: there are ~30 lateral
                `router.push` calls across the app and this covers every one of them,
                including calls written later. `index` stays plain - it is the landing
                route and redirects when signed in, so it is never a push target. */}
            <Stack.Screen name="index" />
            <Stack.Screen name="privacy" dangerouslySingular />
            <Stack.Screen name="terms" dangerouslySingular />
            <Stack.Screen name="cookies" dangerouslySingular />
            <Stack.Screen name="crisis" dangerouslySingular />
            <Stack.Screen name="account-deletion" dangerouslySingular />
            <Stack.Screen name="security" dangerouslySingular />
            <Stack.Screen name="faq" dangerouslySingular />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </View>
      </View>

      {overlayOpen ? (
        // The whole overlay — panel AND backdrop — is the modal dialog: with
        // aria-modal on the panel alone, the backdrop would be a sibling of
        // the modal and assistive tech would drop the only close affordance
        // (a panel with no X). The backdrop still leaves the keyboard Tab
        // order below; the focus trap skips tabindex="-1" stops.
        <View
          testID="navigation-overlay"
          ref={panelRef}
          role="dialog"
          aria-modal
          className="absolute inset-0 z-50 flex-row"
        >
          {/* No close button: the panel opens at Home and the backdrop is the
              close affordance for pointer and screen-reader users alike. */}
          <SidebarNav includeTopInset onSelect={close} />
          <Pressable
            accessibilityLabel={t("header.closeNav")}
            accessibilityRole="button"
            className="flex-1 bg-black/50"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={close}
            role="button"
            // Invisible to sighted keyboard users, so it leaves the web Tab
            // order (#671) — but keeps its role + label: touch-exploration
            // screen readers need a close affordance on a panel with no X.
            {...(Platform.OS === "web" ? { tabIndex: -1 as const } : {})}
          />
        </View>
      ) : null}
    </View>
  );
}
