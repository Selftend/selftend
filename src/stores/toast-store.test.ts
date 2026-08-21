import { MAX_TOASTS, SUCCESS_TOAST_MS, useToastStore } from "@/src/stores/toast-store";

/**
 * The store is a pure state machine (#1336): every transition below is decided
 * without rendering and without a clock, because the dismiss timer lives in the
 * host. That is the whole reason these tests can be this direct.
 *
 * No test here asserts a literal `id`. The counter is module-scoped and never
 * reset between tests, so a hardcoded id would pass only in the order it was
 * written in, and would break the moment a test is added above it.
 */

function show(title: string, tone: "success" | "error") {
  useToastStore.getState().showToast({ title, tone });
}

const queuedTitles = () => useToastStore.getState().queue.map((toast) => toast.title);

beforeEach(() => {
  useToastStore.setState({ visible: null, queue: [] });
});

describe("useToastStore - the transition table", () => {
  it("an empty slot takes whatever arrives", () => {
    show("Saved", "success");

    expect(useToastStore.getState().visible).toMatchObject({ title: "Saved", tone: "success" });
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("a success behind a visible success waits its turn rather than clobbering it", () => {
    show("First", "success");
    show("Second", "success");

    // The pre-#1336 store was a single slot, so "Second" would have silently
    // erased the confirmation for the action the user took first.
    expect(useToastStore.getState().visible).toMatchObject({ title: "First" });
    expect(queuedTitles()).toEqual(["Second"]);
  });

  it("an error preempts a visible success, and the displaced success is discarded", () => {
    show("Saved", "success");
    show("Something did not save", "error");

    expect(useToastStore.getState().visible).toMatchObject({
      title: "Something did not save",
      tone: "error",
    });
    // Not requeued: re-showing "Saved" after the failure would tell the user a
    // write landed at the very moment the app is telling them one did not.
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("an error preempting a QUEUE of successes discards all of them, not just the visible one", () => {
    show("First", "success");
    show("Second", "success");
    show("Something did not save", "error");

    expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("a success arriving behind an unread error is discarded, never queued", () => {
    show("Something did not save", "error");
    show("Saved", "success");

    // The invariant: an error owns the slot, so nothing queues behind it and
    // nothing sits in front of it.
    expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("an error replaces a visible error and leaves the queue empty", () => {
    show("First failure", "error");
    show("Second failure", "error");

    expect(useToastStore.getState().visible).toMatchObject({ title: "Second failure" });
    expect(useToastStore.getState().queue).toEqual([]);
  });
});

describe("useToastStore - overflow", () => {
  it("caps visible plus queued at MAX_TOASTS and drops the INCOMING toast", () => {
    show("First", "success");
    show("Second", "success");
    show("Third", "success");
    show("Fourth", "success");

    expect(MAX_TOASTS).toBe(3);
    expect(useToastStore.getState().visible).toMatchObject({ title: "First" });
    // "Fourth" is dropped rather than evicting "Second": once a toast has entered
    // the queue it is immutable, because evicting the oldest would delete the
    // confirmation for the action the user took FIRST.
    expect(queuedTitles()).toEqual(["Second", "Third"]);
  });

  it("an error is never dropped by the cap - it preempts even a full queue", () => {
    show("First", "success");
    show("Second", "success");
    show("Third", "success");
    show("Something did not save", "error");

    expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("dismissing a full queue makes room again", () => {
    show("First", "success");
    show("Second", "success");
    show("Third", "success");
    useToastStore.getState().dismissToast();
    show("Fourth", "success");

    expect(useToastStore.getState().visible).toMatchObject({ title: "Second" });
    expect(queuedTitles()).toEqual(["Third", "Fourth"]);
  });
});

describe("useToastStore - dismissing and clearing", () => {
  it("dismissToast promotes the head of the queue", () => {
    show("First", "success");
    show("Second", "success");

    useToastStore.getState().dismissToast();

    expect(useToastStore.getState().visible).toMatchObject({ title: "Second" });
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("dismissToast empties the slot when nothing is waiting", () => {
    show("Saved", "success");

    useToastStore.getState().dismissToast();

    expect(useToastStore.getState().visible).toBeNull();
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("dismissToast on an empty store is a no-op, not a crash", () => {
    useToastStore.getState().dismissToast();

    expect(useToastStore.getState().visible).toBeNull();
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("clearToasts drops the visible toast AND everything queued behind it", () => {
    show("First", "success");
    show("Second", "success");
    show("Third", "success");

    useToastStore.getState().clearToasts();

    expect(useToastStore.getState().visible).toBeNull();
    expect(useToastStore.getState().queue).toEqual([]);
  });

  it("clearToasts removes a sticky error, which nothing else ever will on its own", () => {
    show("Something did not save", "error");

    useToastStore.getState().clearToasts();

    expect(useToastStore.getState().visible).toBeNull();
  });
});

describe("useToastStore - identity and timing", () => {
  it("gives every toast a distinct id, so the host can key its timer on one", () => {
    show("First", "success");
    show("Second", "success");

    const { visible, queue } = useToastStore.getState();
    expect(visible?.id).toEqual(expect.any(Number));
    expect(visible?.id).not.toBe(queue[0]?.id);
  });

  it("schedules nothing itself: a success outlives its own duration inside the store", () => {
    jest.useFakeTimers();
    try {
      show("Saved", "success");

      jest.advanceTimersByTime(SUCCESS_TOAST_MS * 10);

      // The store holds no timer - dismissal is the host's job, and that split is
      // what makes "no timer is ever scheduled for an error" provable at all.
      expect(useToastStore.getState().visible).toMatchObject({ title: "Saved" });
    } finally {
      jest.useRealTimers();
    }
  });
});
