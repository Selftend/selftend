# Positioning

What Selftend is, which market it is in, and the words that follow from that. This is the canonical source for every surface that says what Selftend is — the landing page, both store listings, the README, directory entries, and the copy inside the app.

Decided across [map #1597](https://github.com/Selftend/selftend/issues/1597) using April Dunford's _Obviously Awesome_. Eleven decisions, each linked below rather than restated, so a settled refusal can be read with its reasoning instead of rediscovered as a good idea.

## The hierarchy

**`AGENTS.md` guardrails and [product-principles.md](product-principles.md) bind positioning. Positioning binds copy.**

A conflict resolves for the guardrail, always. If a sharper frame would need a claim the guardrails forbid, the frame loses — that is what happened to "guided self-help", the phrase Selftend shipped most widely.

**What positioning does _not_ bind** ([#1610](https://github.com/Selftend/selftend/issues/1610)). "What the product is" fuses three separable things, and a frame governs only the last:

|               | What it is                                                                              | Bound by the frame?                              |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Inventory** | What the product contains — eight tools, six onboarding concerns, ACT, the DBT overview | **No.** Protected by the modularity guardrail.   |
| **Sequence**  | What it offers first, and what it pre-selects                                           | **No.** Has its own non-positioning constraints. |
| **Copy**      | What it says, on every surface                                                          | **Yes.** This document.                          |

This is load-bearing. Centring CBT is a real argument for pre-selecting the CBT module in onboarding, and that argument was **rejected**: the wizard ships with no module selected, and flipping it loses to the modularity guardrail. Narrowing the six onboarding concerns to the three that route into the programme was **rejected** for the same reason. The frame was chosen _because the build already satisfied it_ — so a large product consequence would have been evidence the frame was chosen wrongly, not evidence of work to do.

---

## 1. The canvas

The 30-second read. Dunford's six fields, one shipped deliberately empty, plus one row his canvas does not have.

| Field                        | Selftend                                                                                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product**                  | **Selftend** — a free, private CBT programme, with everyday tools for the days you cannot face it.                                                                                                                                                              |
| **Market category**          | **A CBT programme.** _Cognitive behavioural therapy_, spelled out on first use. No subcategory claimed. ([#1604](https://github.com/Selftend/selftend/issues/1604))                                                                                             |
| **Competitive alternatives** | Most common first: **doing nothing, or working it out by hand** → **a general-purpose AI** → **another wellbeing app** → **a book** → **therapy**. A mood tracker is not among them. ([#1599](https://github.com/Selftend/selftend/issues/1599))                |
| **Unique attributes**        | **One compound, never three bullets:** field-level encryption over ~36 tables with the Vault key held _outside_ the database, **plus** a public AGPL source tree, **plus** no AI reading any of it. ([#1602](https://github.com/Selftend/selftend/issues/1602)) |
| **Value**                    | Four themes, in the order below. Theme 2 carries the frame; theme 3 is an on-ramp and never co-equal. ([#1603](https://github.com/Selftend/selftend/issues/1603), ordered by [#1604](https://github.com/Selftend/selftend/issues/1604))                         |
| **Who cares a lot**          | **Empty as of 2026-08-31.** Deliberately. See below. ([#1605](https://github.com/Selftend/selftend/issues/1605))                                                                                                                                                |
| **Not this**                 | See the refusals table.                                                                                                                                                                                                                                         |

### Positioning statement

> For **[segment — empty as of 2026-08-31, see #1605]**, Selftend is **a CBT programme you can be honest with** — because a thought record built on the thought you were willing to admit is worthless, and here the record is encrypted at rest with the key held outside the database, the source is public and readable, and no AI is reading it.

### Why "Who cares a lot" is empty

**This is the map's central thesis, not an omission.**

Dunford's Step 1 assumes you already have enough happy customers to see a pattern in who loves you, and warns: _"Until you can see that, you will want to hold off on tightening up your positioning."_ Selftend launched days before this was written, with Play showing 10+ installs and zero ratings anywhere. So the frame was decided now and the segment deferred, rather than running all ten steps against assumptions.

**A placeholder would silently harden into the answer. An empty dated slot is a visible obligation; a placeholder is an invisible decision.** If you are reading this and the slot is still empty, do not helpfully fill it in — fill it from the instrument, or leave it.

The instrument that will fill it is designed and specified in [#1605](https://github.com/Selftend/selftend/issues/1605): a concern-cohorted retention cross-tab, run by hand, collecting nothing new. **It is gated on 30 W4-retained users** — the same threshold as the warrant to continue — so the segment becomes answerable on the **2027-08-31** clock, not the February one.

⚠️ **A _pond_ is not a _segment_.** A pond is a strategic aim — who you point at. A segment is an empirical finding — who turns out to love you. Bulgarian was declined as a pond on supply-side-only evidence and remains the strongest candidate for the segment. Naming a pond would not fill this slot.

### The four value themes, in order

1. **"You can be honest here"** — _primary differentiated value._ Stated **instrumentally, never morally**: honesty is an input requirement of the method, since a thought record built on the thought you were willing to admit is worthless. That makes privacy load-bearing for anyone, not a feature for the paranoid. "No AI is reading this" and "works in a browser, nothing to install" ride **inside** this theme and never stand alone — an app icon on a phone is itself a disclosure.
2. **"You can work through something, not just track how you feel"** — **the frame carrier.** This is what "a CBT programme" means to a person: unique against a book (structure, no record of you) and against a wellbeing app (a record of you, no progression).
3. **"Something to do right now, with no commitment"** — the eight everyday tools. **Supporting. Never leading.** See the ordering constraint.
4. **"It won't be taken away or turned against you"** — supporting, never a headline. Its provable core is **export plus public source**, _not_ longevity.

### ☠️ The ordering constraint on theme 3 — a hard rule, and no gate can enforce it

Theme 3 stays in the positioning because half the declared onboarding goals route to standalone tools; a positioning that never mentions them misdescribes the product a `sleep` or `habits` user actually arrives at.

The landing hero shows exactly how it fails. Before [#1616](https://github.com/Selftend/selftend/issues/1616), `src/i18n/locales/en/auth.json` read:

> _"Calm, guided self-help - CBT and ACT modules plus eight everyday tools. No ads, no subscriptions."_

**That string fails not because it mentions the tools, but because it lists everything flat.** Supporting is not co-equal. The frame sentence lands first; the tools appear _afterwards_, as what is there on a day someone cannot face the programme.

#1616 removed the banned compound and moved the frame sentence to the front. It did **not** clear this rule: ACT and the eight tools are still listed flat behind it, which is what [#1628](https://github.com/Selftend/selftend/issues/1628) is for.

**No regex reaches this rule.** `test/positioning-copy.test.ts` is one-sided by design and cannot express "mentioned, but second". This paragraph is the enforcement. It is written down precisely so nobody builds a brittle gate for it, watches it fail on good copy, and deletes the guard along with it.

---

## 2. The reasoning

### The category, and the style

**Head to Head into a vacated category, minus the leadership commitment.**

CBT was the only candidate frame that cleared all three tests at once — it already exists in users' minds, it puts Selftend's strongest value at the centre, and it does not trigger table stakes Selftend conspicuously fails. The build earns the pass rather than the copy: thought records, distortions, behavioural activation, exposure, worry/anger/beliefs, and a five-stage programme with graduation, from a named source (Gillihan).

The category is a graveyard, and that is why it is open. Five consumer CBT entrants left in roughly thirty months — Woebot gated behind provider partnerships, Sanvello, Quirk and Bloom gone, Youper shut down on 2026-09-30 — **every one venture-funded, every one needing the category to support a business it has been demonstrated not to support.** Selftend needs it to support a _project_, at roughly $650/yr. The thing that killed them is the thing Selftend does not need.

**The leadership half is declined on the record.** Dunford's Head to Head obliges you to define and evangelise the category permanently. There is no audience for that here — `cbt app` draws >100 searches/mo against `cognitive behavioral therapy` at >100K — and the warrant to continue contains no growth commitment. The style is named with the departure inside it so a later session cannot quietly reinstate the commitment as though it had been agreed.

☠️ **The frame is bought for comprehension on arrival, never for organic store pull.** A visitor understands what Selftend is within five seconds. It does not buy ranking, and it must never be defended as though it did.

**Why "programme" and not "app".** _Programme_ carries the centred value theme in the noun and is accurate rather than aspirational — the CBT module is a real progression engine, not a content library. The risk was checked explicitly: "guided self-help" died because _guided_ implies a practitioner Selftend does not employ, and _programme_ does not re-import that. The person is implied by _guided_; structure is implied by _programme_. **The frame word is safe; the killed compound stays killed.**

**ACT is swallowed by the frame** — conventionally third-wave CBT, named where a user actually meets it, never in the frame sentence. The honest footnote: a purist can object that ACT is not CBT, and one programme-routed onboarding goal (`stress-overwhelm`) does go to ACT. The objection is real and the umbrella is still the right call.

### What "free" says here

CBT's credible free precedents are **institutional** — MindShift CBT from the non-profit Anxiety Canada, CBT-i Coach from the US Department of Veterans Affairs, FreeCBT. Nobody has set a price anchor here the way Calm has, so in this frame free reads as institutional rather than unfinished. That is an argument _for_ this frame.

But it only reads that way if the reason is stated:

> **Free because it is a non-profit, not because it is a trial.**

**AGPL is the proof behind that sentence, never the sentence itself.** "Open source" is not a value to someone in distress; here it does its proper job — making the claim checkable rather than making the claim.

### The differentiator is a compound, and splitting it destroys it

Individually each part is weak. Encryption is a claim every vendor makes unverifiably; openness is not a benefit to a distressed user; "no AI" is a negative that is normally unprovable. Together they produce something none of them is alone: **a privacy promise a stranger can verify by reading the source instead of trusting the vendor.**

☠️ **A permanent boundary on how this is said.** The design is _provider-recoverable_ — the migration says so in those words.

- **Sayable:** encrypted at rest; the key is held outside the database; a leaked dump is ciphertext.
- **Never sayable:** _end-to-end_, _zero-knowledge_, _even we can't read them_.

These three are guarded by `test/positioning-copy.test.ts` and fail `verify`. They are the only claims on this map where the wrong word is a lie rather than a weak pitch, told to the people who chose Selftend _because_ of that property.

### No trend is layered

Dunford's Step 9 is declined ([#1609](https://github.com/Selftend/selftend/issues/1609)). Six candidates were tested and all six failed.

☠️ **A trend cannot be louder than the category it sits on.** The AI-therapy collapse is the strongest hook available and is refused _because_ of that strength: layered onto a frame drawing >100 searches/mo, it makes the visitor comprehend _"an anti-AI thing"_ — spending the very comprehension the frame was bought for. **A trend layer is also a segment choice wearing a timeliness costume**: leading with no-AI selects for the already-AI-suspicious and pre-empts the deferred segment.

**AI stays a rationale, never a claim** — the same shape as the AGPL ruling.

Two closures are conditional rather than dated: **durability** reopens if a donation path is wired (none exists today, which is why theme 4 cannot claim longevity); **the AI trend** reopens if the frame stops being ~3 orders of magnitude quieter than the trend.

### The refusals

The canvas has no field for a refusal, and every refusal on this map otherwise lives only in a closed issue — which is exactly how one gets reversed by the next person with a good idea. **A refusal that is not in the governing document is not governed.**

| Not this                               | Why, in one line                                                                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mood tracker**                       | Fails correlations, CSV export and offline-first, and #1599 found it is not what a Selftend user would otherwise reach for. Both algorithmic surfaces read Selftend this way; this frame out-argues them rather than following them. |
| **Journaling**                         | Fails search, photos and tags. A journal you cannot search is not a journal a journaller keeps.                                                                                                                                      |
| **Meditation**                         | Fatal. The guided-audio table stake against Calm (1.98M ratings) and Headspace (974K).                                                                                                                                               |
| **Wellness / toolkit**                 | Buries everything specific. You lose to Calm on polish and Finch on delight, and win neither.                                                                                                                                        |
| **"Guided self-help"**                 | Not a category, and clinically it means _with a practitioner_ — which Selftend does not have. Unsafe, not merely weak.                                                                                                               |
| **ACT at co-equal billing**            | Content inside the frame, never in the frame sentence.                                                                                                                                                                               |
| **Category leadership**                | No audience to evangelise to, and no growth commitment behind it.                                                                                                                                                                    |
| **Store pull as a goal**               | This frame buys comprehension, not ranking.                                                                                                                                                                                          |
| **Growth as an ambition**              | The style declines the leadership commitment, so the frame cannot later be defended on reach.                                                                                                                                        |
| **A trend / a "why now"**              | All six candidates failed.                                                                                                                                                                                                           |
| **Validated measures (PHQ-9 / GAD-7)** | The frame's one real table-stakes gap, **refused with a reason**: scored clinical screening walks into the "not a diagnosis engine" guardrail, which outranks positioning. Not a backlog item.                                       |
| **Bulgarian as the pond**              | Declined on supply-side-only evidence — zero competing BG apps proves an empty shelf, not a shopper. Still the strongest segment candidate.                                                                                          |

### What this cost

Choosing this frame gives up the wellness/toolkit frame — the broadest reach available, and the only one under which all eight tools and all six onboarding concerns are equally on-message. It gives up meditation permanently, the journaling frame's cross-platform pond, and theme 3 as the lead. **Three of six declared onboarding goals now route somewhere the frame does not speak to**; [#1610](https://github.com/Selftend/selftend/issues/1610) examined that and ruled it a positioning matter, absorbed above, with no product change.

### The yardstick this answers to

Revenue does not apply, so it is replaced not by a growth target but by a **warrant to continue**: **30 W4-retained users by 2027-08-31** ([#1598](https://github.com/Selftend/selftend/issues/1598)). The failure mode is the owner stopping, not the market rejecting — so the number is a threshold of sufficient evidence, never a projection. "Retained" may count **whether** someone returned and never how long or how often, so the metric cannot drift into engagement maximisation.

Segment size is therefore **not** the criterion this frame was chosen on. 30 W4-retained implies only a few hundred signups a year, which every surviving candidate frame clears; the frame was decided on credibility and differentiation instead.

---

## 3. Canonical phrasings

⚠️ **Everything above this line is positioning.** Changing it is a positioning change and takes the re-check below — not a commit. Everything below is phrasing, and may be edited freely as long as it stays consistent with what is above.

### The frame sentence

> **Selftend is a free, private CBT programme** — cognitive behavioural therapy — **with everyday tools for the days you cannot face it.**

Short form, where length is capped:

> **A free, private CBT programme.**

### Approved supporting lines

- **On honesty (theme 1, lead with this):** "A thought record only works if you were honest in it. Yours is encrypted at rest, the key is held outside the database, the source is public, and no AI is reading it."
- **On the programme (theme 2):** "Work through something, don't just track how you feel."
- **On the tools (theme 3 — only after the frame):** "And on a day you cannot face the programme, there are eight everyday tools that ask nothing of you."
- **On price:** "Free because it is a non-profit, not because it is a trial."
- **On durability (theme 4):** "Your data exports whenever you want, and the source is public." Never _"we'll still be here"_.

### Words to use

**Programme** · **cognitive behavioural therapy** (spelled out on first use, then CBT) · **private** · **encrypted at rest** · **non-profit** · **free**.

### Words never to use

| Never                                                           | Why                                                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **guided self-help**                                            | Clinically means _with a practitioner_. Selftend has none.                                                     |
| **end-to-end**, **zero-knowledge**, **even we can't read them** | False. The design is provider-recoverable. **Guarded by `verify`.**                                            |
| **AI therapist / AI counsellor / AI coach**, affirmatively      | Guardrail. The _negation_ is legitimate and stays. **Guarded by `verify`.**                                    |
| **no streaks**, **no streak pressure**, **streak-free**         | The build guardrail stays; its absence is never a pitch (owner decision, 2026-07-24). **Guarded by `verify`.** |
| **AI-powered**                                                  | AI is a rationale here, never a claim. **Guarded by `verify`.**                                                |

Allowed adjacent phrasing: "no pressure", "no shame", "no ads, no subscriptions".

---

## What binds this document

Four gates, split by what each can physically reach. **Nothing reaches the last row, and saying so is the point** — that is where the sharpest contradictions were found.

| Surface                                                                                                                                  | Gate                                                                                                                 | Strength                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| i18n strings (both locales), `public/manifest.webmanifest`, `public/index.html`, `README.md`, `CONTEXT.md`, `docs/product-principles.md` | `test/positioning-copy.test.ts`                                                                                      | **Merge gate.** Runs in `verify` on every PR.                                       |
| App Store `subtitle`, `promoText`                                                                                                        | [`store/apple-info.json`](../store/apple-info.json), compared weekly by `.github/workflows/store-metadata-drift.yml` | Weekly alarm. Not a merge gate — it reads a remote a human may legitimately change. |
| Play listing text                                                                                                                        | [`store/play-listing.md`](../store/play-listing.md), carrying a `last verified` date                                 | Diff and review only. No remote verification exists.                                |
| AlternativeTo, GitHub repo `description`/`homepage`/`topics`, the Reddit banner and sidebar, eight published video narrations            | This list, plus one line in `.github/pull_request_template.md`                                                       | **Human habit. Nothing stronger is available.**                                     |

☠️ **The merge gate was seeded deliberately short, and "guided self-help" was its first growth ring.** That rule could not ship alongside the guard: the phrase was in 22 i18n strings plus the manifest and three prose docs, so it would have failed on arrival, and a 22-entry suppression list was rejected because a list that size silently becomes permanent. [#1616](https://github.com/Selftend/selftend/issues/1616) therefore fixed the copy and added the rule **in the same change**, with no exemptions — the only order that leaves the guard meaning what it says. What was seeded originally are the rules with zero live violations — the highest-consequence ones, the claims a person writing marketing copy in good faith reaches for first. The frame-spelling invariant ([#1627](https://github.com/Selftend/selftend/issues/1627)) is still outstanding.

`CONTEXT.md` takes the **vocabulary** and only the vocabulary — what "CBT programme" means, and why the retired compound is banned. The position itself stays here.

☠️ **That entry cannot spell the banned compound out, because `CONTEXT.md` is inside the merge gate's scan.** #1616 wrote the entry and fixed line 3 in one change; the entry names the ban by pointing back here rather than by quoting it. This document is the only surface excluded from the scan, which is why the banned words themselves live in the table above and nowhere else in the repo's guarded set.

## The re-check

**2027-02-28.** Owner: the repo owner — there is nobody else, and saying so is more useful than leaving it implied.

**Two clocks, deliberately kept apart:**

- **2027-02-28 — the frame.** Is "a CBT programme" still the right category?
- **2027-08-31 — the warrant to continue.** 30 W4-retained users; does the project go on?

Conflating them would turn a positioning review into a survival referendum, or the reverse.

**Named triggers**, recorded so a re-check is not mistaken for a rediscovery:

- **#1605 returns a segment.** That fills the empty canvas field, which is a positioning change by definition. Earliest 2027-08-31.
- **A donation path is wired** → durability reopens as a claim.
- **The frame stops being ~3 orders of magnitude quieter than the AI trend** → that trend reopens.
- **2026-09-30, Youper's shutdown passes.** Already decided not to act on; the trigger is "note that it expired", not "revisit".

⚠️ **A re-check restarts at Dunford's Step 4 (competitive alternatives), not Step 1.** A landscape shift changes who you are compared against; it does not oblige you to re-derive the product from nothing.
