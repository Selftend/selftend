# Bulgarian divergence triage — all 80 groups, draft piles

Asset for [Draft the pile triage of all 80 divergent Bulgarian groups (#1092)](https://github.com/Selftend/selftend/issues/1092), part of map [#1090](https://github.com/Selftend/selftend/issues/1090). Drafted 2026-08-19 against `dev` @ `22f52bc1`.

**Measurement:** 340 English strings appear under ≥2 keys across `src/i18n/locales/{en,bg}`; **80** of them have more than one Bulgarian rendering. (Strictly cross-namespace: 222/66.) Regeneration script in the appendix.

**Piles** (from [#1062](https://github.com/Selftend/selftend/issues/1062)):

- **Pile 1 — legitimately divergent, leave alone.** Gender/number agreement, CLDR plural forms, true polysemy (same English word, different meaning), surface-register splits (noun title vs imperative button), and one documented deliberate split.
- **Pile 2 — safety copy.**
- **Pile 3 — drift to decide.** Sub-bucketed below so ~12 decisions cover all 56 groups.

Every pile assignment here is a **draft** — linguistic reasoning stated per group, owner confirms or overrules. Groups marked ⚖️ are borderline calls.

## Two premise corrections vs #1062

1. **`Cancel` is not a clean Pile 1 case.** #1062 framed Отказ/Откажи as "noun on a dialog vs imperative on a button". The actual key distribution tracks _tool_, not surface: act/cbt/common/habits/routines/settings use `Отказ` everywhere (16 keys, including dialogs), while gratitude/journal/mood/sleep/breathing-builder use `Откажи` everywhere (9 keys, including plain buttons). It's a per-tool register drift → moved to Pile 3 as one convention decision.
2. **`{{count}} sit` hides a misspelling.** `navigation:home.rows.sits_one` renders `седение` — not a Bulgarian word; `meditation:module.insights.sessionCount_one` has the correct `седене`. A typo, not a divergence judgment → Pile 3, fix-on-sight.

---

## Pile 2 — safety copy (1 group)

| en                   | renderings                                                 | keys                                                                                                                        |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Open crisis guidance | `Отвори кризисните насоки` / `Отвори кризисно ръководство` | `common:safety.openCrisis`, `settings:feedback.openCrisis` / `settings:supportPage.openCrisis`, `settings:legal.openCrisis` |

Decided in [Crisis guidance has two Bulgarian names — choose the one (#1093)](https://github.com/Selftend/selftend/issues/1093).

---

## Pile 1 — legitimately divergent, leave alone (19 firm + 4 borderline)

**CLDR plural machinery** — `_one`/`_other` keys where English happens not to inflect but Bulgarian must (⚠️ Bulgarian бройна форма makes `_other` a count form; any sweep flattening these breaks pluralization):

- `{{count}} active` — `активно`/`активни` (`navigation:home.rows.active_one/_other`)
- `Logged {{count}}× today` — `{{count}} запис/записа днес` (`navigation:home.widgets.moodCheckin.loggedSummary_one/_other`)

**Gender/number agreement** — the adjective agrees with the noun each surface describes (задача/цел = f., действие = neuter, навик = m., lists = pl.):

- `Abandoned` — `Изоставени` (pl. title) / `Изоставено` (n., ACT action status) / `Изоставена` (f., CBT task/goal status)
- `Active` — `Активни` / `Активно` / `Активна` (same pattern)
- `Completed` / `completed` — `Завършени`/`Завършено`/`Завършена` (same pattern, two casing variants)
- `Archived` — `Архивирано` (n., generic feedback toast) / `Архивиран` (m., badge on навик)
- `Good` — `Добре` (mood scale, adverbial) / `Добро` (n., sleep quality)
- `Logged` — `Записан` (m., запис) / `Записано` (n., badge)
- `Next` — `Напред` (grounding step CTA) / `Следваща` (f., routines стъпка)
- `None` — `Без звук` (sound picker — clearer than a bare "none") / `Няма` / `Никакво` (n., distraction level)

**True polysemy** — same English word, different meaning; one Bulgarian word would be wrong:

- `Body` — `Тяло` (ACT expansion body-scan step) vs `Текст` (journal editor body-text field)
- `Exercise` — `Упражнение` (a practice step) vs `Упражнения` (self-care category: physical exercise)
- `Complete` — `Завърши` (imperative CTA) vs `Завършена` (f. adj., programme status) — verb vs adjective

**Surface register** — noun for titles/breadcrumbs, imperative for buttons (the split #1062 thought `Cancel` had — these actually have it):

- `Edit` — `Редактирай` (buttons, 8 keys) / `Редактиране` (breadcrumb)
- `Edit activity`, `Edit goal` — `Редактиране на …` (screen title) / `Редактирай …` (button)
- `Practice` — `Практика` (step label) / `Практикувай` (widget CTA)

**Documented deliberate split:**

- `Something went wrong` — `Нещо се обърка` (`errors:fallback.title`, full-screen error-boundary card; calmer) vs `Възникна проблем` (`common:feedback.wentWrong`, transient toast). Deliberate per #1059; reasoning recorded on #1062's comments. Must survive any sweep.

**⚖️ Borderline — drafted Pile 1, owner may overrule:**

- `Dismiss` — `Затвори` (close banner) / `Скрий` (hide start-here card): contextually apt verbs, arguably fine.
- `FAQ` — `ЧЗВ` (tight footer link) / `Често задавани въпроси` (page title): surface-appropriate lengths.
- `Finish` — `Завърши` (end grounding session) / `Готово` (wizard finish button): different surface idioms.
- `Mood check-in` — `Проверка на настроението` (notification title) / `Настроение` (routine tool chip): chip-length constraint; but it _is_ the tool's name — see the glossary bucket if the owner wants one name everywhere.

---

## Pile 3 — drift to decide (56 groups, ~12 decisions)

### 3A. Product-term glossary decisions (one canonical Bulgarian term per concept → Weblate `SelfTend` glossary)

| concept (en)                                     | renderings in the wild                                         | keys                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Defusion                                         | `Когнитивна дефузия` / `Дефузия`                               | `act:principles.defusion.name`, `navigation:home.widgets.actDefusion.title` / `help:defusion.title`, `navigation:breadcrumb.defusion`                                                                                                                                   |
| Connection                                       | `Връзка с настоящето` / `Връзка` / `Свързаност`                | `act:principles.connection.name` / `cbt:activities.pace.connection`, `help:connection.title` / `navigation:breadcrumb.connection` — ⚠️ `cbt:activities.pace.connection` may be a _different_ concept (social connection in activity pacing); confirm before sweeping it |
| **Expansion** _(new find, not in #1062's seven)_ | `Разширяване` / `Приемане`                                     | `help:expansion.title` / `navigation:breadcrumb.expansion` — the breadcrumb calls the tool "Acceptance", the help page "Expansion"                                                                                                                                      |
| Core beliefs                                     | `Основни убеждения` / `Дълбоки убеждения`                      | `cbt:beliefs.title`, `help:beliefs.title`, `navigation:breadcrumb.beliefs` / `navigation:home.widgets.cbtBeliefs.title`                                                                                                                                                 |
| Thought record                                   | `Запис на мисъл` / `Запис на мисли`                            | `cbt:recovery.stats.thoughtRecords_one`, `cbt:detail.title` / `navigation:home.widgets.cbtOpenRecord.title`, `routines:tools.cbt`                                                                                                                                       |
| Insights                                         | `Прозрения` / `Наблюдения`                                     | `cbt:dashboard.insights.title`, `gratitude:insights.title` / `navigation:sidebar.progress`, `navigation:progress.title`                                                                                                                                                 |
| Procrastination                                  | `Прокрастинация` / `Отлагане`                                  | `cbt:dashboard.strategies.tasks`, `cbt:tasks.title`, `navigation:breadcrumb.tasks` / `meditation:module.obstacles.procrastination`                                                                                                                                      |
| Urge (surfing)                                   | `Сърфиране на импулса` / `Сърфиране на пориви`                 | `navigation:breadcrumb.urgeSurfing` / `routines:tools.urgeSurf` — glossary term: urge = `импулс` or `порив`                                                                                                                                                             |
| Worry                                            | `Притеснение` / `Тревога`                                      | `act:defusion.categories.worry` / `cbt:worry.detailTitle` — ⚠️ `Тревога` risks colliding with anxiety (`тревожност`)                                                                                                                                                    |
| Obstacles                                        | `Пречки` / `Препятствия`                                       | `act:committedAction.steps.obstacles` / `meditation:module.stages.obstaclesLabel`                                                                                                                                                                                       |
| Reminder time                                    | `Час на напомняне` / `Час за напомняне` / `Час на напомнянето` | `act:onboarding.commit.timeLabel` / `notifications:time.label` / `routines:reminder.timeLabel`, `routines:sheet.reminderTimeLabel`                                                                                                                                      |
| Struggle switch                                  | `Превключвател на борбата` / `Превключвател`                   | `act:expansion.struggleSwitchLabel` / `act:expansion.steps.struggle` — full name vs step-chip shortening; confirm or align                                                                                                                                              |
| Notice Five Things                               | `Забележи пет неща` / `Пет неща`                               | `act:connection.techniques.noticeFiveThings` / `act:connection.noticeFiveGuide.title` — same shortening question                                                                                                                                                        |

### 3B. Convention decisions (each sweeps many keys at once)

1. **Cancel register** — `Отказ` (16 keys: act, cbt except builder, common, habits, routines, settings) vs `Откажи` (9 keys: gratitude, journal, mood, sleep, cbt breathing builder). Pick one register app-wide (`Отказ` is the common Bulgarian UI convention and the majority).
2. **"Saving…" verb** — `Записване...` (9 keys, all ACT) vs `Запазване...` (15 keys, everything else). Related: `Your time so far will be saved` — `записано` (`cbt:breathing.session.exit.message`) vs `запазено` (`meditation:sit.exit.message`). One verb for persisting data: `запазвам` or `записвам`.
3. **"(optional)" marker** — `по желание` (`cbt:exposure.session.notes`, `cbt:anger.notes`) vs `по избор` (`sleep:log.notesLabel`) vs `незадължително` (`act:committedAction.targetDateLabel`); plus `Target date` itself: `Целева дата` vs `Крайна дата` (`cbt:goals.targetDate`).
4. **още / все още** — `Още не` vs `Все още не` (`act:program.advanceCancel`, `cbt:program.advanceCancel` vs `meditation:onboarding.assessment.habitNo`); `Все още няма сесии` vs `Още няма сесии` (#3D below); `Още няма нищо` vs `Още няма нищо тук`. One adverb convention.
5. **Definite object in CTAs** — `Запази запис` (`cbt:worry.save`, `cbt:anger.save`) vs `Запази записа` (`gratitude:editor.save`); `Запази сесия` (`cbt:exposure.session.save`) vs `Запази сесията` (`cbt:grounding.save`). Definite form reads more natural for a known object.
6. **Noun-form stragglers on buttons** — `Запазване` (`navigation:home.widgets.config.save`) among 13 `Запази` keys; `Премахване` (`cbt:record.removeThought`) among 10 `Премахни`; `Редактиране` covered in Pile 1 only because it's a breadcrumb — these two look like buttons; verify surface, then align to imperative.
7. **Color-palette naming** — cbt breathing-builder swatches are nouns (`Кехлибар`, `Глина`, `Аква`, `Виолет`), habits swatches are adjectives (`Кехлибарено`, `Теракота`, `Аквамарин`, `Виолетово`). Each palette is internally consistent; decide whether cross-palette consistency matters (⚠️ side-find: `habits:form.colors.rose` carries English label "Clay" — key/label mismatch on the English side, out of this map's scope but worth a note).
8. **Wizard "Continue/Next"** — meditation onboarding uses `Напред` (3 keys) where the rest of the app uses `Продължи` (16 keys); also `Begin` — `Започни` (`meditation:module.home.begin`) vs `Начало` (`meditation:onboarding.welcome.continue`, a button labelled with a noun); and `Got it` — `Разбрах` (12 keys) vs `Ясно` (`navigation:homeTour.*.dismiss`, 2 keys).

### 3C. Parallel ACT/CBT programme copy that drifted (align as one family)

The two programmes carry sentence-for-sentence identical English that was translated twice:

- `Advance` — `Продължи` (act) / `Напред` (cbt)
- `Advance anyway?` — `Все пак да продължа?` / `Да преминеш ли въпреки това?`
- `You haven't finished this phase's steps yet. Move on anyway?` — two renderings (`act:program.advanceEarlyConfirmBody` / `cbt:program.advanceEarlyConfirmBody`)
- `You reached the end at your own pace. …` — `със собственото си темпо` / `в свое собствено темпо` (`…graduationBodyEmpty`)

One decision: translate the programme-flow family once, apply to both namespaces.

### 3D. Near-duplicate polish (no concept at stake — pick the better sentence, sweep)

- `Couldn't delete this entry. Try again.` — `Записът не можа да се изтрие…` (gratitude/journal/mood) / `Не можа да се изтрие записът…` (sleep)
- `Delete this entry?` — `Да изтрия ли този запис?` (gratitude/journal/mood) / `Изтриване на записа?` (sleep)
- `Couldn't load your history` — `Историята не можа да се зареди` (habits) / `Историята не се зареди` (mood/sleep)
- `Couldn't save your preferences. Try again.` — `Предпочитанията не можаха да се запазят…` (gratitude) / `Не успяхме да запазим настройките…` (habits) — also предпочитания/настройки term
- `No sessions yet` — `Все още няма сесии` (cbt grounding/breathing) / `Още няма сесии` (navigation tool stats) → convention 3B.4
- `Nothing here yet` — `Още няма нищо` (gratitude/journal) / `Още няма нищо тук` (mood/sleep)
- `Finish early` — `Завърши по-рано` (cbt grounding/breathing) / `Приключи по-рано` (meditation/timer)
- `Update` — `Обнови` (cbt mood, gratitude, journal) / `Актуализирай` (sleep)
- `Back to sign in` — `Обратно към влизане` (2 keys) / `Назад към входа` (1)
- `Daily reminder` — `Ежедневно напомняне` / `Дневно напомняне`
- `Done today` — `Направено днес` (dashboard stat) / `Готово за днес` (routine step state) — ⚖️ contexts differ; may be fine
- `Mood trend` — `Тенденция в настроението` (cbt weekly review) / `Тенденция на настроението` (mood, navigation)
- `Join our Discord` — `нашия Discord` / `Discord`
- `Launch review required` — two word orders (`policies:launchReview` / `settings:legal.launchReview`)
- `Legal and boundaries` — `Правни граници` / `Правна информация и граници`
- `Length` — `Дължина` / `Продължителност` (`meditation:module.home.durationLabel` / `meditation:onboarding.commit.durationLabel`) — for time, `Продължителност` is right; `Дължина` is spatial
- `New belief` — `Ново убеждение` / `Нов запис` (widget CTA) — widget says "new entry" where English says "New belief"
- `Notes (optional)` → convention 3B.3
- `Recent entries` — `Скорошни записи` (cbt anger, gratitude) / `Последни записи` (sleep)
- `Reflection prompt` — `размисъл` / `рефлексия`
- `How we protect your data` — `данните ти` / `твоите данни` (ти-form consistency)
- `Selective and focused. Isolates one object - like the breath - …` — `дишането` / `дъха` (`meditation:info.attentionBody` / `meditation:onboarding.attention.attentionBody`)
- `{{count}} sit` — fix `седение` → `седене` (`navigation:home.rows.sits_one`); misspelling, fix-on-sight
- `Save entry` / `Save session` → convention 3B.5

---

## Appendix — regeneration script

Run from the repo root with Node (no deps):

```js
const fs = require("fs"),
  path = require("path");
const base = "src/i18n/locales";
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + "." + k : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object") flatten(v, key, out);
  }
  return out;
}
const en = {},
  bg = {};
for (const f of fs.readdirSync(path.join(base, "en"))) {
  const ns = f.replace(".json", "");
  const e = flatten(JSON.parse(fs.readFileSync(path.join(base, "en", f), "utf8")), "", {});
  const b = flatten(JSON.parse(fs.readFileSync(path.join(base, "bg", f), "utf8")), "", {});
  for (const [k, v] of Object.entries(e)) en[ns + ":" + k] = v;
  for (const [k, v] of Object.entries(b)) bg[ns + ":" + k] = v;
}
const byEn = {};
for (const [k, v] of Object.entries(en)) (byEn[v] ??= []).push(k);
for (const [text, keys] of Object.entries(byEn).sort()) {
  if (keys.length < 2) continue;
  const byBg = {};
  for (const k of keys) (byBg[bg[k]] ??= []).push(k);
  if (Object.keys(byBg).length < 2) continue;
  console.log(JSON.stringify(text));
  for (const [b, ks] of Object.entries(byBg))
    console.log("   ", JSON.stringify(b), "<-", ks.join(", "));
}
```
