# Android Development Build

Last updated: 2026-05-07

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
   npm run android:emulator:list
   ```

   The default emulator name is `Selftend_API_35`. If Android Studio created a different AVD name, set it before running the Android script:

   ```powershell
   $env:SELFTEND_ANDROID_AVD="Your_AVD_Name"
   ```

## Day-to-day workflow

```bash
npm run android
```

`npm run android` launches the configured Android Studio emulator when no Android device is connected, waits for it to boot, starts the Expo development-client server with the development app variant, configures `adb reverse` for Metro, then opens `Selftend Dev` with the `selftend-dev://expo-development-client/?url=...` URL. `npm run android:dev`, `npm run android:dev-server`, and `npm run android:studio` are aliases for the same flow.

You do not need to run `npm run start` first. `npm run start` (and its alias `npm run start:dev-client`) starts Metro for the development client when the emulator/device is already running. Use `npm run start:expo-go` if you specifically want plain `expo start` (web or Expo Go). For a fresh emulator boot plus install/launch of `Selftend Dev`, prefer `npm run android`.

The script intentionally avoids Expo CLI's `--android` opener because it can fall back to Expo Go when the development client is missing or stale. Use `npm run android:server-only` if you want to start the emulator and server without launching the dev client. If automatic launch reports that `Selftend Dev` is not installed, install the latest development build, then rerun `npm run android`.

Pass Expo start flags after `--`, for example:

```bash
npm run android -- --clear
```

Once the development build is installed, keep using it as the default Android development client. The day-to-day workflow should be `npm run android` plus the installed dev build, with `npm run build:android:development` only when you need a refreshed binary.

Use `npm run android:expo-go` only for temporary Expo Go checks. Expo Go uses `exp://.../--/auth-callback` redirects and can still fall back to the Supabase production Site URL if the exact current Metro redirect is not allow-listed.

## Troubleshooting

If `npm run android` fails with `Cannot find module 'ora'` from Expo CLI after a local EAS build, reinstall the project dependencies from the repository root:

```bash
npm install
```

This restores hoisted Expo CLI dependencies such as `ora` without changing the lockfile when `package-lock.json` is already current. Then rerun `npm run android`.

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

Then rerun `npm run android`. These paths are generated npm install artifacts; do not delete source files to fix this error.

If Android opens the Play build from a QR code, stop Metro, run `npm run android -- --clear`, then open `Selftend Dev` directly from the emulator launcher. If it still opens the Play build, uninstall any older development client that used the production package, then rebuild from the current config.

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

Trigger from the Actions tab, download the artifact, then `adb install -r <apk-name>.apk` on the target device. Run Metro on the same machine as the emulator with `npm run start:dev-client`.
