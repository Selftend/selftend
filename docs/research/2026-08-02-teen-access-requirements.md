# What genuine 13+ availability requires for Selftend

> Research for [Research what genuine 13+ availability requires for Selftend](https://github.com/Selftend/selftend/issues/614),
> resolved 2026-08-02. This is a product and compliance decision aid, not legal advice.
> Primary sources were checked on 2026-08-02.

## Decision in brief

Changing a store declaration from adults-only to 13+ is not enough. Genuine availability to
13-17-year-olds means deliberately designing the account, privacy, safety, support, content,
SDK, and store experience for teenagers, while applying a territory-specific minimum age where
law does not let a 13-year-old authorize the processing on their own.

Selftend should **not publish an unconditional global “13+” claim yet**. The defensible path is:

1. Treat 13-17-year-olds as a protected audience throughout the product, not merely as people
   who are allowed to download it.
2. Put a neutral, privacy-preserving age and territory decision **before account creation or any
   optional tracking/SDK activity**. Do not collect an exact birth date unless the final legal and
   risk analysis shows it is necessary; age bands or a minimum-age answer are preferable.
3. Permit self-service access only where the user meets the applicable territory threshold.
   Where a 13-year-old cannot consent or contract alone, either implement verified parental
   authorization or raise that territory's floor. Selftend has no parental-consent system today,
   so the latter is the lower-risk first release.
4. Complete a child-focused DPIA and product-safety review, rewrite policy and in-product
   explanations for a 13-year-old reader, define minor/parent rights handling, and review every
   runtime SDK and data flow before changing store declarations.
5. Keep campaign creative age-neutral and avoid an explicit “13+” claim until the app, public
   policies, live store declarations, and supported-country matrix agree.

The repository currently describes launch jurisdictions as the EU/EEA, United States, and UK,
while its policies, tests, Android launch guide, and signup posture still say 18+. If either store
is available more broadly than those documented jurisdictions, the country list itself must be
resolved first: Apple requires compliance in every location where the app is available, and
Google tells developers targeting anyone under 21 to determine whether those users are children
under local law ([Apple Review Guideline 5](https://developer.apple.com/app-store/review/guidelines/),
[Google target-audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159)).

## What the age labels do and do not mean

| Surface | Firm platform meaning | What remains Selftend's responsibility |
| --- | --- | --- |
| Google Play target audience | The console has separate 13-15, 16-17, and 18+ groups. Select only groups for which the app was actually designed and is appropriate. Google reviews the accuracy of the declaration and warns that 13-15 and 16-17 may be children in some locales. | Local child definitions, consent/contract validity, an appropriate experience, accurate Data safety and Health apps declarations, and any required age assurance. |
| Google Play content rating | The IARC result describes content suitability; it does not establish privacy consent, contractual capacity, or legal eligibility. | Answer the live questionnaire accurately, including any self-harm, medical/treatment, or unrestricted-web-content questions. Do not force a desired rating by understating content. |
| Apple age rating | The App Store Connect questionnaire produces a content rating. Current categories include 9+ for health/wellness topics and 13+ for infrequent medical/treatment information. A developer can override upward, and Apple says a EULA minimum higher than the calculated rating must be reflected by an upward override. | A 13+ content rating is not proof that every 13-year-old may lawfully create an account or consent to data processing. Developers remain responsible for their own age restrictions and local law. |
| Apple Kids Category | “Made for Kids” is a separate, optional category for ages up to 11, with stricter links, analytics, ads, and parental-gate rules. | Selftend's teen-and-adult product should not select Kids Category. General-app rules for collecting personal data from minors still apply. |

Sources: [Google target audience and content](https://support.google.com/googleplay/android-developer/answer/9867159),
[Google content-rating requirements](https://support.google.com/googleplay/android-developer/answer/9859655),
[Apple: set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/),
[Apple age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/),
and [Apple Review Guidelines 1.3, 5 and 5.1.4](https://developer.apple.com/app-store/review/guidelines/).

## Territory rules: “child” is not one universal threshold

### European Union and EEA

GDPR Article 8 applies when an information-society service is offered directly to a child and
the Article 6 lawful basis is consent. The default self-consent age is 16; each member state may
lower it, but not below 13. Below the applicable age, consent must be given or authorized by a
holder of parental responsibility, and the controller must make reasonable efforts to verify that
authorization. Article 8 expressly leaves national contract-capacity law untouched
([GDPR Article 8](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)). The European Commission
therefore tells cross-border services to check the threshold with each national data-protection
authority; the range is 13-16
([European Commission child-data safeguards](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en)).

This matters immediately in Selftend's home market: Bulgaria sets 14 for consent-based
processing, including directly supplied information-society services
([Bulgarian Personal Data Protection Act, Article 25c](https://cpdp.bg/en/legislation/personal-data-protection-act/)).
A flat “13+ everywhere” rule would therefore need a different lawful route or verified parental
authorization for Bulgarian 13-year-olds; a store selection cannot supply either.
The Bulgarian DPA also places processing children's data when offering an information-society
service directly to them on its Article 35(4) list of operations requiring a DPIA
([Bulgarian DPA DPIA list](https://cpdp.bg/en/guidelines/list-of-processing-operations-requiring-data-protection-impact-assessment-dpia-pursuant-to-art-35-paragraph-4-of-regulation-eu-2016-679/)).

All teen users still receive children's heightened GDPR protections even when old enough to
consent themselves. Information addressed to a child must be easily understandable, and health
data is special-category data whose processing is prohibited unless an Article 9 exception
applies. Selftend's current policy relies on explicit consent where user-entered self-help content
engages Article 9
([GDPR Recitals 38 and 58, Articles 9 and 12](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)).

Two EU questions require counsel rather than an engineering assumption:

- Article 8 names Article 6(1)(a), while Selftend currently calls core processing contractual and
  separately relies on Article 9(2)(a) explicit consent for sensitive content. Counsel must confirm
  a valid Article 6 and Article 9 route for each teen age/territory; “contract” does not remove
  national rules about a minor's capacity to enter that contract.
- GDPR Recital 38 says parental consent should not be necessary for preventive or counselling
  services offered directly to a child. Selftend is intentionally framed as wellness and guided
  self-help, not counselling or healthcare. It should not claim this exception without a written
  legal classification covering the actual feature set and each relevant national law.

### United Kingdom

Under UK GDPR, a child aged 13 or over can give their own consent for a directly offered online
service; under 13 requires parental authorization when consent is the lawful basis. The rule also
reaches special-category processing according to the ICO
([ICO, lawful basis for children's services](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/annex-c-lawful-basis-for-processing/)).

Separately, the statutory Children's Code treats a child as anyone under 18 and covers services
likely to be accessed by children, including general wellbeing apps and qualifying not-for-profit
services. The Code excludes services specifically offering online counselling or preventive
services, but explicitly says more general health, fitness, and wellbeing apps are covered
([ICO, services covered](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/services-covered-by-this-code/)).
Because Selftend is deliberately for 13-17-year-olds and calls itself guided self-help, the working
assumption should be that the Code applies unless UK counsel documents the exception.

For a covered service, the ICO requires a child-focused DPIA, age-appropriate application, clear
child-readable transparency, high-privacy defaults, data minimization, sharing and profiling off
by default, no detrimental data use or privacy-eroding nudges, and accessible rights tools. The
service must either establish age with certainty proportionate to its data risks or apply the
Code's protections to every user
([ICO Code standards](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/),
[ICO age-appropriate application](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/3-age-appropriate-application/)).

### United States

Federal COPPA protects children under 13; it does not make 13-17-year-olds adults. It applies to
commercial child-directed online services that collect personal information and to general-
audience services with actual knowledge they collect it from an under-13 user. A general-audience
service may block under-13 users using a neutral age screen and may rely on the entered age unless
it later acquires actual knowledge. A mixed-audience child-directed service has stricter rules and
cannot simply collect first and block later
([FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).
The 2025 amended COPPA Rule took effect on 2025-06-23 and its general compliance date was
2026-04-22, so implementation must use the amended rule rather than the older FAQ baseline. It
strengthens parental-consent, retention, security, and third-party disclosure requirements for
covered operators
([Federal Register, amended COPPA Rule](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)).

The FTC says many genuine nonprofit entities outside its FTC Act jurisdiction are generally
outside COPPA, but nonprofits operating for commercial members may be covered. “Free” and
“non-profit mission” do not by themselves prove the exemption. Selftend's operator/legal-entity
status therefore needs a documented legal conclusion before relying on it. Even if exempt, a
pre-account under-13 block and COPPA-level minimization are the safer product baseline for a
service that does not plan parental consent.

State age-assurance and teen-privacy rules are a fast-moving second layer. Google and Apple now
provide regional age-range and significant-update signals for certain jurisdictions, but both say
the developer—not the store—must decide when the law applies and how to restrict access or act on
parental approval. A nationwide U.S. launch needs current counsel review of the supported states,
the operator's nonprofit status, and whether the free wellness service is in scope before choosing
to integrate platform age-signal APIs
([Google Play changes for U.S. state laws](https://support.google.com/googleplay/android-developer/answer/16569691),
[Apple age-assurance Q&A](https://developer.apple.com/support/age-assurance)).

The FTC's Health Breach Notification Rule is a separate standing issue, not a teen-only rule. It
can cover businesses **and nonprofits** offering personal health records outside HIPAA, including
qualifying health apps, and treats some unauthorized disclosures as breaches. Counsel must decide
whether Selftend's multi-module user record has the technical capacity to draw health information
from multiple sources and is a covered PHR
([FTC HBNR compliance guide](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)).

## Firm store and product obligations before the audience change

### Google Play

- Declare the actual 13-15, 16-17, and adult audiences and send the change for review. The app and
  listing must be appropriate for every selected group. Google warns that any targeted user under
  21 may be a child under local law and that apps targeting children must comply with Families
  Policy ([target-audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159)).
- Treat Families applicability as a territory/legal finding, not as automatically absent merely
  because under-13 is excluded. If it applies, child-accessible content, SDKs, identifiers, data
  practices, APIs, and sign-in must meet the Families rules. Mixed-audience apps may not transmit
  listed device identifiers from child or unknown-age users and must not require an API/SDK that
  is not approved for child-directed services unless it is safely behind a neutral age screen
  ([Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335),
  [Families data practices](https://support.google.com/googleplay/android-developer/answer/11043825)).
- Keep the Data safety form accurate for the app and every embedded SDK, including account data,
  user-entered wellness/health content, deletion, security, collection, and sharing
  ([Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)).
  Because account creation is required, retain both the in-app deletion path and the externally
  accessible deletion resource required by the User Data policy.
- Keep the Health apps declaration accurate. Google explicitly includes stress management,
  mindfulness, meditation, cognitive health, and mental/behavioral-health tools. The privacy
  policy must comprehensively describe personal and sensitive data use. A non-regulated app must
  carry the required not-a-medical-device/no-diagnosis-treatment-cure-prevention disclaimer in
  its description and direct users to qualified professionals for medical advice
  ([Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291),
  [Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511)).
- Re-run the live content-rating questionnaire truthfully. The public documentation does not
  expose every current question, so the actual self-harm and medical/treatment wording must be
  captured during the console review rather than guessed.

### Apple App Store

- Answer the age-rating questionnaire accurately, including health/wellness and medical/treatment
  content. If the resulting rating is below Selftend's legal/EULA minimum, override it upward to
  match that minimum
  ([Apple age-rating setup](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)).
- Do not select Made for Kids. Still comply with Guideline 5.1.4: an app that collects, transmits,
  or can share personal information from a minor must have a privacy policy and comply with every
  applicable children's privacy law. Birth date and parental contact details may be requested only
  for compliance purposes, with useful functionality regardless of age
  ([App Review Guidelines 1.3 and 5.1.4](https://developer.apple.com/app-store/review/guidelines/)).
- Keep App Privacy answers comprehensive and current for Selftend and all third-party partners.
  Apple requires disclosure even when collection varies by whether the user is a child
  ([Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/)).
- Preserve in-app account deletion. Also confirm that the Apple Developer account is the correct
  legal-entity type: Guideline 5.1.1(ix) says apps providing healthcare services or requiring
  sensitive user information should be submitted by the legal entity providing the service, not
  an individual developer
  ([App Review Guideline 5.1.1](https://developer.apple.com/app-store/review/guidelines/)).
- Preserve the wellness, not medical-device, posture. Apple gives medical apps greater scrutiny,
  rejects unverifiable health measurements/claims, restricts health-data advertising and data
  mining, and applies separate consent/ethics rules to human-subject research
  ([App Review Guidelines 1.4.1 and 5.1.3](https://developer.apple.com/app-store/review/guidelines/)).
  If Selftend's category or questionnaire answers trigger Apple's regulated-medical-device
  declaration, complete it truthfully even when the answer is that Selftend is not regulated
  ([Apple medical-device declaration](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status)).
- Evaluate the Declared Age Range API and PermissionKit against the supported-country decision.
  They can return privacy-preserving age bands and regional regulatory signals, but Apple says
  developers remain responsible for age restrictions and significant-change handling. A parallel
  web/Android policy is still required; an iOS-only signal cannot be Selftend's sole age gate
  ([Apple age-assurance Q&A](https://developer.apple.com/support/age-assurance),
  [Declared Age Range](https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app)).

## Product safeguards implied by a genuine teen audience

These are product-risk conclusions rather than claims that one cited statute prescribes the exact
UI:

- **Age and territory before data:** decide eligibility before signup, OAuth, crash-reporting user
  association, push registration, or saving a journal entry. Avoid a gate that encourages a desired
  answer. Store only the minimum proof needed for the decision and document retention/deletion.
- **One high-privacy baseline:** reminders remain off, analytics/tracking remain absent, no ads or
  profiling, no public sharing, and no retention mechanics that punish absence. Applying these
  child-protective defaults to adults too reduces age inference and branch complexity.
- **Child-readable layered policy:** provide concise 13-year-old-readable explanations at account
  creation and when sensitive entry, reminders, export, deletion, or third-party sign-in is first
  used. The full privacy policy and terms remain available but cannot be the only explanation.
- **Teen content review:** review every CBT, ACT, exposure, worry, recovery, sleep, meditation, and
  crisis flow for 13-15 and 16-17 developmental suitability. Keep diagnosis, treatment outcomes,
  emergency monitoring, and therapist-replacement claims out of app and campaign copy.
- **Crisis boundary:** keep crisis guidance calm, visible, and separate; state that entries and
  support are not continuously monitored and Selftend is not an emergency service. Verify the
  country-directory destination and define how support staff respond if a minor discloses imminent
  danger, abuse, or exploitation.
- **Rights without unsafe disclosure:** preserve self-service export and deletion, then define how
  a minor or a parent/guardian can exercise rights. Do not assume a parent is automatically entitled
  to a teenager's private reflections; authority, the teen's capacity, confidentiality, and safety
  can differ by country and circumstances.
- **SDK and processor review:** inventory every native and web SDK, network destination, log field,
  OAuth provider, push service, crash reporter, and processor. Confirm contractual permission for
  teen/child data, prevent wellness text from entering logs or analytics, and update store labels,
  processor disclosures, and data-processing records together.
- **Release and support operations:** update the breach/DPIA/rights workflows for child data,
  define account handling when an underage user is discovered, and test age paths without creating
  non-deliverable live email accounts.

## Decisions that still need explicit legal or owner resolution

The research narrows the remaining decisions to these:

1. **Supported-country and minimum-age matrix:** country-aware floors (13-16), verified parental
   authorization in selected markets, or a simpler uniform higher floor. This controls every other
   age-gate and marketing decision.
2. **Lawful basis and contract capacity:** the Article 6/9 basis for teen-entered wellness data,
   national contract validity, and whether any preventive/counselling exception actually applies.
3. **Age-assurance architecture:** a shared web/native declaration, platform age signals where
   legally required, or applying the most protective teen defaults to everyone; including what
   minimal evidence is retained.
4. **U.S. entity and state-law posture:** whether the actual operator is outside COPPA's FTC Act
   scope, which state app-store/teen laws apply, and whether Selftend is covered by the HBNR.
5. **Apple operator identity:** whether the current individual or organization developer account
   satisfies Apple's legal-entity expectation for an app that requires sensitive information.
6. **Minor and guardian rights/support:** verification, access, deletion, consent withdrawal,
   safeguarding escalation, and the boundary around confidential reflections.
7. **Public claim gate:** “for teens and adults” or “13+” becomes publishable only after the matrix,
   app behavior, policies, Play declaration, App Store rating, and live availability all agree.

## Consequence for the video campaign

Video preparation does not need to wait. Use the already-decided fictional, age-neutral demo
account; calm narration; no clinical outcome claims; no real health data; and modular footage.
The promotional cut may show Android, iOS, and web after each is publicly available and verified.
Until the decisions above are implemented and reviewed, do not put “13+”, “for teenagers”, or an
equivalent minor-eligibility promise in narration, captions, store video, end cards, descriptions,
or Reddit copy.

## Primary sources

All sources checked 2026-08-02.

- Google Play: [Target audience and content](https://support.google.com/googleplay/android-developer/answer/9867159) · [Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335) · [Families data practices](https://support.google.com/googleplay/android-developer/answer/11043825) · [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) · [Health declaration](https://support.google.com/googleplay/android-developer/answer/14738291) · [Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511) · [U.S. state age-verification changes](https://support.google.com/googleplay/android-developer/answer/16569691) · [Play Age Signals](https://developer.android.com/google/play/age-signals/overview)
- Apple: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/) · [Age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/) · [App Privacy](https://developer.apple.com/app-store/app-privacy-details/) · [Medical-device declaration](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status) · [Age-assurance Q&A](https://developer.apple.com/support/age-assurance) · [Declared Age Range](https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app)
- EU/Bulgaria: [GDPR official text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) · [European Commission child-data safeguards](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en) · [Bulgarian Personal Data Protection Act](https://cpdp.bg/en/legislation/personal-data-protection-act/) · [Bulgarian DPA DPIA list](https://cpdp.bg/en/guidelines/list-of-processing-operations-requiring-data-protection-impact-assessment-dpia-pursuant-to-art-35-paragraph-4-of-regulation-eu-2016-679/)
- UK ICO: [Services covered by the Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/services-covered-by-this-code/) · [Code standards](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/) · [Age-appropriate application](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/3-age-appropriate-application/) · [Lawful basis](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/annex-c-lawful-basis-for-processing/)
- U.S. FTC: [COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) · [Amended COPPA Rule](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule) · [Health Breach Notification Rule guide](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)
