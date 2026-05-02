export const policyLastUpdated = "2026-05-02";

export interface PolicyAction {
  label: string;
  url: string;
}

export interface PolicySection {
  body: string[];
  title: string;
}

export const privacyPolicySections: PolicySection[] = [
  {
    title: "Scope",
    body: [
      "This privacy policy covers SelfTend across web and mobile builds.",
      "Before wider public launch, the maintainer must replace the pending organization and contact details with the final legal entity, support contact, and privacy contact.",
    ],
  },
  {
    title: "What the app collects",
    body: [
      "Account data: email address, authentication identifiers, and sign-in metadata handled through Supabase Auth.",
      "App data: user preferences, enabled modules, reminder settings, and private CBT thought records that users create in the app.",
      "Local device data: a local reminder identifier may be stored on the device when a user explicitly enables reminders. Reminders are off by default.",
    ],
  },
  {
    title: "What the app does not do in the MVP",
    body: [
      "The MVP does not include ads, subscription paywalls, analytics SDKs, public social feeds, peer messaging, or user-facing AI coaching.",
      "The MVP does not sell personal data and does not use sensitive wellness entries for advertising or manipulative retention.",
      "The app does not diagnose, treat, cure, prevent, or monitor any medical or mental health condition.",
    ],
  },
  {
    title: "How data is used",
    body: [
      "Data is used to sign users in, restore sessions, sync private records across devices, save preferences, and run the self-help features the user chooses to use.",
      "Google sign-in is optional. Users may use passwordless email sign-in instead.",
      "Email and authentication data may be processed by Supabase and, if Google sign-in is used, Google as the authentication provider.",
    ],
  },
  {
    title: "Sharing and processors",
    body: [
      "Supabase is the backend provider for authentication and database storage.",
      "Netlify or an equivalent static host may serve the web app. Static hosting should not add app behavior tracking.",
      "Expo and EAS are used for builds and app submission workflows. They should not be added as product analytics providers without a separate review.",
    ],
  },
  {
    title: "Security and retention",
    body: [
      "The app uses HTTPS for web traffic and Supabase client libraries for authenticated data access.",
      "Mobile session data is stored with Expo SecureStore. Web session data uses browser storage.",
      "Detailed retention windows, backup handling, and incident response need human/legal review before wider public promotion.",
    ],
  },
  {
    title: "Choices and deletion",
    body: [
      "Users can turn reminders off in settings. Disabling reminders cancels the scheduled local reminder.",
      "Account and data deletion currently uses a request-based process. A direct self-service deletion flow remains a launch blocker before broader public release if required by store policy or local law.",
      "A public account-deletion page must be hosted at /account-deletion on the final domain before Google Play closed or public testing.",
    ],
  },
  {
    title: "Children and all-ages review",
    body: [
      "The roadmap currently assumes broad availability, including possible use by minors. That raises additional privacy, consent, child-safety, and legal-review requirements.",
      "The product should not add child-directed social features, public posting, behavioral targeting, or broad tracking without explicit review.",
    ],
  },
];

export const termsSections: PolicySection[] = [
  {
    title: "Product boundary",
    body: [
      "This app is for wellness, reflection, and guided self-help. It is not medical care, therapy, diagnosis, treatment, crisis support, or emergency support.",
      "The app should not be used as the only support for a serious or urgent situation. For medical advice, diagnosis, or treatment, consult a qualified professional.",
    ],
  },
  {
    title: "Use of the app",
    body: [
      "Users are responsible for the information they enter and for deciding whether a self-help tool is appropriate for their situation.",
      "The app is designed to be calm and optional. Reminders are user-controlled, quiet by default, and should not create pressure or shame.",
      "Users should not enter information about other people unless they have a clear, respectful reason and the right to do so.",
    ],
  },
  {
    title: "Accounts",
    body: [
      "The MVP requires an account so records and preferences can sync across web and device builds.",
      "Users can sign in with a passwordless email link or Google. Manual password signup is intentionally not part of the MVP.",
      "Account deletion and data deletion currently require a request process until a reviewed self-service flow is implemented.",
    ],
  },
  {
    title: "Age and legal review",
    body: [
      "The project aims for broad public availability, but final age limits, parental consent requirements, and regional rules need legal review before public launch.",
      "If a user is under the age required to consent to digital services in their location, they should use the app only with appropriate parent or guardian involvement.",
    ],
  },
  {
    title: "Free access",
    body: [
      "The product should remain free to users. The project should not add ads, subscription paywalls, or paid access to care-like functionality.",
      "Donations may be added later only if they are optional, transparent, and separated from access to the app's self-help tools.",
    ],
  },
  {
    title: "Open-source project",
    body: [
      "The repository is planned under AGPL-3.0-only. Contribution and licensing details live in the repository docs.",
      "Reference repositories and resource lists may inform ideas, but copied code, text, and assets require explicit license review and tracking.",
    ],
  },
  {
    title: "Draft status",
    body: [
      "These terms are implementation-ready product boundaries, not legal advice. They must be reviewed and approved by the maintainer and legal counsel before public launch.",
    ],
  },
];

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

export const accountDeletionSections: PolicySection[] = [
  {
    title: "Current process",
    body: [
      "The MVP uses a request-based account and data deletion process until a reviewed self-service deletion flow exists.",
      "Before Google Play closed testing or public launch, configure a real privacy or support email and host this page on the final public domain.",
    ],
  },
  {
    title: "What to include",
    body: [
      "Send the request from the email address used for your account, or include that account email in the request.",
      "Ask to delete your app account and associated app data.",
      "Do not include private CBT records, crisis details, or other sensitive content in the deletion request.",
    ],
  },
  {
    title: "What happens next",
    body: [
      "The maintainer should verify the request, delete the account and associated app data where technically and legally possible, and confirm completion.",
      "Retention exceptions, backups, fraud prevention, security records, and legal obligations need a reviewed policy before wider public release.",
    ],
  },
];

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
