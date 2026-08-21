import { expect, test } from "./fixtures";

import {
  deleteAllGratitudeEntriesForUser,
  deleteAllMoodLogsForUser,
  deleteAllRoutinesForUser,
  dismissPostSignInModals,
  expectSuccessToast,
  navigateViaPanel,
} from "./helpers";

/**
 * The toast anchors to the BOTTOM and steps over the furniture already there
 * (#1340, spec §5).
 *
 * Jest owns the arithmetic and the clamp - `toastBottom` is a pure function and
 * `app-toast.test.tsx` drives it directly, which is the only place the
 * climbs-forever class of bug can be caught. What jest cannot do is measure: its
 * `View` is a class mock with no `measureInWindow`, so no publisher in a jest
 * tree ever reports an edge and every offset there is one the test itself
 * published. This spec is the other half - real layout, real measurement, real
 * `ResizeObserver`, at the width a phone actually is.
 *
 * The furniture is assembled rather than assumed: a routine scheduled today puts
 * `RoutineFab` on layer 2, and going offline puts the offline banner in the
 * bottom strip on layer 1. Both have to be on screen at once, because the toast
 * reads the MAX of the layers below it and a single obstruction cannot tell a max
 * from a passthrough.
 *
 * Offline also supplies the toast itself, and a sticky one: the star toggle's
 * mutation fails fast (`networkMode: "always"`), and an error toast never expires
 * on its own (#1336). A success would give this three assertions' worth of time.
 */
test.describe("the toast at the bottom of a phone screen", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllGratitudeEntriesForUser(user.id);
    await deleteAllRoutinesForUser(user.id);
    await deleteAllMoodLogsForUser(user.id);
  });

  test.afterEach(async ({ page, user }) => {
    // First, and unconditionally: a worker context left offline would fail every
    // spec that reuses it, with a symptom nowhere near this file.
    await page.context().setOffline(false);
    await deleteAllGratitudeEntriesForUser(user.id);
    await deleteAllRoutinesForUser(user.id);
    await deleteAllMoodLogsForUser(user.id);
  });

  test("at 360x800 it clears the FAB and a visible banner strip, and stays below the header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });

    // A prior spec's trailing preferences write can leave this worker user with a
    // stale policy_version_accepted at boot, and the consent gate then hijacks
    // any deep link to "/". Clear the gates once, up front.
    await page.goto("/");
    await dismissPostSignInModals(page);

    // --- Something to star, which is what will raise the toast later ---
    await page.goto("/tools/gratitude-log/new");
    await page.getByRole("textbox", { name: "What made you laugh?" }).fill("Morning coffee");
    await page.getByRole("button", { name: "Save entry", exact: true }).click();
    // Names its own failure if the save is what broke (#1334).
    await expectSuccessToast(page, "Saved");

    // --- Furniture: a routine scheduled today arms the FAB everywhere ---
    await navigateViaPanel(page, "Routines");
    await expect(page).toHaveURL(/\/routines$/, { timeout: 15_000 });
    await page.getByRole("button", { name: "New routine", exact: true }).click();
    await expect(page).toHaveURL(/\/routines\/new$/, { timeout: 15_000 });
    await page
      .getByRole("textbox", { name: "Routine name", exact: true })
      .fill("E2E toast position");
    await page.getByRole("button", { name: "Add Mood check-in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove Mood check-in", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // Save routes with router.replace; navigating mid-replace can be swallowed.
    // Ids are hex, so a segment starting with "new" can only be the editor.
    await page.waitForURL(/\/routines\/(?!new)[^/]+$/, { timeout: 15_000 });

    await page.goto("/tools/gratitude-log");
    const fab = page.getByTestId("routine-fab");
    await expect(fab).toBeVisible({ timeout: 15_000 });

    // --- Furniture: the offline banner fills the bottom strip ---
    await page.context().setOffline(true);
    await expect(page.getByText(/you're offline/i)).toBeVisible({ timeout: 15_000 });

    // --- The toast: a failing mutation, so it is an error and therefore sticky ---
    await page.getByRole("button", { name: "Favorite", exact: true }).click();
    const toast = page.getByTestId("app-toast");
    await expect(toast).toBeVisible({ timeout: 15_000 });

    const layout = await page.evaluate(() => {
      const box = (testId: string) => {
        const element = document.querySelector(`[data-testid="${testId}"]`);
        if (!element) return null;
        const { top, bottom, left, right, width, height } = element.getBoundingClientRect();
        return { top, bottom, left, right, width, height };
      };

      // The accent bar carries no testID of its own - it is decoration. Found by
      // the shape it is specified as instead: a 4px absolutely-positioned rule
      // inside the card, painted in the tone colour.
      const card = document.querySelector('[data-testid="app-toast"]');
      const bar = [...(card?.querySelectorAll("*") ?? [])].find((node) => {
        const style = getComputedStyle(node);
        return style.position === "absolute" && Math.round(parseFloat(style.width)) === 4;
      });

      return {
        host: box("app-toast-host"),
        card: box("app-toast"),
        fab: box("routine-fab-host"),
        strip: box("bottom-banner-strip"),
        header: box("invisible-header"),
        viewportHeight: document.documentElement.clientHeight,
        // Not the literal 360: a headless vertical scrollbar would eat a few px
        // of it, and the toast spans the layout width, not the viewport width.
        clientWidth: document.documentElement.clientWidth,
        barBackground: bar ? getComputedStyle(bar).backgroundColor : null,
        // The X must be a real control, not a glyph.
        dismissLabels: card?.querySelectorAll('[aria-label="Dismiss message"]').length ?? 0,
      };
    });

    // Guard the guard: every comparison below is vacuous against a null.
    expect(layout.host).not.toBeNull();
    expect(layout.fab).not.toBeNull();
    expect(layout.strip).not.toBeNull();
    expect(layout.header).not.toBeNull();
    const { host, fab: fabBox, strip, header, viewportHeight } = layout;
    if (!host || !fabBox || !strip || !header) throw new Error("unreachable");

    // The strip is really occupying space - otherwise "the toast clears it" is a
    // sentence about nothing.
    expect(strip.height).toBeGreaterThan(0);

    // The ladder, rung by rung: the FAB (layer 2) clears the strip (layer 1), and
    // the toast (layer 3) clears the FAB. Read as <= rather than < because a rung
    // that lands exactly on the edge below it has still cleared it.
    expect(fabBox.bottom).toBeLessThanOrEqual(strip.top);
    expect(host.bottom).toBeLessThanOrEqual(fabBox.top);
    expect(host.bottom).toBeLessThanOrEqual(strip.top);

    // Bottom-anchored, and not by a hair: with this much furniture the toast is
    // pushed well up the screen, so "it is at the bottom" is checked against the
    // rung it stands on rather than against the window edge.
    expect(host.top).toBeGreaterThan(viewportHeight / 2);

    // The clamp's side of the deal: #660 gave the top of the screen to the
    // invisible header, and the toast never crosses under it.
    expect(host.top).toBeGreaterThanOrEqual(header.bottom);

    // Full width at 360dp, inside the 16px page gutter on both sides.
    expect(host.left).toBe(0);
    expect(host.right).toBe(layout.clientWidth);
    expect(layout.card?.left).toBe(16);
    expect(layout.card?.right).toBe(layout.clientWidth - 16);

    // The accent bar painted, in a real colour rather than a transparent
    // fallback - and the X is there to free a toast that will not expire.
    expect(layout.barBackground).not.toBeNull();
    expect(layout.barBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(layout.dismissLabels).toBe(1);

    await page.screenshot({ path: "test-results/toast-position-360.png" });

    // --- And it settles back down when the furniture goes away ---
    await page.context().setOffline(false);
    await expect(page.getByText(/you're offline/i)).toBeHidden({ timeout: 15_000 });

    const settled = await page.evaluate(() => {
      const host = document.querySelector('[data-testid="app-toast-host"]');
      const fab = document.querySelector('[data-testid="routine-fab-host"]');
      return {
        hostBottom: host?.getBoundingClientRect().bottom ?? null,
        fabTop: fab?.getBoundingClientRect().top ?? null,
      };
    });

    // ☠️ This is the assertion the whole layered model exists for, and the one a
    // stale measurement would silently pass in the other direction only. On web
    // `onLayout` is a bare ResizeObserver, so a publisher that MOVES without
    // resizing never re-fires it - the FAB dropping back down when the banner
    // leaves is exactly that shape, and `useInsetPublisher`'s `revision` is what
    // makes it re-measure. Without it the toast would stay parked where the
    // banner used to be.
    expect(settled.hostBottom).not.toBeNull();
    expect(settled.fabTop).not.toBeNull();
    expect(settled.hostBottom!).toBeGreaterThan(host.bottom);
    expect(settled.hostBottom!).toBeLessThanOrEqual(settled.fabTop!);
  });
});
