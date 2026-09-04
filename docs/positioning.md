# Positioning

What Selftend is, which market it is in, and the words that follow from that. This is the canonical source for every surface that says what Selftend is — the landing page, both store listings, the README, directory entries, and the copy inside the app.

Decided across [map #1597](https://github.com/Selftend/selftend/issues/1597) using April Dunford's _Obviously Awesome_ — eleven decisions — and **repositioned across [map #1813](https://github.com/Selftend/selftend/issues/1813)** in ten more. Each is linked below rather than restated, so a settled refusal can be read with its reasoning instead of rediscovered as a good idea. ✅ **Where a #1597 decision survives, it is still linked to #1597**: a superseded frame does not invalidate the reasoning underneath every one of its parts.

☠️ **What changed, in one line.** The market category moved from **a CBT programme** to **a CBT self-help app** ([#1814](https://github.com/Selftend/selftend/issues/1814)), and the eight everyday tools moved from _"supporting, never leading"_ to the **lead** theme ([#1817](https://github.com/Selftend/selftend/issues/1817)). The method did not get dropped to do it — **it survives inside the category noun**, which is what answers #1597's refusal of the vague toolkit frame rather than ignoring it.

## The hierarchy

**`AGENTS.md` guardrails and [product-principles.md](product-principles.md) bind positioning. Positioning binds copy.**

A conflict resolves for the guardrail, always. If a sharper frame would need a claim the guardrails forbid, the frame loses — that is what happened to "guided self-help", the phrase Selftend shipped most widely, and it is what happened again on this map to _"an app that helps you self-manage your mental health"_, the sentence the repositioning was opened with ([#1815](https://github.com/Selftend/selftend/issues/1815)).

☠️ **`docs/product-principles.md` has two ranks inside one file, and reading it as one rank is how this hierarchy gets run backwards** ([#1820](https://github.com/Selftend/selftend/issues/1820)). It is named in row 1 of § _What binds this document_ below — so the document that **binds** positioning is simultaneously **scanned as copy by** positioning's own gate. That is not a contradiction:

|                                                  | Rank                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| **The twelve principles, and the Audience Note** | **Bind positioning.** Positioning may not edit them to fit a frame. |
| **The opening description (line 3)**             | **Bound by positioning.** It is copy saying what Selftend is.       |

The corroboration is countable: `CBT` and `programme` appear in that file **exactly once**, on line 3, and **none of the twelve principles depends on the frame** — every one reads identically under either. So the frame change edits line 3 and nothing else, which is positioning flowing downward.

**What positioning does _not_ bind** ([#1610](https://github.com/Selftend/selftend/issues/1610)). "What the product is" fuses three separable things, and a frame governs only the last:

|               | What it is                                                                              | Bound by the frame?                              |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Inventory** | What the product contains — eight tools, six onboarding concerns, ACT, the DBT overview | **No.** Protected by the modularity guardrail.   |
| **Sequence**  | What it offers first, and what it pre-selects                                           | **No.** Has its own non-positioning constraints. |
| **Copy**      | What it says, on every surface                                                          | **Yes.** This document.                          |

This is load-bearing, and it cuts **both ways** — the frame move does not reach inventory any more than the old frame did. Centring CBT was a real argument for pre-selecting the CBT module in onboarding, and that argument was **rejected**: the wizard ships with no module selected, and flipping it loses to the modularity guardrail. Narrowing the six onboarding concerns to the three that route into the programme was **rejected** for the same reason. Leading with the tools does not now reverse either one.

☠️ **The one place the hierarchy could have run backwards, and deliberately did not.** `AGENTS.md:126` scopes the MVP to _"the CBT programme and the everyday tools around it"_ — wording that subordinates the tools exactly as the retired ordering constraint did. It is **scope and inventory**, which the table above leaves unbound, so editing it because the frame changed would be positioning reaching upward. It is left alone here and filed as an independent owner scope call: [#1902](https://github.com/Selftend/selftend/issues/1902).

---

## 1. The canvas

The 30-second read. Dunford's six fields, one shipped deliberately empty, plus one row his canvas does not have.

| Field                        | Selftend                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product**                  | **Selftend** — a free, private CBT self-help app, with everyday tools for right now and a programme to work through when you want one.                                                                                                                                                                                                                                                                      |
| **Market category**          | **A CBT self-help app.** _Cognitive behavioural therapy_, spelled out on first use. No subcategory claimed. ([#1814](https://github.com/Selftend/selftend/issues/1814))                                                                                                                                                                                                                                     |
| **Competitive alternatives** | Most common first: **doing nothing, or working it out by hand** → **a general-purpose AI** → **another wellbeing app** → **a book** → **therapy**. ([#1599](https://github.com/Selftend/selftend/issues/1599), re-measured by [#1859](https://github.com/Selftend/selftend/issues/1859))                                                                                                                    |
| **Unique attributes**        | **One compound, never four bullets:** field-level encryption over ~36 tables with the Vault key held _outside_ the database, **plus** a public AGPL source tree, **plus** no AI reading any of it, **plus** no account needed to check any of that for yourself. ([#1602](https://github.com/Selftend/selftend/issues/1602), fourth leg added by [#1859](https://github.com/Selftend/selftend/issues/1859)) |
| **Value**                    | Five themes, in the order a person **meets** them. Roles are named; the position number is not a role. ([#1817](https://github.com/Selftend/selftend/issues/1817))                                                                                                                                                                                                                                          |
| **Who cares a lot**          | **Empty as of 2026-09-04.** Deliberately. See below. ([#1605](https://github.com/Selftend/selftend/issues/1605))                                                                                                                                                                                                                                                                                            |
| **Not this**                 | See the refusals table.                                                                                                                                                                                                                                                                                                                                                                                     |

### Cluster 3 is not the graveyard it was

The five clusters and their order are unchanged — [#1859](https://github.com/Selftend/selftend/issues/1859) re-measured them against the new shelf and found the **ranking holds**. What changed is who occupies the third one.

|                                                                     | Cluster 3 = "another wellbeing app"                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Under the old frame**                                             | The CBT shelf #1599 called a graveyard: Quirk unmaintained, MindShift shut, Woebot's consumer app gone, Youper shutting, Sanvello absorbed.                                    |
| **Now** ([#1816](https://github.com/Selftend/selftend/issues/1816)) | **Finch** (747,098 ratings), **Clarity: CBT Self Help Journal** (29,316), **Headspace**, **Habit Tracker** (146,288), **How We Feel**, **Daylio** — alive and shipping weekly. |

☠️ **The swap cuts _for_ the differentiator, not against it.** The old cluster 3 contained **open-source apps** — Quirk and FreeCBT — so a public AGPL tree was not unique against it. The new one is entirely closed-source commercial. **The verifiable-privacy compound gets stronger under the shelf move.**

⚠️ **A mood tracker is a member of this cluster, and #1599's standalone exclusion line is deleted.** It read _"a mood tracker is not among them"_, written under a frame that refused the category. Daylio and How We Feel are demonstrably on this shelf, so pretending nobody reaches for a tracker is false. A mood tracker was never a _cluster_; it is an occupant of this one. ☠️ **The refusal is untouched and its reason moved** — Selftend's answer to that person is not a better tracker, because correlations are refused outright by a rule positioning cannot repeal (see the refusals table).

### Positioning statement

> For **[segment — empty as of 2026-09-04, see #1605]**, Selftend is **a CBT self-help app you can be honest with** — because anything you write for an audience stops being useful to you, and here the record is encrypted at rest with the key held outside the database, the source is public and readable, no AI is reading it, and you never had to give an email to check.

⚠️ **The instrumental argument is now general, not the thought record's alone** ([#1814](https://github.com/Selftend/selftend/issues/1814), [#1817](https://github.com/Selftend/selftend/issues/1817)). It applies to a mood log, a gratitude entry or a self-care log the same way — which matters more here than it did, because the tools now lead.

### Why "Who cares a lot" is empty

**This is #1597's central thesis, and this map did not touch it.**

Dunford's Step 1 assumes you already have enough happy customers to see a pattern in who loves you, and warns: _"Until you can see that, you will want to hold off on tightening up your positioning."_ Selftend launched days before the first frame was written, with Play showing 10+ installs and zero ratings anywhere. So the frame was decided then and the segment deferred, rather than running all ten steps against assumptions.

**A placeholder would silently harden into the answer. An empty dated slot is a visible obligation; a placeholder is an invisible decision.** If you are reading this and the slot is still empty, do not helpfully fill it in — fill it from the instrument, or leave it.

The instrument that will fill it was specified in [#1605](https://github.com/Selftend/selftend/issues/1605) and built in [#1613](https://github.com/Selftend/selftend/issues/1613): a concern-cohorted retention cross-tab, run by hand, collecting nothing new. It is `scripts/analytics-segment.sql` (`npm run analytics:segment`), and how to read it is written down in [analytics.md](analytics.md). **It is gated on 30 W4-retained users** — the same threshold as the warrant to continue — so the segment becomes answerable on the **2027-08-31** clock, not the February one.

⚠️ **A _pond_ is not a _segment_, and neither is an _attribute_.** A pond is a strategic aim — who you point at. A segment is an empirical finding — who turns out to love you. Bulgarian was declined as a pond on supply-side-only evidence and remains the strongest candidate for the segment. [#1814](https://github.com/Selftend/selftend/issues/1814) also refused Big Fish / Small Pond as a style, so naming privacy-motivated users as a pond would not fill this slot either.

### The five value themes, by role and by encounter order

☠️ **The 1–4 ranking is retired, and that is a structural fix rather than a re-ordering** ([#1817](https://github.com/Selftend/selftend/issues/1817)). The old list conflated three different claims onto one axis: theme 1 was labelled _primary differentiated value_, theme 2 _carried the frame_, and the rank number was **also** silently read as _what gets said first_. A rule that equivocates cannot be checked, which is why the old ordering constraint needed a paragraph of enforcement and still failed.

**Roles are now named. "Order" means one thing only: the order a person meets them.**

1. **"Something to do right now, with no commitment"** — the eight everyday tools. **LEAD.**
2. **"You can work through something, not just track how you feel"** — the programme. **FRAME CARRIER.** ✅ It holds this role _independently_ of its position now, because CBT sits inside the category noun; it no longer has to lead in order to carry the frame.
3. **"You can be honest here"** — **PRIMARY DIFFERENTIATED VALUE.** Stated **instrumentally, never morally**: any self-record edited for an audience is worthless to the person keeping it. That makes privacy load-bearing for anyone, not a feature for the paranoid. "No AI is reading this", "works in a browser, nothing to install" and "no account needed" ride **inside** this theme — an app icon on a phone is itself a disclosure.
4. **"You run it yourself, without a gatekeeper"** — supporting. **NEW.** The second half of the category noun — _self-**help**_ — was represented by none of the four old themes, while `AGENTS.md` says _"self-help the person runs themselves"_. It is genuinely differentiated: Apple's `mental health tools` returns **prescribers** (Cerebral, Brightside, Talkspace), so _no practitioner, no waiting list, no one else in the loop_ separates Selftend from what that shelf actually surfaces.
5. **"It won't be taken away or turned against you"** — supporting. Its provable core is **export plus public source**, _not_ longevity.

☠️ **Why the differentiator sits third and not second.** [#1609](https://github.com/Selftend/selftend/issues/1609) refused the no-AI trend layer because _leading_ with privacy makes a visitor comprehend **"an anti-AI thing"**, spending the very comprehension the frame was bought for. That reasoning transfers exactly: privacy differentiates only _after_ the visitor knows what the thing is. Placed second it becomes the identity instead of the advantage. The narrative is **what can I do now → why these and not any eight things → why here rather than Finch → who else is involved → what's the catch.**

⚠️ **Theme 4 is bounded.** It must read as _available without a gatekeeper_, **never** as _instead of professional help_. The "not a therapist replacement" guardrail outranks positioning, and the crisis-signposting separation stays intact.

⚠️ **Theme 5's job changed even though its position did not.** Under the CBT frame, `free` read as institutional. On this shelf **every top result across every term tested lists at $0**, so free is the floor rather than a signal, and the question a visitor silently asks becomes _"what's the catch?"_. That is what theme 5 now answers. Promoting it would tempt precisely the durability claim #1609 left conditional on donations covering a year of running costs. ⚠️ The freemium characterisation is **reasoning, not copy** — #1816 measured price, not business model.

### ☠️ The hard rule on how the tools appear — two clauses, and no gate can enforce either

The old rule protected the tools' **subordination** — _"Supporting. Never leading."_ That failure mode is retired with the ranking. ☠️ **The live failure mode is its inverse, and it is already shipping: the iOS first screenshot is a home screen headed `Your tools` with no programme in frame.**

> **1. The tools may lead, but never appear alone.** No surface presents the tools without the method somewhere on it. The failure is _not_ the tools leading — that is the point of the re-order — it is the tools appearing as a **bare inventory with nothing behind them**. And the tools are still never **enumerated in prose**: the sentence says what they are _for_; the page shows which ones exist.
>
> **2. Privacy is never the opening claim.** It is the primary differentiated value and the one attribute the style competes on, and it still lands third. Leading with it spends comprehension on "an anti-AI thing" ([#1609](https://github.com/Selftend/selftend/issues/1609)'s reasoning, transferred).

**Two reading tests, so a reviewer can apply them without a judgement call:** _Is the method on this surface?_ and _Is privacy the first claim?_

☠️ **Clause 1 is not a deletion rule, and reading it as one is how this gets reverted** — the same warning the old rule carried, for the same reason. The tools appearing as a chip row, a nav group or a home section is **inventory**, which the frame does not bind ([#1610](https://github.com/Selftend/selftend/issues/1610)). What clause 1 forbids is a surface where the method is _absent_, never one where the tools are _prominent_.

✅ **_"Don't list everything flat"_ survives verbatim inside clause 1.** Promoting the tools does not repeal it: **eight items is still a flat list.** The landing hero is the worked example. Before [#1616](https://github.com/Selftend/selftend/issues/1616), `src/i18n/locales/en/auth.json` read:

> _"Calm, guided self-help - CBT and ACT modules plus eight everyday tools. No ads, no subscriptions."_

That string failed not because it mentioned the tools, but because it listed everything flat — and it would fail today for the same reason, under the opposite theme order. [#1628](https://github.com/Selftend/selftend/issues/1628) cleared it. ☠️ **Neither half of that fix was a deletion, and reading it as one is how it gets reverted:** the eight tools are still on the page as the chip row under the CTA, and ACT is still there in its own module section. What stopped is the prose enumerating what the page already shows.

☠️ **Clause 1 is also what holds the refusals table up**, which is why it is a hard rule rather than a style note ([#1818](https://github.com/Selftend/selftend/issues/1818)). A table stake is imported by **the category noun a visitor assigns you**, not by a tool appearing in a list — Finch names two tools in its subtitle and is held to neither one's stakes, because its category noun is a self-care pet; Daylio's category noun **is** `mood tracker`, and it duly meets correlations and CSV. On a surface with a bare tool list and no method, **the loudest tool noun present becomes the category by default, and its stake binds immediately.**

**No regex reaches either clause.** `test/positioning-copy.test.ts` is one-sided by design and cannot express "mentioned, but second" — nor "present at all". These paragraphs are the enforcement. They are written down precisely so nobody builds a brittle gate for them, watches it fail on good copy, and deletes the guard along with it.

---

## 2. The reasoning

### The category, and the style

**Head to Head on a crowded shelf — minus the leadership commitment, and minus the reach claim.**

**The noun is `a CBT self-help app`** — not a sentence, not a description, a noun a person would say out loud. It was available for reasons that were checked rather than assumed ([#1814](https://github.com/Selftend/selftend/issues/1814)):

- **`self help apps` is the second Google autocomplete** for its prefix, the best-positioned candidate term anywhere in [#1816](https://github.com/Selftend/selftend/issues/1816).
- ☠️ **The "`self-help` returns a credit union" finding was App Store _autocomplete_ only.** Apple's actual `/search` for `self help` returns **Finch · I am · Quabble · Clarity: CBT Self Help Journal · Deepstash · Habit Tracker · Headspace** — exactly the target shelf. The two proxies disagree, and for **placement** the results decide.
- **Clarity is the live commercial proof** — `Clarity: CBT Self Help Journal`, 29,316 ratings, Apple's #10 for `mental health app` and #4 for `self help`. A CBT app standing on the broad shelf, carrying the method in its name. ☠️ **"Broad shelf" and "CBT category noun" were never the either/or the old frame assumed.**
- **`AGENTS.md:17` already says _"a wellness and self-help product"_** — the top of the hierarchy was already speaking this vocabulary, so it is the retired noun that sat slightly off the governing guardrail, not the replacement.

**Both departures are named inside the style, so neither can be quietly reinstated.**

- **Minus leadership.** Dunford's Head to Head obliges you to define and evangelise the category permanently. There is no audience for that here — `cbt app` draws >100 searches/mo against `cognitive behavioral therapy` at >100K — and the warrant to continue contains no growth commitment.
- **Minus the reach claim.** New on this map. Selftend competes on **one attribute**: privacy a stranger can verify by reading the source. It does **not** compete on scale, polish or delight.

☠️ **#1604's _"into a **vacated** category"_ is no longer available, and surrendering it is the biggest thing this move costs.** The old style rested on a graveyard — five consumer CBT entrants gone in roughly thirty months, every one venture-funded, every one needing the category to support a business it had been demonstrated not to support. On the broad shelf that argument is simply false: six of six incumbents shipped within eight days of the check, and the apparent shutdowns there were **absorptions, not deaths**.

☠️ **The frame is bought for comprehension on arrival, never for organic store pull — and this renunciation now costs something.** Under the old frame it was free, because the words had no market vocabulary. **These words do.** A visitor should understand what Selftend is within five seconds; that is all the frame buys, and it must never be defended as though it bought ranking. See the two refusal rows that carry this.

☠️ **The second standing warning, in Finch's own numbers, so the next person who feels the pull knows what they are feeling** ([#1859](https://github.com/Selftend/selftend/issues/1859)). Cluster 3's occupants are now alive and enormous — **Finch alone has 747,098 ratings** — while this style explicitly declines to compete on polish or delight. Under the old graveyard cluster 3, declining that contest cost nothing; under this one, Selftend is declining a contest against the single most-adopted thing on the shelf. **That is not a reopen.** #1814 already priced it — _losing a contest you have refused to enter is not a cost_ — and the answer to Finch was never polish. It is that **Finch cannot be checked and Selftend can.**

### What happens to CBT, and to the word "programme"

**The method behind the tools first; the thing you graduate into second.** In that order.

☠️ **This is the load-bearing move of the whole reposition.** CBT inside the noun is what converts the eight tools from a **flat inventory** into _the everyday end of a named method_. It answers #1597's _"buries everything specific"_ directly, and it **respects** the surviving "don't list everything flat" rule rather than colliding with it.

CBT is _not_ demoted to a credential and _not_ made "a tool among tools": the build is a five-stage progression with graduation from a named source (Gillihan) — a real progression engine, not a content library — so calling it a tool would be inaccurate. Thought records, distortions, behavioural activation, exposure, worry/anger/beliefs. **The build earns the category, not the copy.**

**`programme` survives as the module's own noun, and only that.** The demotion is from _category_ to _component_. It stays accurate, and forcing a new word would churn a lot of gated copy for nothing. The old argument for it as the **frame** word — that it carried the centred value theme inside the noun — is surrendered: ⚠️ **nothing in the new noun does that job.**

The risk that killed the retired compound was checked and is unchanged: "guided self-help" died because _guided_ implies a practitioner Selftend does not employ, and _programme_ does not re-import that. **The frame word is safe; the killed compound stays killed** — and it is now closer than it has ever been. See § _Words never to use_.

**ACT is swallowed by the frame** — conventionally third-wave CBT, named where a user actually meets it, never in the frame sentence. The honest footnote: a purist can object that ACT is not CBT, and one programme-routed onboarding goal (`stress-overwhelm`) does go to ACT. The objection is real and the umbrella is still the right call. ⚠️ **The live risk has moved** ([#1818](https://github.com/Selftend/selftend/issues/1818)): CBT is still inside the noun, so the dilution argument holds — what is new is the second beat of a tools-led sentence becoming a flat list of methods in its own right, which is clause 1's problem, not a separate one.

### What "free" says here

☠️ **The old argument has decayed and cannot be repeated.** #1597 held that CBT's credible free precedents were **institutional** — MindShift CBT from the non-profit Anxiety Canada, CBT-i Coach from the US Department of Veterans Affairs, FreeCBT — so free read as institutional rather than unfinished. Checked 2026-09-04: **Anxiety Canada ceased operations on 2025-04-01**, MindShift's Apple seller of record is now **247 Labs Inc**, a commercial developer, and FreeCBT's is **Evan Rosson**, an individual. **Only CBT-i Coach still supports the argument.** ⚠️ This is evidence about the _old_ frame rather than for the new one, and it is recorded because carrying the sentence forward unchanged would have been a lie.

**On this shelf, free says almost nothing on its own.** Every top result across every term tested lists at $0, so free is the **floor, not a signal** — a positioning asset traded away. It keeps its place in the frame sentence and in a supporting line, and it is the first word dropped when length is capped (see § _The short form_).

What still has to be stated, because it is what turns a floor into an answer:

> **Free because it is a non-profit, not because it is a trial.**

**AGPL is the proof behind that sentence, never the sentence itself.** "Open source" is not a value to someone in distress; here it does its proper job — making the claim checkable rather than making the claim.

### The differentiator is a compound, and splitting it destroys it

Individually each part is weak. Encryption is a claim every vendor makes unverifiably; openness is not a benefit to a distressed user; "no AI" is a negative that is normally unprovable; "no account" alone is a convenience. Together they produce something none of them is alone: **a privacy promise a stranger can verify by reading the source instead of trusting the vendor.**

✅ **A fourth leg joined, and it did not become a second headline** ([#1859](https://github.com/Selftend/selftend/issues/1859)). [#1453](https://github.com/Selftend/selftend/issues/1453) shipped anonymous sign-in on 2026-09-02, so _"no account needed — no email, no signup"_ went **unconditional**. It folds **into** the compound because it is the same claim, not an extra one: the compound says _you don't have to trust us, you can check_, and reading migrations and reading an AGPL tree are how an engineer checks. **Opening the web app and using it without giving an email is how everyone else checks.** It is the compound's only leg a non-technical person can verify in ten seconds, and the only one aimed at cluster 1 — the largest alternative. Folding a fourth verification route in is the opposite of splitting the compound into weak bullets.

☠️ **A permanent boundary on how this is said.** The design is _provider-recoverable_ — the migration says so in those words.

- **Sayable:** encrypted at rest; the key is held outside the database; a leaked dump is ciphertext.
- **Never sayable:** _end-to-end_, _zero-knowledge_, _even we can't read them_.

These three are guarded by `test/positioning-copy.test.ts` and fail `verify`. They are the only claims on this map where the wrong word is a lie rather than a weak pitch, told to the people who chose Selftend _because_ of that property.

⚠️ **One limit, stated rather than glossed:** #1816 catalogued **placement**, not rival feature sets. Nothing here rests on a claim about whether Finch, Clarity or Headspace ships an AI companion. The no-AI leg is declared unique against **cluster 2** — a general-purpose AI — and that is where it stays.

### No trend is layered

Dunford's Step 9 is declined ([#1609](https://github.com/Selftend/selftend/issues/1609)). Six candidates were tested and all six failed.

☠️ **A trend cannot be louder than the category it sits on.** The AI-therapy collapse is the strongest hook available and is refused _because_ of that strength: layered onto this frame it makes the visitor comprehend _"an anti-AI thing"_ — spending the very comprehension the frame was bought for. **A trend layer is also a segment choice wearing a timeliness costume**: leading with no-AI selects for the already-AI-suspicious and pre-empts the deferred segment.

**AI stays a rationale, never a claim** — the same shape as the AGPL ruling.

Two closures are conditional rather than dated, and ⚠️ **one of the two conditions is now unmeasurable:**

- **Durability** reopens only if donations cover a full year of running costs — a link alone does not (a GitHub Sponsors path into a personal account was decided 2026-09-02, [#1625](https://github.com/Selftend/selftend/issues/1625); it pays hosting, not the maintainer's time, and the maintainer stopping is the failure mode theme 5 cannot insure against). **Still measurable.**
- **The AI trend** was written to reopen _"if the frame stops being ~3 orders of magnitude quieter than the trend"_. ☠️ **That test can no longer be run.** [#1816](https://github.com/Selftend/selftend/issues/1816) established that **no search volume is obtainable at all** — Trends' public endpoint returns 429 and Keyword Planner needs a spending Ads account. The condition is recorded as **unmeasurable** rather than quietly dropped, and **nobody may invent a number to satisfy it.** Reopening this row needs a new instrument first.

### The refusals

The canvas has no field for a refusal, and every refusal otherwise lives only in a closed issue — which is exactly how one gets reversed by the next person with a good idea. **A refusal that is not in the governing document is not governed.**

☠️ **Leading with the tools multiplies the categories you can be mistaken for, so this table _grew_** ([#1818](https://github.com/Selftend/selftend/issues/1818)). Fourteen rows. **Nothing was overturned outright**; three reasons were replaced and two rows added.

| Not this                               | Why, in one line                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mood tracker** _(as the category)_   | Correlations are refused outright — a computed reading appraises the record back at the user ([#711](https://github.com/Selftend/selftend/issues/711)/[#952](https://github.com/Selftend/selftend/issues/952), [ADR-0004](adr/0004-retention-by-return-not-engagement.md)) — and export is complete but JSON, not the spreadsheet a tracker shopper means. |
| **Journalling** _(as the category)_    | Fails search, photos and tags — all three verified absent in-app, not merely in store copy. A journal you cannot search is not a journal a journaller keeps.                                                                                                                                                                                               |
| **Meditation** _(as the category)_     | The unguided mode ships complete — nine ambient beds, opening/interval/end bells, a duration, a ten-stage programme and six practices. The **noun** imports a narrated-library expectation Selftend does not meet, so it may not be the category. **The tool may lead, framed as unguided sitting.**                                                       |
| **Habit tracker** _(as the category)_  | On this shelf `Habit Tracker` is a top-6 result for `self help` and `self care`, and its core loop is the streak mechanic the guardrails forbid. Selftend has no streak feature to switch off.                                                                                                                                                             |
| **A sleep app** _(as the category)_    | Sleep is a diary, not a content library; the noun imports Calm's stories and soundscapes. The honest comparator is CBT-i Coach, also a diary.                                                                                                                                                                                                              |
| **Wellness / toolkit**                 | Kept and **narrowed**: _"buries everything specific"_ is answered because the specific thing is inside the category noun, and the style declines to compete on Calm's polish or Finch's delight at all. The **unqualified** toolkit frame stays refused.                                                                                                   |
| **"Guided self-help"**                 | Not a category, and clinically it means _with a practitioner_ — which Selftend does not have. Unsafe, not merely weak. ☠️ **The livest row on this table** — see § _Words never to use_.                                                                                                                                                                   |
| **ACT at co-equal billing**            | Content inside the frame, never in the frame sentence. The live risk is now the second beat becoming a flat list of methods, which clause 1 already governs.                                                                                                                                                                                               |
| **Category leadership**                | No audience to evangelise to, and no growth commitment behind it. Carried inside the style's own name.                                                                                                                                                                                                                                                     |
| **Store pull as a goal**               | This frame buys comprehension, not ranking. ☠️ **Now a real renunciation** — previously costless because the words had no vocabulary, and these words do.                                                                                                                                                                                                  |
| **Growth as an ambition**              | The style declines the leadership commitment, so the frame cannot later be defended on reach. Quirk's own founders recorded that a subscription-billed recovery product _"treated successes as failures"_; pairs with ADR-0004 — **a user who needs Selftend less is a success.**                                                                          |
| **A trend / a "why now"**              | All six candidates failed ([#1609](https://github.com/Selftend/selftend/issues/1609)). ⚠️ Its reopening condition is now **unmeasurable** — see above. Do not invent a number.                                                                                                                                                                             |
| **Validated measures (PHQ-9 / GAD-7)** | Scored clinical screening walks into the "not a diagnosis engine" guardrail, which outranks positioning. Not a backlog item.                                                                                                                                                                                                                               |
| **Bulgarian as the pond**              | Declined on supply-side-only evidence — zero competing BG apps proves an empty shelf, not a shopper. Still the strongest segment candidate, and **an attribute is not a segment; neither is a language.**                                                                                                                                                  |

☠️ **Two of the eight table stakes are refused by rules positioning cannot repeal** — mood-correlations and habit-streaks. Those two rows can never be reopened by a future frame change, only by amending ADR-0004 or the guardrails themselves. That is the most durable thing in this table.

⚠️ **`Meditation` is the weakest-authority row on this map, and it is marked rather than dressed up.** _"Fatal"_ — the old reason, resting on a guided-audio table stake against Calm and Headspace — is **retired**, falsified by Finch holding 747,098 ratings with no meditation audio while being Apple's top result for four of this shelf's own names. The replacement framing (**unguided**) was decided on the evidence by an agent with the owner declining to override, not by an owner ruling. It changes nothing that ships — Play's live description already frames the tool this way — and it is the only option compatible with a style that declines to compete on polish. **It should be the first row reopened if the frame later strains.** What would reopen it: a narrated session library shipping, or evidence that the unguided framing fails to land on a real surface.

☠️ **What was found while auditing this table, and it is not a copy note.** The tool inventory was checked in-repo rather than from store copy, and the premise that Selftend "ships no guided audio" is **false**: breathing ships narrated cues in two voices with the guided voice as the **default**, there are nine looping ambient beds with fades, and meditation shares them. The gap was never audio or capability — it is a library of narrated **sessions**. ⚠️ Play's live description consequently understates the tool.

### What this cost

**Choosing this frame gives up five things, and they are listed so the trade can be quoted back.**

1. **The vacant shelf, and every argument built on it.** _"The thing that killed them is the thing Selftend does not need"_ becomes irrelevant when the incumbents are alive and shipping weekly. The single biggest surrender.
2. **`programme` as the frame word.** It carried theme 2 inside the noun. Nothing in the new noun does that job.
3. **`free` stops signalling.** Under the CBT frame it read as institutional; here it is the floor.
4. **Permanent proximity to the banned compound**, on every surface, forever.
5. **The renunciation of store pull becomes costly** rather than free, because these words have real vocabulary.

☠️ **The mirror of #1597's own crack, and the honest one to quote against this frame:**

> **The frame now under-describes the most substantial thing in the build** — the five-stage programme with graduation is the one part no app on this shelf has, and the category noun carries it only as a qualifier.

### ☠️ The evidence position, stated so it cannot harden quietly

**This frame was chosen on judgment, not on data** — the owner's reading, on 2026-09-04, that the surfaces read wrong against what the app actually is.

That is the **same** evidential position #1597 was in: it chose the CBT frame days after launch with 10+ installs and zero ratings, and deliberately left **Who cares a lot** empty rather than guess. So this document swaps one judgment call for another. **It does not correct an error with facts, and nothing here may claim it does.** #1816 supplied real evidence about the shelf — placement, ratings, autocomplete, four labelled proxies — and none of it measures whether the reposition helps anyone.

The one crack #1597 recorded in itself is the honest argument for reopening, and it should be cited as such rather than dressed up:

> _"Three of six declared onboarding goals now route somewhere the frame does not speak to."_

⚠️ **No search volume was obtainable at any point, and none was invented.** Where a number is quoted here it comes from a named proxy — App Store autocomplete, Apple `/search` results, Google autocomplete, ratings counts, Wikipedia pageviews. If you need one that is not here, measure it; do not estimate it.

### The yardstick this answers to

Revenue does not apply, so it is replaced not by a growth target but by a **warrant to continue**: **30 W4-retained users by 2027-08-31** ([#1598](https://github.com/Selftend/selftend/issues/1598)). The failure mode is the owner stopping, not the market rejecting — so the number is a threshold of sufficient evidence, never a projection. "Retained" may count **whether** someone returned and never how long or how often, so the metric cannot drift into engagement maximisation.

☠️ **The shelf move did not touch it, and the direction of dependency is why** ([#1860](https://github.com/Selftend/selftend/issues/1860)). This number is **upstream** of the style, not downstream: both of the style's departures are justified _by_ it — _"the warrant to continue contains no growth commitment"_ — so changing it to match the style would knock out the style's own stated justification. The generator is the owner's stopping condition against ~$650/yr of owner-funded cost, and a crowded shelf does not reach that.

☠️ **The definition is not this document's to change.** _Retained means returned at all in the window, never duration or frequency_ is fixed by [ADR-0004](adr/0004-retention-by-return-not-engagement.md), which `AGENTS.md` § _Review guidelines_ cites by path — so it reaches positioning **from above**. The sentence above is quoting downward. ⚠️ The number and date are also written in `docs/analytics.md` and `scripts/analytics-segment.sql`, which deliberately reuse this constant rather than inventing a second one; a divergence would silently move the segment gate.

Segment size is therefore **not** the criterion this frame was chosen on. 30 W4-retained implies only a few hundred signups a year, which every candidate frame considered on this shelf clears comfortably — they are all broader than the one they replaced; the frame was decided on table stakes, provability and one differentiating attribute instead. ⚠️ **That arithmetic is not to be "recalibrated" against the new shelf.** It derives from a category-median retention figure, #1816 measured placement rather than retention, and #1598 already ruled that _"today's baseline tells us how far away it is, not what it should be."_

☠️ **Neither direction of this number is a verdict on the frame.** Reaching it is not reach, growth or market validation — see the two refusal rows that say so. **Missing it is not evidence the shelf move was wrong**, which is the inference a crowded shelf with real search vocabulary invites. § _The re-check_ keeps the two clocks apart for exactly this reason, and conflating them turns a positioning review into a survival referendum or the reverse.

---

## 3. Canonical phrasings

⚠️ **Everything above this line is positioning.** Changing it is a positioning change and takes the re-check below — not a commit. Everything below is phrasing, and may be edited freely as long as it stays consistent with what is above.

### The frame sentence

> **Selftend is a free, private CBT self-help app** — cognitive behavioural therapy — **with everyday tools for right now and a programme to work through when you want one.**

164 characters, up from 128. It grew for two reasons that are not stylistic: the category noun is four characters longer, and ☠️ **the old tail could not be carried forward at all.** _"with everyday tools for the days you cannot face it"_ defines the tools as **the fallback from the programme** — the exact subordination [#1817](https://github.com/Selftend/selftend/issues/1817) repealed. It is **deleted, not relocated**; moving it would have smuggled the old hierarchy into the new sentence.

☠️ **_"when you want one"_ is doing work, and is easy to mistake for filler.** The first-run wizard's panel 3 offers _"Leave both unselected if you only want individual tools"_, and it was exactly that contradiction — panel 1 declaring a category panel 3 then let you decline — that forced [map #1755](https://github.com/Selftend/selftend/issues/1755)'s surface rule into existence. **This sentence is true on all three onboarding paths**, so it repairs the contradiction instead of routing around it, and it states the modularity guardrail rather than straining against it.

**The dash form, not a colon variant.** Both put the tools first among the concrete offerings. The dash wins because it keeps the gloss adjacent to the **first** use of `CBT` — inside the category noun — so the sentence models the _spelled out on first use_ rule it is supposed to model. In a colon variant the gloss detaches and lands beside `programme`, two clauses later.

### The short form

> **A private CBT self-help app.**

☠️☠️ **The short form is a 30-character object, and until [#1819](https://github.com/Selftend/selftend/issues/1819) nobody had written that down.** `test/store-info-invariants.test.ts` caps the App Store `subtitle` at **30** and the cap is `verify`-gated. The retired short form _"A free, private CBT programme."_ was **exactly 30** — built to the cap without saying so. The obvious replacement _"A free, private CBT self-help app."_ is **34** and cannot exist.

So a word had to go, and the cap chose it rather than taste:

| Candidate                          | Chars  |                          |
| ---------------------------------- | ------ | ------------------------ |
| A free, private CBT self-help app. | 34     | ✗ over the cap           |
| **A private CBT self-help app.**   | **28** | ✅ **adopted**           |
| A free CBT self-help app.          | 25     | drops the differentiator |
| A CBT self-help app.               | 20     | drops both adjectives    |

**`free` drops; `private` stays.** Free is the floor on this shelf rather than a signal, and `private` is the one attribute the style competes on. Free is not demoted out of positioning — it keeps its place in the frame sentence and its own supporting line. ⚠️ **The concrete cost:** `public/index.html`'s `og:title` reads _"Selftend - a free, private CBT programme"_, so this drops **free** from the social card too. **That is the price of refusing a third shape.**

☠️ **"Where length is capped" is true in three places, not one, which means it will be cited everywhere — so the inventory is written out rather than summarised.** [#1819](https://github.com/Selftend/selftend/issues/1819) named only the App Store `subtitle`. [#1940](https://github.com/Selftend/selftend/issues/1940) found two more while [#1823](https://github.com/Selftend/selftend/issues/1823) was pricing the store surfaces, and one of them is in this document's own governed mirror.

| Field                  | Cap | Used today | Source                                                                          |
| ---------------------- | --- | ---------- | ------------------------------------------------------------------------------- |
| App Store `subtitle`   | 30  | 28         | `test/store-info-invariants.test.ts:39`                                         |
| App Store `promoText`  | 170 | 168        | `test/store-info-invariants.test.ts:40` — the same `CAPS` object, the next line |
| Play short description | 80  | 62         | `store/play-listing.md`, _"Short description (62 of 80 characters)"_            |

**The rule holds at all three.** The frame sentence is **164** characters, so it does not fit Play's 80 at all and would leave six characters of `promoText` — which is why the escape clause below is the answer at each of them rather than a new shape:

- **`subtitle` (30)** — the cap that chose the short form's words, above.
- **Play short description (80)** — ✅ **decided: it takes the short form** ([#1823](https://github.com/Selftend/selftend/issues/1823), owner decision). ⚠️ The **62** in the table is the string this replaces, not the decision — like every surface here, it is written and not yet applied. **The cost is stated rather than hidden:** it leaves **52 of 80** characters unused on Play's most-read line, and drops both `free` and the `cognitive behavioural therapy` gloss from it. The gloss loss is not new — the short form is unglossed **by construction**, and #1819 accepted exactly that for the `subtitle`; the gloss lands one paragraph later, in ¶1 of the same listing.
- **`promoText` (170)** — a promotional paragraph rather than a line that states the category, so no shape is owed there; #1823 fills it with body copy at **162**. ⚠️ Recorded so a later reader does not treat the cap as an instruction to squeeze a shape into it.

**Anywhere without a cap, the answer is the frame sentence.** ⚠️ **This corrects an inventory, not a rule.** Naming two more capped fields is the escape clause working as written; it sanctions nothing new, and the count of shapes below is unchanged.

The precedent is recorded because the same shortcut will be re-derived otherwise. [#1628](https://github.com/Selftend/selftend/issues/1628) left `auth:landing.subtitle` reading the frame sentence with the spell-out surgically removed, and justified it under this clause. [#1627](https://github.com/Selftend/selftend/issues/1627) overruled it on three counts:

1. **There was no cap.** `AuthLandingBlock` renders the subtitle in a plain wrapping `<Text>` with no `numberOfLines`, no truncation and no width constraint. Nothing was capped; the clause did not apply.
2. **It was not the short form anyway.** The sanctioned short form is the words above, full stop. That string kept the 62-character tail and dropped the 31-character gloss — a string with room for the tail has room for the gloss.
3. **It is a genuine first use.** § _Words to use_ says spelled out **on first use**, and the auth landing is a different screen from the web hero.

**There are exactly two sanctioned shapes. Nothing above invites a third.** If length is ever genuinely capped somewhere new, the answer is the short form, not a fourth thing.

### Which surfaces carry it

> **A surface carries the frame sentence only if a person can meet it before crossing into the product.** Past that threshold, copy's job is orientation, so naming the category becomes **optional** — never forbidden, and never a licence to loosen any other rule here.

Decided on [map #1755](https://github.com/Selftend/selftend/issues/1755) ([#1757](https://github.com/Selftend/selftend/issues/1757), [#1759](https://github.com/Selftend/selftend/issues/1759)) and **carried forward verbatim** — nothing on the repositioning map touched the threshold concept. It changed _what the sentence says_, never _which surfaces owe one_. The trigger was the first-run wizard: panel 1 declared the category, and panel 3 two panels later offered _"Leave both unselected if you only want individual tools"_, so one of three onboarding paths never delivered what the welcome had promised.

☠️ **This is a permission, not an obligation, and that distinction is the whole of it.** Nothing here ever obliged a surface to declare the category — line 3 self-scopes to "every surface _that says what Selftend is_", and every rule in § _Words never to use_ is a **ban**. So being bound by the frame governs **how** a surface names the category, never **whether** it must. A surface that says nothing about what Selftend is was never in scope, so it could never have been in violation. The wizard was not in contradiction with this document — panel 1 had **opted into a sentence it never needed**.

**The threshold is the deliberate act of entry, and the rule is keyed on the surface, never on the reader.** ☠️ "Reachable without an account" was tried first and **falsified by the guest flow**: `startNow` promises "no account needed" and guests see the wizard, so account state does not mark the boundary.

**Pre-threshold — where the frame sentence belongs:** the landing page and the app-shell auth landing, `public/index.html`, `public/manifest.webmanifest`, both store listings, `README.md`, `CONTEXT.md`, directory entries. ✅ **Public policy pages are pre-threshold by surface identity**, not by where the reader happens to be standing — the frame there is definitional and legal rather than promotional.

**Post-threshold — free not to declare:** the onboarding wizard, the Modules screen, module homes, and every in-app orientation surface.

☠️☠️ **One genuine addition that reads like a conflict and is not.** § _The hard rule_'s **clause 1** — _no surface presents the tools without the method somewhere on it_ — **is an obligation, and it reaches post-threshold surfaces too.** So the new frame adds a duty in exactly the place this rule deliberately left free. They do not collide: **this rule governs the frame sentence; clause 1 governs the method's presence in any form.** A post-threshold screen still owes no category declaration — it owes only that the tools do not appear as a bare inventory with nothing behind them.

✅ **The Modules screen is compliant exactly as it stands.** It presents CBT as one option among the tools and names no category, and that is correct rather than a gap. Said plainly because the failure mode is predictable: a later session reads a frameless post-threshold screen as an omission and fills it in.

⚠️ **Safety copy and `settings:legal.productBoundaryDescription` are exempt as a class**, on either side of the threshold. They name the category _instrumentally_ — to bound what the product is not — and a bound needs its subject. This is why the live Play listing names a category twice, four paragraphs apart: ¶1 is the frame sentence, and the closing _"Important: Selftend is a wellness and self-help tool"_ is safety copy doing a different job. Not a defect, and not to be "reconciled". ⚠️ The same licence covers _"no account needed"_ appearing twice — as a friction claim in theme 1 and as the compound's fourth verification leg in theme 3. **One fact, two jobs.**

**No gate reaches this rule, and none should be built.** It is a permission, so there is nothing to violate — `test/positioning-copy.test.ts` bans phrases and has never asserted one, and a rule that forbids nothing gives a ban-shaped gate nothing to do. What a gate _could_ pin is the other half, that the pre-threshold surfaces still **do** carry the frame; that is a free-standing call rather than a consequence of this rule, and it was weighed and declined ([#1759](https://github.com/Selftend/selftend/issues/1759)). It is brittle in the way a ban is not, re-failing on every legitimate rewording, and this document twice records that a guard which fails on good copy gets deleted rather than fixed. ⚠️ **So the honest statement is that nothing mechanically stops a later session hollowing the frame out of the web hero.** This paragraph is the enforcement.

⚠️ **Every pre-threshold surface is presently off-frame, and that is now the expected state rather than a defect list.** The frame sentence above ships nowhere yet; applying it is [#1823](https://github.com/Selftend/selftend/issues/1823)'s. Two problems predate the reposition and are **not** to be inherited as a baseline: the App Store `subtitle` reads "Calm, guided self-help tools" — the one phrasing § _Words never to use_ calls unsafe, and it fits the 28-character short form exactly — and `public/manifest.webmanifest` carries "A free, private CBT programme with calm everyday tools.", a **third shape** that was never sanctioned. ☠️ **No merge gate scans `store/` for phrasing, and the weekly alarm that reads it cannot notice this.** `store/` appears in none of `test/positioning-copy.test.ts`'s corpora; `test/store-info-invariants.test.ts` checks field provenance and cap tightness only; and the drift job compares the **committed** file against the live listing, so it can only catch the remote drifting away from `store/` — never that the committed value is itself off-frame. A guard that agrees with a wrong file reports "matches" forever. That is how a banned phrase reached a live listing and stayed. Tracked at [#1760](https://github.com/Selftend/selftend/issues/1760) and [#1789](https://github.com/Selftend/selftend/issues/1789).

### Approved supporting lines

Five, in the order a person meets them, with each theme's **role** named so the position number is never read as "what gets said first" again.

- **1. The tools — LEAD:** "Eight everyday tools that ask nothing of you — not even an account. Open one, use it, and you're done."
  ☠️ **Rewritten, not reordered.** The old line began _"And on a day you cannot face the programme…"_ — it existed to keep the tools subordinate, so promoting it unchanged would have promoted the subordination with it. _"Open one, use it, and you're done"_ states [product-principles.md](product-principles.md) §12's own bar — **fulfilling, and done** — rather than inviting a return. ✅ A **count** is not an enumeration: the line says how many, the page shows which.
- **2. The programme — FRAME CARRIER:** "Work through something, don't just track how you feel."
  ✅ Survives verbatim. The only line that needed nothing.
- **3. Honesty — PRIMARY DIFFERENTIATED VALUE:** "Anything you write for an audience stops being useful to you. Yours is encrypted at rest, the key is held outside the database, the source is public, and no AI is reading it."
  Generalised past the thought record. Still instrumental, never moral — _"stops being useful to you"_, not _"you should be honest"_. The encryption clause stays inside the § _Words never to use_ ceiling.
- **4. No gatekeeper — supporting:** "You run it yourself — nothing to be assigned, nobody to wait for."
  ⚠️ **The line most likely to strain the _not a therapist replacement_ guardrail**, flagged rather than hidden. It describes what Selftend **is**, not what it substitutes for. If a future reviewer disagrees, the sanctioned tamer form is **"You run it yourself — nothing here is assigned to you."** Do not invent a third.
- **5. What's the catch — supporting:** "Free because it is a non-profit, not because it is a trial. Your data exports whenever you want, and the source is public."
  Merges the retired price and durability lines, because the two jobs collapsed into one. ☠️ Its provable core is **export plus public source, never longevity** — _"we'll still be here"_ stays banned.

### Words to use

**CBT self-help app** · **cognitive behavioural therapy** (spelled out on first use, then CBT) · **programme** (the module, never the category) · **private** · **encrypted at rest** · **non-profit** · **free** · **no account needed**.

**British spelling, and it is not a preference.** _behavioural_, not _behavioral_ — in the frame term, in "behavioural activation", and in the DBT sibling beside them. **Guarded by `verify`** ([#1627](https://github.com/Selftend/selftend/issues/1627)). The one legitimate American use is the privacy sense — "behavioral profiling tools" — which is a different word and stays.

**The plain noun follows the adjective: _behaviour_, never _behavior_.** **Guarded by `verify`** ([#1638](https://github.com/Selftend/selftend/issues/1638)). The clause above bought consistency in the three places the frame is _named_ and left the ordinary noun beneath it split thirteen ways against nine — including inside a single Think · Act · Be card, whose kicker read "Behavioural" directly above a description that read "Schedule meaningful behavior". Unlike the adjective, this rule carries no carve-out and needs none: no word boundary falls between the _r_ of _behavior_ and the _al_ of _behavioral_, so the privacy sense is outside the ban by construction.

**And the house style is the whole style, not one word.** _favourite_, _colour_, _organise_, _practising_, _recognise_, _fulfil_, _fuelled_ — **guarded by `verify`** ([#1639](https://github.com/Selftend/selftend/issues/1639)) — plus **_programme_** and **_judgement_** ([#1651](https://github.com/Selftend/selftend/issues/1651)), on translated strings only. Two boundaries are deliberate and permanent. **Identical-in-both words are not "American" and are never respelled**: _practice_ the noun, _humorous_, _judgment_ in its legal sense. **Identifiers are not copy**: the `/tools/gratitude-log/favorites` route, the `favorites_one` / `favorites_other` plural keys, and every column name keep their spelling, exactly as `behavioral-activation` did — a respelling that breaks a bookmark or a plural form has cost a user something to fix a word no user reads.

### Words never to use

| Never                                                           | Why                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **guided self-help**                                            | Clinically means _with a practitioner_. Selftend has none. **Guarded by `verify`**, and see the note below — this is now the livest row on the table.                                                                                                    |
| **a management verb over a health or condition object**         | _manage / treat / cure / fix / improve / work on_ **your** _mental health / wellbeing / anxiety / depression / panic / trauma / OCD / burnout / symptoms / condition_. Implies a clinical outcome the product does not deliver. **Guarded by `verify`.** |
| **end-to-end**, **zero-knowledge**, **even we can't read them** | False. The design is provider-recoverable. **Guarded by `verify`.**                                                                                                                                                                                      |
| **AI therapist / AI counsellor / AI coach**, affirmatively      | Guardrail. The _negation_ is legitimate and stays. **Guarded by `verify`.**                                                                                                                                                                              |
| **no streaks**, **no streak pressure**, **streak-free**         | The build guardrail stays; its absence is never a pitch (owner decision, 2026-07-24). **Guarded by `verify`.**                                                                                                                                           |
| **AI-powered**                                                  | AI is a rationale here, never a claim. **Guarded by `verify`.**                                                                                                                                                                                          |

Allowed adjacent phrasing: "no pressure", "no shame", "no ads, no subscriptions".

☠️☠️ **_guided self-help_ is now the livest row here, and the category noun is why** ([#1872](https://github.com/Selftend/selftend/issues/1872)). The noun owns **half the banned compound**, and the other half is live product vocabulary — `guided` appears in 29 English strings ("Guided programmes", "A guided programme", both breathing voices), so it cannot be retired. **The gap that opened is one word wide, and the word is the frame's own `CBT`:** _"A guided CBT self-help app"_ walked straight through an adjacency-only pattern, in both languages, while the live App Store subtitle was caught. The three patterns now allow **one intervening word** — `{0,1}` and deliberately not `{0,2}`, which fails on _"Guided meditation and self-help tools"_ in both languages, and **Selftend ships guided meditation**. ⚠️ The probes are the **intervening** form, so a later narrowing back to adjacency fails loudly instead of going green; the adjacent form is pinned separately beside it.

☠️ **A ban row leaves this table when its _reason_ dies, never when its _violations_ run out.** Four of the six rows have zero live violations today and every one stays. The gate was **seeded** with exactly the zero-violation rules ([#1606](https://github.com/Selftend/selftend/issues/1606)) — the claims a person writing marketing copy in good faith reaches for first. An inert ban costs one regex; a deleted ban costs the next person's good-faith mistake. ⚠️ This is the **opposite** object from a suppression list, which is a permission to violate and must expire.

☠️ **The management-verb row's shape was cut down from what [#1815](https://github.com/Selftend/selftend/issues/1815) proposed, and the reason is on the record.** That ruling also asked for bare `treat` / `treatment` / `symptoms` / `recovery`. Swept before writing: **`treatment` appears in six live strings and five of them are safety copy** saying what Selftend is _not_ — including [product-principles.md](product-principles.md)'s own _"claim treatment outcomes"_ prohibition — **`recovery` appears in thirteen**, naming the shipped `Recovery plan` a relapse-prevention plan is properly called, and `treat` catches `AGENTS.md`'s own _"Treat this as a wellness and self-help product"_. Banning them would turn the guard red on the guardrail document and on the disclaimers, and the only "fix" available would be to weaken safety copy. #1815's own ruling says why this is right: **a condition named as _content_ is the material describing itself, not the product claiming scope.** The bare words stay legal.

⚠️ **The half a regex cannot hold, and it is written here rather than pretended away:** _no management verb takes a health or condition noun_ — as a **rule**, beyond the closed list of objects above. **`self-manage` itself is not banned** and must stay usable: it is the one word that says _no practitioner_ without saying _no help_. A non-management verb over the same objects is permitted — _look after_, _take care of_, _tend_. Enforcement for the general rule is row 4 of the table below: **human habit, nothing stronger is available.**

---

## What binds this document

Four gates, split by what each can physically reach. **Nothing reaches the last row, and saying so is the point** — that is where the sharpest contradictions were found.

| Surface                                                                                                                                                                                                                                                                             | Gate                                                                                                                 | Strength                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| i18n strings (both locales), `public/manifest.webmanifest`, `public/index.html`, `README.md`, `CONTEXT.md`, `docs/product-principles.md` — plus `AGENTS.md` and the whole `docs/` prose tree for the _guided self-help_ rule alone, and i18n values alone for the house-style rules | `test/positioning-copy.test.ts`                                                                                      | **Merge gate.** Runs in `verify` on every PR.                                       |
| App Store `subtitle`, `promoText`                                                                                                                                                                                                                                                   | [`store/apple-info.json`](../store/apple-info.json), compared weekly by `.github/workflows/store-metadata-drift.yml` | Weekly alarm. Not a merge gate — it reads a remote a human may legitimately change. |
| Play listing text                                                                                                                                                                                                                                                                   | [`store/play-listing.md`](../store/play-listing.md), carrying a `last verified` date                                 | Diff and review only. No remote verification exists.                                |
| AlternativeTo, GitHub repo `description`/`homepage`/`topics`, the Reddit banner and sidebar, eight published video narrations — **and the general management-verb rule above**                                                                                                      | This list, plus one line in `.github/pull_request_template.md`                                                       | **Human habit. Nothing stronger is available.**                                     |

☠️ **The merge gate was seeded deliberately short, and "guided self-help" was its first growth ring.** That rule could not ship alongside the guard: the phrase was in 22 i18n strings plus the manifest and three prose docs, so it would have failed on arrival, and a 22-entry suppression list was rejected because a list that size silently becomes permanent. [#1616](https://github.com/Selftend/selftend/issues/1616) therefore fixed the copy and added the rule **in the same change**, with no exemptions — the only order that leaves the guard meaning what it says. What was seeded originally are the rules with zero live violations — the highest-consequence ones, the claims a person writing marketing copy in good faith reaches for first.

✅ **The frame-spelling invariant ([#1627](https://github.com/Selftend/selftend/issues/1627)) is the second growth ring, and the last one this document promised** — a claim [#1638](https://github.com/Selftend/selftend/issues/1638) falsified the following day; see the third ring below. The product spelled its own defining word two ways — ten British against five American in shipped English copy, four of those five being this sense and the fifth the privacy one below. Both spellings shipped inside `cbt.json`, and "Behavioural activation" and "Behavioral activation" were reachable in one session. British wins because § _Words to use_ says so. The four American strings were respelled and the rule landed in the same change, on the same bargain as the first: fix the copy, or do not add the rule.

☠️ **It is keyed on the CBT-sense compound, never on bare `behavioral`, and that is not fussiness.** The word has a second legitimate sense here — `policies.json` privacy §3 promises no "behavioral profiling tools", and the same sense recurs as _nudges_ in `AGENTS.md`, _profiling_ and _analytics_ in `docs/analytics.md` and the operations runbook. A bare ban fails correct, consent-bearing copy on sight, which is the over-sweep failure that gets a guard deleted rather than fixed. A test beside the rule pins the privacy string so a later "simplification" names what it broke.

⚠️ **Two American spellings survive on purpose, and both are invisible.** `mood.json`'s key is `behavioralActivation` above a British value, and `behavioral-activation` is a **persisted database value** in `mood_logs.linked_strategy` — renaming it orphans rows users have already saved. The guard reads values and never keys, so it cannot see either.

⚠️ **DBT came along, and it is a rider rather than a positioning claim.** Nothing here mandates how _dialectical behaviour therapy_ is spelled. It was respelled and guarded because the two render side by side — the sidebar puts the CBT module's spelled-out name two lines above the DBT label, and the Modules screen lists all three names in one column. Fixing the frame word while leaving its neighbour American moves the carelessness one row down instead of removing it.

✅ **The plain-noun invariant ([#1638](https://github.com/Selftend/selftend/issues/1638)) is the third growth ring, and the lesson in it is that "the last rule" is a prediction, not a decision.** #1627 settled the adjective and closed believing the word was done. Counted on `dev` the next day — values only, keys excluded — the ordinary noun beneath it was split **thirteen American strings (fourteen occurrences) against nine British**, wider than the adjective had ever been, across four namespaces. ☠️ One pair rendered **on the same card**: `cbt.json` `pillars.act.sub` is the kicker "Behavioural" and `pillars.act.description` directly under it read "Schedule meaningful behavior", both drawn by `PillarCard`. The thirteen were respelled and the rule landed in the same change, on the bargain the other two rings inherited.

☠️ **This ring is keyed on the bare noun — the opposite call from the ring above, and the reason is worth keeping.** The adjective needed a compound to discriminate, because a bare `behavioral` ban fails consent-bearing privacy copy. The noun needs nothing: `\bbehaviors?\b` cannot match `behavioral`, since no word boundary falls between the `r` and the `al`. So "behavioral profiling tools", the `behavioralActivation` key and the persisted `behavioral-activation` slug are all excluded **by construction**, with no lookahead and no exemption. A test pins that property directly, because it is the kind of claim that stays obviously true until a later edit quietly loosens the pattern.

⚠️ **Two judgement calls, decided rather than swept.** (1) Seven of the thirteen were `habits.json`, where _behavior_ is the vocabulary of the Atomic Habits material the module draws on. **Source fidelity was declined**: the file holds no other British spelling to preserve a register with, nothing in it is a quotation — the strings are Selftend's own paraphrases — and one of them, "I will [behaviour] at [time] in [location]", is repeated verbatim inside a second string that had to agree with it either way. (2) `policies.json` faq §12 gives bug-report instructions and said "expected and actual behavior" — the **software** sense, the one string with a real claim to stay American. **Respelled anyway**: unlike "behavioral profiling" it is not a term of art, nothing is lost by spelling it British, and it shares a file with two consent-bearing sections that already say _cognitive behavioural_. ✅ `faq` is outside the four sections the consent digest hashes, so the digest did not move and no user was re-gated.

⚠️ **`CONTEXT.md` was split against itself, and the ticket had not seen it.** The **Anchor** entry defined a habit cue as "The everyday behavior…" while **Routine vs. Habit**, eighty-nine lines down, called a habit "a behaviour the user marks done themselves". Two glossary entries about the same feature pair, disagreeing — inside the merge gate's own scan. Fixed there; it is why the rule can be scoped `all`.

⚠️ **The American noun stays correct, and common, in the software sense** — `AGENTS.md`, `.github/CONTRIBUTING.md`, `docs/analytics.md`, `docs/deployment.md`, the vendored `CODE_OF_CONDUCT.md`. None of those surfaces are in the merge gate and none should be. ☠️ Widening the gate's surface list to `docs/` or `.github/` turns this rule red first; the answer would be to narrow the surface, never to weaken the rule.

✅ **The house-style invariant ([#1639](https://github.com/Selftend/selftend/issues/1639)) is the fourth growth ring, and it is the one that stops the rule being about a single word.** Two rings had now settled _behavioural_ and _behaviour_ by appealing to a house style enforced for exactly that word. Recounted for that change — i18n values only, keys excluded — **28 strings across nine namespaces** still spelled a different word American: fourteen _favourite_ (thirteen in `gratitude.json` alone), four _colour_, three _organise_, three _practising_, two _recognise_, one _fulfil_, one _fuelled_. ☠️ _colour_ was split exactly the way _behaviour_ had been: `meditation.json` said "Notice its **colour**" while two colour-picker labels in two modules, `habits.json` and `cbt.json`, both rendered **"Color"**. The 28 were respelled and the rules landed in the same change, on the bargain all three earlier rings inherited.

☠️ **This ring is scoped to translated strings alone, and that narrowing is the whole reason it can exist.** The other three run over the manifest, the HTML shell and three prose docs. A `colour` rule cannot: `theme_color` and `background_color` in `manifest.webmanifest`, and `prefers-color-scheme`, `theme-color` and `backgroundColor` in `index.html`, are five correct tokens it would fail on the day it landed. Prose docs are excluded for a second reason — they are contributor-facing technical writing where `color`, `program` and `license` are identifiers. ☠️ The cost of getting this wrong was demonstrated during the change itself: an unbounded `color` pattern rewrote the US state **Colorado** to "Colourado" inside privacy §9, a consent-bearing section. Every pattern is now bounded on both sides and a test pins Colorado, _fulfilled_, _practice_ and _humorous_ as literals.

⚠️ **One consent-bearing sentence moved, and the version deliberately did not.** Privacy §6 now reads "recognised data transfer frameworks". The ticket flagged this as the one place American might be correct, being adjacent to GDPR/SCC terms of art — it is not: the terms of art are "Standard Contractual Clauses (SCCs)" and "European Commission", both untouched, and the surrounding prose is ours, addressed to EEA, UK and Swiss readers whose own institutional English style is British. Nothing disclosed changed, so `englishDigest` moved alone with the reason recorded at the pin, and `policyVersion` did not — the third digest-only move, on the rule the first two set.

✅ **The surface list grew instead of the exemption list ([#1644](https://github.com/Selftend/selftend/issues/1644)), and the distinction is the whole decision.** #1616 removed _guided self-help_ from everything the gate could reach and left about 35 occurrences outside it. Seven were ordinary prose — `AGENTS.md` and six docs — and were fixed there. The question was whether the gate should grow to cover `docs/`, which #1638 had warned against because a wider surface turns the _behaviour_ rule red on the software sense in `docs/analytics.md` first.

**Answer: widen the surface for this one rule, never for all of them.** _guided self-help_ is the only banned phrasing with no legitimate sense anywhere in the repo — unlike `behavioral`, which is correct in the privacy sense, or `color`, which is a CSS token. So it alone can safely reach contributor-facing prose, and it does.

☠️ **What is excluded is a category, not a tolerance list, and the difference is why this is safe.** Thirteen files still contain the phrase legitimately: this document, the reply already sent to Apple, the script of a recording already made, the closed-testing doc reproducing the live Play listing verbatim, eight published video narrations, and a published Reddit banner. Every one is a **record of something already published** — its job is to match the artefact it records, not the current positioning, and editing it does not change the artefact, it only makes the record lie about it. A test asserts both halves: that the walk finds the prose, and that two of the excluded records still contain the phrase, so the exclusion stays load-bearing rather than becoming a leftover.

⚠️ **#1644's own category list was one file short.** It routed `store/play-listing.md` to owner action and did not notice that `docs/android-closed-testing.md` reproduces the same short and full descriptions verbatim. Fixing one without the other silently desynchronises them; both are now named in the exclusion list with that reason.

✅ **The category-word invariant ([#1651](https://github.com/Selftend/selftend/issues/1651)) is the fifth growth ring, and it is the one that reached the word this document used to open with.** § _Words to use_ then began with **Programme** and the canvas named the category "a CBT programme" — and shipped copy spelled it `program` **31 times against `programme` 19**, a wider split than _behaviour_ ever had, on a more important word. ☠️ Both spellings lived inside `navigation.json`: `headerButton.program` and `home.widgets.cbtProgramme.title` can render on one screen. `judgment` was split 4 against 2 with `cbt.json` carrying both, and the pair rendered in near-identical sentences two surfaces apart — `meditation.json` body-scan said "without judgement" while `act.json` observing-self said "without judgment". All 35 were respelled and two rules landed in the same change. ⚠️ **The word is no longer the category, and the rule is untouched by that**: _programme_ is still the module's noun and still British.

✅ **All 31 `program` strings turned out to be the course, not the software** — checked one at a time rather than assumed, which is why the rule is a bare ban with no compound discriminator. Had even one been the software sense it would have needed `FRAME_SPELLING`'s shape instead. ⚠️ `program` remains a **key namespace** in `act.json` and `cbt.json`, and `navigation.json` has a key literally named `program`; the guard reads values and never keys, so they are outside it by construction.

☠️ **`licence` was decided and deliberately NOT swept, which is the more interesting half.** British splits the noun (_licence_) from the verb (_license_); three of the four occurrences are the participle "licensed", **already correct British**. The two nouns both refer to the AGPL — an instrument titled "GNU Affero General Public **License**", matching the repo's own `LICENSE` file — and respelling a noun that names a document makes it disagree with the document it names. So there is no `licence` rule and no change, and the four strings are pinned as literals in the test so a later completeness sweep meets the decision instead of rediscovering it as an oversight. ✅ Nothing there touched a consent-bearing section, so the digest did not move.

✅ **The reposition is the sixth growth ring, and it is the first one that is not about spelling** ([#1872](https://github.com/Selftend/selftend/issues/1872), [#1815](https://github.com/Selftend/selftend/issues/1815)). Two changes, both landing green on arrival — the #1606 seeding condition rather than the #1616 fix-the-copy bargain, because there was no copy to fix. The three _guided self-help_ patterns were widened to allow one intervening word, because the new category noun opened a one-word gap in them; a corpus sweep across both locales, the manifest, the HTML shell, `README.md`, `CONTEXT.md`, `AGENTS.md`, `docs/product-principles.md` and the whole `docs/` tree produced **zero new offenders** (en 31 → 31, bg 2 → 2). And the management-verb ban was added at half the width #1815 asked for, for the reason recorded above § _Words never to use_.

⚠️ **The closing claim below has now been wrong five times, and it is left standing as a warning rather than repaired into a sixth prediction.** #1627 called itself "the last one this document promised" and #1638 falsified it the next day; #1638 wrote the sentence beneath this one, #1639 falsified that, #1651 falsified it again, and the reposition falsified it a fourth time from a direction none of them anticipated — **not by counting, but by changing the words the rules are about.** So: the gate grows a ring whenever someone counts, and also whenever the positioning moves. The honest statement is that no one has yet counted and found nothing.

**With this, every rule the four-gate table can physically reach is in place.** What remains unreachable is unchanged, and the hard rule on the tools above is still prose for the reason stated there.

`CONTEXT.md` takes the **vocabulary** and only the vocabulary — what "CBT self-help app" means, why _programme_ is now the module's noun, and why the retired compound is banned. The position itself stays here.

☠️ **That entry cannot spell the banned compound out, because `CONTEXT.md` is inside the merge gate's scan.** The entry names the ban by pointing back here rather than by quoting it. This document is the only surface excluded from the scan, which is why the banned words themselves live in the table above and nowhere else in the repo's guarded set.

## The re-check

**2027-02-28.** Owner: the repo owner — there is nobody else, and saying so is more useful than leaving it implied.

**Two clocks, deliberately kept apart:**

- **2027-02-28 — the frame.** Is "a CBT self-help app" still the right category?
- **2027-08-31 — the warrant to continue.** 30 W4-retained users; does the project go on?

☠️ **Conflating them would turn a positioning review into a survival referendum, or the reverse** — and the reposition made both directions of that mistake easier, because the words now have real search vocabulary. Missing the number is not evidence the category is wrong; hitting it is not evidence the category is right, and is never reach.

**Named triggers**, recorded so a re-check is not mistaken for a rediscovery:

- **#1605 returns a segment.** That fills the empty canvas field, which is a positioning change by definition. Earliest 2027-08-31.
- **Donations cover a full year of running costs** → durability reopens as a claim. The path itself was wired by ruling on 2026-09-02 ([#1625](https://github.com/Selftend/selftend/issues/1625)) and did not reopen it.
- ⚠️ **The AI trend's reopening condition is unmeasurable** and needs a new instrument before it can fire at all. See § _No trend is layered_.
- **The meditation row strains**, by a narrated session library shipping or by the unguided framing failing on a real surface. It is the weakest-authority row here and the first to reopen.
- **2026-09-30, Youper's shutdown passes.** Already decided not to act on; the trigger is "note that it expired", not "revisit". ⚠️ As of 2026-09-04 that date is still in the future, and any sentence writing it in the past tense is wrong.

⚠️ **A re-check restarts at Dunford's Step 4 (competitive alternatives), not Step 1.** A landscape shift changes who you are compared against; it does not oblige you to re-derive the product from nothing. ✅ The reposition is the worked example: [#1859](https://github.com/Selftend/selftend/issues/1859) re-ran Step 4 against the new shelf, found the **order unchanged** and the membership swapped, and that alone repaired two canvas rows without touching the frame.
