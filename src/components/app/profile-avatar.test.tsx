import { screen } from "@testing-library/react-native";

import { ProfileAvatar } from "./profile-avatar";
import { renderWithProviders } from "@/test/render-with-providers";

describe("ProfileAvatar", () => {
  it("uses the display name initial when a name is provided", () => {
    renderWithProviders(<ProfileAvatar name="alex" email="ux-user@example.com" />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("falls back to the email initial without a name", () => {
    renderWithProviders(<ProfileAvatar email="ux-user@example.com" />);
    expect(screen.getByText("U")).toBeTruthy();
  });

  /**
   * #1810 replaced the `?`. It was `getInitial`'s refusal-to-invent sentinel
   * leaking into the UI, and it reads as an error where the truth is only *no
   * photo yet*. Asserted by testID: the glyph is `aria-hidden`, so it has no
   * accessible name to query by — and that is deliberate, since the name sits
   * beside it.
   */
  it("draws a person glyph, not a `?`, when neither name nor email is available", () => {
    renderWithProviders(<ProfileAvatar />);

    expect(screen.getByTestId("profile-avatar-person")).toBeTruthy();
    expect(screen.queryByText("?")).toBeNull();
  });

  /**
   * ☠️ The live guest shape. `user.email` is `""`, not `undefined`, and the type
   * is `email?: string` so a `??` chain typechecks and then indexes into an
   * empty string. Pin the empty string, or the fixture hides the bug.
   */
  it("draws the glyph for a guest, whose email is an empty string", () => {
    renderWithProviders(<ProfileAvatar email="" name={null} />);

    expect(screen.getByTestId("profile-avatar-person")).toBeTruthy();
  });

  it("labels the avatar with the localized alt text", () => {
    renderWithProviders(<ProfileAvatar name="alex" email="ux-user@example.com" />);
    expect(screen.getByLabelText("User avatar")).toBeTruthy();
  });
});
