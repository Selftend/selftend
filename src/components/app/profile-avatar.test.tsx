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

  it("renders ? when neither name nor email is available", () => {
    renderWithProviders(<ProfileAvatar />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("labels the avatar with the localized alt text", () => {
    renderWithProviders(<ProfileAvatar name="alex" email="ux-user@example.com" />);
    expect(screen.getByLabelText("User avatar")).toBeTruthy();
  });
});
