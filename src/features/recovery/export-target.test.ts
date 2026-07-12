import { Platform } from "react-native";

import { deliverMarkdown } from "@/src/features/recovery/export-target";

const originalOS = Platform.OS;

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true, writable: true });
}

afterEach(() => {
  Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true, writable: true });
  jest.restoreAllMocks();
});

describe("deliverMarkdown", () => {
  // NOTE: the native branch (`await import("react-native")` -> Share.share) cannot be
  // exercised under jest's VM (dynamic import is unsupported without experimental ESM),
  // so it is verified manually on device — see visual-check-cbt-recovery.md (R3). This
  // suite covers the web Blob-download branch, which is pure DOM glue.
  it("web: downloads a markdown blob via a temporary anchor and revokes the URL", async () => {
    setPlatformOS("web");

    const click = jest.fn();
    const anchor: { href: string; download: string; click: jest.Mock } = {
      href: "",
      download: "",
      click,
    };
    const appendChild = jest.fn();
    const removeChild = jest.fn();

    const originalBlob = (global as { Blob?: unknown }).Blob;
    const originalDocument = (global as { document?: unknown }).document;
    const hadCreate = "createObjectURL" in URL;
    const hadRevoke = "revokeObjectURL" in URL;

    (global as { Blob?: unknown }).Blob = jest.fn(function MockBlob(
      this: { parts: unknown; opts: unknown },
      parts: unknown,
      opts: unknown,
    ) {
      this.parts = parts;
      this.opts = opts;
    });
    (URL as unknown as { createObjectURL: jest.Mock }).createObjectURL = jest.fn(() => "blob:url");
    (URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL = jest.fn();
    (global as { document?: unknown }).document = {
      createElement: jest.fn(() => anchor),
      body: { appendChild, removeChild },
    };

    try {
      await deliverMarkdown("BODY", "myfile.md", "Share title");

      expect((URL as unknown as { createObjectURL: jest.Mock }).createObjectURL).toHaveBeenCalled();
      expect(anchor.href).toBe("blob:url");
      expect(anchor.download).toBe("myfile.md");
      expect(appendChild).toHaveBeenCalledWith(anchor);
      expect(click).toHaveBeenCalledTimes(1);
      expect(removeChild).toHaveBeenCalledWith(anchor);
      expect(
        (URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL,
      ).toHaveBeenCalledWith("blob:url");
    } finally {
      if (originalBlob === undefined) {
        delete (global as { Blob?: unknown }).Blob;
      } else {
        (global as { Blob?: unknown }).Blob = originalBlob;
      }
      if (originalDocument === undefined) {
        delete (global as { document?: unknown }).document;
      } else {
        (global as { document?: unknown }).document = originalDocument;
      }
      if (!hadCreate) {
        delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
      }
      if (!hadRevoke) {
        delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
      }
    }
  });
});
