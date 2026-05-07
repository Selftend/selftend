# Selftend

<div align="center">
  <img src="./assets/icon.png" alt="Selftend logo" width="200" height="200" />
</div>

Selftend is a free, non-profit, cross-platform mental health product.

This repository started as docs-first planning and now includes the first implementation scaffold: an Expo Router app with Google OAuth and passwordless email auth foundations, a CBT section, private thought records, settings, public policy surfaces, support links, tests, and CI.

## Mission

Build a widely available mental health app that helps as many people as possible without ads, subscriptions, manipulative engagement loops, or paywalls.

## Product direction

- wellness and self-help first, not diagnosis or therapist replacement
- guided self-help before social/community product features
- account-required MVP for cross-platform continuity
- gamification is optional, soft, and never punitive
- users should be able to choose which features they want and turn features off later
- notifications must be explicit, quiet by default, and easy to disable
- the app should be usable on iOS, Android, and in a browser from one product codebase

## Current implementation

The first shipped section is `CBT`.

Included now:

- Expo + React Native + TypeScript scaffold
- Expo Router app shell
- Supabase Google OAuth and magic-link auth wiring
- Google profile-picture import plus manual profile-picture changes backed by Supabase Storage
- NativeWind styling with default React Native Reusables-generated UI primitives
- brand theme tokens with a purple primary, gray secondary, and subtle purple-tinted surfaces
- CBT learn surface and guided thought record flow
- account-backed one-page app and CBT onboarding with a Settings reset control
- thought history, edit, and archive flow
- collapsible sidebar Tools navigation with CBT history nested under CBT
- placeholder routes for Mood tracker, Meditation, ACT, and Gratitude log
- quiet reminder settings, default-off, with native local reminders and web push infrastructure
- support, legal, privacy, crisis, and account-deletion surfaces
- shared safety callout, loading/empty/error states, mobile form shell, app toast feedback, and global error fallback
- Jest test harness
- provider-aware component test example for i18n, navigation assumptions, and mocked backend data
- GitHub issue / PR templates and CI workflow
- i18n with English and Bulgarian, runtime language switching in settings

Deferred intentionally:

- mood check-ins as a separate section
- journaling as a separate section
- real implementations for ACT, meditation, gratitude, and the broader tool library
- social features
- AI features

## Quick start

1. Install dependencies:

```bash
npm install
```

Use Node `20.19.0+` for this repo. That matches the `package.json` engine requirement. Expo SDK 54 does not work correctly on Node 18.

2. Copy env values:

```bash
cp .env.example .env
```

For a self-hosted or bring-your-own-Supabase build, start from:

```bash
cp .env.self-host.example .env
```

3. Fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_PUBLIC_APP_URL=http://localhost:8081` for local Expo web auth, or your production web origin before exporting a production web build
- `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` if testing browser push reminders
- `EXPO_PUBLIC_EAS_PROJECT_ID` only if you need to override the linked Expo project ID

Only put public client configuration in `EXPO_PUBLIC_*` values. Never put service-role keys, database passwords, OAuth secrets, SMTP secrets, or JWT secrets in Expo public env vars.

Web push also needs Supabase Edge Function secrets before browser reminders can send:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`, for example `mailto:support@selftend.org`
- `WEB_PUSH_CRON_SECRET`

For local Expo web auth, make sure the matching callback URL is allowed in Supabase Auth redirect URLs:

```text
http://localhost:8081/auth-callback
```

For quick native auth checks in Expo Go, Supabase also needs to allow the Expo Go callback URL that `Linking.createURL("auth-callback")` produces, commonly:

```text
exp://**/--/auth-callback
```

If Expo Go still falls back to the production Site URL, add the exact Metro URL shown for the current session, for example:

```text
exp://192.168.0.12:8081/--/auth-callback
```

Use the Android development build for reliable OAuth testing. Expo documents Expo Go callback URLs as development URLs, not stable production-style auth callbacks.

The Android development client intentionally uses a separate app identity from the Play build so both can be installed at the same time:

```text
Development package: org.vasilyoshev.selftend.dev
Development scheme: selftend-dev
Play package: org.vasilyoshev.selftend
Play scheme: selftend
```

Add `selftend-dev://auth-callback` to Supabase Auth redirect URLs before testing Google or email auth in the development build.

4. Run the app:

```bash
npm run start
```

Useful commands:

```bash
npm run web
npm run android
npm run android:dev-server
npm run android:server-only
npm run android:emulator:list
npm run android:emulator
npm run start:dev-client
npm run android:expo-go
npm exec expo -- config --type prebuild --json
npm run build:android:development
npm run build:android:development:local
npm run build:android:preview
npm run build:android:production
EAS_LOCAL_BUILD_ARTIFACTS_DIR=./build-artifacts npm exec eas-cli -- build --platform android --profile production --local --non-interactive
npm run export:web
npm run serve:web:production
npm run typecheck
npm test -- --runInBand
npm exec @react-native-reusables/cli@latest -- doctor --summary --yes
```

For Android development, use the installed development build with `npm run android` or `npm run start:dev-client`. Do not treat Expo Go as the default Android workflow for this project.

Before a Google Play upload, run `npm exec expo -- config --type prebuild --json` and confirm the resolved Android permissions do not include `android.permission.CAMERA` or `android.permission.RECORD_AUDIO`. The app only uses the photo library for optional profile-picture changes, and `app.config.ts` disables camera and microphone permissions in `expo-image-picker` for Play policy hygiene.

## Branding and assets

Icon files are stored in `assets/`:

- **`selftend-icon-source-2048.png`** (in `assets/branding/`) — Original source icon at 2048×2048. Use this as the primary source for any future icon updates or exports.
- **`icon.png`** — 1024×1024, iOS app icon
- **`adaptive-icon.png`** — 1024×1024, Android adaptive icon foreground
- **`splash-icon.png`** — 1024×1024, splash screen
- **`favicon.png`** — 192×192, web favicon
- **`favicon-512.png`** — 512×512, web PWA icon

All resized versions are generated from the source using `assets/branding/selftend-icon-source-2048.png`. If you update the source icon, regenerate all sizes using the Python script (see below) or equivalent image resizing tool.

To regenerate icon sizes from the source:

```bash
python3 << 'EOF'
from PIL import Image

source_path = './assets/branding/selftend-icon-source-2048.png'
img = Image.open(source_path).convert('RGBA')

sizes = {
    'assets/icon.png': 1024,
    'assets/adaptive-icon.png': 1024,
    'assets/splash-icon.png': 1024,
    'assets/favicon.png': 192,
    'assets/favicon-512.png': 512,
}

for output_path, size in sizes.items():
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(output_path, 'PNG')
EOF
```

## Android development build

Use the Android development build for normal development, reminder testing, and device verification. Do not use Expo Go as the primary Android runtime for this project.

1. Create or update `.env` with your real Supabase values.
2. The linked Expo project ID is already configured in `app.config.ts`. Only set `EXPO_PUBLIC_EAS_PROJECT_ID` if you need to override it.
3. If the project is not yet linked in EAS for your account, run `npm exec eas-cli -- init`.
4. Make sure Supabase Auth allows the development callback:

```text
selftend-dev://auth-callback
```

5. Build the Android development client:

```bash
npm run build:android:development
```

6. Install the resulting build on the Android device or emulator. It installs as `Selftend Dev` with package `org.vasilyoshev.selftend.dev`, so it can coexist with the Play/internal-testing app.
7. Confirm the Android Studio emulator exists:

```bash
npm run android:emulator:list
```

The default emulator name is `Selftend_API_35`. If Android Studio created a different AVD name, set it before running the Android script:

```powershell
$env:SELFTEND_ANDROID_AVD="Your_AVD_Name"
```

8. Start the day-to-day Android development flow:

```bash
npm run android
```

`npm run android` launches the configured Android Studio emulator when no Android device is connected, waits for it to boot, starts the Expo development-client server with the development app variant, configures `adb reverse` for Metro, then opens `Selftend Dev` with the `selftend-dev://expo-development-client/?url=...` URL. `npm run android:dev`, `npm run android:dev-server`, and `npm run android:studio` are aliases for the same flow.

You do not need to run `npm run start` first. `npm run start` is the plain Expo start command, mainly useful for Expo Go or web-oriented checks. For the installed development client, use `npm run android`, or use `npm run start:dev-client` when the emulator/device is already running and you only need Metro.

The script intentionally avoids Expo CLI's `--android` opener because it can fall back to Expo Go when the development client is missing or stale. Use `npm run android:server-only` if you want to start the emulator and server without launching the dev client. If automatic launch reports that `Selftend Dev` is not installed, install the latest development build, then rerun `npm run android`.

Pass Expo start flags after `--`, for example:

```bash
npm run android -- --clear
```

If Android opens the Play build from a QR code, stop Metro, run `npm run android -- --clear`, then open `Selftend Dev` directly from the emulator launcher. If it still opens the Play build, uninstall any older development client that used the production package, then rebuild from the current config.

Once the development build is installed, keep using it as the default Android development client. The day-to-day workflow should be `npm run android` plus the installed dev build, with `npm run build:android:development` only when you need a refreshed binary.

Use `npm run android:expo-go` only for temporary Expo Go checks. Expo Go uses `exp://.../--/auth-callback` redirects and can still fall back to the Supabase production Site URL if the exact current Metro redirect is not allow-listed.

### Local Android builds

`npm run build:android:development:local` runs the EAS development build on your machine instead of in the cloud. Useful for iterating on a fresh dev client without consuming EAS cloud build minutes, or when offline.

Prerequisites:

- Android SDK with `cmdline-tools/latest`, `platform-tools`, `build-tools`, and a recent `platforms` directory. Easiest install path is Android Studio → SDK Manager.
- JDK 17 (Android Gradle Plugin 8 requires 17).
- `ANDROID_HOME` and `JAVA_HOME` exported in `~/.profile`.

Use `~/.profile`, not `~/.bashrc`. `.bashrc` is only sourced by interactive bash, so EAS local builds spawned by IDEs, agents, or any other non-interactive subprocess will not see exports placed there and Gradle fails with `SDK location not found`. `.profile` is sourced once at desktop login and the values propagate to every process in the session.

Example block to add to `~/.profile`:

```sh
if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
    PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
fi

if [ -d "$HOME/jdk-17" ]; then
    export JAVA_HOME="$HOME/jdk-17"
    PATH="$JAVA_HOME/bin:$PATH"
fi
```

After editing, run `source ~/.profile` for the current shell, and log out and back into the desktop once so every newly-spawned terminal inherits the values.

## Manual release workflows

GitHub Actions has separate manual release workflows for production surfaces:

- `Android Play internal release`: checks out `main`, runs an EAS local Android production build on the GitHub runner, uploads the `.aab` as a workflow artifact, and can upload it as a draft Google Play internal-testing release.
- `Web production deploy`: checks out `main`, exports the Expo web app, and deploys `dist` to Netlify production.

There is also a manual development build workflow for cross-machine emulator testing:

- `Android development APK`: builds the development client via `npm run build:android:development:local` on the runner and uploads the `.apk` as an artifact. Useful when you want to install the dev client on an emulator running on a different machine (for example, building on Linux and emulating on a Windows host with a stronger GPU). Trigger from the Actions tab, download the artifact, then `adb install -r selftend-dev.apk` on the target device. Run Metro on the same machine as the emulator with `npm run start:dev-client`.

Required GitHub repository variables for both workflows:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_PUBLIC_APP_URL
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_PRIVACY_EMAIL
EXPO_PUBLIC_SECURITY_EMAIL
```

Android also requires `EXPO_TOKEN` as a repository secret. Store submission additionally requires `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` after the first manual Google Play upload and Play API setup are complete.

EAS preview and production builds also require matching EAS environment variables before running `npm run build:android:preview` or `npm run build:android:production`. The app now fails those builds if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing, so a Play build cannot be shipped with auth disabled by accident.

Web deployment requires `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` as repository secrets.

## Repo map

- [ROADMAP.md](ROADMAP.md): feature roadmap, launch phases, and readiness criteria
- [AGENTS.md](AGENTS.md): instructions for AI agents working in this repo
- [CONTRIBUTING.md](CONTRIBUTING.md): contributor flow and expectations
- [docs/product-principles.md](docs/product-principles.md): product guardrails
- [docs/data-privacy-model.md](docs/data-privacy-model.md): shared data, privacy, draft, export, and deletion model
- [docs/stack.md](docs/stack.md): approved technical stack
- [docs/costs.md](docs/costs.md): launch and operating cost planning
- [docs/deployment.md](docs/deployment.md): single-page web deployment and Supabase auth callback setup
- [docs/self-hosting.md](docs/self-hosting.md): supported hosted and self-hosted backend modes
- [docs/android-closed-testing.md](docs/android-closed-testing.md): Google Play closed-testing readiness
- [docs/policies.md](docs/policies.md): public policy surfaces and launch-review status
- [docs/naming.md](docs/naming.md): final app-name decision and naming checks
- [docs/community.md](docs/community.md): contributor/community and popularization strategy
- [docs/licensing.md](docs/licensing.md): license choice and reference-repo rules
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): current third-party notice tracking for copied/generated code
- [docs/modules/cbt.md](docs/modules/cbt.md): first CBT module spec
- [docs/modules/tools.md](docs/modules/tools.md): Tools navigation and placeholder-module rules
- [docs/reference-log.md](docs/reference-log.md): reference-repo usage log
- [docs/github-setup.md](docs/github-setup.md): GitHub workflow and label setup
- [docs/internal-testing.md](docs/internal-testing.md): internal build and testing checklist
- [supabase/README.md](supabase/README.md): schema and environment notes

## Documentation expectation

This repo relies on docs as durable context. When a change affects setup, commands, deployment, store submission, environment variables, safety/legal boundaries, current blockers, or next user inputs, update the relevant docs in the same pass so fresh-context agents can resume safely.

## Status

Implementation scaffold is in place and pushed to GitHub. A real Supabase project exists, Android development should use the installed development build rather than Expo Go, and the UI shell now uses NativeWind with default React Native Reusables-generated primitives plus brand tokens from the Selftend icon palette. The P0 app and backend foundation now includes shared safety, feedback, loading/empty/error, mobile form, online-first draft, global error fallback, data/privacy, module-contract, component-test patterns, repaired Supabase migration history, profile avatar storage, language preference persistence, account-backed one-page app/CBT onboarding flags, native local reminders, and browser push reminder infrastructure. Launch-prep docs cover single-page Netlify web deployment plus Google Play closed testing, including Android permission hardening for the first Play upload. The next blockers are `selftend.org` purchase/DNS, Netlify production env verification, web push VAPID keys and Supabase Edge Function secrets, web reminder cron scheduling, domain email aliases, Expo/EAS authentication on the build machine, Google Play organization account setup, first manual AAB upload, Supabase production Site URL and redirect verification, and end-to-end auth/persistence/profile-picture/reminder verification on web and device builds from the current environment.

The current database/storage contract includes profile avatar metadata, a private Supabase Storage `profile-pics` bucket, timestamped reminder consent fields, and `web_push_subscriptions` for opted-in browser reminders. Removed profile photos use the existing nullable avatar fields plus a removal timestamp, so no extra avatar-source value is required. Apply all migrations before testing profile-picture upload, profile-picture removal, account deletion cleanup, or browser reminders.

The first web and Android testing path uses the maintainer-hosted Supabase project. Data separation remains a product direction, but it is not a launch blocker: add export/delete first, then local-only storage, then encrypted backup/import, with custom backend or Drive sync considered later.

## Reference repositories

This project may inspect sibling repositories such as `../freecbt`, `../quirk`, `../ifme`, and `../awesome-mental-health` for ideas, workflows, and lessons, but should not copy code, text, or assets into this repo without explicit license review and attribution.
