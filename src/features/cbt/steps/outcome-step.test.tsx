import { fireEvent, screen, within } from "@testing-library/react-native";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { OutcomeStep } from "@/src/features/cbt/steps/outcome-step";
import { defaultValues } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { renderWithProviders } from "@/test/render-with-providers";

// The wizard's closing step. It carries three fields: the belief re-rating that
// #1376 adds, and the emotion intensity + outcome notes that ruling F3 keeps -
// the design drops both, and dropping intensity would silently break the
// completion screen, which renders ONLY the intensity pair.
//
// Both ratings are the same 0-100 control, so every query here is scoped by
// testID: an unscoped getByText("40") would match whichever happened to render
// first and would keep passing if the two were swapped.

const HOT_TEXT = "I will be late and they will think I am unreliable";

// Read imperatively after the event rather than through `form.watch()`, which
// the React Compiler lint cannot memoize and warns on.
let getFormValues: () => ThoughtRecordFormSchema;
const values = () => getFormValues();

function Harness({ initial }: { initial?: Partial<ThoughtRecordFormSchema> }) {
  const form = useForm<ThoughtRecordFormSchema>({
    defaultValues: {
      ...defaultValues,
      nats: [
        { text: "Traffic is bad", beliefRating: 40, isHotThought: false },
        { text: HOT_TEXT, beliefRating: 90, isHotThought: true },
      ],
      ...initial,
    },
  });
  // In an effect, not the render body: assigning to a module global during
  // render is a side effect, and react-hooks/globals rejects it outright.
  useEffect(() => {
    getFormValues = form.getValues;
  }, [form]);
  return <OutcomeStep control={form.control} errors={form.formState.errors} />;
}

const beliefRating = () => within(screen.getByTestId("belief-after-rating"));

describe("OutcomeStep - belief after", () => {
  it("names the hot thought being re-rated, not the first thought in the list", () => {
    // "Believe it how much now?" is unanswerable without saying which thought,
    // and the hot thought is not necessarily the first one captured.
    renderWithProviders(<Harness />);
    expect(screen.getByText(HOT_TEXT)).toBeTruthy();
  });

  it("writes the tapped rating into beliefAfter", () => {
    renderWithProviders(<Harness />);

    fireEvent.press(beliefRating().getByText("40"));

    expect(values().beliefAfter).toBe(40);
    // The emotion intensity is a separate field and must not move with it.
    expect(values().emotionIntensityAfter).toBeNull();
  });

  it("records a tapped 0 as zero, not as 'unrated'", () => {
    // 0 is a real and meaningful answer here - "I no longer believe it at all"
    // is the best outcome the record can have, and falsy-checking it away would
    // erase exactly the records that worked.
    renderWithProviders(<Harness />);

    fireEvent.press(beliefRating().getByText("0"));

    expect(values().beliefAfter).toBe(0);
  });

  it("leaves beliefAfter null when the rating is never touched", () => {
    // AC: the form is not gated on this field - a record saved without it is a
    // record with a null belief, not a blocked save.
    renderWithProviders(<Harness />);
    expect(values().beliefAfter).toBeNull();
  });

  it("shows a saved value when an existing record is edited", () => {
    renderWithProviders(<Harness initial={{ beliefAfter: 30 }} />);
    expect(values().beliefAfter).toBe(30);
  });

  it("still renders the emotion intensity and outcome notes fields (ruling F3)", () => {
    renderWithProviders(<Harness />);
    expect(screen.getByText("Emotion intensity after (0-100)")).toBeTruthy();
    expect(screen.getByLabelText("Outcome notes")).toBeTruthy();
  });
});
