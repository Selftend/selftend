# Public Policy Surfaces

Last updated: 2026-05-02

The app now has public policy routes that can be hosted from the Expo web export:

- `/privacy`
- `/terms`
- `/crisis`
- `/account-deletion`

The source text for these routes lives in [src/features/policies/policy-content.ts](../src/features/policies/policy-content.ts).

## Launch status

Implementation status:

- [x] privacy policy route exists without sign-in
- [x] terms and product-boundary route exists without sign-in
- [x] crisis guidance route exists without sign-in
- [x] account deletion request route exists without sign-in
- [x] in-app sign-in, support, settings, and legal screens link to relevant public pages
- [ ] final legal entity name added
- [ ] public support email alias configured on `selftend.org`
- [ ] public privacy/deletion email alias configured on `selftend.org`
- [x] crisis-resource intent captured as broad/global
- [ ] global crisis-resource strategy reviewed
- [ ] human/legal review completed
- [ ] self-service account deletion decision made

## Current policy boundaries

The policy text should keep these boundaries:

- wellness and guided self-help, not therapy or diagnosis
- not emergency support
- no claims to treat, cure, prevent, or monitor a condition
- account-required MVP with data minimization
- reminders optional, explicit, and off by default
- no ads, subscriptions, manipulative retention, social feeds, or user-facing AI coach in MVP
- all-ages ambition remains an open legal/privacy review item and should not be softened in docs

## Current launch assumptions

- Target production domain: `https://selftend.org`
- Target support contact: `support@selftend.org`
- Contact preference: use public domain aliases that forward to the owner's inbox, not the owner's personal Gmail address directly
- Remaining public contact aliases to configure before broader testing: `privacy@selftend.org` and `security@selftend.org`
- Temporary deletion/privacy fallback can use `support@selftend.org` until a separate privacy alias exists
- First web and Android testing path stores app records in the maintainer-hosted Supabase project
- Local-only storage, custom backend selection, and Google Drive sync are planned privacy directions, not launch features
- Audience ambition: global and all ages, because the product mission is to help as many people as possible
- Practical policy posture: global/all-ages launch raises legal, privacy, child-safety, content, and crisis-resource review burden; do not treat this as a simple copy edit

## Google Play URLs

Use the final domain, not GitHub or preview URLs, for store forms:

```text
https://selftend.org/privacy
https://selftend.org/account-deletion
```

Google Play requires Data safety information for closed, open, and production tracks. Apps with account creation also need an account deletion path. The current path is request-based, so a real privacy/support email must be configured before store testing.

## Crisis guidance

The app can show calm, separate crisis guidance, but it must never imply that the app provides crisis response.

Current public resources listed:

- United States and territories: <https://988lifeline.org/get-help/>
- Canada: <https://988.ca/get-help/help-right-now>

Because the owner wants broad/global availability, do not imply that US or Canada resources cover everyone. Before public launch outside those jurisdictions, either add reviewed local resources for each target jurisdiction or keep the guidance generic outside explicitly listed countries.
