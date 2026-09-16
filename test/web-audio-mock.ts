/**
 * One fake Web Audio graph for the lane-player tests, beside `test/expo-audio-mock.ts`.
 *
 * The web bed loops on `AudioBufferSourceNode.loop` (`docs/sound.md` §3), so a test
 * needs a whole small graph — a context with a state, a decoder that can reject, a
 * buffer source that records its loop window, and a gain node standing in for the
 * volume the ramp writes. It also needs a `fetch` returning an `ArrayBuffer`, because
 * the lane fetches the asset itself rather than handing a URL to an element.
 *
 * Install with `installFakeWebAudio()` in `beforeEach` and read the graph back off
 * the returned handle. Everything is synchronous-resolving, so a plain microtask
 * flush is enough to get from `play()` to a live source under fake timers.
 *
 * ☠️ The lane keeps ONE `AudioContext` per page in module state (W1), so a test that
 * wants a fresh context must `jest.resetModules()` and re-require the lane — see
 * `lane-player.test.ts`. Installing a new fake here does not reset the old lane.
 */

export type FakeGainNode = {
  gain: { value: number };
  connect: jest.Mock;
  disconnect: jest.Mock;
};

export type FakeBufferSource = {
  buffer: FakeAudioBuffer | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  start: jest.Mock;
  stop: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
};

/** Only the two fields the loop window is computed from. */
export type FakeAudioBuffer = { duration: number; sampleRate: number };

export type FakeAudioContext = {
  state: "suspended" | "running" | "closed";
  destination: object;
  createBufferSource: jest.Mock<FakeBufferSource, []>;
  createGain: jest.Mock<FakeGainNode, []>;
  decodeAudioData: jest.Mock;
  resume: jest.Mock;
  suspend: jest.Mock;
};

export interface FakeWebAudio {
  /** Every context constructed since install. One, unless the lane module was reset. */
  contexts: FakeAudioContext[];
  /** The one context, or `undefined` while no looping bed has ever played. */
  readonly context: FakeAudioContext | undefined;
  /** Every buffer source created, in creation order. */
  sources: FakeBufferSource[];
  /** Every gain node created, in creation order. Parallel to `sources`. */
  gains: FakeGainNode[];
  /** Sources that have not been `stop()`ped. */
  liveSources: () => FakeBufferSource[];
  /** URLs passed to `fetch`, in order — a decode cache hit adds no entry. */
  fetched: string[];
  /** Decoded lengths, keyed by URL. Defaults to `DEFAULT_BED_SECONDS`. */
  durations: Map<string, number>;
  /** When set, `decodeAudioData` rejects with it instead of resolving. */
  decodeError: Error | null;
  /** When true, `resume()` leaves the context `suspended`. */
  resumeFails: boolean;
}

/**
 * A decode that trimmed the AAC priming: exactly the authored length, so the
 * loop window lands on `[0, duration]`. A test that wants the untrimmed case
 * sets `durations` to nominal + ~23 ms itself.
 */
export const DEFAULT_BED_SECONDS = 30;

type Globals = {
  AudioContext?: unknown;
  webkitAudioContext?: unknown;
  fetch?: unknown;
  navigator?: { audioSession?: { type: string } };
};

/**
 * Put a fake `AudioContext` and `fetch` on the global object for one test.
 *
 * `withoutConstructor` installs the no-Web-Audio browser instead: `fetch` is still
 * there, but `AudioContext` is absent, which is the first of §3.1.7's three fallback
 * triggers.
 */
export function installFakeWebAudio({
  withoutConstructor = false,
}: { withoutConstructor?: boolean } = {}): FakeWebAudio {
  const fake: FakeWebAudio = {
    contexts: [],
    get context() {
      return fake.contexts[fake.contexts.length - 1];
    },
    sources: [],
    gains: [],
    liveSources: () => fake.sources.filter((s) => s.stop.mock.calls.length === 0),
    fetched: [],
    durations: new Map(),
    decodeError: null,
    resumeFails: false,
  };

  // Every decode is keyed back to its URL so `durations` can differ per bed; the
  // fetch hands the decoder the URL itself rather than real bytes, which is all the
  // lane ever does with the ArrayBuffer.
  const g = globalThis as unknown as Globals;
  g.fetch = jest.fn(async (url: unknown) => {
    // ☠️ Stringified: on web `require("...m4a")` is a URL, but a test hands the lane a
    // bare asset number, and a Map keyed by 1 does not answer to "1".
    const key = String(url);
    fake.fetched.push(key);
    return { ok: true, arrayBuffer: async () => bytesFor(key) };
  }) as unknown as typeof fetch;

  function FakeAudioContextCtor(this: FakeAudioContext) {
    const ctx: FakeAudioContext = {
      state: "suspended",
      destination: {},
      createBufferSource: jest.fn(() => {
        const source: FakeBufferSource = {
          buffer: null,
          loop: false,
          loopStart: 0,
          loopEnd: 0,
          start: jest.fn(),
          stop: jest.fn(),
          connect: jest.fn(),
          disconnect: jest.fn(),
        };
        fake.sources.push(source);
        return source;
      }),
      createGain: jest.fn(() => {
        const gain: FakeGainNode = {
          gain: { value: 1 },
          connect: jest.fn(),
          disconnect: jest.fn(),
        };
        fake.gains.push(gain);
        return gain;
      }),
      decodeAudioData: jest.fn(async (bytes: ArrayBuffer) => {
        if (fake.decodeError) throw fake.decodeError;
        const url = urlFor(bytes);
        return {
          duration: fake.durations.get(url) ?? DEFAULT_BED_SECONDS,
          sampleRate: 44100,
        } satisfies FakeAudioBuffer;
      }),
      resume: jest.fn(async () => {
        if (!fake.resumeFails) ctx.state = "running";
      }),
      suspend: jest.fn(async () => {
        ctx.state = "suspended";
      }),
    };
    fake.contexts.push(ctx);
    return ctx;
  }

  if (withoutConstructor) {
    delete g.AudioContext;
    delete g.webkitAudioContext;
  } else {
    g.AudioContext = FakeAudioContextCtor as unknown;
  }

  return fake;
}

/** Forget the fakes so a later non-web test does not see a Web Audio browser. */
export function uninstallFakeWebAudio() {
  const g = globalThis as unknown as Globals;
  delete g.AudioContext;
  delete g.webkitAudioContext;
  delete g.fetch;
  if (g.navigator) delete g.navigator.audioSession;
}

// A one-byte "file" per URL, so the fake decoder can tell the beds apart without
// carrying real audio: the byte is an index into this table.
const urls: string[] = [];
function bytesFor(url: string): ArrayBuffer {
  let index = urls.indexOf(url);
  if (index === -1) index = urls.push(url) - 1;
  const bytes = new Uint8Array(1);
  bytes[0] = index;
  return bytes.buffer;
}
function urlFor(bytes: ArrayBuffer): string {
  return urls[new Uint8Array(bytes)[0]] ?? "";
}
