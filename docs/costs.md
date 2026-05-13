# Costs

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
- Current production-domain decision: buy `selftend.org` if available and use it as the canonical web and app-store policy domain.

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
- for the first public launch, prefer aliases such as `support@selftend.org`, `privacy@selftend.org`, and `security@selftend.org` forwarding to the owner's real inbox
- avoid publishing a personal Gmail address directly as the app's public mental-health support or privacy contact unless there is no better short-term option

If you later need a proper shared mailbox provider, treat that as optional overhead rather than day-one scope.

Reference pricing signal:

- Google Workspace public pricing history shows Business Starter around `$6-$7.20/user/month`, depending on plan type and timing
- Source: <https://workspace.google.com/blog/product-announcements/pricing-updates-and-more-flexible-payment-options-google-workspace>

## Web hosting note

Expo gives the web build, not the hosting bill.

Initial recommendation:

- static frontend hosting on Netlify's free tier or an equivalent platform
- Netlify should be verified against current pricing and bandwidth/build limits before launch
- Source: <https://www.netlify.com/pricing/>

The browser app should stay cheap if it remains a mostly static front-end that talks to Supabase.

## GitHub Actions release builds

The manual Android release workflow uses `eas build --local` on a standard GitHub-hosted Ubuntu runner. This avoids the EAS cloud build queue, but it still consumes GitHub Actions minutes and artifact/cache storage.

GitHub's billing docs say standard GitHub-hosted runner usage is free for public repositories, while private repositories receive plan-dependent included minutes and storage before overage billing. Source checked 2026-05-05: <https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions>

Practical default:

- keep mobile and web release workflows manual
- keep Android `.aab` artifact retention short
- do not run store-release builds on every push until release cadence and Actions usage are understood
- consider a self-hosted runner only if build time, quota, or reproducibility becomes a real blocker

## Self-hosting and portability

The long-term product direction should make self-hosting possible, similar in spirit to apps that support both a hosted service and user-controlled deployments.

Pre-Android support is docs and build-time configuration:

- default hosted path: static Expo web app plus the maintainer's Supabase project
- bring-your-own Supabase Cloud path: self-hoster pays Supabase or uses the free tier under their own account
- advanced self-hosted Supabase path: self-hoster pays for their own server, storage, email, backups, monitoring, and maintenance
- later evaluate easy managed self-hosting paths such as PikaPods or similar services
- avoid dependencies or proprietary backend assumptions that would make build-time Supabase portability unnecessarily hard

Research exact self-hosting providers, operational requirements, and pricing before committing to a supported managed deployment method. Do not promise PikaPods support until the required Supabase-compatible backend, auth, email, backups, domains, TLS, and upgrade path are verified.

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
- GitHub Actions billing: <https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions>
- Supabase billing FAQ: <https://supabase.com/docs/guides/platform/billing-faq>
- Supabase billing overview: <https://supabase.com/docs/guides/platform/billing-on-supabase>
- Supabase self-hosting with Docker: <https://supabase.com/docs/guides/self-hosting/docker>
- PikaPods docs: <https://docs.pikapods.com/>
- Resend pricing: <https://resend.com/pricing>
- Netlify pricing: <https://www.netlify.com/pricing/>
- Google Play developer account requirements: <https://support.google.com/googleplay/android-developer/answer/13628312>
- Google Play registration payment: <https://support.google.com/googleplay/android-developer/answer/6112435>
- Google Workspace pricing update reference: <https://workspace.google.com/blog/product-announcements/pricing-updates-and-more-flexible-payment-options-google-workspace>
- Android developer verification: <https://developer.android.com/developer-verification>
- Android Developer Console first-look PDF: <https://developer.android.com/developer-verification/assets/pdfs/introducing-the-android-developer-console.pdf>
