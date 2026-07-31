// Colour maths shared by the theme engine: hex <-> the "H S% L%" triple form
// the token contract is written in, plus the linear mix the derivation rules
// are expressed with. Kept apart from derive.ts so the contrast gate (#560) and
// the selector's swatches (#583) can reach the same conversions without
// importing a palette.

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const match = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) throw new Error(`Unparseable hex: "${hex}"`);
  const digits = match[1];
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Linear RGB mix of two hexes; t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/** Hex → the "H S% L%" triple global.css and tailwind's hsl(var(--…)) use. */
export function hexToHslTriple(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Parse "262 62% 56%" → [degree, saturation, lightness] as plain numbers. */
export function parseHslTriple(triple: string): [number, number, number] {
  const match = triple.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) throw new Error(`Unparseable HSL triple: "${triple}"`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** "H S% L%" → "#rrggbb", the inverse of hexToHslTriple. */
export function hslTripleToHex(triple: string): string {
  const [h, s, l] = parseHslTriple(triple);
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let rgb: Rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex([(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255]);
}

/**
 * "262 62% 56%" + 28 → "262 62% 28%". Degree and saturation are the colour's
 * identity, so the ink recipes move lightness only — a floor met by throwing the
 * hue away is met by near-black, which reads as no accent at all.
 */
export function withLightness(triple: string, lightness: number): string {
  const [h, s] = parseHslTriple(triple);
  return `${h} ${s}% ${lightness}%`;
}
