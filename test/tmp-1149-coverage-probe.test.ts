// THROWAWAY probe for #1149 — not a gate.
//
// #1149's body says "no existing guard covers this". Before recording numbers,
// check whether that is true: `test/theme-contrast.test.ts` runs `auditTokens`
// over every style x scheme already. The question is whether its pairings
// SUBSUME the toast's — a check that is stricter than the toast's pair covers
// the toast's pair, and one that is looser does not.
import { auditTokens, compositeOver, contrastRatio, tripleToRgb } from "@/src/lib/theme/contrast";
import { COLOR_SCHEMES } from "@/src/lib/theme/contract";
import { STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";

describe("#1149 — is the toast accent already gated?", () => {
  it("compares the audit's pairings to the toast's", () => {
    const rows: string[] = [];
    let markSubsumes = true;
    let inkSubsumes = true;
    let destructiveSubsumes = true;

    for (const style of STYLE_NAMES) {
      for (const scheme of COLOR_SCHEMES) {
        const t = THEME_TOKENS[style][scheme] as unknown as Record<string, string>;
        const card = tripleToRgb(t["--card"]);
        const accent = tripleToRgb(t["--primary"]);
        const ink = tripleToRgb(t["--primary-ink"]);
        const destructive = tripleToRgb(t["--destructive"]);

        // What the audit measures for "accent as a mark": the accent against a
        // 10% wash OF ITSELF over the neutral, not against the bare neutral.
        const washOnCard = compositeOver(accent, 0.1, card);
        const auditMark = contrastRatio(accent, washOnCard);
        // What the toast's bar actually is: the accent on the bare card.
        const toastBar = contrastRatio(accent, card);
        if (auditMark > toastBar) markSubsumes = false;

        // "primary ink" measures the ink on four surfaces INCLUDING card.
        const auditInkOnCard = contrastRatio(ink, card);
        const toastIcon = auditInkOnCard;
        if (auditInkOnCard > toastIcon) inkSubsumes = false;

        // "destructive ink" measures destructive on background and card at 4.5,
        // which is strictly above the 3.0 a mark owes.
        const auditDestructiveOnCard = contrastRatio(destructive, card);
        if (auditDestructiveOnCard < 4.5) destructiveSubsumes = false;

        rows.push(
          `${style}/${scheme}  auditMark(accent vs accent/10-on-card)=${auditMark.toFixed(2)}  toastBar(accent vs card)=${toastBar.toFixed(2)}  ${auditMark <= toastBar ? "audit is STRICTER -> subsumes" : "audit is LOOSER -> GAP"}`,
        );
        rows.push(
          `             destructive vs card = ${auditDestructiveOnCard.toFixed(2)} (audit floor 4.5, mark floor 3.0)   primary-ink vs card = ${auditInkOnCard.toFixed(2)}`,
        );

        // And prove the audit currently passes, so "already gated" means
        // "gated and green", not "gated and failing".
        expect(auditTokens(THEME_TOKENS[style][scheme])).toEqual([]);
      }
    }

    rows.push("");
    rows.push(`bar subsumed by "accent as a mark":      ${markSubsumes}`);
    rows.push(`success icon subsumed by "primary ink":  ${inkSubsumes}`);
    rows.push(`error icon/bar subsumed by "destructive ink" at 4.5: ${destructiveSubsumes}`);

    console.log(rows.join("\n"));

    expect({ markSubsumes, inkSubsumes, destructiveSubsumes }).toEqual({
      markSubsumes: true,
      inkSubsumes: true,
      destructiveSubsumes: true,
    });
  });

  it("shows the audit has NO pairing for card-vs-background separation", () => {
    // Deliberately break the card so it is identical to the background — the
    // toast's dark-mode worst case — and prove the existing gate stays silent.
    const t = { ...THEME_TOKENS["quiet-lilac"].dark };
    t["--card"] = t["--background"];
    const findings = auditTokens(t);

    console.log(
      `\ncard forced equal to background — auditTokens findings: ${JSON.stringify(findings)}`,
    );
    expect(findings).toEqual([]);
  });
});
