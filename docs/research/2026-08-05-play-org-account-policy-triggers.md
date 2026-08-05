# Play Console organization-account requirement: triggers and exit routes

> Research for [wayfinder ticket #644](https://github.com/Selftend/selftend/issues/644)
> (map [#643](https://github.com/Selftend/selftend/issues/643)), resolved 2026-08-05.
> Context: Selftend (individual Play developer account, Health apps declaration completed)
> received "Violation of Play Console Requirements — some types of apps can only be
> distributed by organizations", enforced 2026-08-05.
> All quotes verbatim from the live English pages; date checked 2026-08-05.

## 1. What triggers the requirement

**The trigger is providing a "health app" service — a policy classification based on what the app does.** Neither the store listing category (Health & Fitness / Medical) nor the Health apps declaration is named as the trigger anywhere; the policy keys off the service provided.

[Play Console Requirements](https://support.google.com/googleplay/android-developer/answer/10788890):

> "When creating your Play Console account, developers providing the following services must register as an Organization: … 1.2. Health apps, such as Medical apps and Human Subjects Research apps. Learn more about Health app categories."

The other org-only types are financial products and services (1.1), apps approved to use the VpnService class (1.3), and government apps (1.4). The Key Considerations do-list repeats: "Register as an organization if developing for financial, health, VPN, or government services."

The [July 17, 2024 policy announcement](https://support.google.com/googleplay/android-developer/answer/14993590) uses the unqualified word **"health"**:

> "We're requiring developers providing the following services to register as an Organization: financial products and services, health, VPN, and government. … This update will roll out to new developer accounts first. Existing developers will receive more information later this year."

**Ambiguity:** "Health apps, **such as** Medical apps and Human Subjects Research apps" names only two institutional examples, but the head noun is "Health apps" and the "Learn more" link points at the broad Health app categories definition (§2). The policy never says "only Medical and Human Subjects Research apps," and Selftend's 2026-08-05 enforcement is empirical evidence Google applies the broad reading.

## 2. Is Selftend scoped as a health app regardless of category?

**Yes.** Scoping is feature-based and category-independent, and mental well-being is explicitly inside the definition.

[Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511):

> "If your app offers health-related features or information as part of its functionality, or accesses health data to support non-health features, it must comply with … the below requirements"
>
> "If your app is not primarily a health app, but has health-related features and accesses health data, it is still in scope of the Health App policy."

[Health app categories](https://support.google.com/googleplay/android-developer/answer/13996367):

> "Health apps encompass a wide range of applications that are designed to support and improve users' health, **well-being (mental and physical)**, and medical management. Medical apps, **health and fitness apps**, and health research apps are examples of health apps."

Health and fitness apps are defined to include "wellness" and "**stress management apps**". The [Health apps declaration form](https://support.google.com/googleplay/android-developer/answer/14738291) has a matching declarable feature under **Health and fitness** (not Medical):

> "**Stress Management, Relaxation, Mental Acuity** — Apps offering guidance on stress management, mindfulness, meditation, and cognitive health. May include brain training games, relaxation techniques, and wellness coaching programs."

and under **Medical**: "**Mental and Behavioral Health** — Tools for mental health support, counseling services and addiction recovery programs." CBT-style guided exercises fit "wellness coaching programs" / "cognitive health" almost word-for-word. Store category is never mentioned as a scoping mechanism on any of these pages.

## 3. Exit routes

**Recategorizing the store listing: no documented effect.** No page conditions the org requirement or health-app scope on the Play store category; Health & Fitness → Lifestyle changes nothing in policy terms.

**Amending the declaration to "no health features": would be a false declaration.** The declaration must be accurate and reflect actual features:

> "After August 31, 2024, all apps will be required to have completed **an accurate Health apps declaration** that discloses the health features their app supports" ([14738291](https://support.google.com/googleplay/android-developer/answer/14738291))
>
> "Important: If your app doesn't provide any health features, you should declare: My app doesn't provide any health features" (ibid.)

Play Console Requirements adds "Don't provide inaccurate or unverifiable details." An app offering guided CBT exercises, journaling, and habit support cannot truthfully declare no health features given the Stress Management/Relaxation/Mental Acuity definition — un-declaring would itself be a violation. There is no documented exemption for non-profit, free, or explicitly non-medical wellness apps.

**The documented route is organization-account migration:**

- D-U-N-S number is mandatory and slow: "This process can take up to 30 days so you should plan ahead. You will not be able to create a developer account for an organization without one." … "We will not accommodate any exemptions or provide extensions for any organization accounts that fail to provide a D-U-N-S number" ([13628312](https://support.google.com/googleplay/android-developer/answer/13628312)). The only alternative verification path is for regions Dun & Bradstreet does not support.
- [Account changes page (16909862)](https://support.google.com/googleplay/android-developer/answer/16909862) lists "a transition between account types (for example, individual to organization)" as an active account change, implying an in-place transition flow exists; the explicitly documented path for **monetizing** individual accounts is "create a new developer account and transfer your existing apps to it." Whether Selftend (non-monetizing) qualifies for in-place conversion is not publicly documented.
- Appeals exist for enforcement errors: "instructions on how to appeal if you believe we've taken action in error" ([9899234](https://support.google.com/googleplay/android-developer/answer/9899234)); "We will reinstate applications if an error was made" ([9899142](https://support.google.com/googleplay/android-developer/answer/9899142)).

## 4. What happens to apps that do nothing

The general [enforcement ladder](https://support.google.com/googleplay/android-developer/answer/9899234) applies, escalating:

- **Rejection:** new updates "will not be made available on Google Play"; "the app version published prior to the update will remain available."
- **Removal:** "The app, along with any previous versions … removed from Google Play"; existing installs keep working "but will no longer receive updates"; restored "once you submit a policy-compliant update."
- **Suspension / account restriction / termination:** "Suspension can occur as the result of egregious or multiple policy violations, as well as repeated app rejections or removals"; a restricted account has "all apps in your catalog … removed from Google Play."

For Console Requirements issues specifically, Google uses a deadline-then-restriction mechanic: "You must fix this by the deadline provided to avoid your developer account being restricted, which would remove all of your apps from Google Play" ([13628312](https://support.google.com/googleplay/android-developer/answer/13628312)).

**Deadline note:** the 2026-01-28 migration deadline for existing health-app developers appears on **no public Google page** — only the July 2024 "more information later this year" promise plus third-party reports; the authoritative date was communicated via targeted Console/email notices. (The only official public 2026-01-28 is the unrelated US external-linking/alt-billing deadline, [16671517](https://support.google.com/googleplay/android-developer/answer/16671517).) The org requirement persists verbatim in the [preview of the July 2026 policy updates (17125096)](https://support.google.com/googleplay/android-developer/answer/17125096), effective 2026-09-30.

## Open questions

1. Whether a Health-and-fitness-only declaration (only "Stress Management, Relaxation, Mental Acuity") is enough to trigger the org requirement, or whether Google keyed on a Medical-category feature ("Mental and Behavioral Health") for Selftend — not visible on any policy page.
2. Whether a non-monetizing individual account gets an in-place individual→organization conversion or must do a new-account app transfer.
3. The exact enforcement stage Selftend is at (update rejection vs. removal vs. restriction warning) — determines urgency; the enforcement email's appeal instructions are the entry point.

## Sources

- Play Console Requirements — [answer/10788890](https://support.google.com/googleplay/android-developer/answer/10788890) (checked 2026-08-05)
- Play Console Requirements: verification/D-U-N-S — [answer/13628312](https://support.google.com/googleplay/android-developer/answer/13628312) (checked 2026-08-05)
- Choose a developer account type — [answer/13634885](https://support.google.com/googleplay/android-developer/answer/13634885) (checked 2026-08-05)
- Policy announcement, July 17 2024 — [answer/14993590](https://support.google.com/googleplay/android-developer/answer/14993590) (checked 2026-08-05)
- Health Content and Services — [answer/16679511](https://support.google.com/googleplay/android-developer/answer/16679511) (checked 2026-08-05)
- Health app categories — [answer/13996367](https://support.google.com/googleplay/android-developer/answer/13996367) (checked 2026-08-05)
- Health apps declaration — [answer/14738291](https://support.google.com/googleplay/android-developer/answer/14738291) (checked 2026-08-05)
- Account owner/type changes — [answer/16909862](https://support.google.com/googleplay/android-developer/answer/16909862) (checked 2026-08-05)
- Enforcement Process — [answer/9899234](https://support.google.com/googleplay/android-developer/answer/9899234) (checked 2026-08-05)
- My app has been removed — [answer/9899142](https://support.google.com/googleplay/android-developer/answer/9899142) (checked 2026-08-05)
- Preview: Play Console Requirements (July 2026 updates) — [answer/17125096](https://support.google.com/googleplay/android-developer/answer/17125096) (checked 2026-08-05)
