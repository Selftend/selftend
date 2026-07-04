import {
  createAppQueryClient,
  reportMutationError,
  reportQueryError,
} from "@/src/lib/query-client";
import { captureError } from "@/src/lib/sentry";

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  isReportableError: jest.requireActual("@/src/lib/sentry").isReportableError,
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
}));

describe("reportQueryError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures unexpected errors with the query key as context", () => {
    reportQueryError(new Error("boom"), ["journal", "list"]);

    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      queryKey: '["journal","list"]',
    });
  });

  it("ignores offline network errors", () => {
    reportQueryError(new TypeError("Network request failed"), ["journal", "list"]);

    expect(captureError).not.toHaveBeenCalled();
  });
});

describe("reportMutationError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures unexpected errors with the mutation key as context", () => {
    reportMutationError(new Error("boom"), ["journal", "save"]);

    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      mutationKey: '["journal","save"]',
    });
  });
});

describe("createAppQueryClient", () => {
  it("keeps the existing defaults", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.retry).toBe(1);
  });
});
