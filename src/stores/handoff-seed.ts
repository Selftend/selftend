/**
 * How long a cross-module hand-off stays consumable.
 *
 * A seed is a hand-off across ONE navigation: a door writes it and the form it
 * opens takes it. The one case it outlives that navigation is the owner's rule
 * for every door (#2206) - the form found a live draft, kept it, and left the
 * seed for the next fresh open of that form.
 *
 * ☠️ Left unbounded, that rule reached arrivals it was never minted for. Both
 * seed stores are module singletons, so on native (no page reload) an
 * un-consumed seed waits for the whole app process: finish the draft it
 * deferred to, open the same form from the module hub an hour later for
 * something unrelated, and it arrives pre-filled with a judgement or a
 * paragraph about an old episode - which the person can save into a record that
 * is about something else.
 *
 * ⚠️ The window is a chosen number, not a derived one. It has to outlast
 * finishing the draft the hand-off stepped aside for - a thought record is not
 * a thirty-second form - and to be well short of "later that day", when a form
 * opened from a hub is a fresh intention rather than the tail of a hand-off.
 * Half an hour is the smallest span that covers the first without touching the
 * second. Falling out of the window is the SAFE direction: the form opens empty,
 * which is what a hub open should give anyway.
 */
export const HANDOFF_SEED_TTL_MS = 30 * 60 * 1000;

/**
 * Whether a seed minted at `mintedAt` may still be applied. `null` - nothing was
 * ever minted, or a store predating the stamp - is never fresh.
 */
export function isHandoffSeedFresh(mintedAt: number | null): boolean {
  return mintedAt !== null && Date.now() - mintedAt <= HANDOFF_SEED_TTL_MS;
}
