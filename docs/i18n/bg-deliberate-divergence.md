# Bulgarian: deliberately divergent translations

Some English strings are translated **differently on purpose** in Bulgarian. This file is the confirmed list, so that nobody "fixes" them. Owner-confirmed 2026-08-19 (decisions recorded on [#1096](https://github.com/Selftend/selftend/issues/1096); survey and reasoning in [#1062](https://github.com/Selftend/selftend/issues/1062)).

**Do not add a CI guard asserting "same English ⇒ same Bulgarian".** The categories below make it structurally wrong — Bulgarian inflects where English doesn't — and an allowlist would be longer than the problem.

## CLDR plural forms

English often doesn't inflect where Bulgarian must. `_one`/`_other` keys with identical English and different Bulgarian are the plural system working, not drift. Bulgarian's бройна форма makes `_other` a count form — flattening these breaks pluralization.

- `navigation:home.rows.active_one/_other` — `активно`/`активни`
- `navigation:home.widgets.moodCheckin.loggedSummary_one/_other` — `запис`/`записа`

## Gender and number agreement

Status adjectives agree with the noun each surface describes (задача/цел f., действие n., навик m., lists pl.). One English word correctly becomes several Bulgarian forms:

- `Abandoned` / `Active` / `Completed` — `-и` (pl. titles), `-о` (n., ACT action status), `-а` (f., CBT task/goal status)
- `Archived` — `Архивирано` (n., feedback toast) / `Архивиран` (m., habit badge)
- `Good` — `Добре` (mood scale) / `Добро` (n., sleep quality)
- `Logged` — `Записан` (m.) / `Записано` (n.)
- `Next` — `Напред` (step CTA) / `Следваща` (f., routines стъпка)
- `None` — `Без звук` (sound picker) / `Няма` / `Никакво` (n., distraction level)

## True polysemy

Same English word, different meaning — one Bulgarian word would be a bug:

- `Body` — `Тяло` (ACT body-scan step) vs `Текст` (journal body-text field)
- `Exercise` — `Упражнение` (practice step) vs `Упражнения` (physical exercise, self-care)
- `Complete` — `Завърши` (verb CTA) vs `Завършена` (adjective, programme status)
- `Connection` — the ACT process is `Връзка с настоящето`, but `cbt:activities.pace.connection` is **social** connection in activity pacing and stays `Връзка`

## Surface register

Nouns for titles and breadcrumbs, imperative for buttons:

- `Edit` — `Редактирай` (buttons) / `Редактиране` (breadcrumb)
- `Edit activity`, `Edit goal` — `Редактиране на …` (screen title) / `Редактирай …` (button)
- `Practice` — `Практика` (step label) / `Практикувай` (CTA)

Surface-appropriate variants confirmed as deliberate:

- `Dismiss` — `Затвори` (close a banner) / `Скрий` (hide a card)
- `FAQ` — `ЧЗВ` (tight footer link) / `Често задавани въпроси` (page title)
- `Finish` — `Завърши` (end a session) / `Готово` (wizard finish)
- `Mood check-in` — full `Проверка на настроението` (notification title) / `Настроение` (width-limited tool chip)
- `Struggle switch` — full `Превключвател на борбата`; the expansion step chip keeps the short `Превключвател` (width limit)

## Deliberate copy splits

- `Something went wrong` — `Нещо се обърка` (`errors:fallback.title`, full-screen error-boundary card: calmer) vs `Възникна проблем` (`common:feedback.wentWrong`, transient toast). Chosen in #1059.
- **Color palettes**: the CBT breathing-builder swatches are nouns (`Кехлибар`, `Глина`, `Аква`, `Виолет`); the habits swatches are adjectives (`Кехлибарено`, `Теракота`, `Аквамарин`, `Виолетово`). Each palette is internally consistent; cross-palette alignment was considered and declined (#1096).

## Terminology guardrails

- **Worry = `тревога`** (the worry journal's vocabulary). If an _anxiety_ concept ever enters the product, it must take `тревожност` — never overload `тревога`.
- Canonical product terms live in the Weblate `SelfTend` glossary; the decided list is on [#1096](https://github.com/Selftend/selftend/issues/1096).

## Re-running the divergence survey

From the repo root with Node (no deps) — prints every English string with more than one Bulgarian rendering:

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

Anything the script prints that is not covered by this file is either new drift (fix it against the glossary and the conventions on [#1096](https://github.com/Selftend/selftend/issues/1096)) or a new legitimate divergence (add it here with its reasoning).
