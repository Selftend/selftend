import catalogJson from "./widget-catalog.json";

export type WidgetKind = "mood" | "today" | "shortcuts";

export interface CatalogEntrySize {
  minWidth: string;
  minHeight: string;
  maxWidth: string;
  maxHeight: string;
  targetCellWidth: number;
  targetCellHeight: number;
  resizeMode: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  kind: WidgetKind;
  emoji: string;
  widgetFeatures?: string;
  size: CatalogEntrySize;
}

export const WIDGET_CATALOG = catalogJson as unknown as CatalogEntry[];

export function catalogEntryByName(name: string): CatalogEntry | undefined {
  return WIDGET_CATALOG.find((w) => w.name === name);
}
