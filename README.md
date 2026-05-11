# Selftend

<div align="center">
  <img src="./assets/icon.png" alt="Selftend logo" width="200" height="200" />
</div>

**A free, open-source mental health app for web, iOS, and Android.**

https://github.com/Selftend/selftend

Selftend helps you with guided self-help tools including cognitive behavioral therapy (CBT), mood tracking, meditation, and more. No ads, no subscriptions, no paywalls.

## Quick Start

### 1. Install dependencies

```bash
git clone https://github.com/Selftend/selftend.git
cd selftend
npm install
```

Requires Node 20.19.0+.

### 2. Set up environment

You have two options for environment configuration:

**Option A: Use `.env` for remote Supabase (hosted)**

```bash
cp .env.example .env
```

Fill in your hosted Supabase URL and anon key. Good for testing against a shared backend.

**Option B: Use `.env.local` for local Supabase**

```bash
cp .env.local.example .env.local
```

Fill in your local Supabase URL and anon key from `supabase/config.toml`. Run `npx supabase start` to start local backend.

**.env takes precedence over .env.local** if both exist.

### 3. Run the app

**Web browser:**

```bash
npm run web
```

Opens at http://localhost:8081

**Android emulator:**

```bash
npm run start:emulator
```

Uses local Supabase if `.env.local` exists, otherwise uses `.env`. Requires Android Studio emulator running.

**Android device (connected via USB):**

```bash
npm run start
```

Detects connected device automatically. Enable USB debugging on device.

**iOS simulator:**

```bash
npm run ios
```

### 4. Day-to-day commands

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint code quality
npm run test        # Run Jest tests
npm run verify      # Typecheck + lint + test
npm run format      # Format code with Prettier
```

## Documentation

| Topic         | Guide                                                      |
| ------------- | ---------------------------------------------------------- |
| Android Setup | [docs/android-development.md](docs/android-development.md) |
| Contributing  | [CONTRIBUTING.md](CONTRIBUTING.md)                         |
| Roadmap       | [ROADMAP.md](ROADMAP.md)                                   |
| Tech Stack    | [docs/stack.md](docs/stack.md)                             |
| Privacy       | [docs/data-privacy-model.md](docs/data-privacy-model.md)   |

## License

AGPL-3.0-only. The Selftend name, logo, and branding are not licensed. See [LICENSE](LICENSE) for details.

## Contributing

This is a community project. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/contributor-roles.md](docs/contributor-roles.md) to get started.
