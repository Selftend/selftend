# The subtraction attack on the k=5 floor: what the field calls it, and what its standard answers cost here

Date: 2026-09-16 · Map: [#2523](https://github.com/Selftend/selftend/issues/2523) · Ticket:
[#2526](https://github.com/Selftend/selftend/issues/2526) · Unblocks:
[#2388](https://github.com/Selftend/selftend/issues/2388), and through it
[#2389](https://github.com/Selftend/selftend/issues/2389)

**Findings, not a recommendation.** Nothing below picks an option. The choice belongs to #2388.

**No production figures appear here, deliberately.** `Selftend/selftend` is public. Every claim is
written so its logic stands without numbers; where arithmetic appears it is done over the range the
rule already publishes about itself (`<5` means 1..4, which is in the repo), never over a measured
cell.

Sources were fetched and read on **2026-09-16**; the full list with URLs is at the end. Quotations
are exact. Three SQL shapes were prototyped against a local PostgreSQL 17 instance on synthetic
values only.

---

## Headline

Six findings, in the order they change what #2388 can say.

1. **The attack does not have the name the ticket assumes.** In the primary sources there is no
   "differencing attack" and no "disclosure by subtraction". The within-table case — recover a
   suppressed cell from the printed marginal and its printed siblings — is not treated as a named
   attack at all. It is stated as **the reason complementary suppression exists**, in the form
   _"derived by subtraction from published marginal totals"_. **"Disclosure by differencing" is a
   different and narrower thing**: subtracting two overlapping _published tables_ to synthesise an
   unpublished one. Calling the §3 arithmetic "differencing" would read as a category error to
   anyone who knows the field — and would spend the term the project actually needs for the case
   where it _does_ apply (finding 6).
2. **The k=5 block is a _threshold rule_ applying _primary suppression_, and the standard remedy for
   exactly its failure mode is _complementary suppression_ (US) / _secondary suppression_ (UK-EU) /
   _consequential suppression_ (ABS).** #2388's gap is real: this is the first answer in every
   handbook, and the 1-D case with a published total is the field's own opening worked example.
3. **The field's verdict on the constraint #2388 treats as a concession is that it is orthodox.**
   The handbooks say _"suppression of marginal cells should be avoided as far as possible"_ and that
   the whole purpose of secondary protection is to let the margins survive. Refusing to blind §1 is
   the field's own default. The price is stated just as plainly by FCSM: _"Complementary
   suppressions may not be needed if marginal totals are not published."_ Publishing the total **is**
   what creates the debt, and there is no third position.
4. **The constraint that an empty arm stay distinguishable from a withheld one is the one the field
   most directly contradicts.** ONS's output-checking guidance names the exact design the shared
   block ships: _"suppressing counts of 1-9 with '<10' but **zeros with '-' would not be
   acceptable**"_ — because the pair of markers tells the reader which cells are small. The project's
   reason for printing `0` is real and the field agrees a _structural_ zero discloses nothing; but
   the marker scheme is not a free choice, and #2388 should know it is defending a position the
   field rejects rather than one it never considered.
5. **`<5` caps this floor's protection at four values, permanently, and sometimes at one.** The glyph
   is not opaque — it publishes a two-sided bound. So "two or more suppressed arms means only their
   sum is recoverable" is not right: with the sum recoverable from the marginal and every suppressed
   cell bounded to `1..4`, the feasibility interval is at most four values wide and collapses to a
   single value whenever that sum sits at either end of its range. The ceiling is a property of the
   marker, not of the number of suppressed cells.
6. **There is a second exposure the map has not named, and the field has a word for it.** The monthly
   digest republishes the same tables over a growing population from 2026-10-01. _"Residual
   disclosure: disclosure that occurs by combining released information with previously released or
   publicly available information."_ Nothing makes a suppression decision consistent between one
   issue and the next, and the field's standing instruction for repeated tables is that it must be.

---

## 1 · The shape of the instrument, in the field's terms

The literature's advice is indexed by table shape, and this instrument sits in the simplest,
best-understood corner of it.

Each qualifying section is a **one-dimensional frequency table with a published marginal**:

- `analytics-segment.sql` §3 and §4 each hold, per account type, three count columns (`users`,
  `w4_mature`, `w4_retained`). For a fixed account type and a fixed column the arms **partition**
  that population — `user_locale` and `user_modules` are each a `case` over `accounts`, so every
  account lands in exactly one arm — and §1 prints the same three totals **raw** for that account
  type. That is six one-dimensional tables per section, each with its own published marginal.
- `analytics-onboarding.sql` §4 is one one-dimensional table of four arms partitioning the whole
  population, beside §0's raw population split.

So the mechanism #2388 describes is not a quirk of a cross-tab. It is the textbook configuration —
an exhaustively published partition whose marginal is published unprotected, protected by primary
suppression alone — and it is the Handbook's **Example 1a**, the first worked example in its chapter
on tabular protection.

Three structural details bear on every option below.

- **The three count columns are nested**, not independent: within an arm
  `w4_retained ⊆ w4_mature ⊆ users`. Anything learned about one column constrains the other two on
  the same row before any subtraction is attempted. In field terms these are **linked tables**, where
  suppression is at its hardest — the Handbook lists _"Difficult to maintain consistency across a
  number of tables"_ among cell suppression's disadvantages, and GSS: _"A cell used as a secondary
  suppression in one published table should also be suppressed if it appears in another published
  table."_
- **`analytics-onboarding.sql` §4's first arm is already determined by §0 alone.** The unconverted-guest
  arm is the guest population minus anything in the contradiction arm, and the contradiction arm is
  asserted to be empty. That arm is therefore recoverable from a _different table_, not from
  its own marginal. It is the one place in the three reports where **disclosure by differencing**
  genuinely applies.
- **The ordering is itself a statistic computed from the suppressed values.** `sort_rate` is the raw
  rate, and the section instructs the reader to _read the ordering_. No option below touches it, so
  the payload survives all of them — but it is an unsuppressed function of sensitive cells and
  belongs inside the risk calculus rather than outside it.

---

## 2 · The vocabulary

### 2.1 The attack

| What to call it                                                                                                                               | What the sources say                                                                                                                                                                                                                                                                                                                                                                                                                    | Applies here?                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"derived by subtraction from published marginal totals"** — and nothing shorter                                                             | FCSM: _"Other cells, called complementary suppressions are selected and suppressed so that the sensitive cells cannot be derived by addition or subtraction from published marginal totals."_ FCSM again, as the rule: _"In a row or column with a suppressed sensitive cell, at least one additional cell must be suppressed, or the value in the sensitive cell could be calculated exactly by subtraction from the marginal total."_ | **Yes — §3, §4 and onboarding §4.** The field has no shorter name because it treats the situation as the _definition_ of why secondary suppression exists, not as an attack to be named. |
| **Disclosure by differencing**                                                                                                                | SDC Handbook §5.2: _"Differencing involves an intruder using multiple overlapping tables and subtraction to gather additional information about the differences between them. A disclosure by differencing occurs when this comparison of two or more tables enables a small cell (0, 1, or 2) to be calculated."_                                                                                                                      | **Only onboarding §4 against §0**, and the digest series over time. Not §3/§4 against §1 — that is one table and its own margin.                                                         |
| **Residual disclosure**                                                                                                                       | SDC Handbook glossary: _"Disclosure that occurs by combining released information with previously released or publicly available information."_                                                                                                                                                                                                                                                                                         | **Yes, and unexamined** — see §6.                                                                                                                                                        |
| **Group / class disclosure**                                                                                                                  | GSS: _"If all cells in a row or column are zero apart from one, an attacker would know that all members of the row belong to a particular category for the column variable. This is a form of group disclosure."_ ONS SRS §6.2: _"empty cells … and full cells (i.e., cells whose unweighted counts represent 100% of a group) represent a class disclosure risk."_                                                                     | **Yes**, and it is the named test #2389's degenerate arm needs, plus the unguarded `0.0%` / `100.0%` case in §6.                                                                         |
| ~~differencing attack~~ · ~~table differencing~~ · ~~disclosure by subtraction~~ · ~~unsafe cell recovery~~ · ~~additivity-based disclosure~~ | Zero occurrences across the SDC Handbook, Eurostat 2024, NISRA 2021, FCSM WP22, the τ-ARGUS 4.1 manual and both GSS guidance documents.                                                                                                                                                                                                                                                                                                 | Do not use.                                                                                                                                                                              |

### 2.2 The rule that hides the cell

- **Primary suppression** — SDC Handbook glossary: _"Withholding all disclosive cells from
  publication, which means that their value is not shown in the table, but replaced by a symbol such
  as '×'."_ Note the example marker: **opaque**. That is not an accident; see §5.3.
- **Threshold rule** (FCSM, Handbook glossary) or **minimum frequency rule** (Handbook §4.2.1) —
  FCSM: _"With the threshold rule, a cell in a table of frequencies is defined as sensitive if the
  number of respondents is less than some specified number. Some agencies require at least 5
  respondents in a cell, while others require 3."_ FCSM also supplies notation the legend could
  borrow: **"5+"**, where _"The '+' notation (3+ for example) means at least that many **non-zero**
  observations must be present for the cell to be published."_
- **Not "k-anonymity".** In the Handbook that term belongs to magnitude tables, combined with the
  dominance rule. This is a threshold rule on a frequency table. `docs/analytics.md` does not
  currently claim k-anonymity and should keep not claiming it.
- τ-ARGUS states the limit in one line, close to what #2388 wants written down: _"this is not always
  an adequate way to protect a frequency count table. Yet it is applied a lot."_

### 2.3 The remedy and the machinery around it

- **Complementary suppression** (FCSM Ch. IV §B.2 is titled _"Complementary Suppression"_) /
  **secondary suppression** (GSS, SDC Handbook) / **consequential suppression** (ABS). The Handbook
  uses the first two in one sentence: _"Other cells must be suppressed (so called 'complementary' or
  'secondary' suppressions)…"_
- **The secondary cell suppression problem** — Handbook §4.2.2: _"to find a valid set of secondary
  suppressions with a minimum loss of information connected to it."_ τ-ARGUS: _"In general the
  secondary cell suppression problem turns out to be a hard problem."_
- **Feasibility interval** — Handbook glossary: _"The interval containing possible values for a
  suppressed cell in a table, given the table structure and the values published."_
- **Protection level / protection interval** — Handbook §4.2.2: _"We call the deviation between those
  safety bounds and the true cell value 'upper and lower protection levels'."_ τ-ARGUS: _"When a
  table has been protected properly, the feasibility interval of each primary sensitive cell should
  cover the protection interval."_
- **The attacker problem, and audit** — τ-ARGUS §2.9: an attacker _"will compute [the interval] by
  solving two linear programming programs (called attacker problems)"_. FCSM §B.2.a.iii: _"All audit
  systems produce upper and lower estimates for the value of each suppressed cell based on linear
  combinations of the published cells. A suppression audit can uncover three types of problems for
  tables cells: 1) the upper and lower limits may be the same; 2) the upper and lower limits may be
  too close together; 3) the upper and/or lower limits may be too close to the cell value."_
- **Validity is not "two per line".** Both FCSM and Cox give worked tables that satisfy the
  two-per-line rule and still disclose. Cox's conclusion is blunt and worth quoting into any ruling
  that adopts a hand-written rule: _"CCS should be done based on a verifiable mathematical model and
  **NOT 'by hand'** or by software based, in essence, on 'by hand' reasoning."_

**The most useful import here is the feasibility interval, not the remedy.** The repo currently
describes the floor as working or not working. The field describes it by the **width of the interval
the reader is left with**, which is a quantity — and §5.4 computes it for this instrument, where the
answer is less comfortable than the SQL comment's.

### 2.4 A glossary the amendment can adopt

| The repo says                                               | The field says                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "k=5 cell suppression"                                      | a **threshold rule** enforced by **primary suppression**                                     |
| "recoverable by subtraction"                                | **derived by subtraction from the published marginal total**                                 |
| "an exhaustively printed partition" (the map's own phrase)  | a **one-dimensional table with a published marginal** — correct as stated                    |
| "only their sum is recoverable, which is the floor working" | the **feasibility interval**; say how wide it is rather than how many cells are hidden       |
| "an empty arm is information"                               | **structural zero** (permitted) vs **non-structural zero** (a class-disclosure risk) — §5.3  |
| "a gate you cannot see the distance to is not a gate"       | _"suppression of marginal cells should be avoided as far as possible"_ — the same conclusion |
| the axis-coverage precondition                              | a **table-release rule** / **disclosure rule**, in NISRA's sense                             |

That last row is a free win. NISRA's Flexible Table Builder gates release on rules including _"at
least 40% of the table should be non-zero cells"_ and _"an average of at least one case per cell"_.
`axis_coverage` already belongs to that family; it is not an invention, and #2389's question — how
many arms must hold somebody — is the question NISRA answers with a non-zero-proportion rule and a
minimum-average-cell-count rule.

---

## 3 · The standard mitigation set, priced against the four fixed constraints

The four constraints as given: **(G)** §1's raw gate cannot be blinded; **(B)** the k=5 block is
byte-identical across three files, gated by `test/analytics-shared-sql.test.ts`; **(E)** an empty arm
must stay distinguishable from a withheld one; **(W)** the ordering needs a weight beside it.

The handbooks' own sequencing, verbatim from GSS: _"Table redesign is recommended as the initial
method of disclosure control but should be balanced against user needs and publication plans. If
further disclosure control is required then either controlled rounding (if suitable software is
available) or cell suppression are the suggested options."_

| Method                                                                            | What it is                                                                                                                                                                                                      | Cost against G / B / E / W                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Primary suppression alone** (status quo)                                        | Threshold rule, no secondary cells.                                                                                                                                                                             | Costs nothing on any constraint, and is not a protection on a published-marginal partition. The Handbook's own disadvantage list for cell suppression: _"does not protect against disclosure by differencing"_ and _"Disclosive zeros need to be suppressed"_.                                                                                                                                                                 |
| **Complementary / secondary suppression**                                         | Suppress a second, non-sensitive cell on the same line so no arm is recoverable alone.                                                                                                                          | **G: free.** **W: costs one weight per affected line**, not the column, and never the ordering. **E: in conflict — see §5.3.** **B: the real cost, and smaller than the ticket assumes — see §5.5.** Fails outright where only one arm is populated (§5.6). Volume, per GSS: _"Up to three secondary suppressions are needed to protect one unsafe primary suppression."_                                                      |
| **Table redesign / recoding / collapsing categories**                             | Merge arms until no cell is small. _"It is a property of the sensitivity rules that a joint cell is safer than any of the individual cells."_ The field's recommended _first_ move.                             | **G, B, E, W: all free.** The cost is the axis's meaning — merging the structurally-empty locale arm into its neighbour, or §4's single-module arms into one, ends the question those arms exist to answer. A **product** cost, not a technical one. Also absent from #2388's list.                                                                                                                                            |
| **Suppress the marginal instead**                                                 | Don't publish §1's totals. FCSM: _"Complementary suppressions may not be needed if marginal totals are not published."_                                                                                         | **Violates G** — and the Handbook advises against it independently: _"suppression of marginal cells should be avoided as far as possible."_ Its worked example spells out the loss: _"the sector-level information is completely lost!"_ Correctly refused, and now refusable on the field's authority rather than only the project's.                                                                                         |
| **Recompute the marginal from what printed**                                      | ONS SRS: _"As the totals have been recalculated and now only include the counts that were not suppressed, it is now impossible to recalculate the suppressed counts using them."_ OpenSAFELY requires the same. | **Violates G more subtly than suppressing it**: §1 would still print a number, but not the distance to the threshold. ⚠️ ONS attaches a clause that bites here: _"all of the totals have been recalculated, not just those that could be used to recalculate suppressed counts."_ A total that is sometimes whole and sometimes partial is itself a signal of where the suppression is.                                        |
| **Partial suppression / publish the feasibility interval**                        | Handbook §4.2.2 (Salazar 2003): _"The idea of the partial suppression method is to publish the feasibility intervals of the resulting suppression pattern."_                                                    | **G, B, W: free.** ⚠️ `<5` **already is** an interval, so this instrument is closer to partial suppression than to classical suppression — but see Cox's objections in §5.4, which are serious and specific. The Handbook records it as never implemented: users _"prefer the statistical agencies to provide actual figures rather than intervals"_, and it _"tends to affect more cells than cell suppression"_.             |
| **Rounding** (conventional / random / controlled / small-count)                   | Replace counts with multiples of a base.                                                                                                                                                                        | See §4. Handbook: controlled rounding _"is the statistical disclosure control method that is generally most effective for frequency tables"_; conventional rounding _"can be easily 'unpicked' when differencing and linking tables"_. τ-ARGUS notes one thing rounding does that suppression cannot: it creates _"uncertainty also with respect to zero values (i.e. empty cells). The same cannot be said for suppression."_ |
| **Perturbation** (cell key method, barnardisation, controlled tabular adjustment) | Add noise to published cells.                                                                                                                                                                                   | See §4. Structurally weakened here by the public repo.                                                                                                                                                                                                                                                                                                                                                                         |
| **Pre-tabular methods** (targeted record swapping, noise in the microdata)        | Alter records before tabulating.                                                                                                                                                                                | Unavailable on a different ground entirely: these reports run read-only and alter nothing. Worth recording that the whole pre-tabular half of the field is off the table, which is why the post-tabular half carries all the weight.                                                                                                                                                                                           |
| **Table-release rules / disclosure rules**                                        | Refuse to publish a table too sparse to be safe (NISRA's non-zero-proportion and average-cell-count rules).                                                                                                     | **G, B, E, W: all free.** The family `axis_coverage` already belongs to, and the natural home for the degenerate-arm case. Withholds whole sections rather than cells: a bigger visible loss, a smaller conceptual one.                                                                                                                                                                                                        |
| **Do not publish the level at all**                                               | Eurostat §2.1.4: _"Some NSIs chose not to publish entire aggregation levels if they cause issues for statistical disclosure control."_                                                                          | The honest floor of the option space. Costs the section.                                                                                                                                                                                                                                                                                                                                                                       |

Two warnings from the sources that apply directly and appear nowhere in the repo:

- **GSS, verbatim, in both documents: _"Cell suppression does not generally provide protection from
  disclosure by differencing. Tables should be published using fixed categories to avoid disclosure
  by differencing."_** The arms _are_ fixed categories, which is why §3 and §4 are safe from the
  across-tables case. The digest series is where that guarantee stops (§6).
- **Handbook §4.3.2 on how often patterns silently fail an audit:** _"in study B we found between
  about 4% (protection by Modular) and about 6% (protection by Hyper0) of sensitive cells at risk in
  an audit step where we computed the feasibility intervals."_ The field's own automated tooling
  leaves cells at risk and finds out by auditing, not by reasoning.

---

## 4 · Are rounding and perturbation admissible at all?

**"Collect nothing new" does not rule them out.** Every method in the family is _post-tabular_: it
operates on the printed cell, after aggregation, and requires no new column, no new event, no new
row. On the founding constraint they are clean, and an argument from it would not hold.

**"The report is the instrument, not the judgement" does not rule them out either, read exactly.**
That sentence governs what the report may _conclude_ — no threshold, comparison or verdict the
document has not already committed to. A rounded count is not a judgement. It is a fact stated at
lower resolution, which is what `<5` already is.

**What does bite is narrower, and worth stating precisely.**

1. **A perturbed figure asserts something false; a suppressed one asserts nothing.** The Handbook
   names this as suppression's one honesty advantage: it _"is highly visible to users. The original
   counts in the data that are not selected for suppression are left unadjusted."_ The contrast is
   record swapping, whose stated disadvantage is _"Method not transparent to users. It may appear as
   if disclosure control has not been carried out."_ A reader of a suppressed cell knows they are
   being told nothing. A reader of a perturbed cell does not know they are being told something
   slightly wrong.
2. **Non-additivity is the visible price, and the field is blunt about how it reads.** FCSM: _"A
   table prepared using random rounding could lead the public to lose confidence in the numbers: at a
   minimum it looks as if the agency cannot add."_ ABS: perturbation _"cannot guarantee consistency
   within a table"_, and _"Totals are not calculated by summing the interior values of the table."_
   Here the marginal **is the gate**, so a non-additive marginal is not cosmetic: §1 would stop being
   the number §3 sums to, and the one quantity the document has committed to in writing would become
   approximate. This is the strongest constraint-G-flavoured objection to the whole family, and it
   applies to rounding as much as to perturbation.
3. **Secrecy of parameters: the field wants it, this project cannot have it, and the consequence is
   asymmetric.** The guidance is uniform — FCSM: _"Although agencies may reveal the primary
   suppression rule they use, **they should not disclose parameter values**, as knowledge of the rule
   and its parameters enables a respondent to make better inferences concerning the values reported
   by other respondents."_ GSS: _"the values of the p% and minimum threshold parameter n and m should
   remain confidential."_ Handbook §5.2: _"Explanations should provide details of the methods used
   but avoid stating the exact parameters as this may allow intruders to unpick the protection."_
   ⚠️ **This project already violates that rule and cannot stop**: the parameter is in a public
   repository and, more immediately, **the glyph prints it** — `<5` _is_ the threshold. The
   asymmetry is in what the disclosure costs. Publishing "five" tells a reader `1..4`, which the
   glyph tells them anyway. Publishing a perturbation parameter is a different order of loss:
   Eurostat works an example in which an attacker who knows the maximum deviation _and_ knows that
   zeros are never perturbed recovers the true interior values exactly, and concludes _"the exact
   value should never be published, since it is valuable information for any attacker."_
4. **Eurostat's communication rule applies whichever way #2388 goes:** _"If an SDC method does not
   preserve additivity or consistency, a clear communication with the users will be needed, since
   otherwise they might get confused. The more complex a Statistical Disclosure Control method is,
   the more detailed and transparent the methodology and its effects on the data must be described."_

**So the honest summary is:** the family is not excluded by the founding constraint; an _unmarked_
perturbed figure is excluded several times over; and the thing that actually closes the door on
**perturbation specifically** is (3) — its protection depends on a secret this project structurally
cannot keep. **Rounding is a different case and should not be swept in with it.** Its parameters are
safely publishable, the Handbook calls controlled rounding _"generally most effective for frequency
tables"_, it is the one post-tabular method that creates doubt about empty cells, and the project's
own stated rationale for k=5 is **anti-false-precision first** — on that axis a rounded count is
arguably a better instrument than a raw one. What rounding costs here is (2): additivity between §1
and §3, which is the gate. A real objection, and a different one from "a number nobody measured".

---

## 5 · Complementary suppression, concretely

### 5.1 What it has to satisfy in the one-dimensional case

**One suppressed cell is never enough**, and the reason is linear algebra rather than convention: a
1-D table is a single equation, `total = Σ arms`. One unknown means a unique solution, so the
feasibility interval collapses to a point — FCSM's audit failure mode 1, _"the upper and lower limits
may be the same"_. Two unknowns give one degree of freedom and a non-degenerate interval. The
Handbook's opening worked example is exactly this configuration, and its remedy is exactly the one
#2388 is missing:

> _"If the cell values of the two non-sensitive subsectors and the 'total' are displayed, then users
> of the publication can disclose the cell value for the sensitive subsector by taking the difference
> between the 'total' and the subsector values … In order to avoid this, a secondary protection
> measure for this table has to be taken, e.g. selecting one of the two non-sensitive subsector cells
> and suppressing it as well."_

**Two is the minimum, not a guarantee.** Two documented ways it still fails, both live here:

- **Singletons** — Handbook protection standard PS2: _"A suppression pattern, with only two suppressed
  cells within a row (or column) of a table is not valid, if each of the two corresponds to a single
  respondent who are not identical."_ Two arms each holding one person protect that person from
  everyone except the other one. At the sizes where `<5` bites, that case is reachable on these axes.
- **Width** — the residual is the sum of the two suppressed arms, and if it is small the interval is
  narrower than the protection required. The complement has to be large enough to _carry_ protection,
  which is the trade in §5.4.

### 5.2 Which second cell — the candidate set

Two exclusions come straight from the sources and decide most of it.

- **Not the marginal.** Handbook §4.1: _"suppression of marginal cells should be avoided as far as
  possible."_ The Modular algorithm hard-codes it — marginals are _"fixed … not allowed to be
  (secondarily) suppressed"_ — at the documented price that _"when several empty cells are apparent
  in a low level table, it might be the case that no solution can be found if one is restricted to
  suppress interior cells only."_ That is constraint **G**, reached independently by the field.
- **Not a zero.** FCSM: _"A simple result is that zero cells are not valid candidates for
  complementary suppression as the union of a sensitive cell and a zero cell is equal to the
  sensitive cell, and is therefore still sensitive."_ The structural definitions encode it — the
  network-flow characterisation requires _"a sequence of non-zero cells"_, the hypercube _"a pattern
  of suppressed, nonzero cells"_ — and τ-ARGUS implements it: _"Zero cells are consider[ed] to be
  frozen as well in the hypercube."_

So the candidate set on any line is **the populated arms that currently print their true value**, and
the complement necessarily lands on a cell that is not itself sensitive. That is the method's
defining cost, stated by Cox as bluntly as it can be: _"Suppression sacrifices both confidential and
nonconfidential data, forcing potentially significant degradation in data quality and usability.
These effects are often compounded because mathematical relationships induced by suppression tend to
produce 'over-protected' solutions."_

Who chooses is also documented, and it is not a rule: ONS SRS, _"Exactly which additional cells are
suppressed is chosen by the researcher (unless specified under dataset- or project-specific SDC
rules)."_ FCSM adds the analyst's heuristic and, with it, a second-order risk: _"Typically the data
analyst knows which cells are of greatest interest to users (and should not be used for complementary
suppression if possible), and which are of less interest to users (and therefore likely candidates
for complementary suppression)."_ If "least interesting" is a predictable function of the data, the
choice of complement is itself a signal.

### 5.3 The printed `0` — where the field agrees, and where it does not

This is the constraint with the sharpest finding against it, and both halves need stating.

**Where the field agrees with the project.**

- A **structural zero** is not the risk. GSS: _"Structural zeros are those where the counts cannot be
  anything other than zero, such as 8 year old mothers, whereas non structural zeros occur because
  nobody with that combination of characteristics is present in the population … Risk in tables with
  zeros is generally determined by cells which contain non structural zeros."_ ONS SRS: _"The
  exception to this is structural zeros, also called logical zeros … Structural zeros are
  permitted."_ The locale axis's unreachable arm is a structural zero by CHECK constraint, and the
  field would leave it alone.
- ABS agrees as practice: _"It is not usually recommended to suppress cells that contain a zero."_
- And spending a zero as a complement is forbidden outright (§5.2). **So "an empty arm discloses
  nothing, and may not be used to protect anything" is the field's position too.**

**Where the field contradicts the project, directly.**

- ONS SRS §6.1.1, on markers: _"The only proviso is that they must not enable the reader to **crack
  the suppression** – e.g., suppressing counts of 1-9 with '<10' but **zeros with '-' would not be
  acceptable**."_ That is the shared block's design named and rejected: a marker scheme where zero
  and small-but-hidden print differently tells the reader which cells are small.
- ONS SRS §6.2 on non-structural zeros: _"Unweighted counts of zero, excepting structural zeros, must
  be suppressed or otherwise removed"_, because empty and full cells are a **class disclosure** risk.
  On these axes, an arm that _could_ hold accounts and happens not to is a non-structural zero.
- ONS SRS §6.3.2 on distinguishing the two kinds of suppression: the researcher _"may use the same or
  different symbols or letters to indicate primary versus secondary suppression, **provided that the
  choice does not enable the reader to crack the suppression**."_ A marker that says "withheld, but
  not small" tells the reader that cell is large — which narrows the primary cell's interval by
  exactly the amount the complement was supposed to widen it.

**The consequence for #2388 is concrete.** A complement is by definition not small, so it cannot
print `<5` without asserting something false — and it cannot print a _distinct_ marker without
handing back the protection. The only scheme that satisfies both is the one the Handbook's glossary
shows: **a single opaque marker** (`×`, `..`) covering every withheld cell, small or not, and, on
ONS's reading, covering non-structural zeros too. Adopting complementary suppression therefore points
at abandoning `<5` as a _semantic_ marker — which is also what would lift the protection ceiling in
§5.4. **The trade is not "complementary suppression costs E". It is "complementary suppression and E
are alternative marker philosophies, and the project has so far chosen the readable one."** That is
a defensible choice, made for a false-precision reason rather than a privacy one, and #2388 can
restate it as a choice instead of an axiom.

### 5.4 The selection rule, and the interval it has to buy

The field formulates this as an optimisation: minimise information loss subject to every sensitive
cell's **feasibility interval** covering its **protection interval**, with the two **attacker
problems** embedded and solved by mixed-integer programming (τ-ARGUS via Benders' decomposition;
named heuristics **Hypercube/GHMITER**, **Modular/HiTaS**, **Optimal**, **Network flow**; `sdcTable`
offers the same family in R). None of that machinery is proportionate here. What transfers is the
**criterion** — and applying it exposes something the repo currently states wrongly.

The SQL comment says: _"Where two or more arms are suppressed only their SUM is recoverable, which is
the floor working."_ **The glyph makes that false.** `<5` does not mean "withheld"; it means `1..4`,
because `0` prints as `0`. Every suppressed cell therefore arrives with a published two-sided bound,
and the attacker problem is a small integer one. With `n` suppressed cells on a line and their sum
`S` recoverable from the marginal, one cell's feasibility interval is
`[max(1, S − 4(n−1)), min(4, S − (n−1))]`. Computed exhaustively:

| suppressed cells on the line | values left for one cell in the worst case | when                             |
| ---------------------------- | ------------------------------------------ | -------------------------------- |
| 1                            | **1 — exact disclosure**                   | always                           |
| 2                            | **1 — exact disclosure**                   | at either end of the sum's range |
| 2                            | at most 4                                  | mid-range                        |
| 3 or more                    | **1 — exact disclosure**                   | at either end of the sum's range |
| 3 or more                    | at most 4                                  | mid-range                        |

Two consequences, neither needing a production number:

- **Four values is the ceiling on this floor's protection, permanently.** However many arms are
  suppressed, `<5` bounds each to `1..4`. A threshold rule whose marker publishes a two-sided bound
  cannot buy an interval wider than that bound. Only an opaque marker lifts the ceiling.
- **"Two or more suppressed arms" is not a safe state.** Its safety depends on where the recoverable
  sum falls, and at either end of the range every suppressed cell on the line is disclosed exactly.
  The sentence #2388 is being asked to write is therefore not "the floor holds where more than one
  cell is small" but something closer to: _the floor bounds a cell to at most four values, and to
  exactly one whenever the recoverable sum sits at either end of its range._

The two ends of the selection trade:

- **Suppress the smallest other populated arm** — minimises information loss and buys the narrowest
  interval, because the recoverable sum is then as small as it can be, near the end of the range
  where the interval collapses. Cheapest, weakest.
- **Suppress the largest other populated arm** — buys the widest interval at the price of hiding the
  line's most informative weight. Most expensive, strongest. Cox's summary of practice sits between
  them: complements should be _"large enough to accommodate protection limits … but as small as
  possible to minimize information loss"_.

**Two cautions that apply because this project is public and its rule would be too.**

- **A public deterministic rule leaks the parameter.** Cox demonstrates recovering a secret
  sensitivity parameter by re-running the agency's own selection rule and observing which pattern was
  chosen: _"if the current cycle is not selected, then p > p″ … the largest p″ is a lower bound for
  p."_ The field's answer is not to hide the algorithm — τ-ARGUS is open source — but to **audit the
  protection constraint**. Here the parameter is already public, so the leak costs little; the
  transferable point is that publishing the selection rule tells the reader which arm was sacrificed
  and roughly where it sat in the order.
- **If the project ever publishes a bound instead of a glyph, it must not be symmetric.** Cox's
  Theorem 4.1: exact intervals computed under symmetric attacker knowledge _"are symmetric around
  true values … regardless of the underlying tabular structure"_, with the corollary _"if the
  releaser wishes to provide bounds for suppressed entries, these bounds must be nonsymmetric."_
  Publishing a symmetric interval publishes the value as its midpoint. ⚠️ `<5` is not symmetric, so
  this is not a live defect — but it is the trap any "print a range instead" proposal walks into, and
  Cox's broader verdict on that whole family is: _"even when safe, exact intervals further threaten
  data security, in some situations completely."_

### 5.5 Does it fit inside `k_count` / `k_pct`? — measured, not assumed

**No, and the ticket's instinct is right: they are scalar and row-local.**

```sql
create function pg_temp.k_count(n bigint) returns text language sql immutable
```

sees one cell. Complementary suppression needs to know, for the whole line, how many cells are
primary-suppressed, which of the rest are populated, and what they hold. No signature taking a single
`bigint` can carry that.

Three shapes were prototyped against a local PostgreSQL 17 instance on synthetic values, and **both
non-trivial ones work**:

- **Shape B — a window pass in each section plus a two-argument shared scalar.** The section computes
  `count(*) filter (where n between 1 and 4) over (partition by account)` and a `row_number()` pick
  order that puts primaries first, then non-zero cells ascending, then zeros last; the shared block
  gains `k_count2(n bigint, force_hide boolean)`. Verified: it suppresses a second cell on exactly
  the lines carrying one primary, and never picks a zero arm.
- **Shape C — an array-in / array-out shared function.** `k_counts(bigint[]) returns text[]`, holding
  the whole rule including the selection. Verified working, and it keeps every decision inside the
  shared, gated block.
- **A user-defined window function is not available.** PostgreSQL's `CREATE FUNCTION` reference:
  _"`WINDOW` indicates that the function is a window function rather than a plain function. This is
  currently only useful for functions written in C."_ So "make it a window function" means using
  built-in window functions at each call site, not shipping one in the shared block.

**The byte-identity constraint is narrower than the ticket states, and that matters.**
`test/analytics-shared-sql.test.ts` enforces byte-identity per block **across whichever files declare
that block**, from an `EXPECTED_BLOCKS` map — and `content_events` is already declared in two files,
not three. So:

- Editing the existing `k_suppression` block **is** a three-file change, as stated.
- **Adding a new block** — say `shared:k_partition_suppression` — can name **exactly the two files
  that need it** (`analytics-segment.sql`, `analytics-onboarding.sql`), with `content_events` as
  precedent. Existing `k_count` / `k_pct` call sites across all three reports stay untouched, because
  complementary suppression is owed only where the partition is exhaustively printed, which the map's
  own census puts at three sections in two files.
- The test also asserts _"declares no shared block that EXPECTED_BLOCKS does not know about"_, so the
  test file is part of any such change by construction. That is a feature.

**The uncatchable part is the plumbing, and it is the real risk.** Under shape B the _selection rule_
lives in each section's CTE, outside every `shared:` marker, so nothing gates its consistency: two
sections could drift into two different complementary-suppression policies with every test green.
Shape C does not have that problem — the rule is inside the block — but it changes three call sites
from per-row scalars to array aggregation and re-expansion, and the three nested count columns mean
three independent calls per line whose results must be mapped back onto the same arm order.

**Two consequences any shape inherits:**

- **The marker question of §5.3 has to be answered first.** It is not an implementation detail; it
  decides whether the complement prints `<5` (false), a distinct symbol (self-defeating, per ONS) or
  an opaque symbol shared with every other withheld cell (which is the field's answer and which
  collides with constraint E).
- **`k_pct` has to follow the flag.** It decides from raw numerator and denominator today. A
  complementarily-suppressed count printed beside a live percentage is recoverable — the rate is
  rounded to one decimal and the denominator is printed, so the numerator is pinned. Any shape must
  carry the suppression decision into the percentage.

### 5.6 Where it fails outright

On a line with **one populated arm and the rest zero** there is no valid complement: every candidate
is a zero, and a zero protects nothing. The marginal then discloses the single arm exactly, and
complementary suppression has no move. That is #2389's degeneracy from the other side, and the
field's answer there is not a better pattern but **table redesign** (collapse arms until a complement
exists) or a **table-release rule** (don't publish the line). It means complementary suppression is
not a complete answer even if adopted — which is worth saying plainly in the amendment, because the
partition where it fails is the partition #2388 calls the bad case.

---

## 6 · Two exposures the map has not named

- **Residual disclosure across the digest series.** From 2026-10-01 the same tables are republished
  monthly over a growing population. The Handbook's glossary definition — _"Disclosure that occurs by
  combining released information with previously released or publicly available information"_ — fits
  exactly, and the field's standing instruction has no counterpart here. GSS: _"A cell used as a
  secondary suppression in one published table should also be suppressed if it appears in another
  published table … When additional ad hoc tables are released to customers, it is difficult to
  ensure that cell suppressions are consistent with all previously released tables."_ FCSM:
  _"Inconsistency in the suppression patterns in a publication increases the likelihood of
  inadvertent disclosure."_ Nothing in this instrument makes a decision consistent from one issue to
  the next, and an arm withheld in one and printed in the next discloses more than either alone. This
  is a property of the publication schedule rather than of the SQL, so it survives every option in §3
  except the perturbative ones — consistency across releases is exactly what the cell key method is
  built to provide.
- **`k_pct` prints `0.0%` and `100.0%` unguarded.** ONS SRS: _"empty cells … and full cells (i.e.,
  cells whose unweighted counts represent 100% of a group) represent a class disclosure risk."_
  OpenSAFELY's operational version, for health data: _"Counts of zero can be retained in general, but
  be aware that zero or 100% counts can be disclosive ('none of the males aged 45-49 used condoms';
  'THC was detected in all premature births in the 17-18 age group') and should be removed."_ A rate
  of 0% or 100% over a denominator that clears the threshold is a statement about every member of
  that arm. Not what #2388 asks about; noted, not acted on.

---

## 7 · What this does not settle

- **Whether any of this is worth doing.** That turns on #2525 — who the floor protects and on which
  route out of the database — and the digest's route is one private reader in a private repository.
  Every handbook cited here is written for **public** release by a national statistics office. Their
  vocabulary transfers; their cost-benefit does not, and it should not be imported unexamined.
- **Which selection rule.** §5.4 prices the two ends; the middle is an optimisation the field solves
  with a mixed-integer program and this instrument should not.
- **Whether the amendment should name the feasibility interval at all**, or keep describing the floor
  in cell counts. Naming it is both more honest and more demanding: it turns "the floor works here"
  into a number, and that number is at best four.
- **Whether `<5` stays.** §5.3 and §5.4 both converge on the marker, from privacy and from
  false-precision respectively, and the map has not treated the marker as a decidable thing.

---

## 8 · Sources

All fetched and read on **2026-09-16**.

| #   | Source                                                                                                                                                                                                                     | URL                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hundepool et al., **Handbook on Statistical Disclosure Control** (Centre of Excellence SDC / ESSnet lineage; the successor of the Hundepool et al. material) — chs. 4, 5, glossary                                         | https://sdctools.github.io/HandbookSDC/ · PDF: https://sdctools.github.io/HandbookSDC/Handbook-on-Statistical-Disclosure-Control.pdf                                                   |
| 2   | **τ-ARGUS 4.1 User's Manual**, Statistics Netherlands                                                                                                                                                                      | https://research.cbs.nl/casc/Software/TauManualV4.1.pdf                                                                                                                                |
| 3   | **FCSM Statistical Policy Working Paper 22, "Report on Statistical Disclosure Limitation Methodology"** (2005). ⚠️ carries a front note marking it as historical reference, superseded by the FCSM Data Protection Toolkit | https://statspolicy.gov/assets/fcsm/files/docs/spwp22WithFrontNote.pdf · mirror: https://nces.ed.gov/FCSM/pdf/spwp22.pdf                                                               |
| 4   | **GSS/GSR Disclosure Control Guidance for Tables Produced from Surveys** (2014)                                                                                                                                            | https://analysisfunction.civilservice.gov.uk/wp-content/uploads/2018/03/Guidance-for-tables-produced-from-surveys-4.pdf                                                                |
| 5   | **GSS/GSR Disclosure Control Guidance for Tables Produced from Administrative Sources** (2014)                                                                                                                             | https://gss.civilservice.gov.uk/wp-content/uploads/2018/03/Guidance-for-tables-produced-from-administrative-sources-4.pdf                                                              |
| 6   | **ONS Secure Research Service, Output Checking Guidance** — the source for the marker rules and the class-disclosure/structural-zero distinction                                                                           | https://www.ons.gov.uk/file?uri=%2Faboutus%2Fwhatwedo%2Fstatistics%2Frequestingstatistics%2Fsecureresearchservice%2Fgettingyourresearchoutputsapproved%2Fsrsoutputcheckingguidance.pdf |
| 7   | Lawrence H. Cox, **"Vulnerability of Complementary Cell Suppression to Intruder Attack"**, _Journal of Privacy and Confidentiality_ 1(2), 235–251                                                                          | https://journalprivacyconfidentiality.org/index.php/jpc/article/download/576/559/590                                                                                                   |
| 8   | **Eurostat, Guidelines for statistical disclosure control methods for census and demographics data**, 2024 edition                                                                                                         | https://ec.europa.eu/eurostat/documents/3859598/20715808/KS-01-24-014-EN-N.pdf                                                                                                         |
| 9   | **NISRA, Census 2021 Statistical Disclosure Control Methodology**, v3 (2023)                                                                                                                                               | https://www.nisra.gov.uk/files/nisra/publications/statistical-disclosure-control-methodology-for-2021-census.pdf                                                                       |
| 10  | **ABS, Data confidentiality guide — Treating aggregate data**                                                                                                                                                              | https://www.abs.gov.au/statistics/understanding-statistics/data-confidentiality-guide/treating-aggregate-data                                                                          |
| 11  | **ABS TableBuilder — Confidentiality and relative standard error**                                                                                                                                                         | https://www.abs.gov.au/statistics/microdata-tablebuilder/tablebuilder/confidentiality-and-relative-standard-error                                                                      |
| 12  | **ONS, Comparison of post-tabular statistical disclosure control methods**                                                                                                                                                 | https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/methodologies/comparisonofposttabularstatisticaldisclosurecontrolmethods                |
| 13  | **ONS, Protecting personal data in Census 2021 results**                                                                                                                                                                   | https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/methodologies/protectingpersonaldataincensus2021results                                 |
| 14  | **Handbook on Statistical Disclosure Control for Outputs**, v2.0 (2024), Safe Data Access Professionals / UK Data Service                                                                                                  | https://ukdataservice.ac.uk/app/uploads/sdc-handbook-v2.0.pdf                                                                                                                          |
| 15  | Zhang, Chen & Cheng, **"Overview of Cell Suppression Methods"**, ASA SRMS Proceedings 2023 (US Census Bureau authors)                                                                                                      | http://www.asasrms.org/Proceedings/y2023/files/Overview_of_Cell%20Suppression_Methods.pdf                                                                                              |
| 16  | **`sdcTable` CRAN vignette** (R implementation: `OPT`, `HITAS`, `HYPERCUBE`, `SIMPLEHEURISTIC`, `GAUSS`)                                                                                                                   | https://cran.r-project.org/web/packages/sdcTable/vignettes/sdcTable.html                                                                                                               |
| 17  | **OpenSAFELY documentation, Applying statistical disclosure control** — operational guidance for a health-data platform; cited for the zero/100% rule and the recomputed-totals rule                                       | https://docs.opensafely.org/outputs/sdc/                                                                                                                                               |
| 18  | **PostgreSQL 17, CREATE FUNCTION** — for the `WINDOW`-is-C-only constraint                                                                                                                                                 | https://www.postgresql.org/docs/17/sql-createfunction.html                                                                                                                             |

**Not verified, stated rather than guessed.**

- **Hundepool et al., _Statistical Disclosure Control_ (Wiley, 2012)** — commercial, no accessible
  full text. The Handbook at source 1 stands in for it; the τ-ARGUS manual cites that handbook
  section-by-section as the same lineage. Treat its quotations as the handbook lineage, not as the
  Wiley book's page-numbered text.
- **Cox (1980) and Cox (1995), _JASA_** — paywalled. The cycle and network characterisations
  attributed to Cox here are quoted from the Handbook and from source 7, not from the originals.
- **Statistics Canada** guidance was not fetched. The only Statistics Canada fact asserted here is
  second-hand via FCSM, which records that complementary-suppression software has existed _"at
  Statistics Canada and at the U.S. Census Bureau"_ since the 1970s.
- **The live FCSM Data Protection Toolkit** that supersedes WP22 was not fetched —
  `https://www.fcsm.gov/resources/safe-guard-data/` redirects to `https://statspolicy.gov/FCSM/` — so
  every FCSM quotation above is from the archived 2005 edition.
- **No UNECE or OECD standalone handbook was found**; UNECE hosts work-session papers by individual
  authors rather than guidance.

<sub>Researched and written solo in a background session on 2026-09-16, with the owner out of the
loop. Findings only — no option is chosen here.</sub>
