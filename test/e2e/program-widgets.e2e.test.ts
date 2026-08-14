import { expect, NORMALIZED_GATE_PREFS, test } from "./fixtures";

import { createServiceClient, dismissPostSignInModals } from "./helpers";

type Row = Record<string, unknown>;

let userId: string;
let originalPreferences: Row | null = null;
let originalWidgets: Row[] = [];

test.describe("CBT and ACT programme widgets", () => {
  test.beforeEach(async ({ user }) => {
    userId = user.id;
    const admin = createServiceClient();
    const [preferences, widgets] = await Promise.all([
      admin.from("user_preferences").select("*").eq("user_id", userId).single(),
      admin.from("widget_preferences").select("*").eq("user_id", userId).order("position"),
    ]);
    if (preferences.error) throw new Error(preferences.error.message);
    if (widgets.error) throw new Error(widgets.error.message);
    originalPreferences = preferences.data as Row;
    originalWidgets = (widgets.data ?? []) as Row[];

    const { error: deleteError } = await admin
      .from("widget_preferences")
      .delete()
      .eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);
    const { error: widgetError } = await admin.from("widget_preferences").insert([
      { user_id: userId, widget_id: "cbt-programme", position: 0 },
      { user_id: userId, widget_id: "act-programme", position: 1 },
    ]);
    if (widgetError) throw new Error(widgetError.message);

    const { error: preferenceError } = await admin
      .from("user_preferences")
      .update({
        cbt_program_started_at: null,
        cbt_program_completed_at: null,
        cbt_program_phase_index: 0,
        act_program_started_at: null,
        act_program_completed_at: null,
        act_program_phase_index: 0,
        shown_button_tours: ["home:edit", "home:navigation"],
      })
      .eq("user_id", userId);
    if (preferenceError) throw new Error(preferenceError.message);
  });

  test.afterEach(async () => {
    const admin = createServiceClient();
    if (originalPreferences) {
      // Gate fields re-normalized on restore so a restored row can never
      // resurrect a consent/onboarding/reminder gate for a later test (#172).
      const { error } = await admin
        .from("user_preferences")
        .upsert({ ...originalPreferences, ...NORMALIZED_GATE_PREFS }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    }
    const { error: deleteError } = await admin
      .from("widget_preferences")
      .delete()
      .eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);
    if (originalWidgets.length > 0) {
      const { error } = await admin.from("widget_preferences").insert(originalWidgets);
      if (error) throw new Error(error.message);
    }
  });

  test("shows no badge before starting, an ordinal while running, and Complete after", async ({
    page,
  }) => {
    const admin = createServiceClient();
    await page.goto("/");
    await dismissPostSignInModals(page);

    // --- Never started: a card with no badge, describing the module ---------
    // Migrated for #977. This block used to pin `View programme` / `Open module` CTA
    // buttons, the task list, and "Programme complete - well done."; the card now
    // presses whole, carries an ordinal badge, and has no button of its own.
    await expect(page.getByText("CBT programme", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("ACT programme", { exact: true }).last()).toBeVisible();
    await expect(page.getByText(/A guided path through the CBT module/).last()).toBeVisible();
    await expect(page.getByText(/^Phase \d+ of \d+$/)).toHaveCount(0);

    // Opening the card is not enrollment; that choice stays explicit on the module.
    await page.getByTestId("programme-card-cbt").last().click();
    await expect(page).toHaveURL(/\/modules\/cbt$/);
    const { data: notStarted } = await admin
      .from("user_preferences")
      .select("cbt_program_started_at")
      .eq("user_id", userId)
      .single();
    expect(notStarted?.cbt_program_started_at).toBeNull();

    // --- Running: an honest ordinal, and the phase theme ---------------------
    const startedAt = new Date().toISOString();
    const { error: activeError } = await admin
      .from("user_preferences")
      .update({
        cbt_program_started_at: startedAt,
        cbt_program_completed_at: null,
        cbt_program_phase_index: 1,
        act_program_started_at: startedAt,
        act_program_completed_at: null,
      })
      .eq("user_id", userId);
    if (activeError) throw new Error(activeError.message);

    await page.goto("/");
    await page.reload();
    await expect(page.getByTestId("programme-badge-cbt").last()).toHaveText("Phase 2 of 5");
    // No task list survives on this card - the launcher widget keeps one, home does not.
    await expect(
      page.getByRole("button", { name: /Notice your thoughts, feelings & behaviours today/ }),
    ).toHaveCount(0);

    // --- Abandoned: started_at cleared, phase_index left stale ---------------
    // The trap this slice exists to avoid: gating on phase_index alone would meet a
    // user who quit in phase 2 with a cheerful ordinal.
    const { error: abandonError } = await admin
      .from("user_preferences")
      .update({ cbt_program_started_at: null })
      .eq("user_id", userId);
    if (abandonError) throw new Error(abandonError.message);

    await page.goto("/");
    await page.reload();
    await expect(page.getByText("CBT programme", { exact: true }).last()).toBeVisible();
    await expect(page.getByTestId("programme-badge-cbt")).toHaveCount(0);

    // --- Complete ------------------------------------------------------------
    const completedAt = new Date().toISOString();
    const { error: completedError } = await admin
      .from("user_preferences")
      .update({
        cbt_program_started_at: startedAt,
        cbt_program_completed_at: completedAt,
        act_program_completed_at: completedAt,
      })
      .eq("user_id", userId);
    if (completedError) throw new Error(completedError.message);

    await page.goto("/");
    await page.reload();
    await expect(page.getByTestId("programme-badge-cbt").last()).toHaveText("Complete");
    await page.getByTestId("programme-card-cbt").last().click();
    await expect(page).toHaveURL(/\/modules\/cbt$/);
  });
});
