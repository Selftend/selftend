# Deleting help source strings: what Weblate does, and the asset tail

Research for [#1521](https://github.com/Selftend/selftend/issues/1521), a ticket on map
[#1512](https://github.com/Selftend/selftend/issues/1512) (help-content reachability).

**Date checked:** 2026-08-28. **Repo baseline:** `origin/dev` @ `4b856520`.
**Weblate `help` component revision at time of writing:** `c1bee637` (a commit on `main`).

This report states facts. It does **not** recommend which keys to delete — that is
[#1518](https://github.com/Selftend/selftend/issues/1518),
[#1519](https://github.com/Selftend/selftend/issues/1519) and
[#1520](https://github.com/Selftend/selftend/issues/1520).

---

## 0. Live configuration of the `help` component

Read anonymously from `https://hosted.weblate.org/api/components/selftend/help/` — the project is
public on the Libre plan, so **no token is needed for any read in this report**. This matters: the
#1105 token was revoked, and every fact below was still verifiable.

| Setting                          | Live value                       |
| -------------------------------- | -------------------------------- |
| `file_format`                    | `i18nextv4` (**monolingual**)    |
| `template`                       | `src/i18n/locales/en/help.json`  |
| `filemask`                       | `src/i18n/locales/*/help.json`   |
| `edit_template`                  | **`false`**                      |
| `manage_units`                   | **`true`**                       |
| `new_base`                       | `""` (empty)                     |
| `allow_translation_propagation`  | `false`                          |
| `branch` (pulled)                | `main`                           |
| `push_branch`                    | `weblate/auth`                   |
| `linked_component`               | `…/components/selftend/auth/`    |
| `check_flags`                    | `ignore-ellipsis, ignore-reused` |
| `file_format_params.json_indent` | `2`                              |

This matches the configuration pinned in `scripts/weblate-create-components.js` exactly — no drift.

**The `edit_template: false` / `manage_units: true` pairing is the single most important
configuration fact in this report.** See §5.

### Live string counts

| Translation | total | translated | fuzzy | is_template |
| ----------- | ----- | ---------- | ----- | ----------- |
| `en`        | 80    | 80         | 0     | ✅          |
| `bg`        | 80    | 80         | 0     | ❌          |

80 units matches the repo's `help.json` leaf-string count exactly (verified by walking both JSON
files). Weblate is in sync with `main` and holds no extra units.

**Bulgarian is 100 % translated with zero fuzzy** — so the 24 `bg` strings a six-key deletion would
remove are complete, human-authored translations, not empty placeholders.

---

## 1. The deletion, sized precisely

`help.json` has **20 top-level blocks**, not 19: the nineteen `HELP_KEYS` **plus `ui`**
(`whatLabel`, `howLabel`, `whyLabel`, `helpPrefix`) — the sheet's own chrome, correctly not a help
key. Any guard built for [#1522](https://github.com/Selftend/selftend/issues/1522) must exempt `ui`,
and per the `escape-coverage.test.ts` precedent that exemption should be **derived**, not
hand-written.

Deleting all six orphan keys removes:

| What                                  | Count                                         |
| ------------------------------------- | --------------------------------------------- |
| `en/help.json` leaf strings           | 24 (6 keys × `title`/`what`/`how`/`why`)      |
| `bg/help.json` leaf strings           | 24                                            |
| **Total source + translated strings** | **48**                                        |
| Weblate units affected                | 24 source units, each with 1 `bg` translation |

This confirms the map's "48 strings" figure, and confirms the `× 2` is **locales**, not namespaces.
`cbt.json` and `act.json` are untouched.

---

## 2. Repo-side: what a deletion actually edits

| File                                     | Forced?                | Why                                                                                                                                            |
| ---------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/help/help-content.ts`      | ✅                     | Remove the key from the `HELP_KEYS` array. `HELP_CONTENT` is _derived_ from it via `Object.fromEntries`, so nothing else in that file changes. |
| `src/features/help/help-images.ts`       | ✅ **by the compiler** | See below.                                                                                                                                     |
| `src/i18n/locales/en/help.json`          | ✅                     | The 4 source strings.                                                                                                                          |
| `src/i18n/locales/bg/help.json`          | ✅ **by a repo test**  | See §3.                                                                                                                                        |
| `assets/images/help/<name>.png`          | ❌ **not forced**      | Nothing but `help-images.ts` references it; see §6.                                                                                            |
| `src/features/help/help-content.test.ts` | ❌                     | Fully _derived_ — it iterates `HELP_KEYS`. No assertion to edit.                                                                               |

### The compiler forces the image entry

`HELP_IMAGES` is typed `Partial<Record<HelpKey, ImageSourcePropType>>`. Removing a key from
`HELP_KEYS` narrows `HelpKey`, and the leftover entry then fails the excess-property check.
**Verified empirically** with a synthetic reproduction compiled by this repo's own `tsc`:

```
error TS2353: Object literal may only specify known properties,
and 'gamma' does not exist in type 'Partial<Record<"alpha" | "beta", string>>'.
```

So the `require(".../assets/images/help/foo.png")` line **cannot** be left behind. That is what
drops the PNG from the Metro bundle. The file on disk is invisible to `tsc` and would survive as
dead weight in git — a deliberate second step, not an automatic one.

### Contrast with `helpKey` — worth recording for #1519

`help-content.test.ts` is **derived** (it loops `HELP_KEYS`), so deleting a help key edits **no
assertion**. `cbt-home-config.test.ts:25` is **hand-written** (`strategy.helpKey.length > 0`), so
deleting that field **does** edit a passing assertion. Only #1519 carries the
"weakened test" review risk from AGENTS.md; the help-key deletions do not.

---

## 3. Must `bg/help.json` be edited in the same commit? — **Yes, and the repo decides it**

Independent of anything Weblate does, `src/features/help/help-content.test.ts` asserts:

```ts
const enKeys = Object.keys(enHelp).sort();
const bgKeys = Object.keys(bgHelp).sort();
expect(bgKeys).toEqual(enKeys);
```

Top-level key parity between `en/help.json` and `bg/help.json` is a **repo gate**. A commit that
deletes from `en` only fails CI. So the question "does Weblate reconcile it for us?" never gets to
be load-bearing: **both files must change together**, and the answer is settled locally.

This also matches the project's own precedent. PR
[#1413](https://github.com/Selftend/selftend/pull/1413) (merged 2026-08-25) deleted
`categories.cbt` and `categories.act` from **both** `en/navigation.json` and `bg/navigation.json` in
one commit.

> ⚠️ **But #1413 is not a Weblate precedent.** `navigation` was not created as a component until
> 2026-08-27 21:14 (see §7). That deletion never passed through Weblate. **No source-string removal
> has ever round-tripped through this project's Weblate** — see §7.

---

## 4. The i18n guards are blind to help keys — both directions

`test/i18n-key-coverage.test.ts` scans `app/` and `src/` for **string-literal** `t("…")` keys and
asserts each resolves in `en`. Two consequences for this map:

1. It is **one-directional** — it catches a key used in code but missing from the locale. It never
   catches a locale key that nothing uses. It could never have flagged these six orphans.
2. Help keys are built as **template literals** (`` `${key}.title` `` in `help-content.ts`), and the
   file's own header says _"Dynamic keys (template literals) are invisible to this guard"_. So the
   entire `help` namespace is outside its reach in **both** directions.

The guard #1522 specifies is therefore genuinely new work, not an extension of an existing check.

---

## 5. Weblate documentation findings

All quotes verbatim from `docs.weblate.org/en/latest/`, fetched 2026-08-28.

### 5.1 A removed source string is removed everywhere, on the next repository update

> "If you want to remove just some specific strings, there are following ways:
>
> - Manually in the source file. They will be removed from the **translation project as well upon
>   Weblate's repository update**."

— [devel/translations.html#removing-existing-translations](https://docs.weblate.org/en/latest/devel/translations.html#removing-existing-translations)

This is one of only **two** officially sanctioned removal methods, and it is the one this project
would use. Editing the source file in the repo is a documented, supported operation — not a
workaround.

For monolingual formats the base file is the authority for the string list:

> "For monolingual formats, the strings are managed **only on source language** and are
> **automatically added or removed in the translations**."

— [admin/projects.html#component-manage-units](https://docs.weblate.org/en/latest/admin/projects.html#component-manage-units)

**i18next is monolingual**, confirming the `en/help.json` template is that authority:

> "i18next translations are **monolingual**, so it is recommended to specify a base file with (what
> is most often the) English strings."

— [formats/i18next.html](https://docs.weblate.org/en/latest/formats/i18next.html)

**No graveyard.** That page's feature table reports `Supports removing obsolete strings: No` for
i18next — the format has no obsolete/archived concept (unlike gettext's `#~`). So there is no
orphaned-unit state to worry about at the file level.

### 5.2 Weblate does not rewrite `bg/help.json` for you — unless one add-on is installed

> "Weblate does not try to manipulate the translation files in any way other than allowing
> translators to translate. So it also **does not update the translatable files when the template or
> source code have been changed. You simply have to do this manually** and push changes to the
> repository."

— [faq.html#why-does-weblate-still-show-old-translation-strings…](https://docs.weblate.org/en/latest/faq.html#why-does-weblate-still-show-old-translation-strings-when-i-ve-updated-the-template)

The single exception is the opt-in **Cleanup translation files** add-on
(`weblate.cleanup.generic`), which runs on _Repository post-update_:

> "**Update all translation files to match the monolingual base file. For most file formats, this
> means removing stale translation keys no longer present in the base file.**"

— [admin/addons.html#cleanup-translation-files](https://docs.weblate.org/en/latest/admin/addons.html#cleanup-translation-files)

> ⚠️ **Whether that add-on is installed on Selftend's components is unverified** — see the closing
> section. **It does not change the answer**, because §3's repo test already forces both files into
> the same commit. Its only effect would be belt-and-braces: with our commit already removing the
> `bg` keys, the add-on would find nothing to clean.

### 5.3 No alert fires on a shrinking source file

The documented alert list is closed and enumerated. It covers duplicated source strings, duplicated
languages, merge/update/push failures, parse errors, billing limits, too many outgoing/missing
commits, missing licenses, add-on errors, misconfigured mono/bilingual translation, broken component
configuration, broken URLs, unused screenshots, ambiguous language code, unused new base, duplicate
file mask, conflicting merge-request setup, "component seems unused", and unused glossary languages.

— [devel/alerts.html](https://docs.weblate.org/en/latest/devel/alerts.html)

**None concerns removed, missing, or surplus strings.** Two entries read like near-misses and are
not: _"Unused new base in component settings"_ is about the **Template for new translations**
setting (Selftend's `new_base` is `""`, so it cannot fire), and _"Component seems unused"_ is an
activity check gated by `UNUSED_ALERT_DAYS`.

This is a useful result given the ☠️ from #1091 that `/alerts/` is 404 on every component: **the
alert that cannot be read is also an alert that should not fire.** The unreadable endpoint is not
hiding a deletion signal, because no deletion signal is defined.

### 5.4 Translators are not notified of removals — the vocabulary has no event for it

Weblate publishes the change-action table used in notification payloads
([admin/addons.html#change-actions](https://docs.weblate.org/en/latest/admin/addons.html#change-actions)).
The relevant rows:

| ID  | Identifier                              | Description                                                          |
| --- | --------------------------------------- | -------------------------------------------------------------------- |
| 71  | `string_added_in_the_repository`        | "A new string was found while synchronizing from the repository."    |
| 90  | `source_string_added_in_the_repository` | "A source string was added while synchronizing from the repository." |
| 59  | `string_updated_in_the_repository`      | "A string was changed while synchronizing from the repository."      |
| 63  | `string_removed`                        | "A string was removed from a translation."                           |

**The asymmetry is the finding.** There are repository-sourced events for strings **added** (71, 90)
and **changed** (59), but **no repository-sourced removal event** — no
`string_removed_in_the_repository`, no `source_string_removed`. Only the generic `string_removed`
(63) exists, and the docs never say a repository pull emits it.

That matches this project's observed history exactly: §7's scan found `String added in the
repository` and `String updated in the repository` as real, recorded action names — and no removal
action of any kind.

The digest notification's enumerated categories reinforce it:

> "The **Translation activity summary** notification is digest-only and summarizes **added,
> updated, translated, approved, needs editing, and unfinished strings**."

— [user/profile.html#notifications](https://docs.weblate.org/en/latest/user/profile.html#notifications)

**Removed is not among them.** The docs name a "new strings to translate" notification; no removal
counterpart appears anywhere.

**Statistics do move**, though this is inference from field definitions rather than a direct quote:
`total` is "total number of strings", so removing 24 source strings lowers `bg`'s `total` and its
absolute `translated` count, while `translated_percent` stays at 100 %.
— [api.html#statistics](https://docs.weblate.org/en/latest/api.html#statistics)

### 5.5 The one documented caveat: merge Weblate's pending changes first

There is **no** published multi-step safety procedure for string deletion (unlike file _renames_,
which get one because they "can lead to losing strings history, comments and suggestions"). The only
caveat that applies:

> "**Note:** It is usually a good idea to **merge changes done in Weblate before updating
> translation files**, as otherwise you will usually end up with some conflicts to merge."

— [faq.html#why-does-weblate-still-show-old-translation-strings…](https://docs.weblate.org/en/latest/faq.html#why-does-weblate-still-show-old-translation-strings-when-i-ve-updated-the-template)

**For this deletion that precondition is currently satisfied**: §7 establishes there are no
translator-made changes on Weblate at all, so there is nothing pending to merge and no conflict to
create. That is a property of _today_, not a permanent one — it stops being true the moment a
translator edits anything.

Supporting tooling if the situation changes: **Lock** ("Freeze translation changes while doing
repository maintenance outside Weblate") and **Commit** ("Commits pending changes stored in Weblate
to the local repository") —
[admin/continuous.html#repository-maintenance](https://docs.weblate.org/en/latest/admin/continuous.html#repository-maintenance).
Both need a token. `scripts/weblate-create-components.js` already refuses to pull when
`needs_commit` / `needs_push` are set, which is the same guard expressed in code.

### 5.6 Net answer

Deleting the six keys from `en/help.json` and `bg/help.json` in one commit, landing on `main` at the
next release, is a **documented, supported, alert-free, notification-free** operation. The
documentation describes no removal-specific hazard, and the only stated precondition (no pending
Weblate changes) holds today.

---

## 6. The asset tail

`HELP_IMAGES` ships a PNG for **all 19** help keys. `assets/images/help/` holds 19 files totalling
**6,703,532 bytes (6.39 MiB)**.

The six orphans:

| File                   | Bytes                    |
| ---------------------- | ------------------------ |
| `distortion_guide.png` | 465,718                  |
| `connection.png`       | 369,019                  |
| `expansion.png`        | 344,478                  |
| `committed_action.png` | 341,189                  |
| `observing_self.png`   | 331,112                  |
| `defusion.png`         | 303,760                  |
| **Total**              | **2,155,276 (2.06 MiB)** |

That is **32 % of the help-image payload**.

**Nothing else in the repo references these files.** A search for `images/help/` and
`assets/images/help` across the whole tree (excluding `node_modules`/`.git`) returns
**`src/features/help/help-images.ts` and nothing else** — no doc, script, config, test or manifest.
Each PNG has exactly one referrer.

⚠️ **Do not grep for the bare stems.** `defusion`, `connection`, `expansion` and `committed_action`
also name Supabase tables (`act_defusion_logs`, `act_committed_actions`, …) and appear throughout
`docs/`. Only the `images/help/` path search is meaningful.

**Images are optional.** `help-sheet.tsx:32` renders `{imageSource ? <Image …/> : null}`, and the
map is `Partial<…>`. So a key can be kept while its image is dropped — the two decisions are
separable, and "delete the PNG, keep the sheet" is an available middle option nobody has costed.

---

## 7. Has the first Weblate push happened? — **No, and nothing is pending**

- **No `weblate/*` branch exists on the remote.** `git ls-remote --heads origin "weblate/*"` returns
  empty.
- **No Weblate-authored PR exists** in any state.
- The `help` component was **created 2026-08-27 21:14:25** — about one day old.
- The project's most recent Weblate activity is **2026-08-27 21:15:11**, and every entry is
  `String added in the repository` **with no user** — i.e. repository-driven imports from the #1105
  component pass, not translator edits.

**Why there is no push:** Weblate opens a push only when it has local commits to send, and it makes
those from _translator_ edits. `bg` arrived already 100 % translated (§0), and no human has edited
anything on Weblate since the components were created. There is nothing to push, so the absence of
`weblate/auth` is **expected**, not a fault.

> ☠️ **The push path therefore remains untested** — exactly as #1091 recorded. A deletion would not
> by itself exercise it either: deletion flows repo → Weblate (a pull), not Weblate → repo. The
> `weblate/auth` PR and its ☠️ _merge-commit, never squash_ rule stay untested until a translator
> edits something.

### No removal has ever occurred here

Scanning **all 8,718** project change events (44 pages, anonymous API) yields these action types:

| Count | Action                           |
| ----- | -------------------------------- |
| 5,594 | String added in the repository   |
| 523   | String updated in the repository |
| 63    | Resource updated                 |
| 34    | Alert triggered                  |
| 31    | Remote repository updated        |
| 24    | String added                     |
| 15    | Component setting changed        |
| 9     | Component created                |
| 9     | Repository rebased               |
| 8     | Source string changed            |
| 4     | Repository notification received |
| 2     | Changes committed                |
| 1     | Explanation updated              |
| 1     | Project created                  |

**Not one removal event of any kind.** Combined with §3's finding that the only prior key deletion
(#1413) hit an untracked namespace, this means: **the project has zero empirical evidence about
what deletion does on Weblate.** Whatever §5's documentation says is the only guide available.

Per the standing rule that _absence of a bad signal is not presence of a good one_: this history
proves the path is **unexercised**, not that it is safe.

---

## 8. Translator coordination — no convention exists

`docs/stack.md` (lines 59–78) documents Weblate setup, the component script, the tracked-branch
screen, the alerts situation, and how to **add a language**. It says nothing about **removing**
strings, and defines no translator-notice expectation.

So there is no project convention to follow, and no convention being violated. If the map wants one,
it would be new — a small doc addition to `docs/stack.md`, which is the kind of thing AGENTS.md's
documentation rule ("update any human-facing doc whose content the change affects") would call for
if a deletion procedure is adopted.

Two facts bear on whether notice is warranted:

- The 24 `bg` strings are **complete human translations**, not placeholders (§0).
- There is exactly **one** translation language and, per the change log, **no active volunteer
  translator** — every `bg` string arrived via the repository, not via Weblate.

---

## Uncertain / not established

Nothing below changes the net answer in §5.6; each is recorded so the next session does not mistake
an unchecked item for a checked one.

**Instance state, checkable later:**

- ⚠️ **Whether the `Cleanup translation files` add-on is installed** on the Selftend components.
  Not load-bearing (§5.2) — the repo test already forces both locale files into one commit — but
  worth knowing. Run once the throttle clears:

  ```
  curl -s https://hosted.weblate.org/api/components/selftend/help/addons/
  curl -s https://hosted.weblate.org/api/components/selftend/auth/addons/
  ```

- ☠️ **The anonymous hosted-Weblate API is rate-limited, and this research exhausted it.** Paging
  the full project change history (44 requests at `page_size=200`) tripped a `429` with
  _"Expected available in 60061 seconds"_ — roughly **17 hours**. Budget anonymous reads, or use a
  token. Everything already reported here was captured before the limit hit.

**Not documented by Weblate (from the primary-source sweep):**

- The fate of a unit's **history, comments and suggestions** when its source string is removed. The
  docs confirm history is DB-backed and confirm history loss on file _rename_, but never state what
  happens to a unit deleted from the base file. Low stakes here: these 24 units have no comments or
  suggestions, and no translator history beyond the repository import.
- Whether removed units are **archived or hard-deleted** in Weblate's database. `Supports removing
obsolete strings: No` is a _file-format_ capability, not a statement about the DB.
- What Weblate does with **surplus keys** in a monolingual translation file (source 100, translation 106) — hidden, shown, or checked. Moot for this deletion, since both files change together.
- Whether a repository-driven removal emits change event **63 `string_removed`**. The docs list
  repository-sourced add/update events but no repository-sourced remove; §7 shows this project has
  never recorded a removal of any kind, so it is untested here too.
- The **full list of e-mail notification types**. So §5.4's conclusion is "no removal notification is
  documented, and the digest's enumerated categories exclude removals" — not a proof of absence.

**Blocked on a revoked token:**

- Weblate's **pending-commit state** (`needs_commit` / `needs_push`): `GET
/api/projects/selftend/repository/` is **403 anonymously**. §7 establishes indirectly that nothing
  is pending (no translator has ever edited anything), but the direct read needs a token.
- Whether any **alert** is currently raised: per #1091, `GET /api/components/selftend/<slug>/alerts/`
  answers **404 on every component**, so severity is readable only from the UI's Alerts tab. §5.3
  makes this largely moot — no documented alert covers removed strings. The 34 historical `Alert
triggered` events carry no component attribution in the anonymous payload.
