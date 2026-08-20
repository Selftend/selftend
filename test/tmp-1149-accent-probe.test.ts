// THROWAWAY probe for #1149 — not a gate. Prints the toast accent's measured
// contrast for every style x scheme so the ticket can record numbers rather
// than assertions. Deleted before this branch is anything but a prototype.
import { AA_MARK, AA_TEXT, contrastRatio, tripleToRgb } from "@/src/lib/theme/contrast";
import { COLOR_SCHEMES } from "@/src/lib/theme/contract";
import { STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";

type Pair = { label: string; fg: string; bg: string; floor: number };

// The settled #1145 treatment, element by element. Surface is `bg-card`
// throughout: the toast is a Card with border-0 and dark:shadow-none.
const PAIRS = (t: Record<string, string>): Pair[] => [
  {
    label: "success icon  text-primary-ink  on card",
    fg: t["--primary-ink"],
    bg: t["--card"],
    floor: AA_MARK,
  },
  {
    label: "error   icon  text-destructive  on card",
    fg: t["--destructive"],
    bg: t["--card"],
    floor: AA_MARK,
  },
  {
    label: "success bar   bg-primary        on card",
    fg: t["--primary"],
    bg: t["--card"],
    floor: AA_MARK,
  },
  {
    label: "error   bar   bg-destructive    on card",
    fg: t["--destructive"],
    bg: t["--card"],
    floor: AA_MARK,
  },
  {
    label: "title         card-foreground   on card",
    fg: t["--card-foreground"],
    bg: t["--card"],
    floor: AA_TEXT,
  },
  {
    label: "desc + X      muted-foreground  on card",
    fg: t["--muted-foreground"],
    bg: t["--card"],
    floor: AA_TEXT,
  },
  // Decision 5 on #1145 created this one: no border, no shadow in dark, so the
  // toast's ONLY edge is card-vs-whatever-is-under-it. 3.0 is 1.4.11's boundary
  // floor, recorded as a reference point — the floor call is not this probe's.
  {
    label: "EDGE  card over --background          ",
    fg: t["--card"],
    bg: t["--background"],
    floor: AA_MARK,
  },
  {
    label: "EDGE  card over another card          ",
    fg: t["--card"],
    bg: t["--card"],
    floor: AA_MARK,
  },
];

describe("#1149 accent contrast probe", () => {
  it("prints every style x scheme", () => {
    const rows: string[] = [];
    const fails: string[] = [];
    for (const style of STYLE_NAMES) {
      for (const scheme of COLOR_SCHEMES) {
        const t = THEME_TOKENS[style][scheme] as unknown as Record<string, string>;
        rows.push(`\n=== ${style} / ${scheme} ===`);
        rows.push(
          `    tokens: primary ${t["--primary"]} | primary-ink ${t["--primary-ink"]} | destructive ${t["--destructive"]} | card ${t["--card"]} | background ${t["--background"]}`,
        );
        for (const p of PAIRS(t)) {
          const ratio = contrastRatio(tripleToRgb(p.fg), tripleToRgb(p.bg));
          const ok = ratio >= p.floor;
          rows.push(
            `    ${ok ? "PASS" : "FAIL"}  ${p.label}  ${ratio.toFixed(2)} (floor ${p.floor})`,
          );
          if (!ok)
            fails.push(`${style}/${scheme}  ${p.label.trim()}  ${ratio.toFixed(2)} < ${p.floor}`);
        }
      }
    }
    rows.push("\n=== FAILURES ===");
    rows.push(fails.length ? fails.join("\n") : "none");

    console.log(rows.join("\n"));
    expect(true).toBe(true);
  });
});
