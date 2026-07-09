import { render } from "@testing-library/react-native";

import { ProfileAvatar } from "./profile-avatar";

describe("ProfileAvatar", () => {
  it("uses the display name initial when a name is provided", () => {
    const { getByText } = render(<ProfileAvatar name="alex" email="ux-user@example.com" />);
    expect(getByText("A")).toBeTruthy();
  });

  it("falls back to the email initial without a name", () => {
    const { getByText } = render(<ProfileAvatar email="ux-user@example.com" />);
    expect(getByText("U")).toBeTruthy();
  });

  it("renders ? when neither name nor email is available", () => {
    const { getByText } = render(<ProfileAvatar />);
    expect(getByText("?")).toBeTruthy();
  });
});
