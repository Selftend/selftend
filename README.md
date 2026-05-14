# Selftend

<div align="center">
  <img src="./assets/icon.png" alt="Selftend logo" width="200" height="200" />
</div>

**Free, open-source guided self-help for web, iOS, and Android.**

Selftend is being built around private guided self-help tools. The current working slice is a Gillihan-based CBT toolkit with goals, thought records, mood and self-care logs, exposure, mindfulness, and recovery planning. It has no ads, subscriptions, or paywalls.

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

`.env` takes precedence over `.env.local` when both exist.

## Run

```bash
npm run web              # browser at http://localhost:8081
npm run start            # Android device, local Supabase when available
npm run start:emulator   # Android emulator
npm run ios              # iOS simulator
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run verify           # typecheck + lint + test
npm run format
```

## Documentation

| Topic              | Guide                                                      |
| ------------------ | ---------------------------------------------------------- |
| Contributing       | [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)         |
| Roadmap            | [.github/ROADMAP.md](.github/ROADMAP.md)                   |
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
