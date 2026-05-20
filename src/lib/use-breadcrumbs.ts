import { usePathname } from "expo-router";
import { useTranslation } from "react-i18next";

import { computeBreadcrumbs, type Breadcrumb } from "./breadcrumbs";

export type { Breadcrumb };

export function useBreadcrumbs(): Breadcrumb[] {
  const pathname = usePathname();
  const { t } = useTranslation("navigation");
  return computeBreadcrumbs(pathname, t);
}
