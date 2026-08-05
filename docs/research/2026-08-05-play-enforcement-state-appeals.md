# Play enforcement state for Selftend: "Previous version available", escalation, and appeals

> Research for [wayfinder ticket #645](https://github.com/Selftend/selftend/issues/645) (map #643),
> resolved 2026-08-05. Context: Play Console shows "Violation of Play Console Requirements" /
> "Previous version available on Google Play — Enforced on 5 Aug" for `org.vasilyoshev.selftend`,
> tied to the organization-account requirement for health apps.
>
> All Google sources checked 2026-08-05. Claims are tagged **[Documented]** (explicit in a Google
> primary source), **[Inference]**, or **[Community/secondary]**.

## 1. What the enforcement state concretely means

**The app is NOT removed.** **[Documented]** Google's "App policy statuses" article enumerates four
statuses — *No issues found*, *Rejected*, *Removed*, *Suspended*. For **Rejected**: "the last
version that you successfully published is still available on Google Play." *Removed* means the app
"won't be available on Google Play until a compliant update is submitted"; *Suspended* is the most
severe and exposes an in-Console Appeal button
([answer/9842754](https://support.google.com/googleplay/android-developer/answer/9842754)).

**[Documented]** The Enforcement Process article confirms: "If an update to an existing app was
rejected, the app version published prior to the update will remain available on Google Play."
Rejections do **not** affect existing installs, statistics, ratings, or account standing
([answer/9899234](https://support.google.com/googleplay/android-developer/answer/9899234)).

**[Inference, high confidence]** The panel label "Previous version available on Google Play" is the
Console surface for the **rejection-class** state — the exact panel string is not quoted verbatim in
any help article, but its language maps one-to-one onto the documented *Rejected* status.

**Updates:** **[Documented]** the submitted version was denied publication; Google instructs "don't
republish until the violation is resolved." **[Inference]** Because this violation is
account-level (wrong account type), every further update will keep being rejected until the account
is migrated — there is nothing to fix in the binary.

## 2. Escalation timeline

**[Documented]** Google describes an escalation ladder with **no dates**: "Suspension can occur as
the result of egregious or multiple policy violations, as well as repeated app rejections or
removals"; "multiple removals may result in a suspension"; suspensions are strikes, and multiple
strikes can terminate the account and related accounts
([answer/9899234](https://support.google.com/googleplay/android-developer/answer/9899234),
[answer/2477981](https://support.google.com/googleplay/android-developer/answer/2477981)).
No public article documents a schedule on which "previous version available" degrades into removal.

**The 2026-01-28 migration deadline is not in any public Google source.** Searches of the help
center, the policy-announcements index (2024–2026), and Android Developers surfaced the date only in
secondary blogs (e.g. myappmonitor.com) with no Google citation. **[Inference]** Google's documented
pattern for account-level deadlines is per-developer communication via Play Console inbox/email —
that is explicitly how the 2023–24 identity-verification deadlines worked, and that article also
documents the consequence pattern: missing an account deadline means "your developer profile and
apps will be removed from Google Play"
([answer/14177239](https://support.google.com/googleplay/android-developer/answer/14177239)).
**The Play Console inbox message is the authoritative source for our deadline and next escalation
step.** The fact that enforcement landed 2026-08-05 as a rejection rather than removal suggests a
soft-first ladder, but Google does not publicly document what comes next or when.

## 3. Appeals, policy support, and remediation

- **Appeals:** **[Documented]** one appeal per enforcement action; Google "will reinstate apps in
  appropriate circumstances" ([answer/2477981](https://support.google.com/googleplay/android-developer/answer/2477981),
  [answer/9899142](https://support.google.com/googleplay/android-developer/answer/9899142)).
  Enforcement emails carry the appeal link; suspended apps additionally get an in-Console Appeal
  button. **Turnaround:** no SLA in the help center; a 2016 Google blog post says a specialist
  responds "within 72 hours" ([blog.google](https://blog.google/products/admob/how-to-resolve-google-play-policy-issues/)),
  but **[Community]** forum reports put real waits at weeks to months. **Appealing is likely moot
  here** — the violation is factual (account type), so remediation is the path, not appeal.
- **Key finding — in-place conversion is supported.** **[Documented]** "If you wish to change the
  type of your Play Console developer account type from individual to organization, you can do so"
  by creating a **new organization-type payments profile**, verifying it, and linking it to the
  existing developer account (country/type/D-U-N-S cannot be edited on an existing payments
  profile). No new developer account and **no app transfer** required. The reverse
  (organization → individual) is not supported
  ([answer/13634888](https://support.google.com/googleplay/android-developer/answer/13634888)).
- **Documented timescales:**
  - **D-U-N-S number** (mandatory for organization accounts; requires a legal entity — an
    individual cannot get one): "can take up to 30 days" — the long pole
    ([answer/13628312](https://support.google.com/googleplay/android-developer/answer/13628312)).
  - **Payments-profile verification:** "can take up to 5 days" (same article). Data mismatches
    between the payments profile and D-U-N-S records risk account restriction, "which would remove
    all of your apps from Google Play."
  - **App transfer** (only if choosing the new-account route instead): reviewed "within 2 business
    days" ([answer/6230247](https://support.google.com/googleplay/android-developer/answer/6230247));
    **[Inference]** an app under active enforcement may complicate a transfer — not documented.
- **Practical path:** request a D-U-N-S for the operating entity now, create + verify an
  organization payments profile (org website verification is also expected), then run the in-place
  account-type change flow.

## 4. Does mental wellness count as a "health app"?

**[Documented]** The requirement's wording is non-exhaustive: organization registration is required
for "Health apps, such as Medical apps and Human Subjects Research apps"
([answer/10788890](https://support.google.com/googleplay/android-developer/answer/10788890),
[answer/13634885](https://support.google.com/googleplay/android-developer/answer/13634885)); it was
introduced in the July 17, 2024 policy announcement (new accounts first, existing developers
notified later) ([answer/14993590](https://support.google.com/googleplay/android-developer/answer/14993590)).
The Health app categories article defines **health and fitness** (fitness, nutrition, wellness,
sleep — "well-being (mental and physical)"), **medical**, and **human subjects research**
([answer/13996367](https://support.google.com/googleplay/android-developer/answer/13996367)) — so
mental wellness/self-help falls under the documented health-and-fitness category. **[Inference]**
Enforcement is presumably keyed off the Health apps declaration we filed; community threads show
other wellness-only apps hitting the same broad interpretation.

## 5. Is the public listing live? (checked 2026-08-05)

**Yes — fully live and installable.**
`https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend` returns **HTTP 200**
(a nonexistent package under the same prefix returns 404), and the served page contains the
Install button, developer "Vasil Yoshev", category Health & Fitness, ratings, screenshots, and the
Data safety section. The listing currently serves **v0.11.0** — consistent with the *Rejected*
state: the last approved version keeps serving while the newer submission is blocked.

## Bottom line

The app is still live with v0.11.0 serving; further updates will be rejected until the developer
account is an organization; escalation to removal/suspension is documented only as an undated
ladder (check the Play Console inbox message for our specific terms); appeal is one-shot and likely
moot for a factual account-type violation; the fastest documented fix is the in-place
individual→organization conversion — D-U-N-S (up to 30 days) plus org payments-profile verification
(up to 5 days), with no new account or app transfer needed.

## Sources

| Source | Supports | Checked |
|---|---|---|
| [App policy statuses (answer/9842754)](https://support.google.com/googleplay/android-developer/answer/9842754) | Rejected keeps last published version live; Removed/Suspended definitions | 2026-08-05 |
| [Enforcement Process (answer/9899234)](https://support.google.com/googleplay/android-developer/answer/9899234) | Previous-version-remains language; escalation ladder; strikes; appeals via email | 2026-08-05 |
| [Removals & appeals (answer/2477981)](https://support.google.com/googleplay/android-developer/answer/2477981) | One appeal per enforcement; multiple removals → suspension | 2026-08-05 |
| [Play Console Requirements (answer/10788890)](https://support.google.com/googleplay/android-developer/answer/10788890) | Org account required for health apps; no public migration deadline | 2026-08-05 |
| [Choose account type (answer/13634885)](https://support.google.com/googleplay/android-developer/answer/13634885) | Health apps must register as organization; D-U-N-S mandatory | 2026-08-05 |
| [Policy announcement 2024-07-17 (answer/14993590)](https://support.google.com/googleplay/android-developer/answer/14993590) | Introduction of the org requirement for health/financial/VPN/government | 2026-08-05 |
| [Account info up to date (answer/13634888)](https://support.google.com/googleplay/android-developer/answer/13634888) | In-place individual→organization conversion is supported | 2026-08-05 |
| [Verification requirements (answer/13628312)](https://support.google.com/googleplay/android-developer/answer/13628312) | D-U-N-S up to 30 days; verification up to 5 days; mismatch risks removal | 2026-08-05 |
| [App transfers (answer/6230247)](https://support.google.com/googleplay/android-developer/answer/6230247) | Transfer requests reviewed within 2 business days | 2026-08-05 |
| [Account verification deadlines (answer/14177239)](https://support.google.com/googleplay/android-developer/answer/14177239) | Deadline-communication pattern; missed deadline → profile and apps removed | 2026-08-05 |
| [Health app categories (answer/13996367)](https://support.google.com/googleplay/android-developer/answer/13996367) | Wellness / mental well-being is a health-and-fitness category | 2026-08-05 |
| [Appeals (answer/9899142)](https://support.google.com/googleplay/android-developer/answer/9899142) | Reinstatement path; appeal via enforcement email link | 2026-08-05 |
| [Google blog, 2016](https://blog.google/products/admob/how-to-resolve-google-play-policy-issues/) | "Within 72 hours" appeal response claim (dated) | 2026-08-05 |
| [myappmonitor.com blog](https://myappmonitor.com/blog/google-play-health-apps-update-2026-requirements) | **Secondary only** — sole found source for the 2026-01-28 deadline; no Google citation | 2026-08-05 |
| Live listing check (HTTP 200 + page markers) | Section 5 | 2026-08-05 |
