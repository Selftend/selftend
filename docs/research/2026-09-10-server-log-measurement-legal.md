# Server-log-derived visitor counting: is it "analytics" under GDPR and ePrivacy?

Date: 2026-09-10 · Map: #2301 (ruling 7) · Ticket: #2309 (research) · Blocks: #2310

Every claim below carries a source URL and the date it was checked (2026-09-10 throughout).
Primary sources are EDPB guidance, the EU treaty texts on EUR-Lex, and national DPA
publications. Anything else is labelled **SECONDARY** inline. Section 7 lists what could
**not** be confirmed from a primary source.

## Headline

**Ruling 7 holds, but not for the reasons it gives, and one string in the app should change.**

Reading Cloudflare's aggregate edge counts is **not** a new disclosure: no byte sent to the
terminal changes, no new recipient or processor or transfer or retention appears, the
further purpose is statistical and therefore treated as compatible under GDPR Recital 50,
and what reaches Selftend is anonymous information that Recital 26 puts outside the
Regulation entirely. The repo's own established test for what counts as a disclosure —
_"not the data collected, not a processor, not retention, not a user right, not eligibility,
not liability"_ — returns **no** on every axis, so no `policyVersion` bump and no re-gate.

☠️ **But both grounds the ruling actually states are unsound.** "No script on the page" is
not the Article 5(3) test — EDPB Guidelines 2/2023 ¶54-55 apply Article 5(3) to IP-only
techniques with no script at all, and put the burden on the operator to _ensure_ the IP does
not originate from the terminal. And "no per-visitor identifier" is true only of what
Selftend sees: Cloudflare's own docs say _"Once Cloudflare identifies a unique IP address
for a request, we identify such request as a visit."_ The identifier exists; it is just
consumed inside the processor.

☠️☠️ **The strongest challenge is the voluntary promise, and it does not need
consumer-protection law.** EDPB Guidelines 4/2019 ¶70 lists as a fairness element:
_"**Truthful** — … they should act as they declare they will and not mislead the data
subjects."_ A promise stricter than statute becomes an Article 5(1)(a) obligation once
published. Nine promise surfaces exist; seven are plainly unaffected, `policies.json:46`
("analytics tracking services") is ambiguous, and **`settings.json:122` — a preference
labelled "Analytics" described as "Not currently used" — is defensible only on context, not
on its text.** That string is not digest-pinned, so fixing it is free.

☠️ **There is no European answer to the ePrivacy question — there are eleven.** Bulgaria,
the establishment jurisdiction, transposed Article 5(3) at **чл. 4а ЗЕТ** as an
information-plus-opt-out regime in which the word "consent" never appears. Spain's AEPD is
the only regulator anywhere to name **log-based analytics** as a technique that processes no
personal data. The Dutch DPA runs exactly this on its own site with no consent mechanism.
Against that: Germany **deleted** its safe-harbour paragraph in Nov 2024 and the BfDI now
says the converse; the UK made "information automatically emitted by the terminal" statutory
access in Feb 2026 **and withheld the new analytics exception from that limb**; CNIL and the
Garante both held in 2026 that a server collecting request parameters reads the terminal;
Italy's Art. 122(2-bis) bans monitoring user operations with no storage predicate at all.

⚠️ **One substantive change follows.** Every adverse source converges on the **IP-derived
deduplication** that produces "unique visitors" — not on the reading, and not on the server.
Build the visitor layer on **requests and page views**, which are counters, and demote
"unique visitors" to a soft secondary reading.

## 0. What is actually being proposed, in legal terms

Three facts fix the analysis, and two of them are repo facts rather than legal ones.

**Fact 1 — the policy already discloses edge logs, including the IP address.**
`src/i18n/locales/en/policies.json:77` names Cloudflare as a processor and says, in the
shipped text: _"Cloudflare (Cloudflare, Inc., USA): serves the static web application via
Cloudflare Workers. Cloudflare does not receive or process your personal data beyond
standard edge server logs (IP address in access logs, subject to Cloudflare's privacy
policy)."_ The collection is therefore already disclosed. The question is not whether the
data may exist — it is whether **reading an aggregate of it for a new purpose** needs to be
said.

**Fact 2 — the "no analytics" promises are worded around client-side instruments.**
The promises `docs/marketing-plan.md` § 3 counts as "eight places" are not a blanket "we do
not measure". The load-bearing ones are:

| Location (`policies.json`) | Text                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:46`                      | "We do not use advertising SDKs, **analytics tracking services**, behavioral profiling tools, or social media pixels."                                                             |
| `:44`                      | "We do not collect IP addresses **for profiling**, device fingerprints, location data…"                                                                                            |
| `:388`                     | "Selftend does not currently use any optional or **analytics cookies**."                                                                                                           |
| `:389`                     | "If optional analytics or functionality cookies are introduced in the future, they will not be set until you provide explicit consent…"                                            |
| `:152`                     | "If **optional analytics** are introduced in the future, they will require your explicit consent through the cookie preferences manager before any non-essential storage is used." |
| `:441`, `:473`             | "no advertising or **analytics SDKs**"                                                                                                                                             |

Two further surfaces sit outside the policy, in the cookie preferences manager
(`src/i18n/locales/en/settings.json`):

| Location (`settings.json`) | Text                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `:111`                     | "We use essential browser storage (localStorage) to keep you signed in. **No tracking cookies are used.**"                                     |
| `:122`                     | Under a preference labelled simply **"Analytics"**: "**Not currently used.** This preference will apply if analytics are added in the future." |

Five of the six categories named in the policy — SDKs, pixels, cookies, fingerprints,
profiling tools — are things placed on or read from the device. Three phrases are broader
and are the exposure: **"analytics tracking services"** (`policies:46`), **"optional
analytics"** (`policies:152`), and ☠️ **"Analytics — Not currently used"**
(`settings:122`). See §5.

**Fact 3 — Cloudflare's free "unique visitors" metric is an IP-derived deduplication,
performed by Cloudflare.** Cloudflare's own documentation states: _"Once Cloudflare
identifies a unique IP address for a request, we identify such request as a visit."_
([developers.cloudflare.com/analytics/faq/about-analytics/](https://developers.cloudflare.com/analytics/faq/about-analytics/),
checked 2026-09-10). The same page contrasts this with script-based tools: _"Google
Analytics and other web-based analytics programs use JavaScript on the web browser to track
visitors."_

☠️ **This qualifies ruling 7's phrase "no per-visitor identifier".** There _is_ a
per-visitor identifier in the pipeline — the IP address — and it is used to deduplicate.
What is true is narrower and still sufficient: **Selftend never sees it.** The identifier is
consumed inside the processor; the controller reads only a scalar. That distinction is what
the rest of this document tests.

## 1. The Article 5(3) ePrivacy hinge

### The operative text

Directive 2002/58/EC Article 5(3), **as amended by Directive 2009/136/EC** (consolidated
text, EUR-Lex CELEX `02002L0058-20091219`, checked 2026-09-10 —
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02002L0058-20091219>):

> Member States shall ensure that the **storing of information, or the gaining of access to
> information already stored, in the terminal equipment of a subscriber or user** is only
> allowed on condition that the subscriber or user concerned has given his or her consent,
> having been provided with clear and comprehensive information, in accordance with
> Directive 95/46/EC, inter alia, about the purposes of the processing. This shall not
> prevent any technical storage or access for the sole purpose of carrying out the
> transmission of a communication over an electronic communications network, or as strictly
> necessary in order for the provider of an information society service explicitly requested
> by the subscriber or user to provide the service.

Note the shape of the provision. It is **not** a rule about analytics, tracking, or
identifiers. It is a rule about a **location** — the terminal equipment — and two **verbs**
— storing, and gaining access to what is already stored. Nothing in it is triggered by
purpose. A tracking-intensive purpose executed entirely off-device is outside it; a trivial
purpose executed by writing one byte to the device is inside it. The "strictly necessary"
exemption in the second sentence only ever matters **once** the first sentence has been
engaged.

### Article 6 (traffic data) does not reach a website operator

Article 6(1) of the same Directive constrains traffic data _"processed and stored by the
**provider of a public communications network or publicly available electronic
communications service**"_ (EUR-Lex CELEX `32002L0058`, checked 2026-09-10). A website
publisher is neither. The ePrivacy traffic-data regime is therefore not a second route into
this analysis; Article 5(3) is the only one.

### The EDPB's own test — and why it does not simply exempt server-side work

**EDPB Guidelines 2/2023 on the Technical Scope of Art. 5(3) of the ePrivacy Directive**,
version 2.0, adopted 7 October 2024, is the controlling interpretive text
([landing page](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en) ·
[PDF v2.0](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf),
both checked 2026-09-10). All paragraph numbers below are from that PDF.

The three-criterion test (¶6): **A** — the operation relates to "information" (_"the term
used is not 'personal data', but 'information'"_); **B** — it involves "terminal equipment"
reached over a "public communications network"; **C** — it constitutes "storage" (C.1) or
"gaining of access" (C.2).

On what counts as gaining access, ¶32:

> Whenever an entity takes steps towards gaining access to information stored in the
> terminal equipment, Article 5(3) ePD would apply. **Usually this entails the accessing
> entity to proactively send specific instructions to the terminal equipment in order to
> receive back the targeted information.** For example, this is the case for cookies, where
> the accessing entity instructs the terminal equipment to proactively send information on
> each subsequent Hypertext Transfer Protocol ('HTTP') call.

¶33 extends this to distributed software, API-calling SDKs and JavaScript, _"as the
accessing entity explicitly instructs the terminal equipment to send the information."_
¶34 then widens it further, and this is the sentence that prevents a clean "server-side is
outside" answer:

> Instructing the device to send already stored information (for example, **through the use
> of a protocol**, or an SDK that imply the proactive sending of information by the terminal
> equipment) makes an intrusion into the terminal equipment possible, therefore such an
> access triggers the applicability of Article 5(3) ePD.

☠️ **"Through the use of a protocol" is broad enough to reach HTTP itself.** The EDPB did
not write a location-based safe harbour for server-side processing. It wrote a test about
whether the terminal was _made to emit_ the information — and a protocol counts.

### ☠️☠️ The paragraph that actually governs: IP-only tracking (§3.3, ¶54-56)

This is the single most important passage for this question, and it is **adverse to the
comfortable reading**. Verbatim:

> **54.** Some providers are developing solutions that only rely on the collection of one
> component, namely the IP address, in order to **track the navigation** of the user, in
> some case across multiple domains. In that context Article 5(3) ePD could apply even
> though the instruction to make the IP available has been made by a different entity than
> the receiving one.
>
> **55.** However, gaining access to IP addresses would only trigger the application of
> Article 5(3) ePD in cases where **this information originates from the terminal equipment
> of a subscriber or user**. While it is not systematically the case (for example when
> CGNAT is activated), the static outbound IPv4 originating from a user's router would fall
> within that case, as well as IPv6 addresses since they are partly defined by the host.
> **Unless the entity can ensure that the IP address does not originate from the terminal
> equipment of a user or subscriber, it has to take all the steps pursuant to the Article
> 5(3) ePD.**
>
> **56.** While the present guidelines do not analyse the application of the exemptions to
> the obligation to collect consent provided by Article 5(3) ePD, it is important to once
> again recall that **the applicability of this article does not systematically mean that
> consent needs to be collected**. The EDPB thus reminds that in each case it would have to
> be assessed if a consent is needed or whether an exemption under Article 5(3) ePD could
> apply.

☠️ **And the threshold was lowered between draft and final.** The v1.0 draft of ¶32
(14 Nov 2023) read: _"Whenever the accessing entity **wishes to gain access** to information
stored in the terminal equipment **and actively takes steps towards that end**, Article 5(3)
ePD would apply."_ The adopted v2.0 deleted both the subjective element and the adverb,
leaving bare _"takes steps towards gaining access"_. Anyone defending a position by citing
"the EDPB requires the entity to have **actively** taken steps" is quoting a superseded
draft. (v1.0:
<https://www.edpb.europa.eu/system/files/2023-11/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_en.pdf>,
checked 2026-09-10.) By contrast **¶55 is word-for-word identical in both versions**, and
footnote 28 — new in v2.0 — expressly separates the tracking question from ordinary routing:

> This is additional to and independent of the use and function of an IP address for the
> establishment and conveyance or transmission of underlying technical communications, or
> the fact that it may or may not be personal data (in respect of ePrivacy analysis, it is
> "information")

⚠️ **Footnote 28 cuts both ways.** It says the IP's ordinary routing function is a separate
matter from the tracking use §3.3 is about — which supports treating pure routing as outside
§3.3's target. But it also forecloses the argument "the IP is only here to route the packet,
so §3.3 cannot reach it": the EDPB has expressly said the two coexist.

**The protocol-level passage (¶¶42-44) is the general rule behind ¶54:**

> **42.** … **The communication of those identifiers to remote actors is instructed through
> software following agreed upon communication protocols.** As outlined above, the fact that
> the receiving entity might not be the entity instructing the sending of information does
> not preclude the application of Article 5(3) ePD. **This might concern routing identifiers
> such as the MAC or IP address of the terminal equipment**, but also session identifiers …
>
> **43.** In the same manner, the application protocol can include several mechanisms to
> provide context data (such as HTTP header including "accept" field or user agent) …
> **Once again, relying on those mechanisms to collect information** (for example in the
> context of fingerprinting or the tracking of resource identifiers) **can lead to** the
> application of Article 5(3) ePD.
>
> **44.** … The use of such information by an application would not constitute a "gaining of
> access to information already stored" in the meaning of Article 5(3) ePD **as long as the
> information does not leave the device**, but when this information or any derivation of
> this information is accessed, Article 5(3) ePD would apply.

Note the modality throughout: "might concern", "can lead to", "could apply". The EDPB built
a framework under which ordinary protocol data _could_ be in scope, and declined to say it
is. And ¶4 refuses the exemption question outright: _"These Guidelines do not address the
circumstances under which a processing operation may fall within the exemptions … as these
circumstances should be analysed on a case-by-case basis accounting for the relevant member
state transposition(s), and guidance issued by national Competent Authorities."_

**CJEU C-673/17 _Planet49_** (1 Oct 2019, ECLI:EU:C:2019:801,
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62017CJ0673>, checked
2026-09-10) confirms the criterion-A point at ¶68-70: Article 5(3) _"refers to 'the storing
of information' and 'the gaining of access to information already stored', without
characterising that information or specifying that it must be personal data"_, and the
protection _"applies to any information stored in such terminal equipment, regardless of
whether or not it is personal data"_. **So the Recital 26 anonymity argument in §2 does not
help under ePrivacy** — it helps only under the GDPR.

Three things follow, and they must be kept separate.

1. **The "no script, therefore no Article 5(3)" argument is dead.** ¶54's whole point is
   that Article 5(3) can bite on IP alone, with no script, and even where the entity that
   caused the IP to be emitted is not the entity receiving it. A defence of ruling 7 built
   on "there is no script on the page" is not supported by the primary source.
2. **¶55 sets a default that runs against the site operator.** IPv6 addresses are called out
   as originating from the terminal because they are _"partly defined by the host"_, and the
   burden is expressly assigned: _unless the entity can ensure_ the IP does not originate
   from the terminal, it must take all Article 5(3) steps. Selftend cannot ensure that for
   an arbitrary visitor.
3. **But ¶54 describes a purpose Selftend does not have, and ¶56 defuses the consequence.**
   ¶54 is about solutions built _"in order to track the navigation of the user, in some case
   across multiple domains"_. Aggregate counting tracks no navigation and crosses no domain.
   And ¶56 says in terms that applicability is not consent: the second sentence of Article
   5(3) — technical storage or access _"strictly necessary in order for the provider of an
   information society service explicitly requested by the subscriber or user to provide the
   service"_ — still has to be assessed. Receiving the IP of an incoming HTTP request is not
   merely strictly necessary to serve the page; it is **physically inseparable from serving
   it**. A TCP/IP response cannot be routed without it.

### The caching point, and why it does not swallow the site

⚠️ ¶50 says of tracking links and pixels that their distribution to the terminal _"does
constitute storage, at the very least through the caching mechanism of the client-side
software. As such, Article 5(3) ePD is applicable, even if this storage is not permanent."_
Taken alone that would make Article 5(3) applicable to serving **any** cacheable page. What
saves an ordinary page is the strictly-necessary exemption, and what forfeits it is ¶51's
subject: _the addition of tracking information_ to what is sent. **The proposal here adds
nothing to what is sent to the terminal.** The bytes on the wire are identical before and
after. That is the strongest ePrivacy argument available, and it is a _purpose-and-payload_
argument, not a _server-side_ one.

### ☠️☠️ The point that actually resolves the hinge: ePrivacy governs the access, not the use

Everything above argues about whether receiving an inbound IP is "gaining access". **That
argument does not need to be won, because it is the wrong question.** Whatever the answer
is, it is the same answer before and after this proposal: the IP already arrives, the edge
already logs it, and nothing about the access changes. Article 5(3) attaches to the access
event, and the ICO says so in terms
(<https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-the-pecr-rules-relate-to-the-uk-gdpr/>,
checked 2026-09-10):

> **Regulation 6 is specifically about the processing involved in storing information, or
> accessing information stored, in user devices. It does not apply to, or contain any
> specific rule about, subsequent processing operations involving this information.**

> if you store information, or access information stored, on user devices, then you must
> comply with PECR first; and **the UK GDPR applies to any processing of personal data
> outside this storage or access.**

**Reading an aggregate of already-collected logs is a subsequent processing operation.** It
is therefore a GDPR question (§2), not an ePrivacy one — and the GDPR answer is purpose
limitation, which Recital 50 resolves in favour of statistical further processing.

⚠️ **The counter-argument, stated fairly.** WP194's closing guideline (2) says: _"If a
cookie is used for several purposes, it can only benefit from an exemption to informed
consent if each distinct purpose individually benefits from such an exemption."_ CNIL says
the same at ¶47 of its guidelines: trackers escape consent only if used _"exclusivement"_
for exempt purposes. On that logic, adding a measurement purpose to data whose access was
exempt could retroactively defeat the exemption. **The answer is that the exempt thing here
is not severable and not chosen:** receiving the source IP of a TCP connection is not a
technique adopted for a purpose, it is a precondition of replying at all. There is no
version of serving the page that omits it. A cookie can be dropped; the return address
cannot.

### ☠️ The national picture is not uniform, and two DPAs moved recently — both adversely

**United Kingdom — PECR reg 6 was substituted on 5 February 2026** by the Data (Use and
Access) Act 2025 (<https://www.legislation.gov.uk/uksi/2003/2426/regulation/6>, checked
2026-09-10). The new text is materially wider than Article 5(3):

> **6.**—(1) Subject to Schedule A1, a person must not store information, or gain access to
> information stored, in the terminal equipment of a subscriber or user.
> (2) In paragraph (1) and Schedule A1— (a) a reference … includes a reference to
> **instigating** the storage or access, and (b) except as otherwise provided, a reference
> … to gaining access to information stored in the terminal equipment of a subscriber or
> user **includes a reference to collecting or monitoring information automatically emitted
> by the terminal equipment**.

☠️☠️ A new **statutory analytics exception** appeared at the same time — Schedule A1 ¶5,
"statistical purposes": sole purpose of collecting statistics about how the service or
website is used with a view to improving it; not shared except to help make those
improvements; clear and comprehensive information given; and **"the subscriber or user is
given a simple means of objecting, free of charge, to the storage or access and does not
object"** (<https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1>, checked 2026-09-10).
**But ¶5(2) switches the exception off for exactly the passive limb:**

> **(2)** In sub-paragraph (1), the reference to gaining access to information stored in the
> terminal equipment of a subscriber or user **does not include a reference to collecting or
> monitoring information automatically emitted by the terminal equipment.**

So in the UK, _if_ an IP arriving in a routine HTTP request is "automatically emitted
information", it is an access with **no** available exception. ⚠️ The ICO's finalised
guidance (29 April 2026) gives exactly one worked example of automatically-emitted
information — **wifi probe requests** — and its guidance contains **zero** occurrences of
"server log", "access log", "log file" or "weblog". **The decisive UK question is
unanswered by the regulator.** The same guidance does, however, say the analytics exception
_"is about how your service is used, not about who uses it"_, and lists as squarely inside
it: total visits page-by-page, device type and browser, **referrer URL**, and **"coarse
geolocation at city or region level that does not allow people to be identified"** — which
is a fair description of what a Cloudflare traffic dashboard shows.

⚠️ The ICO also forecloses the naive version of the ruling's own argument
(<https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/>,
checked 2026-09-10): _"**Regulation 6 applies in both a 'client-side' and 'server-side'
context** where information is stored or accessed on a device. … It is important to
understand that these contexts don't necessarily impact whether regulation 6 applies. **The
key consideration is whether the technology stores or accesses information on a device and
the purposes for which it does so.**"_ Moving work server-side is not, by itself, an answer
anywhere.

**France — CNIL expressly rejected the "the server only received what the browser sent"
argument in March 2026.** In its _Recommandation relative aux pixels de suivi dans les
courriers électroniques_, adopted 12 March 2026
(<https://www.cnil.fr/sites/default/files/2026-04/recommandation-pixels_de_suivi.pdf>,
checked 2026-09-10), §2.1:

> L'inclusion de ces pixels de suivi dans les courriels constitue, dès lors, une
> **instruction donnée au terminal de l'utilisateur de renvoyer des informations ciblées
> (identifiant du pixel, adresse IP, etc.)** aux acteurs qui les déposent. Ces informations
> sont communiquées à travers les paramètres de la requête et **leur collecte, par le
> serveur hébergeant l'image, constitue une opération de lecture sur le terminal de
> l'utilisateur.**

_(The inclusion of these tracking pixels in emails constitutes an instruction given to the
user's terminal to send back targeted information (pixel identifier, IP address, etc.) to
the actors placing them. That information is communicated through the request parameters,
and **its collection, by the server hosting the image, constitutes a read operation on the
user's terminal**.)_

☠️ CNIL's consultation synthesis records contributors making precisely the argument this
document is testing, and dismisses it
(<https://www.cnil.fr/sites/default/files/2026-04/synthese_consultation_pixels.pdf>, checked
2026-09-10): contributors said CNIL was widening "access to information stored in the
terminal" to cover technologies where _"le serveur collecte passivement des données
techniques automatiquement transmises par le terminal via une requête HTTP"_, which _"correspond
en réalité à un comportement standard du protocole web"_. CNIL's answer was to cite EDPB
Guidelines 2/2023 and keep its position.

**But the distinguishing feature is squarely present in the CNIL text and squarely absent
here: the pixel is an _instruction_.** CNIL's reasoning runs pixel → instruction → read. A
page the user asked for, carrying no extra request, contains no instruction to send
anything the user did not already ask to send. CNIL says so itself, in the one sentence that
comes closest to blessing the alternative
(<https://www.cnil.fr/fr/faq-recommandation-pixels-courriers-electroniques>, 22 July 2026,
Q13, checked 2026-09-10): _"la CNIL recommande donc de privilégier des méthodes **ne
reposant pas sur l'accès aux terminaux des utilisateurs**"_ — CNIL recommends preferring
methods that do not rely on access to users' terminals. A method that does not touch the
terminal is CNIL's own recommended alternative.

### ☠️☠️ Bulgaria — the establishment jurisdiction, and it is the most permissive of all

Bulgaria did **not** transpose Article 5(3) in the Electronic Communications Act. It is
**чл. 4а of the Закон за електронната търговия** (Electronic Commerce Act),
<https://lex.bg/laws/ldoc/2135530547>, checked 2026-09-10:

> **Чл. 4а.** (1) Доставчикът на услуги на информационното общество съхранява информация или
> получава достъп до информация, съхранена в крайното устройство на получателя на услугата,
> при условие че: 1. на получателя … е предоставена ясна и изчерпателна информация по чл. 13
> от Регламент (ЕС) 2016/679 …; 2. на получателя … е предоставена **възможност да откаже**
> съхраняването или достъпа до информацията. …
> (3) При последващо съхраняване на информация или получаване на достъп до информация от
> един и същ доставчик изискванията на ал. 1 **не са задължителни, в случай че получателят
> на услугата не е възразил**.
> (4) Изискванията на ал. 1 не се прилагат … когато те са необходими за: 1. предаването на
> съобщения по електронна съобщителна мрежа; 2. предоставяне на услуга на информационното
> общество, **изрично поискана** от получателя …

☠️☠️ **The word „съгласие" (consent) does not appear anywhere in чл. 4а.** Bulgaria
transposed Article 5(3) as an **information-plus-opt-out** regime — the pre-2009 standard —
and never updated it in substance; ал. 3 drops even the information duty on repeat access by
the same provider absent an objection. And ал. 4, т. 2 carries the "explicitly requested
service" exemption verbatim.

The **CPDP** has published cookie guidance (Специфични насоки за различни сектори,
<https://cpdp.bg/специфични-насоки-за-различни-сектори/>, published 2025-05-14, modified
2025-08-04, checked 2026-09-10), which asserts prior consent — but grounds it on the GDPR
rather than on чл. 4а: _"Тези изисквания се прилагат съвместно с GDPR, когато бисквитките
събират лични данни"_ ("these requirements apply jointly with the GDPR where cookies collect
personal data"). On analytics specifically it says: _"Статистически (analytical) … **Изискват
съгласие, освен ако се използват в анонимизиран вид и не се споделят.**"_ — analytics
require consent **unless used in anonymised form and not shared**. That carve-out describes
the proposal exactly.

⚠️ **Confirmed absent:** no CPDP становище or решение on cookies, trackers, audience
measurement, or Article 5(3); zero hits for „трекери"; no CPDP guidance on server or log
files. The sector page is the only relevant CPDP publication and it is Bulgarian-only.

⚠️ **A structural oddity worth knowing:** ЗЕТ чл. 20, ал. 1 puts supervision of чл. 4а with
the **Комисия за защита на потребителите** — the _consumer protection_ commission — not the
CPDP, with penalties of 500-2000 BGN for legal persons (чл. 24, ал. 2). And ЗЕТ чл. 1, ал. 5,
т. 2 carves personal-data protection out of the Act entirely. **So in the establishment
jurisdiction, the regulator holding the ePrivacy transposition is the same regulator that
would hear a misleading-practice complaint about the privacy promise (§5.4).** That is not a
coincidence worth ignoring.

### ☠️☠️ Germany: the safe harbour existed, was authoritative, and was deleted

This is the most consequential national finding, and it runs against the proposal.

**§ 25 TDDDG** (formerly § 25 TTDSG, <https://www.gesetze-im-internet.de/ttdsg/__25.html>,
checked 2026-09-10) transposes Article 5(3) in ordinary terms. What matters is the
supervisory guidance.

**The superseded DSK "OH Telemedien 2021", Version 1.1 (30.11.2022), Rz. 209-218** said
exactly what ruling 7 assumes
(<https://www.datenschutzkonferenz-online.de/media/oh/20221130_OH_Telemedien_2021_Version_1_1.pdf>,
checked 2026-09-10):

> Ein Zugriff setzt eine **gezielte und nicht durch die Endnutzer:innen veranlasste**
> Übermittlung der Browser-Informationen voraus. **Werden ausschließlich Informationen, wie
> Browser- oder Header-Informationen, verarbeitet, die zwangsläufig oder aufgrund von
> (Browser-)Einstellungen des Endgerätes beim Aufruf eines Telemediendienstes übermittelt
> werden, ist dies nicht als „Zugriff auf Informationen, die bereits in der Endeinrichtung
> gespeichert sind", zu werten.** Beispiele dafür sind: die öffentliche IP-Adresse der
> Endeinrichtung, die Adresse der aufgerufenen Website (URL), der User-Agent-String … und
> die eingestellte Sprache.

_(Access presupposes a targeted transmission of browser information not initiated by the end
user. Where exclusively information such as browser or header information is processed which
is transmitted inevitably … this is **not** to be assessed as "access to information already
stored in the terminal equipment". Examples: the public IP address of the terminal, the URL
called, the User-Agent string, and the configured language.)_

☠️☠️ **That paragraph is gone.** The current DSK document is the **"OH Digitale Dienste",
Version 1.2, November 2024**
(<https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf>, checked
2026-09-10), and full-text extraction returns **zero** occurrences of `zwangsläufig`,
`Header`, `User-Agent`, `gezielte`, `eingestellte Sprache` or `öffentliche IP`. The
connector was changed from _"**Demgegenüber** ist es bereits als Zugriff … zu werten"_ to
_"**Auch** ist es als Zugriff … zu werten"_ — the contrast was removed along with the thing
being contrasted. **The DSK's changelog does not mention the deletion.** Rz. 8 does say the
document _"ergänzt die EDSA Guidelines 2/2023"_. ⚠️ The inference that the deletion follows
from that alignment is this document's, not the DSK's.

**The BfDI now states the converse outright** (<https://www.bfdi.bund.de/DE/Buerger/Inhalte/Telemedien/Zählpixel.html>,
undated page citing post-Oct-2024 material, checked 2026-09-10):

> **Beim Austausch von Inhalten über das Internet werden aufgrund der eingesetzten
> technischen Protokolle wie TCP/IP und HTTP zwangsläufig eindeutige Merkmale der
> Endeinrichtung und des Servers miteinander kommuniziert. Es werden somit Informationen in
> der Endeinrichtung des Endnutzenden gespeichert oder es findet ein Zugriff auf
> Informationen, die bereits in der Endeinrichtung (temporär) gespeichert waren, statt.**

Same premise ("zwangsläufig"), opposite conclusion.

⚠️ **But the BfDI's own logfile page then does exactly what §2 of this document argues.**
(<https://www.bfdi.bund.de/DE/Buerger/Inhalte/Telemedien/LogFile_Analyse.html>, checked
2026-09-10.) It holds that transmission is not consent-requiring access _"wenn die
Übermittlung ausschließlich der Darstellung des ausdrücklich von den jeweiligen Nutzenden
gewünschten digitalen Dienstes … dient"_ — i.e. it is rescued by the § 25(2) Nr. 2
exemption, not excluded from scope — and then analyses **reuse of the logfile data for
"Optimierung der Webseite" as a pure GDPR purpose-change question under Art. 6(4)**, with no
§ 25 consent anywhere in the analysis. **Doctrine against, practice for.**

**The strongest single source in favour of the proposal anywhere is German, and it is
ageing.** LfDI Baden-Württemberg, "FAQ Cookies und Tracking", Version 2.0.1, Stand März 2022,
§ 3.1
(<https://www.baden-wuerttemberg.datenschutz.de/wp-content/uploads/2022/03/FAQ-Tracking-online.pdf>,
checked 2026-09-10):

> Ziel im Beispiel ist eine Reichweitenanalyse, **ohne dass nach dem TTDSG (da kein
> „Zugriff") eine Einwilligung erforderlich wäre.** Hierbei können folgende Informationen
> z.B. **mittels Logfile-Analyse** erfasst werden … **Unter § 25 TTDSG fällt nur ein
> „Zugriff" auf Informationen, wenn dieser zielgerichtet erfolgt.** Sowohl IP-Adresse als
> auch User-Agent sind Informationen, die der Browser automatisch beim Aufruf einer Website
> mitsendet … **Der Server hat (anders als bei einem Cookie) keine Informationen als
> Wiedererkennungsmerkmal des Nutzenden auf dessen Endgerät gespeichert und er greift auch
> nicht auf Informationen „zu" … Dieses Vorgehen wird demnach nicht vom § 25 TTDSG erfasst.
> Gleichwohl sind alle (weiteren) Verarbeitungen sehr wohl an den Maßstäben der DS-GVO zu
> messen.**

_(Only a **targeted** access falls under § 25. IP address and User-Agent are sent
automatically by the browser. The server has, unlike with a cookie, stored nothing on the
device as a recognition feature, and nor does it "access" information. **This procedure is
therefore not caught by § 25 TTDSG.** Nevertheless all further processing is very much to be
measured against the GDPR.)_

Its consent-free recipe is almost a description of the proposal: _"Reichweitenanalyse mittels
lokaler Logfile-Analyse · Verzicht auf Dienste externer Dritter · Datensparsame Konfiguration
· Kein Zusammenführen von Nutzungsdaten … · Keine Verwendung der zur Wiedererkennung des
Nutzenden erlangten Informationen für andere Zwecke."_ ⚠️ **Currency caveat, from the LfDI's
own landing page: "Stand: März 2022. … Wir erstellen derzeit eine ergänzte Version dieser
FAQ."** It predates EDPB Guidelines 2/2023 and the DSK deletion.

⚠️ **§ 3.2 of the same FAQ is the warning against the general move**, and it is the fairest
statement of the boundary found in any source: _"Selbstverständlich müssen auch beim
serverseitigen Tracking die Anforderungen des TTDSG und … der DS-GVO eingehalten werden"_,
with the risk that server-side connections are _"vom Nutzenden nicht mehr beobachtbar"_ and
could be done _"**heimlich**"_, harming Article 5(1)(a) transparency — **but**:

> **Findet ein Server-Side-Tracking ohne Cookies … statt und werden Nutzungsdaten vor einer
> Weitergabe an einen Tracking-Dienstleister vollständig anonymisiert, dann kann diese
> Verarbeitung ggf. auf ein berechtigtes Interesse nach Artikel 6 Absatz 1 Buchstabe f
> DS-GVO gestützt werden und **eine Anwendung des TTDSG scheidet aus.**

_(Where server-side tracking takes place without cookies and usage data is fully anonymised
before any transfer, the processing may be based on legitimate interests under Art. 6(1)(f)
and **the TTDSG does not apply**.)_

### ☠️☠️ Italy is a different statute, and it does not need storage or access at all

**Art. 122(2-bis) Codice Privacy** (D.Lgs. 196/2003), in the Garante's own official English:

> Subject to the provisions made in paragraph 1 above, it shall be prohibited to use an
> electronic communications network in order to access information stored in the terminal
> equipment of a contracting party or user, store information, **or monitor the operations
> performed by the user.**

**The third limb has no storage-or-access predicate.** Italian law is textually wider than
Article 5(3), and the "we never touch the terminal" argument does not reach it. The Garante's
2021 cookie guidelines (doc. web 9677876,
<https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876>, checked
2026-09-10) bring _"identificatori passivi, questi ultimi presupponendo **la mera
osservazione**"_ into scope, describing a technique _"che non presuppone l'archiviazione di
informazioni all'interno del dispositivo dell'utente, bensì la mera osservazione delle
configurazioni"_ — and add that the regime bans processing generally with exceptions that
_"non si prestano a interpretazioni analogiche estensive"_, and that _"in nessun caso"_ may
legitimate interest be relied on. The Garante's April 2026 tracking-pixel guidelines
(doc. web 10241943) reach the same conclusion CNIL did: _"**la loro raccolta da parte del
server che ospita l'immagine costituisce un'operazione di lettura sul terminale
dell'utente.**"_

### The jurisdictions where the scope argument is cleanest

**Denmark** states the trigger test as plainly as anyone. Joint guidance of Datatilsynet and
Digitaliseringsstyrelsen, "Brug af cookies og lignende teknologier", May 2025
(<https://www.datatilsynet.dk/Media/638829899950476628/F%C3%A6llesvejledning%20med%20DIGST%20-%20Cookie%20og%20lignende%20teknologier.pdf>,
checked 2026-09-10):

> **Det udslagsgivende for, om du skal forholde dig til cookiebekendtgørelsen er, om du
> lagrer eller tilgår allerede lagrede oplysninger på brugernes udstyr.** Med hensyn til
> databeskyttelsesreglerne er det afgørende, om du behandler personoplysninger i processen.

_(The decisive factor for whether you must deal with the cookie order is whether you store or
access already-stored information on the users' equipment.)_ Its own diagram carries a third
circle for **GDPR-only** processing: _"Anden behandling af personoplysninger, herunder
efterfølgende behandling"_ — other processing of personal data, including subsequent
processing. ⚠️ The same guidance says flatly that statistics tracking technologies require
consent — but every operative sentence is keyed to cookies and similar technologies being
placed or read. ⚠️ Danish supervision moved from Erhvervsstyrelsen to Digitaliseringsstyrelsen
and the old guidance PDF now 404s.

☠️☠️ **The Netherlands is the most probative data point in the entire research, and it is a
DPA's own conduct.** Art. 11.7a(3)(b) Telecommunicatiewet carries a **statutory analytics
exemption** most Member States lack — storage or access to obtain information about the
quality or effectiveness of a delivered service, _"mits dit geen of geringe gevolgen heeft
voor de persoonlijke levenssfeer"_
(<https://wetten.overheid.nl/BWBR0009950/2025-09-01/0/Hoofdstuk11/Paragraaf11.1/Artikel11.7a>,
checked 2026-09-10). And the Autoriteit Persoonsgegevens' own cookie statement (versie
oktober 2025,
<https://www.autoriteitpersoonsgegevens.nl/over-deze-website/cookieverklaring-ap>, checked
2026-09-10) says:

> **De AP gebruikt op deze website alleen functionele cookies.** … **Analyse websitegebruik**
> — Wij gebruiken een statistiekenprogramma om te analyseren … **Hiervoor verzamelen wij,
> net als de meeste websites, IP-adressen van onze bezoekers. Deze IP-adressen worden
> opgeslagen in logfiles. De beheerder van onze website bewaart de logfiles 31 dagen op de
> server, zodat ze beschikbaar zijn voor het statistiekenprogramma. Na deze 31 dagen is
> alleen geaggregeerde informatie beschikbaar…**

**The Dutch data protection authority runs server-log-derived, cookieless site statistics
with no consent mechanism**, describes it under a heading separate from cookies, and
analyses it under the GDPR alone. ⚠️ This is a descriptive statement of the AP's own
practice, not a normative holding. It is evidence of what a regulator thinks is acceptable,
not a ruling that it is.

### ☠️ What the EDPB guidelines do NOT say

A full-text search of the adopted v2.0 PDF returns **zero** occurrences of "log file",
"logfile", "server-side", "server side", "audience", or "statistic". The only occurrence of
"analytic" is ¶48, describing tracking pixels that generate _"analytical usage reports"_.
**The EDPB has not addressed host-side log-derived counting at all.** Any claim that it
blesses the practice, or condemns it, is inference — including the inference in this
document.

## 2. IP addresses processed transiently; legal basis for server logs

### The IP is personal data in Cloudflare's hands; the count is not personal data in ours

GDPR **Recital 30** (EUR-Lex CELEX `32016R0679`, checked 2026-09-10 —
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679>):

> Natural persons may be associated with online identifiers provided by their devices …
> such as internet protocol addresses, cookie identifiers or other identifiers such as radio
> frequency identification tags.

GDPR **Recital 26**, same source:

> The principles of data protection should apply to any information concerning an identified
> or identifiable natural person. … **This Regulation does not therefore concern the
> processing of such anonymous information, including for statistical or research purposes.**

☠️ **These two recitals split the pipeline in half, and the split is the whole argument.**

| Stage                                         | Who holds it | Is it personal data?                                              |
| --------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| IP arrives in the HTTP/IP request             | Cloudflare   | **Yes** — Recital 30, and already disclosed at `policies.json:77` |
| IP deduplicated to compute "unique visitors"  | Cloudflare   | **Yes** — this is processing of personal data                     |
| Scalar count returned via dashboard / GraphQL | **Selftend** | **No** — anonymous statistical information, Recital 26            |

Selftend, as controller, receives a number. That number concerns no identified or
identifiable person and the GDPR does not reach it. The processing that produces it is
Cloudflare's, on Selftend's behalf, of data Selftend already discloses Cloudflare holds.

⚠️ **The honest caveat:** Recital 26's anonymity test is not "the output looks aggregate".
An aggregate can still be personal data if it is granular enough to single someone out. At
Selftend's stated volume — the marketing plan works to "about one arrival a week" — a
country-level or daily count could in principle be a count of one. This is a real, if small,
re-identification surface and it is not addressed by any source found. Recorded in §7.

### Legal basis for the underlying log processing

GDPR **Recital 49**, same source:

> Processing of personal data … for ensuring network and information security … by providers
> of electronic communications networks and services constitutes a legitimate interest.

GDPR **Article 6(1)(f)** (EUR-Lex ELI `reg/2016/679/art_6`, checked 2026-09-10):

> processing is necessary for the purposes of the legitimate interests pursued by the
> controller or by a third party, except where such interests are overridden by the
> interests or fundamental rights and freedoms of the data subject

**Article 6(1)(f) is the basis normally cited for web-server logs, and the EDPB says so
directly.** Guidelines 1/2024 on processing based on Article 6(1)(f), ¶126
(<https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf>,
checked 2026-09-10):

> Measures to ensure an appropriate level of network and information security may entail
> processing of personal data. **Such processing activities may, in principle, be based on
> Article 6(1)(f) GDPR, provided that its conditions (including the necessity and balancing
> tests) are complied with. This was acknowledged – although indirectly – by the CJEU in
> Breyer, as well as in Recital 49 GDPR, and in Recital 121 of Directive (EU) 2022/2555.**

⚠️ **Status caveat: Guidelines 1/2024 is still a draft.** Every page footer reads "Adopted -
version for public consultation"; consultation closed 20 November 2024 and no final version
has been published as of 2026-09-10. The same is true of Guidelines 01/2025 on
Pseudonymisation (consultation closed 14 March 2025). Weigh accordingly.

**CJEU C-582/14 _Breyer_** (19 Oct 2016, ECLI:EU:C:2016:779,
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62014CJ0582>, checked
2026-09-10), operative part point 1:

> …a dynamic IP address registered by an online media services provider when a person
> accesses a website that the provider makes accessible to the public constitutes personal
> data … **in relation to that provider, where the latter has the legal means which enable
> it to identify the data subject with additional data which the internet service provider
> has about that person.**

☠️ **Note what _Breyer_ actually decides: identifiability is _relative to the holder_.**
¶46 sets the limit — data are not personal where identification _"was prohibited by law or
practically impossible on account of the fact that it requires a disproportionate effort in
terms of time, cost and man-power, so that the risk of identification appears in reality to
be insignificant"_.

**CJEU C-413/23 P _EDPS v SRB_** (4 September 2025, ECLI:EU:C:2025:645,
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62023CJ0413>, checked
2026-09-10) confirms the relative approach at the level of the Grand-Chamber-adjacent First
Chamber, ¶86:

> It follows that, contrary to what the EDPS maintains, **pseudonymised data must not be
> regarded as constituting, in all cases and for every person, personal data** … in so far
> as pseudonymisation may, depending on the circumstances of the case, effectively prevent
> persons other than the controller from identifying the data subject in such a way that,
> for them, the data subject is not or is no longer identifiable.

☠️ **But ¶84 is the countervailing limb, and it runs the other way for a controller who
receives data from a processor:**

> …data which are in themselves impersonal may become "personal" in nature where the
> controller puts them at the disposal of other persons who have means reasonably likely to
> enable the data subject to be identified. … **those data are personal data both for those
> persons and, indirectly, for the controller.**

¶100: _"the relevant perspective for assessing whether the data subject is identifiable
depends, in essence, on the circumstances of the processing of the data in each individual
case."_ For a scalar visit count there are no such means, in any direction. ⚠️ The EDPB's
still-draft Guidelines 01/2025 on Pseudonymisation ¶22 takes a harder line than the Court —
_"This statement also holds true if pseudonymised data and additional information are not in
the hands of the same person"_ — and predates the judgment by eight months.

Recital 47 ties the balance to expectation:

> … taking into consideration the **reasonable expectations of data subjects** based on their
> relationship with the controller.

### ☠️ The real GDPR hinge is purpose limitation, not ePrivacy

The logs already exist and are already disclosed — for serving the site. Reading them to
produce a marketing audience number is a **different purpose** from the one disclosed.
That engages **Article 5(1)(b)**:

> personal data shall be collected for specified, explicit and legitimate purposes and not
> further processed in a manner that is incompatible with those purposes

and **Recital 50**, whose first two sentences are:

> The processing of personal data for purposes other than those for which the personal data
> were initially collected should be allowed only where the processing is compatible with
> the purposes for which the personal data were initially collected. In such a case, **no
> legal basis separate from that which allowed the collection of the personal data is
> required.**

Recital 50 also states that further processing **for statistical purposes** _"should be
considered to be compatible lawful processing operations"_ (quoted from the EUR-Lex text;
see §7 on quotation completeness). Article 5(1)(b) itself carries the same carve-out in its
second limb, and Article 89(1) attaches safeguards to it.

**This is the strongest legal footing ruling 7 has, and it is a better argument than the one
the ruling actually makes.** The ruling argues "no script, no identifier, therefore nothing
new". The sounder argument is: _aggregate audience counting is a statistical purpose;
Recital 50 and Article 5(1)(b) treat statistical further processing as compatible with the
original purpose; a compatible purpose needs no new legal basis._ Whether it needs new
**information** is a separate question — Article 5(1)(a) transparency — and that is §5.

Recital 39 sets the counter-pressure:

> It should be transparent to natural persons that personal data concerning them are
> collected, used, consulted or otherwise processed and to what extent … In particular, the
> **specific purposes** for which personal data are processed should be **explicit and
> legitimate and determined at the time of the collection** of the personal data.

## 3. Where DPAs draw the "measurement" / "tracking" line

### ☠️ The regulator's definition of "analytics" is purpose-based, not mechanism-based

**Article 29 Working Party Opinion 04/2012 on the Cookie Consent Exemption (WP194)**,
adopted 7 June 2012, §4.3
(<https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf>,
checked 2026-09-10):

> **Analytics are statistical audience measuring tools for websites, which often rely on
> cookies.** These tools are notably used by website owners **to estimate the number of
> unique visitors**, to detect the most preeminent search engine keywords that lead to a
> webpage or to track down website navigation issues.

☠️☠️ **Read that against the proposal.** "Statistical audience measuring… to estimate the
number of unique visitors" is a precise description of what reading Cloudflare's Traffic tab
is _for_. And "**often** rely on cookies" is the regulator saying the cookie is incidental to
the category, not constitutive of it. **By the WP29's own definition, this is analytics.**
That matters far more for §5 (the promise) than for §1 (the statute), because the statute
turns on mechanism and the promise turns on the word.

On the strictly-necessary exemption, same section:

> While they are often considered as a "strictly necessary" tool for website operators, they
> are **not strictly necessary to provide a functionality explicitly requested by the user**
> (or subscriber). In fact, the user can access all the functionalities provided by the
> website when such cookies are disabled. As a consequence, these cookies do not fall under
> the exemption defined in CRITERION A or B.

⚠️ Note the test WP29 applies: _would the site still work if this were disabled?_ For an
analytics **cookie**, yes — so no exemption. For **the IP address on an inbound request**,
no: the response cannot be routed at all. The exemption reasoning that defeats analytics
cookies does not transfer to log-derived counting, because the thing being relied on is not
severable from the service.

WP29 then set out the conditions under which it thought first-party analytics posed no real
risk, and asked the legislator to codify them:

> However, the Working Party considers that **first party analytics cookies are not likely to
> create a privacy risk when they are strictly limited to first party aggregated statistical
> purposes** and when they are used by websites that already provide **clear information
> about these cookies in their privacy policy** as well as adequate privacy safeguards. Such
> safeguards are expected to include a user friendly mechanism to opt-out from any data
> collection and comprehensive anonymization mechanisms that are applied to other collected
> identifiable information such as IP addresses.
>
> In this regard, should article 5.3 of the Directive 2002/58/EC be re-visited in the future,
> the European legislator might appropriately **add a third exemption criterion** to consent
> for cookies that are strictly limited to first party anonymized and aggregated statistical
> purposes.

☠️ **That third criterion was proposed, endorsed, and then died with its vehicle.** The
Council's negotiating position on the ePrivacy Regulation created exactly such an exception.
EDPB **Statement 03/2021 on the ePrivacy Regulation** (adopted 9 March 2021,
<https://www.edpb.europa.eu/system/files/2021-03/edpb_statement_032021_eprivacy_regulation_en_0.pdf>,
checked 2026-09-10) responded under the heading _"Audience measurement shall be limited to
non-intrusive practices that are not likely to create a privacy risk for users"_:

> The Council's position creates a new exception for audience measurement as suggested by
> the Article 29 Working Party. However, the derogation for audience measurement as proposed
> by the Council **is worded too broadly** … the derogation … should be **limited to low
> level analytics necessary for the analysis of the performance of the service requested by
> the user** and should be **solely limited to providing statistics to the service
> operator** … Therefore, this processing operation **cannot give rise, by itself or in
> combination with other tracking solutions, to any singling-out or any profiling of users**
> … Moreover, the audience measurement service **should not allow to collect navigation
> information related to users across distinct websites/applications and should include a
> user-friendly mechanism to opt-out** from any data collection.

⚠️ **The proposal was withdrawn on 6 October 2025.** EUR-Lex procedure 2017/0003(COD) shows
status "Proposal withdrawn" (<https://eur-lex.europa.eu/procedure/EN/2017_3>, checked
2026-09-10). **There is no EU-level statutory analytics exemption and no longer a
legislative vehicle for one.** WP194's conclusion therefore remains the operative EU-level
position, softened only by national practice — which is why the CNIL, ICO and CPDP positions
below matter, and why they are not uniform.

Read against the EDPB's own list of what a _good_ audience-measurement derogation would
look like, the proposal satisfies every limb: low-level, performance-oriented, statistics to
the operator only, no singling-out, no cross-site navigation data. The only limb it does not
satisfy in form is the opt-out mechanism — and it does not satisfy it because there is
nothing per-visitor to opt out of.

### France — CNIL's exemption criteria, in full

CNIL is the only DPA with a documented, worked exemption. **Délibération n° 2020-091**
(lignes directrices),
<https://www.cnil.fr/sites/cnil/files/atoms/files/lignes_directrices_de_la_cnil_sur_les_cookies_et_autres_traceurs.pdf>,
Article 5, ¶¶50-52, checked 2026-09-10. ¶50 holds that trackers whose purpose is limited to
measuring the audience of the site are _"strictement nécessaires au fonctionnement et aux
opérations d'administration courante"_ and therefore **not subject to prior consent under
Article 82** of the loi Informatique et Libertés. ¶51 sets the conditions:

> Afin de se limiter à ce qui est strictement nécessaire à la fourniture du service, la
> Commission souligne que ces traceurs doivent avoir une finalité strictement limitée à la
> seule mesure de l'audience sur le site ou l'application **pour le compte exclusif de
> l'éditeur**. Ces traceurs **ne doivent notamment pas permettre le suivi global de la
> navigation de la personne** utilisant différentes applications ou naviguant sur différents
> sites web. De même, ces traceurs doivent **uniquement servir à produire des données
> statistiques anonymes**, et les données à caractère personnel collectées **ne peuvent être
> recoupées avec d'autres traitements ni transmises à des tiers** …

**The four binding conditions, in English:** (1) purpose strictly limited to audience
measurement of that site, **for the exclusive account of the publisher**; (2) **no global
tracking** of the person across different sites or apps; (3) **anonymous statistical data
only**; (4) **no cross-matching with other processing and no transmission to third parties**.
¶52 adds that audience measurement remains fully subject to the GDPR.

**Délibération n° 2020-092** (recommandation), Article 5, ¶50, adds four **recommendations**
— not conditions: inform users, e.g. via the privacy policy; tracker lifetime limited to
**thirteen months**, not auto-renewed on new visits; collected information retained for a
maximum of **twenty-five months**; and periodic review of both durations. Consolidated
version dated 16 January 2026 (modified by délibération n° 2025-131 on an unrelated
multi-terminal point); the audience-measurement wording is unchanged.
<https://www.cnil.fr/sites/default/files/2026-01/recommandation_cookies_consolidee.pdf>

⚠️ CNIL's délibération 2020-092 ¶49 adds a point directly relevant to §5:
_"l'article 82 … n'impose pas d'informer les utilisateurs sur l'existence d'opérations de
lecture et écriture non soumises au consentement préalable"_ — **Article 82 imposes no duty
to inform users about read/write operations that are not subject to prior consent.**
Informing is recommended, not required.

**CNIL's July 2025 self-assessment tool** is the most granular criteria list any DPA has
published (<https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf>,
checked 2026-09-10). Its permitted-purpose list is exhaustive: _"les mesures des
performances ; la détection de problèmes de navigation ; l'optimisation des performances
techniques ou de son ergonomie ; l'estimation de la puissance des serveurs nécessaires ;
l'analyse des contenus consultés."_ Marketing measurement must be off by default, including
_"la mesure des canaux d'acquisition"_ — **acquisition-channel measurement is expressly
outside the exemption**. And the test it prescribes:

> la question à poser est de savoir si l'absence de la mesure envisagée conduit à ce que le
> site ne puisse plus répondre à la demande expresse de la personne (étant entendu que **la
> nécessité économique ne rentre pas dans le cadre de ce qui est considéré comme «
> strictement nécessaire »**)

☠️☠️ **This is the most adverse single sentence in the entire research, and it lands on the
purpose, not the mechanism.** Selftend's purpose is acquisition measurement — the map is
titled "how Selftend counts visitors and arrivals". CNIL puts acquisition-channel
measurement outside the exemption by name, and rules out economic necessity as a
justification. Notable technical conditions in the same tool: IP, if used, may localise to
city level and must then be _"pseudonymisée en enlevant au moins le dernier octet"_; the
referrer, if collected, is limited to the host; aggregation _"à la dizaine la plus proche"_;
at most three event types; an opt-out link in the privacy policy.

⚠️ **Two things blunt it.** First, every operative sentence in CNIL's exemption says _"ces
traceurs"_ — the exemption is an exemption _from Article 82_, which bites only on terminal
read/write. If nothing is read or written, no exemption is needed and its conditions do not
apply. Second, CNIL's own guidelines ¶15 say processing of data _produced by_ a tracker is a
GDPR matter and _"**Ces traitements ne sont pas concernés par les présentes lignes
directrices**"_ — CNIL's cookie guidelines expressly do not govern downstream use, which is
the same boundary the ICO draws in §1.

**CNIL's published list of exempted solutions no longer exists.** FAQ Q12 (checked
2026-09-10): CNIL _"a remplacé son programme d'évaluation … par la mise à disposition d'un
outil d'auto-évaluation"_. Providers may say a solution meets CNIL's criteria but must not
call it _"certifiée"_ or _"validée par la CNIL"_.

⚠️ **Nothing on cnil.fr addresses pure server-log analysis.** Searches for "logs", "fichiers
de logs", "journaux serveur", "côté serveur" in an audience-measurement context return only
CNIL's security-logging recommendation, which is unrelated. Recorded in §7.

### United Kingdom — the line is now statutory, and drawn at "how, not who"

The ICO's finalised guidance on the new Schedule A1 ¶5 exception (29 April 2026,
<https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/>,
checked 2026-09-10) states the measurement/tracking line more crisply than any other source
found:

> The exception is essentially for analytics purposes. However, it is not a broad exception
> that covers all types of analytics technologies or ways you can use them. **It is about
> how your service is used, not about who uses it.** It is not for identifying, tracking or
> monitoring people or groups of people who use your service.

Consent is required if you _"make inferences or take decisions about people (or categories
of people) based on information like their IP address"_ or _"retain the individual-level
information (after aggregating it)"_. **Selftend does neither** — it never holds the
individual-level information at all. ⚠️ But the ICO also requires, for the exception, that
users be _"given a simple means of objecting"_, and suggests toggles _"on by default"_ with
the ability to switch them off. There is no per-visitor object mechanism here because there
is no per-visitor record.

### Bulgaria — the CPDP's own carve-out fits

The CPDP's sector guidance (§1) says analytics cookies _"**Изискват съгласие, освен ако се
използват в анонимизиран вид и не се споделят**"_ — require consent **unless used in
anonymised form and not shared**. Aggregate counts read from a hosting processor and shared
with nobody are within that carve-out on its face. ⚠️ This is a one-line statement on a
sector-guidance page, not a reasoned opinion, and it is about **cookies**.

### ☠️☠️ Has any DPA addressed cookieless, script-free, host-side counting? One has

**Correcting the answer this document reached before the Spanish sweep landed: one has, and
it says yes.**

AEPD, **"Orientaciones sobre cookies y analítica web en portales de las Administraciones
Públicas", versión febrero de 2023**
(<https://www.aepd.es/guias/orientaciones-analitica-web-aapp.pdf>, checked 2026-09-10),
§ V.B, listing the characteristics of tools that deliver web analytics without processing
personal data:

> **Existen soluciones técnicas que permite disponer de un servicio de analítica web
> completo sin que implique tratamientos de datos personales** … Por ejemplo, se encuentran
> en el mercado herramientas que incluyen las siguientes características: … **Permiten
> recopilar la información analítica con técnicas distintas a las cookies. Por ejemplo,
> aunque no exclusivamente, analítica basada en la importación de logs de servidor o CDN.**
> … **Pueden proporcionar toda la funcionalidad sin hacer usos de técnicas como píxel de
> seguimiento, fingerprinting, balizas web de seguimiento de terceros o tecnologías
> similares.**

And **footnote 7**, which answers the IP question head-on:

> **Si bien los logs de servidor/CDN contienen las direcciones IP de los usuarios que
> visitan la web, este tratamiento estaría legitimado por la seguridad del sistema de
> información y para hacer posible la comunicación. Se trata de datos de tráfico. Las
> direcciones IP deberán ser anonimizadas en el proceso de importación a la herramienta de
> analítica web ya que no son necesarias para la finalidad que se persigue (truncado de
> IPs).**

_(Although server/CDN logs contain the IP addresses of users visiting the site, this
processing would be legitimated by information-system security and to make the communication
possible. **These are traffic data.** The IP addresses must be anonymised in the import
process into the analytics tool, since they are not necessary for the purpose pursued.)_

§ IV.A adds: _"Si, además, opta por … **directamente no utilizar ninguna tecnología
catalogada como cookies, dicha actividad no entrará en el ámbito material ni del RGPD ni de
la LSSI** … Por lo tanto, **no será obligatorio obtener el consentimiento**"_.

☠️ **Two hard limits, and they matter.** (a) The document addresses **public-sector portals
that are not information-society services**, so LSSI art. 22.2 is inapposite to them for an
independent reason; it does not decide the commercial case. (b) It analyses logs under the
**GDPR** — traffic data, security legal basis, mandatory IP truncation — and never states
the Article 5(3) scope conclusion. It is the closest thing to an on-point regulator
endorsement that exists anywhere, and it is still an analogy.

⚠️ The AEPD's **general** cookie guide (mayo 2024,
<https://www.aepd.es/guias/guia-cookies.pdf>, checked 2026-09-10) is squarely on the other
side for cookies: analytics cookies are _"a pesar de que **no están exentas** del deber de
obtener un consentimiento informado"_, and audience measurement is absent from its exempt
list. Its dedicated audience-measurement guide (enero de 2024,
<https://www.aepd.es/guias/guia-cookies-analiticas-externas.pdf>) restates the CNIL
conditions almost verbatim and adds an **exhaustive** list of the only measurements it
considers strictly necessary, every one of them "agregado diariamente".

**Beyond the AEPD: no.** Across the EDPB, CNIL, ICO, CPDP, DSK, Garante, DPC, Datatilsynet
and APD, every other source reasons about cookies, pixels, scripts, SDKs, fingerprints, wifi
probe requests, or server-side _tagging_ — a client-side instruction relayed through a
server. The next-closest are CNIL's Q13 recommendation to prefer _"des méthodes ne reposant
pas sur l'accès aux terminaux des utilisateurs"_ (§1), the deleted DSK paragraph, the LfDI
BW FAQ, and the Dutch AP's own practice.

### Belgium and Ireland — the exemption limb, at its most hostile

**Belgium refuses the exemption outright**, even for first-party audience measurement. APD/GBA
FAQ, last updated 17/11/2023
(<https://www.gegevensbeschermingsautoriteit.be/burger/faq/test>, checked 2026-09-10):

> **Oui.** En l'état actuel de la législation, **il n'y a pas d'exemption à l'obligation
> d'obtenir le consentement** des personnes concernées pour les "cookies de mesure
> d'audience", **même quand il s'agit de cookies "internes" (first party)**. … **Dès lors,
> le comptage des visiteurs n'en relève en principe pas** … Quelques contrôleurs (dans
> d'autres États membres) adoptent la position selon laquelle le placement ou le fait de se
> procurer un accès à de tels cookies — dans certaines conditions strictes — échappe à
> l'exigence de consentement…

Note the last clause: Belgium knows other authorities disagree, and says so. ⚠️ **The premise
that the Belgian APD has warned about server-side tracking could not be verified** — full
site-index searches in NL and FR returned nothing for "serverside" or "server-side tagging".
That premise appears to be mistaken.

**Ireland requires consent but deprioritises enforcement.** DPC "Guidance note on cookies and
other tracking technologies", April 2020
(<https://www.dataprotection.ie/sites/default/files/uploads/2020-04/Guidance%20note%20on%20cookies%20and%20other%20tracking%20technologies.pdf>,
checked 2026-09-10): _"**Do analytics cookies require consent? Yes.**"_ — followed by
_"**It is unlikely that first-party analytics cookies would be considered a priority for
enforcement action by the DPC.**"_ Notably the DPC keeps the storage/access predicate
conditional even for fingerprinting — _"**if** you process device fingerprints which are
generated through the storage of information, or the gaining of access to information, on a
user's device"_ — a narrower reading than the Garante's.

### ⚠️ The national picture, summarised

| Jurisdiction                    | Scope: is passive receipt "access"?                                                         | Exemption for audience measurement?                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **EDPB**                        | Framework says it _could_ be (¶42-43, ¶55); never decided                                   | Refuses to address (¶4)                                                                      |
| **🇧🇬 Bulgaria** (establishment) | чл. 4а ЗЕТ — **no consent regime at all**, information + opt-out                            | ал. 4 т. 2 explicitly-requested-service exemption; CPDP carve-out for anonymised, unshared   |
| **🇩🇪 Germany**                  | ☠️ Safe harbour **deleted** Nov 2024; BfDI says in scope; LfDI BW says out                  | BfDI treats log reuse as a pure GDPR Art. 6(4) question                                      |
| **🇪🇸 Spain**                    | Guide is storage/retrieval only                                                             | ☠️☠️ AEPD **names log-based analytics** as a no-personal-data technique (public sector)      |
| **🇳🇱 Netherlands**              | Storage/access only                                                                         | Statutory exemption, art. 11.7a(3)(b); **the AP itself runs log statistics without consent** |
| **🇩🇰 Denmark**                  | "The decisive factor … is whether you store or access"                                      | Statistics tracking said to need consent                                                     |
| **🇫🇷 France**                   | ☠️ A server collecting request parameters from an instructed fetch **is** a read            | Yes, four conditions — ☠️ but acquisition-channel measurement expressly excluded             |
| **🇬🇧 UK**                       | ☠️ Reg 6(2)(b) expressly includes "automatically emitted" information                       | New statutory exception — ☠️ **switched off** for the emitted limb (Sch. A1 ¶5(2))           |
| **🇮🇪 Ireland**                  | Predicate kept conditional, even for fingerprinting                                         | No, but explicitly a low enforcement priority                                                |
| **🇮🇹 Italy**                    | ☠️☠️ Art. 122(2-bis) bans "monitor the operations performed by the user" — **no predicate** | Narrow; legitimate interest "in nessun caso"                                                 |
| **🇧🇪 Belgium**                  | Storage/access only                                                                         | ☠️ **None**, even first-party                                                                |

**The spread is itself the finding.** There is no European answer to this question; there
are eleven answers, and they disagree on both limbs. Bulgaria — the establishment
jurisdiction, and the one whose regulators would actually act — sits at the permissive end
of the range on both.

### The line the regulators actually draw

WP29 draws the tracking line explicitly:

> First party analytics should be **clearly distinguished from third party analytics**, which
> use a common third party cookie to collect navigation information related to users across
> distinct websites, and which pose a substantially greater risk to privacy.

**The line the regulators actually draw is: single-site + aggregate + own-account =
measurement; cross-site + per-user + shared = tracking.** The proposal sits at the far
measurement end of that line on every axis, and further out than the first-party analytics
cookie WP29 was already comfortable with — it has no cookie, no opt-out surface to build
because there is nothing per-user to opt out of, and the IP never leaves the processor.

## 4. Processor already engaged for hosting vs. a separate analytics vendor

**Yes, it differs — materially, and this is the least contestable part of ruling 7.**

Engaging a separate analytics vendor changes four things at once, each of which is a
disclosure event in its own right: a **new recipient** of personal data (GDPR Art. 13(1)(e)),
a **new processor** requiring an Art. 28 contract, usually a **new international transfer**,
and — for every mainstream vendor — a **new instrument on the page**. Reading a number from
a processor already engaged changes none of them.

**Article 28(10)** (UK reproduction of the identical EU text, legislation.gov.uk, checked
2026-09-10 — <https://www.legislation.gov.uk/eur/2016/679/article/28>):

> Without prejudice to Articles 82, 83 and 84, if a processor infringes this Regulation by
> determining the purposes and means of processing, the processor shall be considered to be
> a controller in respect of that processing.

This is the provision that usually re-classifies an "analytics vendor" as a joint controller
or an independent controller — WP194 §4.3 makes the same point about a third party running
the analysis: _"This other party will be considered as a joint controller or as a processor
depending on whether it uses the data for its own purposes or if it is prohibited to do so
through technical or contractual arrangements."_ The Cloudflare arrangement is
contractually on the processor side of that line.

**Cloudflare's Data Processing Addendum** (<https://www.cloudflare.com/cloudflare-customer-dpa/>,
checked 2026-09-10 — this is the _vendor's contract_, primary as to its own terms but **not a
regulatory source**):

> the Customer is the Controller (or a Processor processing Personal Data on behalf of a
> third-party Controller), and Cloudflare is a Processor (or sub-Processor, as applicable)

It covers "Customer Logs" — end-user interaction data including IP addresses — and binds
Cloudflare to _"the limited and specified business purpose of providing the Services"_ and
to _"not use the Personal Data for the purposes of marketing or advertising"_. Serving the
customer's own traffic dashboard is within "providing the Services". ⚠️ The DPA was **not
found to contain** an aggregated/de-identified-data carve-out permitting Cloudflare to use
the data for its own purposes; absence of a clause is weaker evidence than a clause, so
treat this as unconfirmed rather than as a positive finding (§7).

**Practical upshot:** the data flow is unchanged. The same processor holds the same data
under the same contract for the same period, and returns a different projection of it. What
changes is only what Selftend _looks at_.

## 5. ⚠️ The voluntary promise: exposure beyond statute

**Short answer: yes, and it does not require consumer-protection law to bite. The GDPR
itself makes a controller's own declarations binding, through Article 5(1)(a) fairness.**

### 5.1 The GDPR route — "they should act as they declare they will"

This is the finding that most directly pressures ruling 7, and it comes from the EDPB.

**EDPB Guidelines 4/2019 on Article 25 Data Protection by Design and by Default**, version
2.0, adopted 20 October 2020
(<https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_201904_dataprotection_by_design_and_by_default_v2.0_en.pdf>,
checked 2026-09-10), ¶69:

> Fairness is an overarching principle which requires that personal data should not be
> processed in a way that is unjustifiably detrimental, unlawfully discriminatory,
> **unexpected or misleading** to the data subject.

¶70 then lists the "key design and default fairness elements". Two are directly on point:

> **Expectation** — Processing should correspond with data subjects' reasonable expectations.
>
> **Truthful** — The controller must make available information about how they process
> personal data, **they should act as they declare they will and not mislead the data
> subjects.**

☠️☠️ **"They should act as they declare they will" is the whole issue in one clause.** The
EDPB is not saying a controller must disclose what the law requires; it is saying a
controller is held to _its own declarations_. A promise that exceeds statute therefore
becomes a compliance obligation the moment it is published, enforceable as a fairness
breach under Article 5(1)(a) — with no need for a consumer regulator at all. Recital 47's
"reasonable expectations" reinforces it: a reader of `policies.json:46` forms an expectation
from the sentence, not from Article 5(3).

### 5.2 What the promise actually says, read strictly

This is where the ruling survives — but on a narrower ledge than it thinks.

- **`:46` "analytics tracking services"** — the exposure. It is a compound noun, and its
  two readings diverge. Read as _"analytics-tracking services"_ (services that track), it
  describes third-party instruments and the proposal is outside it. Read as _"analytics /
  tracking services"_ (a list), "analytics" stands alone and WP194's definition — _"statistical
  audience measuring tools … to estimate the number of unique visitors"_ — pulls the proposal
  inside it. **A careful reader can reach either reading.** The neighbouring nouns in the
  same sentence (SDKs, profiling tools, social media pixels) all denote installed
  instruments, which favours the first reading, and the word **"services"** favours it
  further: reading a dashboard your host already renders is not engaging a service.
- **`:152` "If optional analytics are introduced in the future, they will require your
  explicit consent through the cookie preferences manager before any non-essential storage
  is used."** ⚠️ This one is **conditioned on storage** — "before any non-essential storage
  is used". No storage occurs here, so the promise is not triggered on its own terms. This
  sentence is quietly the strongest textual defence in the policy.
- **`:388`/`:389` cookies** — untouched. No cookie is set.
- **`:44` "We do not collect IP addresses for profiling"** — untouched, and note it is
  already qualified by purpose rather than absolute, which is consistent with `:77`
  disclosing IP in edge logs.
- **`:441`/`:473` "no advertising or analytics SDKs"** — untouched. No SDK.
- **`settings.json:111` "No tracking cookies are used"** — untouched. No cookie.
- ☠️☠️ **`settings.json:122` — a preference labelled "Analytics" whose description reads
  "Not currently used."** This is the sharpest exposure in the codebase, sharper than
  `policies:46`, and it is easy to miss because it lives in the settings namespace rather
  than the policy. It carries no qualifier at all: not "no analytics cookies", not "no
  analytics SDKs" — just **Analytics: not currently used**. A person who reads that and
  later learns Selftend reads a monthly visitor count has been told something that was, on
  the plain meaning of the label, not accurate. The defence is contextual: the string sits
  inside the cookie preferences manager, next to a toggle that governs browser storage, and
  `analyticsDescription` continues _"This preference will apply if analytics are added in
  the future"_ — i.e. the sentence is about a **consent toggle**, and a toggle is meaningless
  where there is nothing per-visitor to consent to. That defence is sound but it is
  **contextual, not textual**, and §5.1's "act as they declare they will" is not obviously
  satisfied by a defence a reader has to reconstruct.

**So: of the nine promise surfaces, seven are plainly unaffected, one (`policies:46`) is
genuinely ambiguous, and one (`settings:122`) is defensible only on context.**

### 5.3 The load-bearing distinction, and where it fails

Ruling 7 rests on "no script, no per-visitor identifier". §1 shows the first half is not the
legal test the EDPB applies, and §0 Fact 3 shows the second half is only true of what
_Selftend_ sees, not of what the pipeline does. **The ruling is right, but for weaker reasons
than it states.** The reasons that actually hold are:

1. **Nothing changes on the wire.** No byte sent to the terminal differs. Whatever the
   ePrivacy position was before, it is identical after (§1, ¶50/¶51 analysis).
2. **ePrivacy governs the access, not the subsequent use, and the access is unchanged.**
   ICO: _"Regulation 6 … does not apply to, or contain any specific rule about, subsequent
   processing operations involving this information"_ (§1).
3. **The further purpose is statistical, and statistical further processing is treated as
   compatible** (Recital 50, Art. 5(1)(b), §2).
4. **No new recipient, processor, transfer, or retention** (§4).
5. **What the controller receives is anonymous information** outside the GDPR entirely
   (Recital 26, §2) — though note _Planet49_ ¶68-70 means this ground helps under the GDPR
   only, never under ePrivacy.

⚠️ **Where it fails is if the promise is read as a promise about _purpose_ rather than about
_instruments_.** On that reading, Selftend would be measuring its audience while telling
people it does not — and §5.1 says the EDPB treats that as a fairness problem regardless of
whether any additional data is collected. The mitigation is cheap and is recommended in §6.

### 5.4 ⚠️⚠️ Consumer-protection exposure — the second, independent route

A privacy promise is not only a data-protection instrument. It is a **statement about the
product**, and consumer law reaches statements about products regardless of what data
protection requires.

#### The EU test

**Directive 2005/29/EC (UCPD), Article 6(1)** (EUR-Lex CELEX `32005L0029`,
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32005L0029>, checked
2026-09-10):

> A commercial practice shall be regarded as misleading if it contains false information and
> is therefore untruthful or in any way, including overall presentation, deceives or is
> likely to deceive the average consumer, **even if the information is factually correct**,
> in relation to one or more of the following elements … and in either case causes or is
> likely to cause him to take a transactional decision that he would not have taken
> otherwise:
> (a) the existence or nature of the product;
> **(b) the main characteristics of the product, such as its availability, benefits, risks,
> execution, composition … fitness for purpose, usage …;**
> **(c) the extent of the trader's commitments, the motives for the commercial practice …**

☠️ **Correction to a common framing: Article 6(2)(b) is the wrong hook.** It reads:
_"non-compliance by the trader with commitments contained in **codes of conduct** by which
the trader has undertaken to be bound…"_, and Article 2(f) defines a code of conduct as _"an
agreement or set of rules **not imposed by law** … which defines the behaviour of traders
who undertake to be bound by the code"_ — i.e. a _third-party_ code. A privacy policy a
trader wrote about its own product is not a code of conduct. **The exposure is under Article
6(1)(b) and 6(1)(c), not 6(2)(b).**

Three definitional points make the reach wider than it looks. Article 2(d): a commercial
practice is _"any act, omission, course of conduct or representation … directly connected
with the promotion, sale or supply of a product"_. Article 2(k): a transactional decision
includes deciding _"whether, how and on what terms to purchase … **retain** or dispose of a
product"_, and covers a consumer who _"decides to act **or to refrain from acting**"_ —
so the decision to _start using_ or _keep using_ a free app counts.

**Commission Notice 2021/C 526/01 (UCPD Guidance)**
(<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52021XC1229(05)>, checked
2026-09-10) closes the two obvious escapes.

On being free, §3.4:

> Importantly, **the UCPD covers all commercial practices concerning 'free' products and
> does not require payment with money as a condition for its application.** … The marketing
> of such products as 'free' without adequately explaining to consumers how their
> preferences, personal data and user-generated content are going to be used **could be
> considered a misleading practice** in addition to possible breaches of data protection
> legislation.

☠️ On being a non-profit, §2.3:

> Organisations which pursue charitable or ethical goals may qualify as traders under the
> UCPD when they engage in commercial activities … **The fact that an organisation is
> structured as 'non-profit' is not decisive to the assessment of whether it qualifies as a
> trader.**

citing CJEU C-59/12 _BKK Mobil Oil_: the term "trader" has _"a particularly broad meaning"_.

On the interplay, §1.2.10:

> **A trader's violation of the GDPR or of the ePrivacy Directive will not, in itself,
> always mean that the practice is also in breach of the UCPD. However, such privacy and
> data protection violations should be considered when assessing the overall unfairness of
> commercial practices under the UCPD** …

and §4.2.7: _"the Directive has a broad scope of application: it covers all
business-to-consumer commercial practices and **does not require the existence of a
contractual relationship or the purchase of a product.**"_

#### Bulgaria — the establishment jurisdiction, and the enforcing body

The UCPD is transposed at **чл. 68д ЗЗП** (<https://lex.bg/laws/ldoc/2135513678>, checked
2026-09-10). Ал. 1 mirrors Article 6(1) verbatim; ал. 2, т. 2 covers _"основните
характеристики на стоката или услугата"_. Enforcement is by the **КЗП**, чл. 68л, ал. 1:
_"Когато Комисията за защита на потребителите установи, че търговската практика е нелоялна,
председателят на комисията издава заповед, с която забранява прилагането на търговската
практика."_ ☠️ As noted in §1, the КЗП is also the body supervising чл. 4а ЗЕТ — the
ePrivacy transposition. **In Bulgaria both routes lead to the same regulator.**

#### United Kingdom — a wider test than the EU's, and a vulnerability provision that bites

The **Digital Markets, Competition and Consumers Act 2024** Part 4 Chapter 1 replaced CPUTR
2008 on **6 April 2025** (s.251(1) revokes CPUTR 2008; commencement S.I. 2025/272).
**s.226(1)** (<https://www.legislation.gov.uk/ukpga/2024/13/section/226>, checked
2026-09-10):

> a commercial practice involves a misleading action if the practice involves—
> **(a) the provision of false or misleading information relating to a product, a trader or
> any other matter relevant to a transactional decision,**
> (b) an overall presentation which is likely to deceive the average consumer …
> **(2)** … the reference to misleading information **includes a reference to information
> which, although true, is presented in a misleading way.**

☠️ **The UK test is open-ended.** Unlike UCPD Article 6(1)'s closed (a)-(g) list, s.226(1)(a)
reaches _"any other matter relevant to a transactional decision"_. **s.225(3)** confirms it
covers a trader's own product; **s.225(5)** confirms it is immaterial whether the act
happens _"before or after"_ the supply. **s.245** includes _"the retention … of a product"_
in "transactional decision"; **s.248** includes _"digital content"_ in "product".

☠️☠️ **s.247 is the provision that should worry a mental-health product most.** Where a
practice is directed at a group particularly vulnerable _"in a way that the trader could
reasonably be expected to foresee"_, the average consumer becomes an average member of that
group — and the listed grounds include _"(a) their age"_ and _"**(b) their physical or
mental health**"_. Selftend's audience is, by design, people seeking mental-health self-help,
with a floor at 13. **Both limbs are present.** The standard against which any privacy claim
is measured is therefore an average member of a foreseeably vulnerable group, not a general
consumer.

⚠️ **Open question:** whether a free, revenue-less non-profit is a "business" under
s.249 — an inclusive definition referring to _"any other undertaking carried on for gain or
reward"_ — and so a "trader", is not settled by the statutory text and no UK authority was
found. The Commission's _BKK Mobil Oil_ framing points towards a broad reading. Recorded in
§7.

#### Has this actually been enforced? Yes — but not on the fact pattern here

**Privacy claims as misleading commercial practices — enforced.** AGCM (Italy) PS11112,
provvedimento n. 27432, 29 November 2018, under artt. 21-22 Codice del Consumo (= UCPD
Arts. 6-7), §70: Facebook _"ha … **ingannevolmente indotto gli utenti consumatori a
registrarsi** sulla Piattaforma Facebook non informandoli adeguatamente e immediatamente …
dell'attività di raccolta, con intento commerciale, dei dati da loro forniti …
enfatizzandone la sola gratuità"_
(<https://agcm.it/dettaglio?db=C12560D000291394&uid=1DA1DFB1D893C0FDC125835F00542FE3>,
checked 2026-09-10). ☠️ §56 is directly relevant to a fix-by-linking approach: a link to the
privacy policy from the registration page did **not** cure the misleading first impression —
_"una grave incompletezza informativa che **non può essere sanata dai meri rimandi tramite
link** ad ulteriori approfondimenti."_ Both this and Hungarian GVH Vj-85/2016/189 are cited
as worked examples in the Commission's own 2021 Notice at §3.4.

**An inaccurate privacy statement, penalised under the GDPR.** CNIL délibération
SAN-2025-017, 30 December 2025 (€3.5m, adopted with 16 counterpart supervisory authorities,
<https://www.cnil.fr/en/transfer-data-social-network-advertising-purposes-cnil-imposed-fine-eu35-million>,
checked 2026-09-10): _"The CNIL noted that the information provided on the company's website
**was inaccurate** … The information was also incomplete on certain points … **and/or
incorrect (the information on data transfer referred to the Privacy Shield, which is no
longer applicable).**"_ Note the ground: Articles 12 and 13, not Article 5(1)(a). But note
also **what made it inaccurate — the world moved and the notice did not.**

**Misrepresentation in a notice → Article 5(1)(a) fairness.** Irish DPC Inquiry IN-18-5-5
(Meta), final decision 31 December 2022
(<https://www.edpb.europa.eu/system/files/2023-01/facebook-18-5-5_final_decision_redacted_en.pdf>,
checked 2026-09-10), §5.77: _"Article 5(1)(a) links transparency to the overall fairness of
the activities of a controller … it is appropriate for the Commission to make a finding that
Facebook has also infringed Article 5(1)(a) GDPR"_. EDPB Binding Decision 3/2022 ¶230, quoted
in the same document: _"**Meta IE has presented its service to the Facebook users in a
misleading manner** … the IE SA's finding of breach of Article 5(1)(a) GDPR with regard to
the principle of transparency should extend to **the principle of fairness** too."_ Its
footnote 215 cites EDPB Guidelines 4/2019 ¶70 — the "act as they declare they will" bullet
from §5.1.

**Keeping a notice current is an express obligation.** WP29 Transparency Guidelines WP260
rev.01 ¶29
(<https://ec.europa.eu/newsroom/article29/items/622227>, checked 2026-09-10):

> Being accountable as regards transparency applies not only at the point of collection of
> personal data but **throughout the processing life cycle**. … Changes to a privacy
> statement/notice that should always be communicated to data subjects include inter alia:
> **a change in processing purpose** … **References in the privacy statement/notice to the
> effect that the data subject should regularly check the privacy statement/notice for
> changes or updates are considered not only insufficient but also unfair in the context of
> Article 5.1(a).**

⚠️ **Correction worth recording: WP260 does not contain the sentence "the information
provided must be accurate and up to date."** Two independent full-text searches confirmed
its absence; the only "accurate" in the substantive text concerns translations. That phrase
belongs to the ICO's Right to be informed page
(<https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/>,
checked 2026-09-10): _"undertake regular reviews to check it **remains accurate and up to
date**"_ and _"If we plan to use personal data for a new purpose, we update our privacy
information and communicate the changes to individuals **before** starting any new
processing."_

#### ☠️ The honest bottom line on §5

**Yes, a voluntary promise creates exposure beyond statute, by two independent routes** —
GDPR Article 5(1)(a) fairness (EDPB 4/2019 ¶70, applied by the EDPB and DPC in the Meta
decision), and consumer law (UCPD Art. 6(1)(b)/(c), DMCCA s.226(1)(a), ЗЗП чл. 68д, enforced
against privacy claims by the AGCM). **Neither depends on the promise being legally
required, and neither is answered by "we complied with the GDPR".** §1.2.10 of the
Commission Notice says compliance and unfairness are separate questions in both directions.

⚠️ **But no primary authority was found in which a privacy statement that was true when
written, and later drifted out of date, was penalised on that ground alone.** Every
enforcement found involves a statement that was inaccurate about live practice, or a
material omission at the point of collection. The exposure here is real but unlitigated, and
the honest characterisation is _reputational and principled first, legal second_. Recorded
in §7.

## 6. What this means for ruling 7

### The repo already owns the test, and the proposal passes it

`src/features/policies/policy-content.test.ts` records, in the comment justifying the first
digest-only move (#1616), exactly what the project counts as a disclosure:

> The version deliberately did NOT move, because nothing DISCLOSED changed: **not the data
> collected, not a processor, not retention, not a user right, not eligibility, not
> liability**, and not one item of the "not therapy, not medical care, not diagnosis, not
> crisis intervention" boundary list.

Run the proposal down that list:

| Disclosure axis | Changes?                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| Data collected  | **No** — no new data; the IP in edge logs is already disclosed at `:77`  |
| A processor     | **No** — Cloudflare already named; no new recipient, no new transfer     |
| Retention       | **No** — Cloudflare's log retention is unaffected by reading a dashboard |
| A user right    | **No**                                                                   |
| Eligibility     | **No**                                                                   |
| Liability       | **No**                                                                   |
| Boundary list   | **No**                                                                   |

**Ruling 7 is confirmed on the repo's own criterion: this is not a disclosure change and it
must not re-gate users.** ☠️ Three precedents (#1616, #1627, #1639) establish that a text
change which discloses nothing moves the digest alone. That means the clarification
recommended below is **free** — it costs a digest move, not a `policyVersion` bump, and
re-gates nobody.

### But the reasoning in the ruling needs replacing

The ruling's stated grounds — "no script on the page, no per-visitor identifier" — are the
two weakest available.

- ☠️ **"No script" is not the Article 5(3) test.** EDPB Guidelines 2/2023 ¶54-55 apply
  Article 5(3) to IP-only techniques with no script at all, and ¶55 puts the burden on the
  operator to _ensure_ the IP does not originate from the terminal.
- ☠️ **"No per-visitor identifier" is only true downstream.** Cloudflare's own docs:
  _"Once Cloudflare identifies a unique IP address for a request, we identify such request
  as a visit."_ The identifier exists; Selftend just never sees it.
- ☠️☠️ **The safe harbour the ruling implicitly relies on was withdrawn.** The DSK's
  "passively transmitted header and IP data is not access" paragraph existed, was
  authoritative in Germany, and was **deleted in November 2024** without explanation; the
  BfDI now states the converse. A ruling resting on that reasoning is resting on a
  superseded text (§1).
- ☠️ **Italy does not use the storage-or-access test at all.** Art. 122(2-bis) bans network
  use to "monitor the operations performed by the user". No amount of not-touching-the-
  terminal answers it.

Substitute the five grounds that do hold: **nothing changes on the wire; ePrivacy governs
the access and not the subsequent use, and the access is unchanged (ICO); statistical
further processing is compatible under Recital 50; no new recipient, processor, transfer or
retention; and what the controller receives is anonymous information under Recital 26.**

### The line in ruling 7 is right, and worth restating more precisely

Ruling 7 draws the line at "a script on the page or any per-visitor identifier". The sources
support a sharper formulation: **the line is crossed when a byte sent to the terminal changes,
or when a per-visitor identifier reaches Selftend.** Both halves matter. EDPB ¶50-51 make the
payload the trigger on the ePrivacy side; Recital 26 makes controller-side identifiability
the trigger on the GDPR side.

### ☠️☠️ The one substantive change the sources force: prefer requests over "unique visitors"

Everything adverse in this research converges on a single element, and it is not the reading
and not the server — **it is the IP-derived deduplication that turns requests into "unique
visitors".**

- EDPB ¶55 reverses the burden **only for gaining access to IP addresses**.
- UK PECR reg 6(2)(b) reaches **"information automatically emitted by the terminal"**, and
  Schedule A1 ¶5(2) removes the analytics exception for exactly that limb.
- The ICO's list of what needs consent begins with making inferences _"based on information
  like their IP address"_.
- CNIL requires an IP used for measurement to be _"pseudonymisée en enlevant au moins le
  dernier octet"_; the AEPD requires _"truncado mínimo de 2 bytes"_ on import.
- The deleted DSK paragraph and the surviving LfDI BW FAQ both turn on the IP.

**Cloudflare's requests and page-views metrics involve none of that.** They are counters
incremented per request. Its "unique visitors" metric is the single number in the free
Traffic tab that is defined by IP: _"Once Cloudflare identifies a unique IP address for a
request, we identify such request as a visit."_ The DSK's own Rz. 88 describes the safe
version precisely: _"es reicht aus, bei jedem Abruf einer Seite den Zähler für diese Seite um
Eins zu erhöhen"_ — it suffices to increment the counter by one on each retrieval — and it
offers _"auf der Basis von Logfiles ohne personenbezogene Daten"_ as a way of doing it.

⚠️ **Recommendation: build the visitor layer on requests and page views, and treat "unique
visitors" as a soft secondary reading rather than the headline number.** It costs precision
that, at Selftend's volume, the suppression floors were going to eat anyway — and it removes
the only element in the whole pipeline that any regulator has actually written about.

### ⚠️ A purpose warning that has nothing to do with mechanism

☠️ CNIL's July 2025 self-assessment tool puts _"la mesure des **canaux d'acquisition**"_
outside the audience-measurement exemption by name, and adds that _"la nécessité économique
ne rentre pas dans le cadre de ce qui est considéré comme « strictement nécessaire »"_.
Map #2301 is titled "how Selftend counts visitors and arrivals" and its domain is
**acquisition measurement**. The exemption CNIL is describing applies to _traceurs_, so it
does not reach a no-tracker method — **but it is a clear statement that this purpose is not
one regulators treat as service-necessary.** The practical consequence is forward-looking:
if any instrument is ever added to the page for this purpose, the audience-measurement
exemption will **not** be available for it, in France or Spain. Ruling 7's line should be
read as harder than it looks, not softer.

### ⚠️ Two recommendations on copy, and both are cheap

Two strings, and **the more exposed of the two costs literally nothing**.

**(a) `settings.json:122` — free, no digest, no version.** The string
`cookies.analyticsDescription` reads "Not currently used." under a preference labelled
"Analytics" (§5.2). `settings.json` is **not** hashed by
`src/features/policies/policy-content.test.ts` — that test digests only the four
consent-bearing sections of `en/policies.json` (`privacy`, `terms`, `cookies`,
`accountDeletion`), and touches `settings.json` solely to assert the consent-checkbox copy
(lines 397-406). Editing this string therefore moves no digest and re-gates nobody. Make the
label say what the toggle actually governs — analytics **cookies and scripts** — rather than
"Analytics" unqualified. Both locales.

**(b) `policies.json:46` — a digest-only move.** _"analytics tracking services"_ is the
ambiguous promise (§5.2). Note that the shipped Bulgarian at `bg/policies.json:46` reads
_"услуги за аналитично проследяване"_, which unambiguously means **analytics-tracking
services** (instruments), not "analytics, tracking services". ⚠️ **The two locales do not
currently promise the same scope** — the English is broader than the Bulgarian, which is a
defect on its own terms regardless of this map.

Given EDPB Guidelines 4/2019 ¶70's "**Truthful** — … they should act as they declare they
will and not mislead the data subjects", the honest move is a digest-only rewording of the
English to match what the Bulgarian already says, plus one clause acknowledging aggregate
host-side counts. Something in the shape of: _"no advertising SDKs, analytics or tracking
services, behavioural profiling tools, or social media pixels. We read only the aggregate
request counts our hosting provider produces as a byproduct of serving pages — no script, no
cookie, and no record of any individual visit reaches us."_

⚠️ Note what that sentence must **not** do: it must not read as advertising a virtue. The
point is accuracy, not a claim.

Both changes together convert the only genuinely arguable exposure in this analysis into
text that is plainly true, at the cost of one digest move that re-gates nobody. **Doing
nothing is defensible; doing this is defensible and also candid.**

## 7. ☠️ Not confirmed from primary sources

Listed so the ruling is not held on something this document did not actually establish.

1. **Only one DPA anywhere was found to have addressed log-derived counting, and it did so
   for a different kind of body.** The AEPD's February 2023 orientations name log-based
   analytics as a no-personal-data technique, but address **public-sector portals that are
   not information-society services** and never state the Article 5(3) scope conclusion
   (§3). Every other source reasons about cookies, pixels, SDKs, scripts, wifi probe
   requests or server-side _tagging_. The application to a hosting provider's own byproduct
   logs is inference in every case, including here.
2. ☠️☠️ **Germany's safe-harbour paragraph was deleted without a stated reason.** The DSK
   changelog (OH Digitale Dienste v1.2, Rz. 6) mentions only terminology and updates at
   Rz. 114ff. **Why the passively-transmitted-data passage was removed is not on the
   record**, and the inference that it follows from alignment with EDPB Guidelines 2/2023
   is this document's, not the DSK's. The BfDI pages stating the converse carry **no
   publication date**; they were dated post-November-2024 by their internal citations,
   which is also an inference.
3. **The LfDI Baden-Württemberg FAQ — the strongest source in favour anywhere — is being
   rewritten.** Its own landing page says "Stand: März 2022 … Wir erstellen derzeit eine
   ergänzte Version dieser FAQ." It predates EDPB Guidelines 2/2023 and the DSK deletion.
   Its successor may not say the same thing.
4. **The Dutch AP's own cookie statement is descriptive, not normative.** It shows what a
   regulator considers acceptable for itself; it is not a legal position and must not be
   cited as one. The same caveat applies to the ICO's own website privacy notice, which
   likewise puts Cloudflare-processed IPs on Art. 6(1)(f) and analytics on consent.
5. **No Belgian APD publication on server-side tracking was found**, contrary to the
   premise put to the research. Full site-index searches in NL and FR returned nothing.
6. **No Garante document uses "server-side" / "lato server"**, and a claimed Garante
   sanction over server-side Google Tag Manager could **not** be verified — the only source
   for it is a commercial blog, i.e. **SECONDARY**. Do not cite it.
7. **The Danish position has moved regulators** — supervision transferred from
   Erhvervsstyrelsen to Digitaliseringsstyrelsen, the old Erhvervsstyrelsen guidance PDF
   404s and could not be read, and whether its October 2021 statistics-cookie enforcement
   forbearance was ever formally withdrawn is unconfirmed.
8. ⚠️ **EDPB Guidelines 2/2023's adoption date is inconsistent across the EDPB's own
   surfaces** — the landing page says 16 October 2024, the PDF's version history says
   7 October 2024.
9. **EDPB Guidelines 2/2023 contain no discussion of server logs, audience measurement or
   statistics.** Verified by full-text search of the adopted v2.0 PDF (§1). Its silence is
   not endorsement.
10. **GDPR Article 6(4) could not be quoted verbatim.** The EUR-Lex HTML full text truncates
    before the articles when fetched, so the compatibility factors (a)-(e) are described in
    substance only. Verify at
    <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679> before relying
    on the exact wording. Recital 50 and Article 5(1)(b) _were_ obtained verbatim and carry
    the same point.
11. **Whether an aggregate count is genuinely anonymous at Selftend's volume is untested.**
    Recital 26 exempts anonymous information, but a daily or per-country count in the low
    single digits may not be anonymous. No source found addresses the threshold. This is a
    real gap, not a formality (§2).
12. **The Cloudflare DPA's absence of an aggregated-data carve-out is an absence, not a
    finding** (§4). It was not possible to confirm from Cloudflare's own documents whether
    Cloudflare derives its own aggregate products from customer zone logs.
13. ☠️☠️ **The decisive UK question is unanswered by the ICO.** PECR reg 6(2)(b) (in force
    5 Feb 2026) makes "gaining access" include _"collecting or monitoring information
    automatically emitted by the terminal equipment"_, and Schedule A1 ¶5(2) removes the new
    statistical-purposes exception from that limb. **Whether an IP address or User-Agent in a
    routine HTTP request is "automatically emitted information" is nowhere addressed.** The
    ICO's only worked example is wifi probe requests, and its entire finalised guidance
    contains zero occurrences of "server log", "access log", "log file" or "weblog". Do not
    assert either answer as the ICO's position.
14. **Nothing on cnil.fr addresses pure server-log analysis** (§3). CNIL's exemption is
    framed entirely around _traceurs_; its only server-side rulings concern email pixels and
    proxied tagging, both of which involve an instruction to the terminal.
15. **The ICO's "analytics cookies are not strictly necessary" sentence could not be read at
    its source** — the detailed cookies guidance PDF now 404s at ico.org.uk and is absent
    from the Wayback Machine at that path (checked 2026-09-10). Treat any rendering of it as
    **SECONDARY**; it is in any event superseded by Schedule A1 ¶5.
16. **Article 82 of the French loi Informatique et Libertés could not be read on
    Légifrance** — every automated fetch returned HTTP 403. The text quoted in §3 is CNIL's
    own verbatim reproduction in délibération n° 2020-091.
17. ⚠️ **Two of the EDPB documents relied on are still public-consultation drafts** —
    Guidelines 1/2024 on legitimate interest (consultation closed Nov 2024) and Guidelines
    01/2025 on Pseudonymisation (closed Mar 2025). No final versions exist as of 2026-09-10,
    and 01/2025 ¶22 contradicts CJEU C-413/23 P ¶86.
18. **Whether a free, revenue-less non-profit is a "business"/"trader" under DMCCA
    s.249/s.225(3) is unsettled** by the statutory text, and no UK authority was found (§5.4).
19. ☠️ **No primary authority was found in which a privacy statement that was true when
    written, and later drifted out of date, was penalised on that ground alone.** The nearest
    are WP260 ¶29, EDPB Guidelines 4/2019 ¶70, the DPC/EDPB Meta decision (misrepresented
    legal basis), and CNIL SAN-2025-017 (a stale Privacy Shield reference). Do not overstate
    these as a "notice went stale" precedent.
20. **WP260 rev.01 does NOT say "the information provided must be accurate and up to
    date."** Confirmed absent by two independent full-text searches; the phrase belongs to
    ICO guidance. Recorded because it is widely misattributed.
21. **cpdp.bg serves a broken TLS chain** and was reachable only through a browser session;
    **crc.bg was searched only via web search**, so the Bulgarian negative findings are
    strong for the CPDP and weaker for other Bulgarian bodies. It was not exhaustively
    verified that no other Bulgarian act contains a parallel Article 5(3) provision.
22. **The live `selftend.org/privacy` page could not be read** — it returns a JavaScript
    shell with no policy text (checked 2026-09-10), consistent with only the landing page
    being statically exported. All policy quotations in this document are taken from the
    repository at `src/i18n/locales/en/policies.json`, not from the served page.
23. **Nothing here is legal advice, and none of it was reviewed by a lawyer.** Ruling 7
    records that the legal read remains the owner's; this document supplies sources for that
    read and does not replace it.
