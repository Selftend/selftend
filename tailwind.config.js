const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // The app accent as small-text ink (#421) — `text-primary-ink`, the
        // `primary` counterpart of the `text-<hue>-ink` block below. Registered
        // flat rather than as `primary.ink` so it reads like `accent-ink` and
        // the other ink tokens; both spellings would compile the same class.
        // NOT `primary-foreground`, which is ink *on* `--primary` (white).
        "primary-ink": "hsl(var(--primary-ink))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        think: "hsl(var(--think))",
        act: "hsl(var(--act))",
        be: "hsl(var(--be))",
        aqua: "hsl(var(--aqua))",
        mist: "hsl(var(--mist))",
        iris: "hsl(var(--iris))",
        ink: "hsl(var(--ink))",
        clay: "hsl(var(--clay))",
        // Each hue as small-text ink (#403) — `text-<hue>-ink` for a hue used
        // as text on the neutral app surface, where `text-<hue>` is below AA
        // for four of the eight. Both forms now exist only for the encoding
        // palette; the eslint rule in this repo fails a build that paints one
        // as chrome (#589).
        // `text-<hue>` remains correct for icons, large numerals and anything
        // decorative. (`ink-ink` is the ink hue's ink — the one awkward name the
        // otherwise-mechanical `<hue>-ink` pattern produces.)
        "think-ink": "hsl(var(--think-ink))",
        "act-ink": "hsl(var(--act-ink))",
        "be-ink": "hsl(var(--be-ink))",
        "aqua-ink": "hsl(var(--aqua-ink))",
        "mist-ink": "hsl(var(--mist-ink))",
        "iris-ink": "hsl(var(--iris-ink))",
        "ink-ink": "hsl(var(--ink-ink))",
        "clay-ink": "hsl(var(--clay-ink))",
      },
      fontFamily: {
        // The Nunito display face; resolveFontFamily in
        // src/components/react-native-reusables/text.tsx maps h1–h2 and this
        // class to it on native.
        display: ["Nunito_800ExtraBold", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require("tailwindcss-animate")],
};
