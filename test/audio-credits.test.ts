/**
 * Which instrument says what a generation cost (#1359).
 *
 * ☠️ WHY THIS FILE EXISTS. The manifest used to carry only a QUOTE — duration
 * times a module constant — and that constant was 3.3x under the truth for a week
 * without anything noticing, because nothing ever compared it to what the API
 * said. `character-cost` comes back on every generation: exact, immediate, free.
 * The balance endpoint is not an alternative to it — it LAGS, and did not move at
 * all across a real 22-credit call before reconciling later.
 *
 * Everything here is a pure function of headers, so none of it needs a key,
 * credits or ffmpeg.
 */
import {
  CHARGED_CREDITS_HEADER,
  chargedCredits,
  costReading,
  sumCharged,
} from "../scripts/audio/credits.mjs";
import { creditHypotheses, creditVerdict } from "../scripts/audio/loop-probe.mjs";

describe("the header is named once, and it is the API's", () => {
  it("is the header ElevenLabs actually sends", () => {
    expect(CHARGED_CREDITS_HEADER).toBe("character-cost");
  });
});

/**
 * ☠️ THE BALANCE IS NOT A COST INSTRUMENT — it LAGS. Across a 22-credit call
 * `/user/subscription` did not move at all (38,893 -> 38,893) and then reconciled
 * exactly by the end of the session. A delta read straight after a call is
 * therefore capable of reporting zero for a call that cost real, unrepeatable
 * credits. `character-cost` comes back on the response itself: exact, immediate,
 * free, and it answered #1347's billing question even though the key on hand
 * lacked `user_read` entirely. Everything that reports cost prefers it (#1359).
 */
describe("chargedCredits reads the exact figure off the response", () => {
  it("reads the header the API actually sends", () => {
    expect(chargedCredits(new Map([["character-cost", "330"]]))).toBe(330);
  });

  it("finds it however the header case came back", () => {
    // `fetch` lower-cases header names, but a stub, a proxy or a replayed
    // recording need not — and a missed header silently degrades to the lagging
    // balance rather than failing.
    expect(chargedCredits({ "Character-Cost": "22" })).toBe(22);
  });

  it("returns null rather than a number when the header is absent", () => {
    expect(chargedCredits(new Map([["content-type", "audio/pcm"]]))).toBeNull();
    expect(chargedCredits(null)).toBeNull();
    expect(chargedCredits(undefined)).toBeNull();
  });

  it("returns null for a header that is not a number, never NaN", () => {
    // NaN would propagate into a manifest row as `null` anyway, but into a total
    // as NaN — poisoning the sum of every other take's real cost.
    expect(chargedCredits({ "character-cost": "" })).toBeNull();
    expect(chargedCredits({ "character-cost": "n/a" })).toBeNull();
  });

  it("keeps a zero, which is a real answer and not a missing one", () => {
    expect(chargedCredits({ "character-cost": "0" })).toBe(0);
  });
});

describe("costReading prefers the header over the balance delta", () => {
  const hypotheses = creditHypotheses({
    requestedSeconds: 60,
    returnedSeconds: 75,
    creditsPerSecond: 11,
  });

  it("takes the header when both are available", () => {
    const reading = costReading({ charged: 330, spent: 0 });
    expect(reading.credits).toBe(330);
    expect(reading.exact).toBe(true);
    expect(reading.source).toMatch(/character-cost/);
  });

  it("says the balance disagreed rather than hiding it", () => {
    // The lag is evidence about the instrument, so it is reported, not dropped.
    expect(costReading({ charged: 330, spent: 0 }).note).toMatch(/0/);
    expect(costReading({ charged: 330, spent: 330 }).note).toBeNull();
  });

  it("falls back to the balance delta when no header came back", () => {
    const reading = costReading({ charged: null, spent: 198 });
    expect(reading.credits).toBe(198);
    expect(reading.exact).toBe(false);
    expect(reading.source).toMatch(/balance/);
  });

  it("reports nothing measurable rather than picking a story", () => {
    const reading = costReading({ charged: null, spent: NaN });
    expect(Number.isFinite(reading.credits)).toBe(false);
    expect(reading.exact).toBe(false);
    expect(creditVerdict({ credits: reading.credits, hypotheses })).toContain("unknown");
  });

  it("prefers a zero header to a plausible balance delta", () => {
    // A header of 0 is the API saying this call was free. The balance delta is
    // the weaker instrument even when it looks more like the expected answer.
    expect(costReading({ charged: 0, spent: 198 }).credits).toBe(0);
  });
});

describe("sumCharged never passes a partial sum off as a total", () => {
  it("adds up a fully priced run and says so", () => {
    const spend = sumCharged([330, 22, 11]);
    expect(spend).toEqual({ total: 363, priced: 3, unpriced: 0, complete: true });
  });

  /**
   * ☠️ THE LOAD-BEARING CASE. Adding up only the priced calls gives a confident
   * number that is too SMALL, and understating an unrepeatable spend is the one
   * direction that misleads. The total is still returned — `render` prints it as an
   * explicit floor — but `complete` is false, which is what makes the probe
   * withhold it entirely rather than quote a fraction as the whole.
   */
  it("reports an incomplete run as incomplete, total and all", () => {
    const spend = sumCharged([330, null, 22]);
    expect(spend.total).toBe(352);
    expect(spend.priced).toBe(2);
    expect(spend.unpriced).toBe(1);
    expect(spend.complete).toBe(false);
  });

  it("counts a zero charge as priced, because it is an answer", () => {
    expect(sumCharged([0, 0])).toEqual({ total: 0, priced: 2, unpriced: 0, complete: true });
  });

  it("calls a run of no calls incomplete rather than a complete zero", () => {
    // An empty pass has measured nothing; reporting "0 credits, complete" would be
    // a confident claim about a question never asked.
    expect(sumCharged([])).toMatchObject({ total: 0, complete: false });
  });

  it("is incomplete when nothing at all came back priced", () => {
    expect(sumCharged([null, null])).toMatchObject({ total: 0, priced: 0, complete: false });
  });
});
