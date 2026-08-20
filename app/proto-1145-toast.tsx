// PROTOTYPE — throwaway, never merged to main. Answers #1145: what does the
// toast accent actually look like?
//
// Public route (outside `(app)`) so it needs no sign-in. Run `npm run web` and
// open /proto-1145-toast.
//
// Both schemes render on one page by applying the theme's own `vars()` objects
// per block, the same way `app/_layout.tsx` applies them at the root. Caveat:
// NativeWind's `dark:` variant is NOT switched by that, so the dark block still
// paints the light `shadow-black/5` instead of `dark:shadow-none`. Geometry,
// colour and layout are honest; that one shadow is not.
//
// Copy is hardcoded English on purpose — a prototype route ships no i18n keys.

import { Pressable, ScrollView, View } from "react-native";

import { Card, CardDescription, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { THEME_VARIABLES } from "@/lib/theme";

type Tone = "success" | "error";

interface ToneStyle {
  /** The accent bar. Full accent — decorative, redundant with icon + copy. */
  bar: string;
  /**
   * The icon's ink. `--destructive` is already gated at AA against card
   * (theme/contrast.ts), but raw `--primary` is not — which is exactly why
   * `--primary-ink` exists. Hence the asymmetry: there is no `destructive-ink`.
   */
  ink: string;
  /** Tinted glyph box, borrowed from program-card's `eyebrowGlyphBox`. */
  box: string;
  icon: MaterialIconName;
}

const TONE: Record<Tone, ToneStyle> = {
  success: {
    bar: "bg-primary",
    ink: "text-primary-ink",
    box: "border-primary/30 bg-primary/10",
    icon: "check-circle",
  },
  error: {
    bar: "bg-destructive",
    ink: "text-destructive",
    box: "border-destructive/30 bg-destructive/10",
    icon: "error",
  },
};

const COPY: Record<Tone, { title: string; description: string }> = {
  success: { title: "Saved", description: "Gratitude entry" },
  error: { title: "Something did not save", description: "Notifications are blocked." },
};

interface CardProps {
  tone: Tone;
  withDescription: boolean;
}

function DismissX({ className }: { className?: string }) {
  return (
    <Pressable
      accessibilityLabel="Dismiss"
      className={`size-9 items-center justify-center rounded-full ${className ?? ""}`}
      role="button"
    >
      <Icon name="close" className="size-5 text-muted-foreground" />
    </Pressable>
  );
}

function Body({ tone, withDescription }: CardProps) {
  return (
    <View className="flex-1 gap-1">
      <CardTitle>{COPY[tone].title}</CardTitle>
      {withDescription ? <CardDescription>{COPY[tone].description}</CardDescription> : null}
    </View>
  );
}

/** Today: tone is a border colour and nothing else. No icon, no X. */
function Baseline({ tone, withDescription }: CardProps) {
  const border = tone === "success" ? "border-primary" : "border-destructive";
  return (
    <Card className={`gap-0 px-4 py-4 shadow-md ${border}`}>
      <Body tone={tone} withDescription={withDescription} />
    </Card>
  );
}

/** A — flush 4px bar, inline icon, X pinned top-right. */
function VariantA({ tone, withDescription }: CardProps) {
  const t = TONE[tone];
  return (
    <Card className="gap-0 py-4 pl-4 pr-2 shadow-md">
      <View className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} />
      <View className="flex-row items-start gap-3 pl-2">
        <Icon name={t.icon} className={`mt-0.5 size-5 ${t.ink}`} />
        <Body tone={tone} withDescription={withDescription} />
        <DismissX className="-mt-2" />
      </View>
    </Card>
  );
}

/** B — flush 4px bar, icon in a tinted glyph box, X pinned top-right. */
function VariantB({ tone, withDescription }: CardProps) {
  const t = TONE[tone];
  return (
    <Card className="gap-0 py-4 pl-4 pr-2 shadow-md">
      <View className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} />
      <View className="flex-row items-center gap-3 pl-2">
        <View className={`size-9 items-center justify-center rounded-lg border ${t.box}`}>
          <Icon name={t.icon} className={`size-5 ${t.ink}`} />
        </View>
        <Body tone={tone} withDescription={withDescription} />
        <DismissX />
      </View>
    </Card>
  );
}

/** C — inset pill bar, no border at all, X vertically centred. */
function VariantC({ tone, withDescription }: CardProps) {
  const t = TONE[tone];
  return (
    <Card className="gap-0 border-0 py-4 pl-3 pr-2 shadow-md">
      <View className={`absolute bottom-3 left-3 top-3 w-1 rounded-full ${t.bar}`} />
      <View className="flex-row items-center gap-3 pl-4">
        <Icon name={t.icon} className={`size-5 ${t.ink}`} />
        <Body tone={tone} withDescription={withDescription} />
        <DismissX />
      </View>
    </Card>
  );
}

/** D — A with a 6px bar and a tone-tinted gutter: the "is 4px loud enough?" test. */
function VariantD({ tone, withDescription }: CardProps) {
  const t = TONE[tone];
  const gutter = tone === "success" ? "bg-primary/10" : "bg-destructive/10";
  return (
    <Card className="gap-0 py-4 pl-4 pr-2 shadow-md">
      <View className={`absolute inset-y-0 left-0 w-11 ${gutter}`} />
      <View className={`absolute inset-y-0 left-0 w-1.5 ${t.bar}`} />
      <View className="flex-row items-start gap-3 pl-2">
        <Icon name={t.icon} className={`mt-0.5 size-5 ${t.ink}`} />
        <Body tone={tone} withDescription={withDescription} />
        <DismissX className="-mt-2" />
      </View>
    </Card>
  );
}

const VARIANTS = [
  { label: "Today (tone = border only)", Component: Baseline },
  { label: "A — flush 4px bar, inline icon, X top-right", Component: VariantA },
  { label: "B — flush 4px bar, glyph box, X top-right", Component: VariantB },
  { label: "C — inset pill bar, no border, X centred", Component: VariantC },
  { label: "D — 6px bar + tinted icon gutter (louder)", Component: VariantD },
];

const CASES: CardProps[] = [
  { tone: "success", withDescription: false },
  { tone: "success", withDescription: true },
  { tone: "error", withDescription: false },
  { tone: "error", withDescription: true },
];

function Block({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <View className="flex-1 bg-background p-4" style={THEME_VARIABLES["quiet-lilac"][scheme]}>
      <Text className="pb-3 text-xs font-semibold uppercase text-muted-foreground">{scheme}</Text>
      <View className="gap-6">
        {VARIANTS.map(({ label, Component }) => (
          <View key={label} className="gap-2">
            <Text className="text-xs text-muted-foreground">{label}</Text>
            {CASES.map((c) => (
              <View key={`${c.tone}-${String(c.withDescription)}`} className="w-[358px]">
                <Component {...c} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Proto1145Toast() {
  return (
    <ScrollView testID="proto-1145">
      <View className="flex-row">
        <Block scheme="light" />
        <Block scheme="dark" />
      </View>
    </ScrollView>
  );
}
