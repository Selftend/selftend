# Android Development Build

Use the Android development build for normal development, reminder testing, and device verification. Do not use Expo Go as the primary Android runtime for this project.

## App identities

The development client uses a separate app identity from the Play build so both can be installed at the same time:

```text
Development package: org.vasilyoshev.selftend.dev
Development scheme: selftend-dev
Play package: org.vasilyoshev.selftend
Play scheme: selftend
```

Add `selftend-dev://auth-callback` to Supabase Auth redirect URLs before testing Google or email auth in the development build.

## First-time setup

1. Create or update `.env` with your real Supabase values (see [README.md](../README.md#quick-start)).
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
   node scripts/android-dev.js --list-avds
   ```

   The default emulator name is `Selftend_API_35`. If Android Studio created a different AVD name, set it before running the Android script:

   ```powershell
   $env:SELFTEND_ANDROID_AVD="Your_AVD_Name"
   ```

## Day-to-day workflow

For a real Android device over USB or wireless debugging:

```bash
npm run start       # local Supabase from .env.local
npm run start:prod  # hosted Supabase from .env
```

`npm run start` starts Metro for the development client with `.env.local`, which
is the local Supabase default. `npm run start:prod` uses `.env`, which should
point at the hosted Supabase project. Before Expo starts, the wrapper checks
`adb devices` and configures reverse mappings for every connected Android
device: Metro's port, plus the local Supabase port when
`EXPO_PUBLIC_SUPABASE_URL` points at `localhost`, `127.0.0.1`, or another local
host name. This keeps `http://localhost:54321` working from a physical phone.

For a fresh Android emulator boot plus dev-client launch:

```bash
npm run start:emulator       # local Supabase from .env.local
npm run start:prod:emulator  # hosted Supabase from .env
```

`npm run start:emulator` uses only the configured Android Studio emulator,
ignoring connected physical phones. It waits for the emulator to boot, starts the
Expo development-client server with the development app variant, configures
`adb reverse` for Metro and the local Supabase API port, then opens `Selftend
Dev` with the `selftend-dev://expo-development-client/?url=...` URL.
`npm run start:prod:emulator` follows the same emulator flow with hosted
Supabase values from `.env`, so it reverses Metro but skips the local Supabase
port.

The `:prod` script name means "use the hosted Supabase env", not "make a
production JavaScript build". Use `npm run web` for Expo web only. For temporary
Expo Go checks, run `npm exec expo -- start` directly. The emulator script
intentionally avoids Expo CLI's `--android` opener because it can fall back to
Expo Go when the development client is missing or stale. If automatic launch
reports that `Selftend Dev` is not installed, install the latest development
build, then rerun `npm run start:emulator`.

Pass Expo start flags after `--`, for example:

```bash
npm run start -- --clear
npm run start:emulator -- --clear
```

For physical-device local Supabase testing, the phone must be visible to `adb`
through USB debugging or wireless debugging before the reverse port can be
configured. Once `adb devices` lists the phone, run:

```bash
npm run start -- --clear
```

Without `adb reverse`, `http://localhost:54321` in `.env.local` points at the
phone itself and the app will fail network requests. `npm run start` configures
the reverse mappings automatically; use `SELFTEND_SKIP_ADB_REVERSE=1` only when
you intentionally want to skip that setup. Override the local Supabase port with
`SELFTEND_LOCAL_SUPABASE_PORT` if the local stack is not using `54321`.

The development build enables Android cleartext HTTP traffic so it can call the
local Supabase API at `http://localhost:54321` during development. Rebuild and
reinstall `Selftend Dev` after changing this native setting; Metro reloads do
not update Android manifest permissions or network policy.

Wireless debugging setup on Android:

1. Enable Developer options by tapping Settings -> About phone -> Build number
   seven times.
2. Open Settings -> System -> Developer options and enable Wireless debugging.
3. Open Wireless debugging -> Pair device with pairing code.
4. On the development machine, run `adb pair PHONE_IP:PAIRING_PORT` and enter the
   pairing code.
5. Connect with the main wireless debugging address using
   `adb connect PHONE_IP:ADB_PORT`, then confirm the phone appears in
   `adb devices`.

Once the development build is installed, keep using it as the default Android
development client. The day-to-day workflow should be `npm run start` for a real
device, `npm run start:emulator` for the emulator, and the `:prod` variants when
you want the hosted backend. Use `npm run build:android:development` only when
you need a refreshed binary.

Use Expo Go only for temporary checks. Expo Go uses `exp://.../--/auth-callback` redirects and can still fall back to the Supabase production Site URL if the exact current Metro redirect is not allow-listed.

## Troubleshooting

If `npm run start:emulator` fails with `Cannot find module 'ora'` from Expo CLI after a local EAS build, reinstall the project dependencies from the repository root:

```bash
npm install
```

This restores hoisted Expo CLI dependencies such as `ora` without changing the lockfile when `package-lock.json` is already current. Then rerun `npm run start:emulator`.

If Metro then fails with `EACCES: permission denied, lstat ... node_modules\\...\\.bin\\.<name>-<random>`, remove stale npm temporary `.bin` junctions from `node_modules`:

```powershell
$nodeModulesRoot = (Resolve-Path -LiteralPath node_modules).Path
$binDirs = Get-ChildItem -Force -Directory -Recurse -Filter '.bin' -LiteralPath $nodeModulesRoot -ErrorAction SilentlyContinue
$items = foreach ($binDir in $binDirs) {
  Get-ChildItem -Force -LiteralPath $binDir.FullName -ErrorAction SilentlyContinue | Where-Object {
    $_.Attributes -band [IO.FileAttributes]::ReparsePoint -and $_.Name -match '^\..+-[A-Za-z0-9]{8}$'
  }
}
$items | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
```

Then rerun `npm run start:emulator`. These paths are generated npm install artifacts; do not delete source files to fix this error.

If Android opens the Play build from a QR code, stop Metro, run `npm run start:emulator -- --clear`, then open `Selftend Dev` directly from the emulator launcher. If it still opens the Play build, uninstall any older development client that used the production package, then rebuild from the current config.

For quick native auth checks in Expo Go, Supabase also needs to allow the Expo Go callback URL that `Linking.createURL("auth-callback")` produces, commonly:

```text
exp://**/--/auth-callback
```

If Expo Go still falls back to the production Site URL, add the exact Metro URL shown for the current session, for example:

```text
exp://192.168.0.12:8081/--/auth-callback
```

Use the Android development build for reliable OAuth testing. Expo documents Expo Go callback URLs as development URLs, not stable production-style auth callbacks.

## Local Android builds

`npm run build:android:development:local` runs the EAS development build on your machine instead of in the cloud. Useful for iterating on a fresh dev client without consuming EAS cloud build minutes, or when offline.

The APK is written to `local-builds/android/selftend-dev-<timestamp>.apk` (gitignored). After the build finishes, the script starts a one-shot HTTP server on your LAN and prints a QR code so you can download the APK directly to a phone on the same Wi-Fi — no cable required. Open the QR in your phone camera, install when the browser/Files app prompts (you may need to enable "install unknown apps" once for that source), then Ctrl+C the server. Override the port with `SELFTEND_APK_SERVE_PORT`. In CI (`CI=true`) the server is skipped and the script just exits after the build.

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

## Cross-machine emulator testing

The `Android development APK` GitHub Actions workflow builds the development client via `npm run build:android:development:local` on the runner and uploads the `.apk` as an artifact. Useful when you want to install the dev client on an emulator running on a different machine (for example, building on Linux and emulating on a Windows host with a stronger GPU).

Trigger from the Actions tab, download the artifact, then `adb install -r <apk-name>.apk` on the target device. Run Metro on the same machine as the emulator with `npm run start`.
