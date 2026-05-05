# Contributing

Thanks for helping with Selftend.

This project is meant to be open to more than code contributions. Product, design, docs, content, QA, localization, and community work all matter.

## Project posture

- Mission-driven
- Free to users
- Non-profit
- Privacy-conscious
- Open-source

## Where collaboration happens

- GitHub: source of truth for issues, PRs, docs, and roadmap
- Discord: contributor chat and coordination
- Shared project email aliases: for support, security, and contributor contact

## Good first contribution areas

- documentation cleanup
- copy editing
- roadmap refinement
- design notes
- accessibility review
- issue triage
- test planning
- adding or improving translations

## Translating the app

Translation files live in `src/i18n/locales/`. Each supported language has a folder (e.g. `en/`, `bg/`) with seven JSON namespace files.

To improve an existing language, edit the JSON files in that language's folder.

To add a new language:

1. Copy `src/i18n/locales/en/` to `src/i18n/locales/{code}/`.
2. Translate every value in all seven JSON files. Do not change the keys.
3. Register the new language in `src/i18n/index.ts` (import the files, add the code to `supportedLanguages`, add the resources).
4. Add the language option to the language switcher in `src/features/settings/settings.tsx`.
5. Open a PR with the new locale.

See `docs/stack.md` for more details on the i18n architecture.

## Contribution flow

1. Open or find an issue.
2. If the change is larger than a typo, explain your approach before writing a lot of code.
3. Keep PRs focused.
4. Document product-impacting changes.
5. Update `ROADMAP.md` when the change materially affects product status, implementation progress, or the next planned steps.
6. Do not add product scope that conflicts with the roadmap without discussion.

## Local checks

Husky runs the pre-commit hook after `npm install`.

VS Code and Cursor should install the recommended Prettier and ESLint extensions from `.vscode/extensions.json`. The workspace settings make Prettier the default formatter and enable format-on-save. The ESLint extension can provide inline diagnostics when installed, but this repo does not require ESLint editor settings.

Editor extensions are optional for enforcement. The pre-commit hook runs `npm run format`, so contributors without the Prettier extension still get repo-wide formatting before commit. Use `npm run lint:fix` separately when you want ESLint to apply safe automatic fixes from the terminal.

The pre-commit hook runs:

- `npm run format`
- `npm run verify`, matching the shared CI checks

If formatting fails, run:

```bash
npm run format
```

## Rules for contributors

- Do not introduce dark patterns.
- Do not add invasive analytics casually.
- Do not copy code or product copy from other projects without license review and attribution.
- Do not frame the product as diagnosis, treatment, or crisis care.
- Be careful with mental-health content and tone.

## Recognition

Contributors should be thanked publicly in a way that matches their contribution. Recognition should include docs, design, QA, moderation, translations, and community work, not only code.
