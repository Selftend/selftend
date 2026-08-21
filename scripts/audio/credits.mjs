/**
 * What a generation cost, and which instrument said so (#1359).
 *
 * ☠️☠️ THERE ARE TWO INSTRUMENTS AND ONLY ONE OF THEM IS ANY GOOD.
 *
 * `character-cost` is a response header on the generation itself: exact,
 * immediate, and free to read. It answered #1347's billing question — charged on
 * the REQUESTED seconds, with no premium for `loop: true` — even though the key
 * on hand lacked `user_read` and 401'd on the balance endpoint entirely.
 *
 * `/user/subscription` LAGS. Across a real 22-credit call it did not move at all
 * (38,893 before, 38,893 after) and reconciled only later in the session. A delta
 * read straight after a call can therefore report ZERO for a call that spent real,
 * unrepeatable credits. It survives here as the fallback for a response that
 * carried no header, and every reading names its own source so a surprising
 * number can be attributed rather than argued with.
 *
 * Kept in its own module rather than beside the loop probe that discovered it:
 * the probe has run and ruled, while this is the pass's permanent cost record,
 * consumed by `render` on every take. Everything here is a pure function of
 * headers, so it is exercised without a key, without credits and without ffmpeg.
 *
 * ⚠️ `CREDITS_PER_SECOND` in catalog.mjs is the other half — the QUOTE, used
 * before a call. This module is what a call actually cost, after.
 */

/** The response header that says what a generation actually cost. */
export const CHARGED_CREDITS_HEADER = "character-cost";

/**
 * The exact charge off one response, or `null` if it did not say.
 *
 * Takes anything header-shaped: a `Headers`, a `Map`, or the plain object
 * `allHeaders()` produces. `fetch` lower-cases header names but a stub or a
 * replayed recording need not, so the lookup is case-insensitive — a missed
 * header degrades silently to the lagging instrument, which is the failure this
 * whole module exists to prevent.
 */
export function chargedCredits(headers) {
  if (!headers) return null;
  const entries =
    typeof headers.entries === "function" ? [...headers.entries()] : Object.entries(headers);
  const hit = entries.find(([name]) => String(name).toLowerCase() === CHARGED_CREDITS_HEADER);
  if (!hit) return null;
  const raw = String(hit[1]).trim();
  const value = Number(raw);
  // ☠️ null, never NaN. A NaN reaches a manifest row as `null` anyway but poisons
  // any total it is summed into, silently erasing every other take's real cost.
  // `Number("")` is 0, so an empty header has to be caught before the conversion.
  return raw !== "" && Number.isFinite(value) ? value : null;
}

/**
 * Add up what a run of calls was charged, and say whether the sum is the whole.
 *
 * ☠️ A PARTIAL SUM LOOKS EXACTLY LIKE A TOTAL. If some calls came back unpriced,
 * adding up the ones that did produces a confident number that is too small — and
 * understating an unrepeatable spend is the one direction that misleads. So the
 * completeness is returned alongside the number rather than left for each caller
 * to re-derive: `render` prints an incomplete sum as an explicit floor ("at least
 * N"), while the probe withholds it and falls back to the balance. Two
 * presentations of one policy, which is the point of computing the policy once.
 *
 * `charges` is the per-call result of `chargedCredits`, `null` entries included.
 */
export function sumCharged(charges) {
  const priced = charges.filter((credits) => credits != null);
  return {
    total: priced.reduce((running, credits) => running + credits, 0),
    priced: priced.length,
    unpriced: charges.length - priced.length,
    complete: charges.length > 0 && priced.length === charges.length,
  };
}

/**
 * Which cost instrument to believe for one figure, stated out loud.
 *
 * `charged` should be `null` unless it is the WHOLE cost — see `sumCharged`.
 */
export function costReading({ charged, spent }) {
  if (Number.isFinite(charged)) {
    return {
      credits: charged,
      source: `${CHARGED_CREDITS_HEADER} header`,
      exact: true,
      // The lag is evidence about the instrument, so it is reported rather than
      // dropped — a disagreement here is the expected behaviour, not a fault.
      note: Number.isFinite(spent) && spent !== charged ? `balance delta says ${spent}` : null,
    };
  }
  if (Number.isFinite(spent)) {
    return { credits: spent, source: "balance delta (lags)", exact: false, note: null };
  }
  return { credits: NaN, source: "unavailable", exact: false, note: null };
}
