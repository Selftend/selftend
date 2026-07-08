"use no memo";

import { FlexWidget, IconWidget, TextWidget, type HexColor } from "react-native-android-widget";
import {
  PALETTE,
  TINTS,
  withAlpha,
  type Theme,
  type TintName,
} from "@/src/features/widgets/palette";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";
import type { CardCta } from "@/src/features/widgets/snapshot-types";

export const MATERIAL_FONT = "MaterialIcons";

/** In-app MaterialIconName ("show-chart") → MaterialIcons.ttf ligature ("show_chart"). */
export const glyph = (name: string) => name.replace(/-/g, "_");

const FACES = ["😭", "🙁", "😐", "😊", "😁"]; // score 1..5, mirrors MoodScale

export function CardFrame({
  theme,
  opacity,
  children,
}: {
  theme: Theme;
  opacity: number;
  children: React.ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        padding: 16,
        backgroundColor: withAlpha(c.card, opacity),
        borderRadius: 12, // in-app Card rounded-xl
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      {children}
    </FlexWidget>
  );
}

export function Pill({
  text,
  color,
  bg,
  uppercase,
}: {
  text: string;
  color: HexColor;
  bg: HexColor;
  uppercase?: boolean;
}) {
  return (
    <FlexWidget
      style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: bg }}
    >
      <TextWidget
        text={uppercase ? text.toUpperCase() : text}
        style={{
          fontSize: uppercase ? 10 : 11,
          fontWeight: "600",
          color,
          ...(uppercase ? { letterSpacing: 1 } : {}),
        }}
      />
    </FlexWidget>
  );
}

export function ReplicaHeader({
  theme,
  icon,
  tint,
  title,
  pill,
  moduleLabel,
}: {
  theme: Theme;
  icon: string;
  tint: TintName;
  title: string;
  pill?: { text: string; tone: "primary" | "muted" } | null;
  moduleLabel?: string;
}) {
  const c = PALETTE[theme];
  const tintHex = TINTS[theme][tint] as HexColor;
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <FlexWidget
          style={{
            width: 32,
            height: 32,
            borderRadius: 8, // size-8 rounded-lg chip
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(tintHex, 0.1),
          }}
        >
          <IconWidget
            font={MATERIAL_FONT}
            icon={glyph(icon)}
            size={20}
            style={{ color: tintHex }}
          />
        </FlexWidget>
        <TextWidget
          text={title}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 14, fontWeight: "600", color: c.fg, marginLeft: 8 }}
        />
      </FlexWidget>
      {moduleLabel ? (
        <Pill text={moduleLabel} color={tintHex} bg={withAlpha(tintHex, 0.1)} uppercase />
      ) : pill ? (
        pill.tone === "primary" ? (
          <Pill
            text={pill.text}
            color={TINTS[theme].primary as HexColor}
            bg={withAlpha(TINTS[theme].primary, 0.1)}
          />
        ) : (
          <Pill text={pill.text} color={c.muted} bg={c.mutedBg} />
        )
      ) : null}
    </FlexWidget>
  );
}

export function BodyText({
  theme,
  text,
  emphasis,
}: {
  theme: Theme;
  text: string;
  emphasis?: boolean;
}) {
  const c = PALETTE[theme];
  return (
    <TextWidget
      text={text}
      truncate="END"
      maxLines={2}
      style={
        emphasis
          ? { fontSize: 14, fontWeight: "500", color: c.fg, marginTop: 12 }
          : { fontSize: 12, color: c.muted, marginTop: 12 }
      }
    />
  );
}

export function TwoStat({
  theme,
  stats,
}: {
  theme: Theme;
  stats: { value: string; label: string }[];
}) {
  const c = PALETTE[theme];
  return (
    <FlexWidget style={{ flexDirection: "row", marginTop: 12, width: "match_parent" }}>
      {stats.map((s, i) => (
        <FlexWidget
          key={s.label}
          style={{ flexDirection: "column", ...(i > 0 ? { marginLeft: 24 } : {}) }}
        >
          <TextWidget text={s.value} style={{ fontSize: 16, fontWeight: "600", color: c.fg }} />
          <TextWidget text={s.label} style={{ fontSize: 11, color: c.muted, marginTop: 2 }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function StatTiles({
  theme,
  tiles,
}: {
  theme: Theme;
  tiles: { label: string; value: string; dim?: boolean }[];
}) {
  const c = PALETTE[theme];
  return (
    <FlexWidget style={{ flexDirection: "row", marginTop: 12, width: "match_parent" }}>
      {tiles.map((tile, i) => (
        <FlexWidget
          key={tile.label}
          style={{
            flex: 1,
            flexDirection: "column",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: withAlpha(c.mutedBg, 0.4),
            ...(i > 0 ? { marginLeft: 12 } : {}),
          }}
        >
          <TextWidget
            text={tile.label.toUpperCase()}
            style={{ fontSize: 11, letterSpacing: 0.5, color: c.muted }}
          />
          <TextWidget
            text={tile.value}
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: tile.dim ? c.muted : c.fg,
              marginTop: 2,
            }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function OutlineButton({ theme, cta }: { theme: Theme; cta: CardCta }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      clickAction={OPEN_PATH}
      clickActionData={{ path: cta.path }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 36, // Button size="sm"
        paddingHorizontal: 12,
        borderRadius: 6, // rounded-md
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      {cta.icon ? (
        <IconWidget
          font={MATERIAL_FONT}
          icon={glyph(cta.icon)}
          size={16}
          style={{ color: c.fg, marginRight: 6 }}
        />
      ) : null}
      <TextWidget text={cta.label} style={{ fontSize: 14, fontWeight: "500", color: c.fg }} />
    </FlexWidget>
  );
}

export function GhostButton({ theme, cta }: { theme: Theme; cta: CardCta }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      clickAction={OPEN_PATH}
      clickActionData={{ path: cta.path }}
      style={{ flexDirection: "row", alignItems: "center", height: 36, paddingHorizontal: 12 }}
    >
      <TextWidget
        text={cta.label}
        style={{ fontSize: 14, fontWeight: "500", color: c.muted, marginRight: 4 }}
      />
      <IconWidget font={MATERIAL_FONT} icon="arrow_forward" size={16} style={{ color: c.muted }} />
    </FlexWidget>
  );
}

/** Compact MoodScale replica: 5 emoji tiles, selected gets the act-green border. */
export function MoodFacesRow({
  theme,
  selectedScore,
}: {
  theme: Theme;
  selectedScore: number | null;
}) {
  const c = PALETTE[theme];
  return (
    <FlexWidget style={{ flexDirection: "row", marginTop: 12, width: "match_parent" }}>
      {FACES.map((face, i) => {
        const selected = selectedScore === i + 1;
        return (
          <FlexWidget
            key={i}
            clickAction={OPEN_PATH}
            clickActionData={{ path: `/tools/mood-tracker/new?score=${i + 1}` }}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 8,
              borderRadius: 16, // rounded-2xl
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? (TINTS[theme].act as HexColor) : c.border,
              ...(i > 0 ? { marginLeft: 6 } : {}),
            }}
          >
            <TextWidget text={face} style={{ fontSize: 20 }} />
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
