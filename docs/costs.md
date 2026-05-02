# Costs

Last checked: 2026-05-02

These are planning estimates, not guarantees. Pricing, verification rules, and limits can change. Verify all costs again before spending money or publishing the app.

## One-time and annual costs

### Apple Developer Program

- Planning baseline: `$99/year`
- Official source: <https://developer.apple.com/programs/>

### Google / Android developer registration

- Planning baseline: `$25` one-time
- Caveat: Google is evolving Android developer verification flows, so verify the exact current requirement at signup.
- Organization account setup can require D-U-N-S number, organization website, organization phone, public developer email, public developer phone, and verification documents. Plan time for this before Android closed testing.
- Official references:
  - <https://support.google.com/googleplay/android-developer/answer/13628312>
  - <https://support.google.com/googleplay/android-developer/answer/6112435>
  - <https://developer.android.com/developer-verification>
  - <https://developer.android.com/developer-verification/assets/pdfs/introducing-the-android-developer-console.pdf>

### Domain

- Planning baseline: `$10-$20/year` for a basic `.org` or similar domain
- This varies by registrar and TLD, so treat it as an estimate rather than a locked price.
- Current web-test decision: use the existing `yoshevbot.uk` domain under Cloudflare, so no new domain purchase is needed for the first web test.

## Monthly operating cost scenarios

### Scenario A: planning and prototype mode

Use this while the project is private or in early testing.

- Expo Free: `$0`
- Supabase Free: `$0`
- Resend Free: `$0`
- Static web hosting on a free tier: `$0`

Expected monthly core infra:

- `$0/month`

Plus annual / one-time:

- Apple Developer Program if you need TestFlight or App Store distribution
- Google registration if you need Play distribution
- domain cost if you buy a domain early

### Scenario B: public MVP launch

This is the realistic baseline for a real public launch with account-based sync.

- Expo Starter: `$19/month`
- Supabase Pro: `$25/month`
- Resend Free to Pro: `$0-$20/month`
- Static web hosting: `$0/month` on a free-tier static host, if usage remains modest

Expected monthly core infra:

- lean public launch: about `$44/month`
- with paid email: about `$64/month`

Plus annual / one-time:

- Apple Developer Program: `$99/year`
- Google registration: `$25` one-time
- domain: about `$10-$20/year`

### Scenario C: growth without enterprise spend

Use this when the product has real traffic, more frequent builds, or a small active team.

- Expo Production: `$199/month` if Starter becomes too limiting
- Supabase Pro: `$25/month`, plus usage and possibly extra project compute
- Supabase additional project compute: `~$10/month` per additional default project, per the billing FAQ example
- Resend Pro: `$20/month`
- Resend Scale if volume demands it: `$90/month`

Expected monthly core infra:

- about `$64-$244+/month` depending on build volume, email volume, and infra growth

## Shared inbox and email operations

Start simple.

Recommended early setup:

- use domain-based forwarding or aliases for `hello@`, `support@`, `privacy@`, `security@`, and `contributors@`
- route them to one real inbox initially
- for the `yoshevbot.uk` web test, prefer aliases such as `support@yoshevbot.uk`, `privacy@yoshevbot.uk`, and `security@yoshevbot.uk` forwarding to the owner's real inbox
- avoid publishing a personal Gmail address directly as the app's public mental-health support or privacy contact unless there is no better short-term option

If you later need a proper shared mailbox provider, treat that as optional overhead rather than day-one scope.

Reference pricing signal:

- Google Workspace public pricing history shows Business Starter around `$6-$7.20/user/month`, depending on plan type and timing
- Source: <https://workspace.google.com/blog/product-announcements/pricing-updates-and-more-flexible-payment-options-google-workspace>

## Web hosting note

Expo gives the web build, not the hosting bill.

Initial recommendation:

- static hosting on a free tier such as Cloudflare Pages or an equivalent platform
- Cloudflare Pages free-plan planning limits currently include 500 builds/month and 100 custom domains/project, with file and asset limits that should be checked before launch
- Source: <https://www.cloudflare.com/developer-platform/products/pages/>
- Limits source: <https://developers.cloudflare.com/pages/platform/limits/>

The browser app should stay cheap if it remains a mostly static front-end that talks to Supabase.

## Future self-hosting and portability

The long-term product direction should make self-hosting possible, similar in spirit to apps that support both a hosted service and user-controlled deployments.

Do not make self-hosting crowd out MVP utility, but keep the architecture portable:

- document the default hosted path: static Expo web app plus the maintainer's Supabase project
- preserve the option to point the app at a user-controlled Supabase-compatible backend
- later evaluate easy managed self-hosting paths such as PikaPods or similar services
- later document a do-it-yourself deployment path for users who want to host infrastructure themselves
- avoid dependencies or proprietary backend assumptions that would make this unnecessarily hard

Research exact self-hosting providers, operational requirements, and pricing before committing to a supported deployment method.

## What not to buy early

Avoid paying for these before the product earns them:

- enterprise Expo plans
- dedicated support contracts
- complex monitoring suites
- multiple staging environments with separate paid compute
- full paid team chat suites

## Practical budget recommendation

### Bare-minimum public launch budget

- Monthly target: `$44-$64`
- Annual and one-time target:
  - `$99/year` Apple
  - `$25` Google registration
  - `$10-$20/year` domain

### Comfortable early-launch budget

- Monthly target: `$75-$125`
- This gives room for:
  - core infra
  - email provider upgrade
  - light design or content tooling
  - unexpected usage spikes

## Sources

- Apple Developer Program: <https://developer.apple.com/programs/>
- Apple enrollment details: <https://developer.apple.com/programs/enroll/>
- Expo pricing: <https://expo.dev/pricing>
- Expo billing docs: <https://docs.expo.dev/billing/plans/>
- Supabase billing FAQ: <https://supabase.com/docs/guides/platform/billing-faq>
- Supabase billing overview: <https://supabase.com/docs/guides/platform/billing-on-supabase>
- Resend pricing: <https://resend.com/pricing>
- Cloudflare Pages: <https://www.cloudflare.com/developer-platform/products/pages/>
- Cloudflare Pages limits: <https://developers.cloudflare.com/pages/platform/limits/>
- Google Play developer account requirements: <https://support.google.com/googleplay/android-developer/answer/13628312>
- Google Play registration payment: <https://support.google.com/googleplay/android-developer/answer/6112435>
- Google Workspace pricing update reference: <https://workspace.google.com/blog/product-announcements/pricing-updates-and-more-flexible-payment-options-google-workspace>
- Android developer verification: <https://developer.android.com/developer-verification>
- Android Developer Console first-look PDF: <https://developer.android.com/developer-verification/assets/pdfs/introducing-the-android-developer-console.pdf>
