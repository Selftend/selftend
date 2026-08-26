import { fireEvent, screen } from "@testing-library/react-native";

import { ThoughtRecordRow } from "./thought-record-row";
import type { NegativeAutomaticThought, ThoughtRecord } from "@/src/features/cbt/types";
import { renderWithProviders } from "@/test/render-with-providers";

function nat(over: Partial<NegativeAutomaticThought> = {}): NegativeAutomaticThought {
  return { text: "a thought", beliefRating: null, isHotThought: false, ...over };
}

function record(over: Partial<ThoughtRecord> = {}): ThoughtRecord {
  return {
    id: "r1",
    userId: "u1",
    situation: "",
    nats: [],
    emotions: [],
    emotionIntensityBefore: null,
    distortions: [],
    evidenceFor: [],
    evidenceAgainst: [],
    balancedThought: "a calmer version",
    emotionIntensityAfter: null,
    outcomeNotes: "",
    beliefAfter: null,
    createdAt: "2026-05-01T09:00:00.000Z",
    createdOffsetMinutes: 0,
    dayKey: "2026-05-01",
    updatedAt: "2026-05-02T09:00:00.000Z",
    archivedAt: null,
    ...over,
  };
}

describe("ThoughtRecordRow", () => {
  it("leads with the hot thought and opens the record", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <ThoughtRecordRow
        record={record({
          nats: [nat({ text: "cold one" }), nat({ text: "the hot one", isHotThought: true })],
        })}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByText("the hot one"));
    expect(onPress).toHaveBeenCalled();
  });

  it("falls back to the situation, then to a placeholder, when there is no thought", () => {
    const { rerender } = renderWithProviders(
      <ThoughtRecordRow record={record({ situation: "the standup" })} onPress={jest.fn()} />,
    );
    expect(screen.getByText("the standup")).toBeTruthy();

    rerender(<ThoughtRecordRow record={record()} onPress={jest.fn()} />);
    expect(screen.getByText("Untitled thought record")).toBeTruthy();
  });

  /**
   * ⚠️ A deliberate change to the history screen's shipped chain, pinned so it
   * is a decision rather than a drift: with nothing flagged it used to take the
   * FIRST thought and now takes the highest-rated one, which is what the form,
   * the completion screen and the detail screen already show for that record.
   */
  it("falls back to the highest-rated thought when none is flagged hot", () => {
    renderWithProviders(
      <ThoughtRecordRow
        record={record({
          nats: [
            nat({ text: "mild one", beliefRating: 20 }),
            nat({ text: "the loud one", beliefRating: 90 }),
          ],
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("the loud one")).toBeTruthy();
  });

  it("renders the belief pair when both numbers are present", () => {
    renderWithProviders(
      <ThoughtRecordRow
        record={record({
          nats: [nat({ beliefRating: 85, isHotThought: true })],
          beliefAfter: 40,
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Belief 85 -> 40")).toBeTruthy();
  });

  it("omits the belief pair - never dashes it - when either number is missing", () => {
    const { rerender } = renderWithProviders(
      <ThoughtRecordRow
        record={record({
          nats: [nat({ beliefRating: 85, isHotThought: true })],
          beliefAfter: null,
        })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText(/Belief/)).toBeNull();

    rerender(
      <ThoughtRecordRow
        record={record({
          nats: [nat({ beliefRating: null, isHotThought: true })],
          beliefAfter: 40,
        })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText(/Belief/)).toBeNull();
  });

  it("renders a zero belief pair, which is a value and not an absence", () => {
    renderWithProviders(
      <ThoughtRecordRow
        record={record({ nats: [nat({ beliefRating: 0, isHotThought: true })], beliefAfter: 0 })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Belief 0 -> 0")).toBeTruthy();
  });

  /**
   * The list is ordered by `updated_at`, so a bare date would present an edit as
   * the moment the thought was written.
   */
  it("labels the timestamp as an update", () => {
    renderWithProviders(<ThoughtRecordRow record={record()} onPress={jest.fn()} />);

    expect(screen.getByText(/^Updated /)).toBeTruthy();
  });

  /**
   * ☠️ An explicit `accessibilityLabel` on the row would hide its children from
   * assistive tech on the web, silencing the belief pair and the timestamp.
   */
  it("has no explicit accessible name, so its children stay readable", () => {
    renderWithProviders(
      <ThoughtRecordRow
        record={record({ nats: [nat({ text: "the thought", isHotThought: true })] })}
        onPress={jest.fn()}
      />,
    );

    const row = screen.getByRole("button");
    expect(row.props.accessibilityLabel).toBeUndefined();
    expect(row.props["aria-label"]).toBeUndefined();
  });
});
