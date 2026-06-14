# Selftend

<div align="center">
  <img src="./assets/icon.png" alt="Selftend logo" width="200" height="200" />
</div>

**Free, open-source guided self-help for web, iOS, and Android.**

Selftend is being built around private guided self-help. The current working slice pairs two evidence-based modules - a Gillihan-based CBT toolkit (thought records, exposure, worry, anger, beliefs, recovery planning) and an ACT module - with a set of shared tools: mood tracker, journal, gratitude log, grounding, meditation and breathing, sleep, and habits. A DBT module is on the roadmap. It has no ads, subscriptions, or paywalls.

Your entries are encrypted in the database at the field level; a leaked database backup exposes only ciphertext, not your content. See [.github/SECURITY.md](.github/SECURITY.md) for the full security posture.

## Quick Start

Requires Node `20.19.0+`.

```bash
git clone https://github.com/Selftend/selftend.git
cd selftend
npm install
```

Create one environment file:

```bash
cp .env.example .env
```

Use `.env` for hosted Supabase values. For local Supabase development, use:

```bash
cp .env.local.example .env.local
npx supabase start
```

In dev mode `.env.local` overrides `.env` (Expo's metro transform merges every `.env*` file over `process.env`). The default `start` scripts load `.env.local`. The `start:prod*` scripts load `.env` and temporarily hide `.env.local` so the dev-client actually hits the hosted Supabase - see [docs/android-development.md](docs/android-development.md) for the gory details.

## Run

```bash
npm run web                    # browser at http://localhost:8081
npm run start                  # Android device, local Supabase
npm run start:prod             # Android device, hosted Supabase (hides .env.local for the run)
npm run start:emulator         # Android emulator, local Supabase
npm run start:prod:emulator    # Android emulator, hosted Supabase
npm run ios                    # iOS simulator
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run verify # lint + format:check + typecheck + test:coverage + ratchet
npm run format
npm run test:coverage # run tests + write coverage report to coverage/ (report only; does not enforce the floor)
npm run coverage:ratchet # fail if lines/statements/functions/branches drop below coverage/baseline.json
npm run coverage:ratchet:update # lock in a new coverage floor after intentionally raising coverage
```

After running `npm run coverage:ratchet:update`, commit the updated `coverage/baseline.json` to keep the floor in sync.

## Documentation

| Topic              | Guide                                                      |
| ------------------ | ---------------------------------------------------------- |
| Contributing       | [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)         |
| Security           | [.github/SECURITY.md](.github/SECURITY.md)                 |
| Code of Conduct    | [.github/CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md)   |
| Docs index         | [docs/README.md](docs/README.md)                           |
| Android setup      | [docs/android-development.md](docs/android-development.md) |
| Architecture       | [docs/architecture.md](docs/architecture.md)               |
| Stack              | [docs/stack.md](docs/stack.md)                             |
| Privacy data model | [docs/data-privacy-model.md](docs/data-privacy-model.md)   |
| Supabase setup     | [supabase/README.md](supabase/README.md)                   |

## License

Code is licensed under AGPL-3.0-only. The Selftend name, logo, and branding are not licensed for reuse. See [LICENSE](LICENSE) and [.github/THIRD_PARTY_NOTICES.md](.github/THIRD_PARTY_NOTICES.md).
