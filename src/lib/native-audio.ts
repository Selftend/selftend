import { Platform } from "react-native";

// Shared native-audio glue for the one-shot and lane players (breathing,
// timer). expo-audio is lazy-required inside the native branches so it stays
// out of the web bundle — web plays through HTMLAudioElement instead.
type ExpoAudioModule = typeof import("expo-audio");

let nativeAudioModeConfigured = false;

export function loadExpoAudio(): ExpoAudioModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- native-only path; lazy require keeps expo-audio out of the web bundle
  return require("expo-audio") as ExpoAudioModule;
}

/** Plays through the iOS mute switch, once per app run. */
export async function ensureNativeAudioMode(audio: ExpoAudioModule): Promise<void> {
  if (nativeAudioModeConfigured) return;
  await audio.setAudioModeAsync({ playsInSilentMode: true });
  nativeAudioModeConfigured = true;
}

/**
 * Fire-and-forget one-shot (timer bells, spoken intro cues). Self-releases
 * when playback finishes. Best-effort: audio must never crash a session.
 */
export function playOneShot(asset: number, volume: number): void {
  if (Platform.OS === "web") {
    try {
      const el = new window.Audio(asset as unknown as string);
      el.volume = volume;
      void el.play().catch(() => {});
    } catch {
      // best-effort
    }
    return;
  }
  void (async () => {
    try {
      const audio = loadExpoAudio();
      await ensureNativeAudioMode(audio);
      const player = audio.createAudioPlayer(asset);
      player.volume = volume;
      player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) player.remove();
      });
      player.play();
    } catch {
      // best-effort
    }
  })();
}
