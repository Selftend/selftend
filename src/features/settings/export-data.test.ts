import { buildExportFileName, serializeExport } from "@/src/features/settings/export-data";

describe("buildExportFileName", () => {
  it("builds a dated selftend-export json filename", () => {
    expect(buildExportFileName("2026-07-11")).toBe("selftend-export-2026-07-11.json");
  });

  it("interpolates the date key verbatim", () => {
    expect(buildExportFileName("1999-01-01")).toBe("selftend-export-1999-01-01.json");
  });
});

describe("serializeExport", () => {
  it("pretty-prints with 2-space indentation", () => {
    expect(serializeExport({ a: 1, b: [2, 3] })).toBe(
      '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}',
    );
  });

  it("round-trips through JSON.parse", () => {
    const data = { entries: [{ id: "x", value: 1 }], version: 2 };
    expect(JSON.parse(serializeExport(data))).toEqual(data);
  });
});
