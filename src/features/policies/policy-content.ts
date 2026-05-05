export const policyLastUpdated = "2026-05-03";
export const policyVersion = "2026-05-03";

/**
 * Set to true while policies await final human/legal review.
 * When true, policy screens display a notice banner.
 */
export const LEGAL_REVIEW_PENDING = true;

export interface PolicyAction {
  label: string;
  url: string;
}

export interface PolicySection {
  body: string[];
  title: string;
}

// ---------------------------------------------------------------------------
// Privacy Policy
// ---------------------------------------------------------------------------

export const privacyPolicySections: PolicySection[] = [
  {
    title: "1. Who we are",
    body: [
      "Selftend is a free, open-source wellness and guided self-help application available on web, iOS, and Android.",
      "Data controller: Selftend (operated by Vasil Yoshev), contact: privacy@selftend.org.",
      "This policy applies to all users of the Selftend application regardless of platform.",
    ],
  },
  {
    title: "2. Data we collect",
    body: [
      "Account data: your email address and authentication identifiers provided during sign-in via passwordless email link or Google OAuth.",
      "App data: user preferences (enabled modules, reminder settings) and private CBT thought records you create.",
      "Device data: a local notification identifier stored on your device only when you explicitly enable reminders. No device fingerprinting or hardware identifiers are collected.",
      "Session data: an authentication token stored in browser localStorage (web) or Expo SecureStore (mobile) to maintain your signed-in session.",
    ],
  },
  {
    title: "3. Data we do not collect",
    body: [
      "We do not collect IP addresses for profiling, device fingerprints, location data, contacts, photos, or health data from device APIs.",
      "We do not use advertising SDKs, analytics tracking services, behavioral profiling tools, or social media pixels.",
      "We do not sell, rent, or trade your personal data to any third party for any purpose.",
    ],
  },
  {
    title: "4. Legal basis for processing (GDPR Article 6)",
    body: [
      "Contract (Art. 6(1)(b)): Processing your email and app data is necessary to provide the service you signed up for — maintaining your account, syncing your records, and delivering the self-help features.",
      "Consent (Art. 6(1)(a)): Notification reminders are only scheduled after you explicitly opt in. You can withdraw consent at any time in Settings.",
      "Legitimate interest (Art. 6(1)(f)): Minimal security logging (e.g., authentication events managed by Supabase) to protect the service and users from abuse.",
    ],
  },
  {
    title: "5. How we use your data",
    body: [
      "To authenticate you and maintain your signed-in session across devices.",
      "To store and sync your private thought records and preferences.",
      "To schedule local device reminders when you opt in.",
      "To process account deletion and data export requests.",
      "We do not use your wellness entries for advertising, training AI models, research, or any purpose beyond delivering the app's features to you.",
    ],
  },
  {
    title: "6. Data processors and sharing",
    body: [
      "Supabase (Supabase Inc., USA): provides authentication, database hosting, and backend infrastructure. Supabase processes your email and app data on our behalf under their Data Processing Agreement. See supabase.com/privacy.",
      "Google (Google LLC, USA): processes your email and account identifiers only if you choose Google OAuth sign-in. See policies.google.com/privacy.",
      "Netlify (Netlify Inc., USA): serves the static web application. Netlify does not receive or process your personal data beyond standard web server logs (IP address in access logs, subject to Netlify's privacy policy).",
      "Expo / EAS (Expo Inc., USA): used for mobile app builds and submission. Does not receive user personal data at runtime.",
      "We do not share your data with any other third parties, advertisers, or data brokers.",
    ],
  },
  {
    title: "7. International data transfers",
    body: [
      "Our data processors are based in the United States. For transfers of personal data from the European Economic Area (EEA), United Kingdom, or Switzerland, we rely on Standard Contractual Clauses (SCCs) as adopted by the European Commission, or the processor's participation in recognized data transfer frameworks.",
      "You can request a copy of the relevant transfer safeguards by contacting privacy@selftend.org.",
    ],
  },
  {
    title: "8. Data retention",
    body: [
      "Account and app data: retained for as long as your account is active.",
      "After account deletion: all personal data (profile, preferences, thought records) is permanently deleted within 30 days. No backups containing your data are retained beyond this period.",
      "Authentication logs: managed and retained by Supabase according to their retention policy.",
      "Local device data (reminder IDs, session tokens): removed when you sign out or delete the app.",
    ],
  },
  {
    title: "9. Your rights under GDPR",
    body: [
      "If you are in the EEA, UK, or Switzerland, you have the following rights:",
      "Right of access: request a copy of your personal data (available via data export in Settings).",
      "Right to rectification: correct inaccurate data (you can edit your thought records directly in the app).",
      "Right to erasure: delete your account and all associated data (available via self-service deletion in Settings).",
      "Right to data portability: receive your data in a structured, machine-readable JSON format (available via data export in Settings).",
      "Right to restrict processing: request that we limit how we use your data.",
      "Right to object: object to processing based on legitimate interest.",
      "Right to withdraw consent: withdraw consent for reminders at any time in Settings.",
      "Right to lodge a complaint: you may file a complaint with your local data protection supervisory authority.",
      "To exercise any right not available through self-service, contact privacy@selftend.org.",
    ],
  },
  {
    title: "10. Your rights under US state privacy laws",
    body: [
      "If you are a resident of California (CCPA/CPRA), Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), or other states with consumer privacy laws:",
      "Right to know: you can request what personal data we collect, use, and disclose.",
      "Right to delete: you can delete your account and all data via self-service in Settings.",
      "Right to opt out of sale: we do not sell your personal data. There is nothing to opt out of.",
      "Right to non-discrimination: we will not treat you differently for exercising your privacy rights.",
      "To exercise any right, use the in-app features or contact privacy@selftend.org.",
    ],
  },
  {
    title: "11. Children's privacy",
    body: [
      "Selftend is intended for users aged 13 and older. We do not knowingly collect personal data from children under 13.",
      "If you are under 13, do not use this app or provide any personal information.",
      "If we become aware that we have collected data from a child under 13, we will delete that data promptly. If you believe a child under 13 has provided us with personal data, contact privacy@selftend.org.",
    ],
  },
  {
    title: "12. Cookies and local storage",
    body: [
      "The web version of Selftend uses browser localStorage to store your authentication session token. This is functionally essential and cannot be disabled while using the app.",
      "We do not use tracking cookies, advertising cookies, or third-party cookies.",
      "If optional analytics are introduced in the future, they will require your explicit consent through the cookie preferences manager before any non-essential storage is used.",
      "You can manage your cookie and storage preferences at any time through the cookie settings available in the app.",
    ],
  },
  {
    title: "13. Security measures",
    body: [
      "All data in transit is encrypted via HTTPS/TLS.",
      "Database access is protected by Row-Level Security (RLS) — each user can only access their own data.",
      "Mobile session credentials are stored in the device's secure enclave via Expo SecureStore.",
      "No service-role keys or database passwords are exposed in the client application.",
      "Supabase infrastructure provides encryption at rest for stored data.",
    ],
  },
  {
    title: "14. Changes to this policy",
    body: [
      "We will update this policy when our practices change. The 'Last updated' date at the top reflects the most recent revision.",
      "If we make material changes, we will notify you through the app (e.g., a consent prompt) before the changes take effect.",
      "Continued use of the app after being notified constitutes acceptance of the updated policy.",
    ],
  },
  {
    title: "15. Contact",
    body: [
      "For privacy questions, data requests, or complaints: privacy@selftend.org.",
      "For general support: support@selftend.org.",
      "For security issues: security@selftend.org.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Terms of Service
// ---------------------------------------------------------------------------

export const termsSections: PolicySection[] = [
  {
    title: "1. Agreement to terms",
    body: [
      "By creating an account or using Selftend, you agree to these Terms of Service and our Privacy Policy.",
      "If you do not agree, do not create an account or use the app.",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You must be at least 13 years old to use Selftend.",
      "By using the app, you represent that you are at least 13 years of age.",
      "If you are between 13 and the age of majority in your jurisdiction, you confirm that your parent or legal guardian has reviewed and agrees to these terms on your behalf.",
    ],
  },
  {
    title: "3. Product scope and boundaries",
    body: [
      "Selftend is a wellness and guided self-help tool. It is not therapy, medical care, diagnosis, treatment, crisis intervention, or emergency support.",
      "The app provides structured cognitive behavioral exercises for personal reflection. It does not replace professional mental health care.",
      "Do not use this app as your only support in a serious or urgent situation. For medical advice, diagnosis, or treatment, consult a qualified professional. For emergencies, contact local emergency services.",
    ],
  },
  {
    title: "4. User accounts",
    body: [
      "An account is required to use the app so your records and preferences can sync across devices.",
      "You may sign in with a passwordless email link or Google OAuth. Passwords are not used.",
      "You are responsible for maintaining access to the email address associated with your account.",
      "One account per person. Do not share account access or create multiple accounts.",
    ],
  },
  {
    title: "5. Acceptable use",
    body: [
      "Use the app for its intended purpose: personal wellness and guided self-help.",
      "Do not enter personally identifiable information about other people in your thought records without a legitimate reason.",
      "Do not attempt to access other users' data, reverse engineer the service, or exploit vulnerabilities.",
      "Do not use the app to generate content that is illegal, harmful, or violates others' rights.",
    ],
  },
  {
    title: "6. User content and intellectual property",
    body: [
      "Your thought records and personal data belong to you. We claim no ownership of your content.",
      "We do not use your content for advertising, training AI models, research, or any purpose other than providing the service to you.",
      "The Selftend application source code is licensed under AGPL-3.0-only. This license applies to the software, not to your personal data.",
    ],
  },
  {
    title: "7. Data and privacy",
    body: [
      "Our collection and use of your data is governed by our Privacy Policy.",
      "You can export your data in machine-readable format at any time through Settings.",
      "You can permanently delete your account and all associated data through Settings.",
    ],
  },
  {
    title: "8. Free access",
    body: [
      "Selftend is free to use. There are no subscription fees, paywalls, or paid features.",
      "We do not serve advertisements or monetize your data.",
      "Optional donations may be introduced in the future, but they will never be required for access to any feature.",
    ],
  },
  {
    title: "9. Availability and changes",
    body: [
      "We aim to keep the service available but do not guarantee uninterrupted access.",
      "We may update, modify, or discontinue features with reasonable notice.",
      "We will notify you of material changes to these terms through the app.",
    ],
  },
  {
    title: "10. Termination",
    body: [
      "You may delete your account at any time through Settings. Deletion is permanent and irreversible.",
      "We may suspend or terminate accounts that violate these terms or are used for abuse.",
      "Upon termination, your data will be deleted in accordance with our Privacy Policy's retention schedule.",
    ],
  },
  {
    title: "11. Disclaimers",
    body: [
      'The app is provided "as is" and "as available" without warranties of any kind, whether express or implied.',
      "We do not warrant that the app will meet your requirements, be error-free, or be available without interruption.",
      "We do not provide medical, psychological, or professional advice. Content in the app is for informational and self-help purposes only.",
      "Your use of the app and reliance on any content is at your sole risk.",
    ],
  },
  {
    title: "12. Limitation of liability",
    body: [
      "To the maximum extent permitted by applicable law, Selftend and its maintainers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app.",
      "This includes, without limitation, damages for loss of data, goodwill, or other intangible losses.",
      "Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.",
    ],
  },
  {
    title: "13. Changes to these terms",
    body: [
      "We may update these terms from time to time. The 'Last updated' date reflects the most recent revision.",
      "If we make material changes, we will notify you through the app before the changes take effect.",
      "Continued use of the app after notification constitutes acceptance of the revised terms. If you do not agree, delete your account.",
    ],
  },
  {
    title: "14. Contact",
    body: [
      "For questions about these terms: support@selftend.org.",
      "For privacy matters: privacy@selftend.org.",
      "For security issues: security@selftend.org.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Crisis Guidance (unchanged — still requires jurisdiction review)
// ---------------------------------------------------------------------------

export const crisisSections: PolicySection[] = [
  {
    title: "Immediate danger",
    body: [
      "If you might hurt yourself or someone else, or if anyone is in immediate danger, contact local emergency services now.",
      "This app is not monitored by crisis responders and cannot provide emergency help.",
    ],
  },
  {
    title: "Crisis support",
    body: [
      "If you are in the United States or its territories, the 988 Suicide & Crisis Lifeline is available by calling or texting 988 or using chat at 988lifeline.org.",
      "If you are in Canada, 9-8-8: Suicide Crisis Helpline is available by calling or texting 9-8-8.",
      "If you are outside those jurisdictions, use the emergency number or crisis support service available where you are.",
    ],
  },
  {
    title: "How this app should be used",
    body: [
      "The app can help with structured reflection when there is time and safety to reflect.",
      "It should not delay contacting emergency services, a crisis line, a trusted person nearby, or a qualified professional when urgent support is needed.",
    ],
  },
  {
    title: "Review requirement",
    body: [
      "Crisis-resource links and country-specific guidance must be reviewed before launch in each target jurisdiction. Do not assume one country's hotline is available everywhere.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Account Deletion
// ---------------------------------------------------------------------------

export const accountDeletionSections: PolicySection[] = [
  {
    title: "What deletion does",
    body: [
      "Deleting your account permanently removes all data associated with it: your profile, preferences, all thought records (including archived ones), and authentication credentials.",
      "Deletion is irreversible. Once completed, your data cannot be recovered.",
      "All data is permanently removed within 30 days of your deletion request.",
    ],
  },
  {
    title: "How to delete your account",
    body: [
      "Self-service (recommended): Go to Settings → Account → Delete my account. You will be asked to confirm before deletion proceeds.",
      "Email request (fallback): Send a deletion request to privacy@selftend.org from the email address associated with your account. Include your account email and ask for complete account and data deletion.",
    ],
  },
  {
    title: "What to know",
    body: [
      "Before deleting, you may want to export your data using the Export feature in Settings.",
      "After deletion, you can create a new account with the same email address, but none of your previous data will be available.",
      "If you only want to stop using the app temporarily, you can simply sign out instead of deleting your account.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Cookie Policy
// ---------------------------------------------------------------------------

export const cookiePolicySections: PolicySection[] = [
  {
    title: "What are cookies and local storage",
    body: [
      "Cookies are small text files placed on your device by websites. Local storage (localStorage) is a browser feature that allows websites to store data locally on your device.",
      "Selftend primarily uses browser localStorage rather than traditional cookies.",
    ],
  },
  {
    title: "Essential storage (required)",
    body: [
      "We use browser localStorage to store your authentication session token. This is strictly necessary for the app to function — it keeps you signed in between visits.",
      "This storage cannot be disabled while using the app. If you clear your browser storage, you will need to sign in again.",
      "No personal data beyond the session token is stored in localStorage by the app itself.",
    ],
  },
  {
    title: "Optional cookies (consent required)",
    body: [
      "Selftend does not currently use any optional or analytics cookies.",
      "If optional analytics or functionality cookies are introduced in the future, they will not be set until you provide explicit consent through the cookie preferences manager.",
      "You will always be able to use the app fully without accepting optional cookies.",
    ],
  },
  {
    title: "Third-party cookies",
    body: [
      "Selftend does not set or use any third-party cookies.",
      "We do not use advertising networks, social media widgets, or third-party tracking pixels that would set cookies on your device.",
    ],
  },
  {
    title: "Managing your preferences",
    body: [
      "You can manage your cookie and storage preferences at any time through the cookie settings available in the app footer (web) or in Settings.",
      "You can also clear all website data through your browser settings, which will remove the session token and sign you out.",
      "For questions about our use of cookies and storage, contact privacy@selftend.org.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Crisis Actions
// ---------------------------------------------------------------------------

export const crisisActions: PolicyAction[] = [
  {
    label: "Open 988 Lifeline",
    url: "https://988lifeline.org/get-help/",
  },
  {
    label: "Open 9-8-8 Canada",
    url: "https://988.ca/get-help/help-right-now",
  },
];

/** URL-only version with stable keys for i18n label lookup. */
export const crisisActionUrls = [
  { key: "open988", url: "https://988lifeline.org/get-help/" },
  { key: "open988Canada", url: "https://988.ca/get-help/help-right-now" },
] as const;
