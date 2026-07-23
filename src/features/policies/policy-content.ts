export const policyLastUpdated = "2026-07-18";
export const policyVersion = "2026-07-18-web-host-cloudflare";

/**
 * Set to true while policies await final human/legal review.
 * When true, policy screens display a notice banner.
 */
export const LEGAL_REVIEW_PENDING = false;

export interface PolicyAction {
  label: string;
  url: string;
}

/** URL-only version with stable keys for i18n label lookup. */
export const crisisActionUrls = [
  { key: "openFindAHelpline", url: "https://findahelpline.com/" },
] as const;
