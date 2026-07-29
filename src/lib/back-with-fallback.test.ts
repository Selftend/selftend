import { router } from "expo-router";

import { backWithFallback } from "@/src/lib/back-with-fallback";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    replace: jest.fn(),
  },
}));

const mockRouter = jest.mocked(router);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("backWithFallback", () => {
  it("goes back when there is navigation history", () => {
    mockRouter.canGoBack.mockReturnValue(true);

    backWithFallback("/modules/cbt");

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("replaces with the fallback when the page has no back stack (deep link/refresh)", () => {
    mockRouter.canGoBack.mockReturnValue(false);

    backWithFallback("/modules/cbt");

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/modules/cbt");
  });
});
