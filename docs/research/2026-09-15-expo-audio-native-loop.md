# What `expo-audio`'s loop does on iOS and Android, and whether it is gapless for AAC

Date: 2026-09-15 · Map: [#2428](https://github.com/Selftend/selftend/issues/2428) · Ticket:
[#2438](https://github.com/Selftend/selftend/issues/2438) · Branch: `research/expo-audio-native-loop`
(never merged; the branch name is the citation)

**Source policy for this file.** Every claim is either (a) read from the `expo-audio@57.0.2` npm
tarball (the exact version `package-lock.json` resolves; expo/expo carries no per-package tag, and
the `sdk-57` branch is already at 57.0.5), from the AndroidX Media3 `1.9.0` sources at the tag
`expo-audio` pins, or from Apple's SDK headers and documentation JSON, each with file and line; or
(b) a live observation I made on 2026-09-15, marked **observed**; or (c) explicitly labelled
**not verified against a primary source**. Nothing from a blog or Stack Overflow is used as
evidence. Where a vendor says nothing, this file says so.

---

## 0. Headline

1. **The README claim is true at the pinned version, and it dates from the fix, not before it.**
   `expo-audio@57.0.2` on iOS builds every player as an `AVQueuePlayer` and, when `loop` is on,
   keeps one duplicate `AVPlayerItem` of the same asset queued behind the current one with
   `actionAtItemEnd = .advance` (`ios/AudioPlayer.swift:28-42`, `:418-430`). On Android it sets
   `ExoPlayer.repeatMode = Player.REPEAT_MODE_ONE` (`android/.../AudioModule.kt:395-406`). Both
   file:line pairs quoted by [#1138](https://github.com/Selftend/selftend/issues/1138) match the
   pinned source exactly. The iOS mechanism arrived in expo-audio **56.0.0** (CHANGELOG, PR
   [expo/expo#43600](https://github.com/expo/expo/pull/43600), merged 2026-03-03, closing
   [expo/expo#42880](https://github.com/expo/expo/issues/42880) "not looping seamlessly on iOS");
   before it, iOS looped by seeking to zero at `AVPlayerItemDidPlayToEndTime`.
2. **Android: gapless by construction, and the shipped files carry what it needs.** A
   `REPEAT_MODE_ONE` repeat is an ordinary period transition (`Timeline.getNextWindowIndex`
   returns the same window), the renderer re-`configure`s the audio sink for the new stream, and
   `TrimmingAudioProcessor` drops the declared encoder delay at the start of every iteration and
   the declared padding at the end of the previous one. Every bed **observed** carries a
   single-entry `elst` with `media_time = 1024` samples (23.2 ms at 44.1 kHz) and zero padding,
   which is inside Media3's 4-sample window for reading an edit list as gapless metadata. Media3's
   own documentation: "Transitions between items in a playlist are seamless." No expo issue
   reports an Android loop gap; #42880 says the opposite ("On Android ... the audio loops
   seamlessly").
3. **iOS: "as gapless as possible", not guaranteed, and Apple says so in the header.**
   `AVQueuePlayer` "plays these items as gaplessly as possible in the current runtime environment,
   depending on the timely availability of media data for the enqueued items" (`AVPlayer.h`);
   `AVPlayerLooper.h` says "Note that the transition at the loop point is not guaranteed to be
   gapless." expo-audio's hand-rolled queue is the pattern Apple's `AVPlayerLooper` documentation
   describes as the manual alternative ("the same result can be accomplished with AVQueuePlayer
   directly"), with one look-ahead item where `AVPlayerLooper` keeps at least three replicas.
   Apple documents no number for the gap and no statement on whether the MP4 edit list is applied
   at an item transition. That claim **could not be verified against a primary source** (§1.4).
4. **The library gives the app no crossfade, no fade, no PCM push, and no wrap event while
   looping.** What it does expose at 57.0.2: any number of independent players, `seekTo` (with
   iOS-only tolerances that default to _fastest_, not _exact_), `currentTime`, a status event every
   `updateInterval` ms (default 500), `setPlaybackRate`, `volume`, `replace`, `preload`, and an
   `AudioPlaylist` whose `'single'` loop on iOS is the **old seek-to-zero** mechanism. `didJustFinish`
   never fires while `loop` is on, on either platform. The audio-sample APIs are read-only taps
   (Android's needs `RECORD_AUDIO`); `useAudioStream` is microphone capture.
5. **A format change does not buy a single asset for all three platforms.** Android decodes Opus
   in Ogg, MP4 and Matroska from 5.0 and Media3 feeds Opus pre-skip through the same trimming path.
   Apple's only primary statements are `kAudioFormatOpus` (iOS 11+) and Safari release notes
   (Opus-in-MP4 on macOS Sonoma with 17.0; Ogg Opus on iOS 18.4). Whether `AVPlayer` decodes
   Opus-in-MP4 or CAF on the iOS versions the app targets is **not verified against a primary
   source**.
6. **Two premises to correct in passing.** Not every bed is 30.000 s: `fire.m4a` is 29.520 s and
   `stream.m4a` 29.600 s by their own `mvhd`/`elst` (**observed**). And the beds carry **no**
   `iTunSMPB`; the priming is declared by the edit list alone, which is fine for Media3 (§2.3) and
   is Apple's native convention.

---

## 1. iOS

### 1.1 What `player.loop = true` does at 57.0.2

`AudioUtils.createAVPlayer` always returns an `AVQueuePlayer` — with the item if the source
resolves, empty otherwise (`ios/AudioUtils.swift:70-75`). The item is an
`AVPlayerItem(asset: AVURLAsset, automaticallyLoadedAssetKeys: [.tracks, .duration])` (`:92-93`).

The `loop` property (`ios/AudioModule.swift:156-160`) sets `AudioPlayer.isLooping`, whose `didSet`
(`ios/AudioPlayer.swift:28-42`):

```swift
if isLooping {
  ref.actionAtItemEnd = .advance
  enqueueNextLoopItem()
} else {
  removeQueuedLoopItems()
  ref.actionAtItemEnd = .pause
}
```

`play(at:)` repeats the same two lines before `playImmediately(atRate:)` (`:102-109`).
`enqueueNextLoopItem` (`:418-430`) bails unless the queue holds at most one item, then:

```swift
let nextItem = AVPlayerItem(asset: currentItem.asset)
nextItem.audioTimePitchAlgorithm = currentItem.audioTimePitchAlgorithm
queuePlayer.insert(nextItem, after: currentItem)
```

So the queue is never deeper than **two** items: the one playing and one look-ahead built from the
same `AVURLAsset` instance. A Combine publisher on `\.currentItem` (`:226-240`) fires on every
advance and enqueues the next duplicate, and re-registers the end-of-item observer. The
`AVPlayerItemDidPlayToEndTime` observer (`:442-472`) does **nothing** while looping — it only
emits `didJustFinish` when `!isLooping`. Turning `loop` off removes every item that is not
current (`:432-440`) and sets `.pause`.

There is no `AVPlayerLooper`, no `seek(to: .zero)` and no `AVAudioPlayer` anywhere on the
single-player path. (`AVAudioPlayer.numberOfLoops` — "Set a negative integer value to loop the
sound continuously" — is a different class expo-audio does not use for playback.)

**Where the mechanism came from.** expo/expo#42880 (opened 2026-02-04): a 5-second file looped on
iOS logged `playing: true → false → true` at the wrap and "the audio doesn't loop seamlessly";
"On Android this issue does not occur: the audio loops seamlessly". PR #43600 (merged
2026-03-03, files `AudioModule.swift`, `AudioPlayer.swift`, `AudioUtils.swift`) says: "When the
current item ends, we seek to the beginning and start again. ... `AVPlayer` does not have built-in
support for gapless looping. For that ideally we would use `AVPlayerLooper` but that means
switching out the entire player. ... because `AVQueuePlayer` is a subclass of `AVPlayer` we can
use that ... It's a bit of a hack but when looping is enabled, we enqueue a copy of the same item
so playback can continue seamlessly." It shipped as "[iOS] Improve looping support" under
**56.0.0 — 2026-05-05** (`CHANGELOG.md:105`). 57.0.0, 57.0.1 and 57.0.2 changed nothing on this
path.

### 1.2 What Apple says about the transition

- `AVQueuePlayer` class discussion, `AVPlayer.h:991-993` (iOS 18.5 SDK): "It plays these items
  as gaplessly as possible in the current runtime environment, depending on the timely
  availability of media data for the enqueued items. For best performance clients should
  typically enqueue only as many AVPlayerItems as are necessary to ensure smooth playback."
- `AVPlayerActionAtItemEndAdvance`, `AVPlayer.h:352`: "This value is supported only for players
  of class AVQueuePlayer."
- `AVPlayerLooper.h:17-20`: "The same result can be accomplished with AVQueuePlayer directly, but
  AVPlayerLooper provides a simpler interface to loop a single AVPlayerItem with an option to
  specify a time range. ... **Note that the transition at the loop point is not guaranteed to be
  gapless.**"
- `AVPlayerLooper` documentation (developer.apple.com, iOS 10+): "You can manually implement
  looping playback in your app using AVQueuePlayer, but AVPlayerLooper provides a much simpler
  interface". `init(player:templateItem:timeRange:)`: "The player item you specify will be used as
  a template to generate **at least 3 player item replicas** that will be inserted into the
  specified player's queue"; `loopingPlayerItems`: replicas are made "using the copy() method".
  `AVPlayerLooper` also "will change the actionAtItemEnd to AVPlayerActionAtItemEndAdvance if
  required" (`AVPlayerLooper.h:111`).

Reading: expo-audio's loop **is** the manual `AVQueuePlayer` technique Apple names, differing
from `AVPlayerLooper` in queue depth (2 vs ≥3) and in building the replica with
`AVPlayerItem(asset:)` rather than `copy()`. Apple gives the same non-guarantee to both. Nothing
in Apple's documentation promises sample-continuity across an item boundary, and nothing quantifies
the gap.

### 1.3 Documented or reported gap

- Apple: no figure anywhere in the pages and headers read.
- expo/expo: after #43600, no open or closed issue reports an audible gap at the iOS loop point
  (searched `repo:expo/expo expo-audio loop`, `... (gapless OR seamless OR "gap")` on 2026-09-15;
  the full hit lists are in §5). The remaining iOS loop issue is
  [#48342](https://github.com/expo/expo/issues/48342) (closed 2026-07-31): with `AVPlayer.
allowsExternalPlayback` at its default `true`, AirPlay takes the timeline and
  `AVPlayerItemDidPlayToEndTime` never fires locally, so the loop "silently fails" — the reporter's
  patch adds an `allowsExternalPlayback` option. The string `allowsExternalPlayback` does not
  occur in the 57.0.2 tarball (`ios/`, `build/*.d.ts`), so that option is **not** in the pinned
  version. (The issue's root-cause text describes the pre-#43600 notification handler; whether the
  queue-advance path behaves differently under AirPlay is not established by the issue.)

### 1.4 Not verified: does AVQueuePlayer honour the edit list at the wrap?

Every bed declares its AAC priming as a single-entry edit list, `media_time = 1024` at
44.1 kHz, presentation duration equal to the movie duration (**observed**, §2.3). The `elst`
convention is Apple's own (it is what Apple's encoders write instead of `iTunSMPB`), and
`AVPlayerItem.duration` for `rain.m4a` is 30.000 s by that edit. But I found **no Apple statement**
that an item-to-item advance in `AVQueuePlayer` starts the next item at the edit's `media_time`
without a discontinuity, nor any statement on whether the decoder's trailing frame of item N is
fully rendered before item N+1's first frame. Treat "iOS applies priming at the wrap" as
**unverified**; only a device measurement settles it.

---

## 2. Android

### 2.1 What `player.loop = true` does at 57.0.2

The player is an `ExoPlayer` from `ExoPlayer.Builder(context)` with `AudioAttributes.DEFAULT`,
main-looper, 10 s seek increments and, only if `preferredForwardBufferDuration > 0`, a
`DefaultLoadControl` with a raised max buffer (`android/.../AudioPlayer.kt:37-56`). Media3 is
pinned at **1.9.0** (`android/build.gradle:29`; tag published 2025-12-17). A bundled asset
becomes a `MediaItem.fromUri(android.resource://…/raw/<name>)` (or a file URI) fed to
`ProgressiveMediaSource` through `DefaultDataSource` (`AudioModule.kt:861-936`), then
`setMediaSource` + `prepare()` (`AudioPlayer.kt:93-98`).

The `loop` property (`AudioModule.kt:395-406`):

```kotlin
player.ref.repeatMode = if (isLooping) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
```

and status reports `loop = ref.repeatMode == Player.REPEAT_MODE_ONE` (`AudioPlayer.kt:196`).
There is no `MediaPlayer`, no `setLooping`, no manual seek. `didJustFinish` is derived from
`Player.STATE_ENDED` (`BaseAudioPlayer.kt:99-108`), which a `REPEAT_MODE_ONE` player never
reaches.

### 2.2 What Media3 says and does at a single-item repeat

**Documentation** ([Playlists](https://developer.android.com/media/media3/exoplayer/playlists),
last updated 2026-09-08):

> `Player.REPEAT_MODE_ONE`: The current item is repeated in an endless loop.
> Transitions between items in a playlist are seamless. ... You can use the same `MediaItem`
> multiple times within a playlist.
> When playback transitions to another media item, **or starts repeating the same media item**,
> `Listener.onMediaItemTransition(MediaItem, @MediaItemTransitionReason)` is called.

`Player.java:1383-1389` (1.9.0): "Repeats the currently playing MediaItem infinitely during
ongoing playback."

**Source path, 1.9.0.** A repeat is not a seek; it is the same period-transition machinery a
playlist uses:

- `Timeline.getNextWindowIndex(windowIndex, REPEAT_MODE_ONE, …)` returns `windowIndex`
  (`Timeline.java:1028-1029`); `MediaPeriodQueue` asks that question when it prepares the
  following period (`MediaPeriodQueue.java:340-341`, `:904-905`).
- The next period's `SampleQueue` re-emits the track `Format` on its first read
  (`SampleQueue.java:704-716`); `MediaCodecRenderer` records it against the presentation time of
  the first sample (`MediaCodecRenderer.java:1619-1622`) and, when output reaches that time,
  calls `onOutputFormatChanged` (`:681-712`).
- `MediaCodecAudioRenderer.onOutputFormatChanged` builds the sink format **with
  `encoderDelay`/`encoderPadding` copied from the track `Format`** (`MediaCodecAudioRenderer.java:642-643`)
  and calls `audioSink.configure`. `onProcessedStreamChange` additionally calls
  `audioSink.handleDiscontinuity()` (`:808-811`; `DefaultAudioSink.java:873-875`).
- `DefaultAudioSink.configure` sets `trimmingAudioProcessor.setTrimFrameCount(encoderDelay,
encoderPadding)` (`DefaultAudioSink.java:737-738`); because the output is already running the
  new configuration is held as `pendingConfiguration` (`:786-797`) and applied in `handleBuffer`
  only after `drainToEndOfStream()` (`:884-898`), which queues end-of-stream through the processor
  chain (`:1128-1138`).
- `TrimmingAudioProcessor.onQueueEndOfStream` discards the held-back end buffer — the previous
  iteration's padding — when a reconfiguration is pending (`TrimmingAudioProcessor.java:155-163`);
  `onFlush` then arms `pendingTrimStartBytes = trimStartFrames * bytesPerFrame` for the new
  iteration (`:166-181`). The class's own comment: "For gapless transitions, configure will
  always be called, so the end buffer is cleared in onQueueEndOfStream" (`:141-147`).

So on Android the wrap is a continuous stream into one `AudioTrack`, with the declared delay
trimmed at the head of every iteration and the declared padding at the tail of every iteration.
Whether that is _audibly_ seamless then depends only on what the file declares versus what the
decoder actually prepends (§2.3).

A caveat that matters for one of the alternatives: `TrimmingAudioProcessor.onFlush` carries a
TODO — "This implementation currently doesn't handle seek to start (where we need to trim at the
start again)" (`:172-177`). A JS-driven `seekTo(0)` loop on Android would therefore **replay the
priming samples** the native repeat trims.

### 2.3 What the shipped files declare (observed 2026-09-15)

Parsed from the `moov` boxes of every `.m4a` in `assets/sounds/breathing/` on `origin/dev`:

| file                                                                        | `mvhd` duration | `elst` (segment ms, `media_time` samples) | `mdhd` samples | `iTunSMPB` |
| --------------------------------------------------------------------------- | --------------- | ----------------------------------------- | -------------- | ---------- |
| `rain.m4a` (and brown-noise, forest, night, ocean, pink-noise, white-noise) | 30 000 ms       | 30 000, 1024                              | 1 324 024      | absent     |
| `fire.m4a`                                                                  | 29 520 ms       | 29 520, 1024                              | 1 302 856      | absent     |
| `stream.m4a`                                                                | 29 600 ms       | 29 600, 1024                              | 1 306 384      | absent     |

For `rain.m4a`: edit start 1024 samples, edit end `1024 + 30.000 s × 44 100 = 1 324 024` =
`mdhd` duration exactly, so declared **encoderDelay = 1024 samples (23.2 ms), encoderPadding = 0**.

Media3 reads an edit list as gapless metadata only inside a narrow window
(`BoxParser.java:114-118`, `:764-806`, `canApplyEditWithGaplessInfo` `:2721-2731`): one edit, an
audio track, start inside the first `MAX_GAPLESS_TRIM_SIZE_SAMPLES = 4` samples (here 1024 <
4096 ✓), end after the last 4 samples and not past the track duration (✓). The beds satisfy it,
so `GaplessInfoHolder` gets `encoderDelay = 1024, encoderPadding = 0` and
`MetadataUtil.setFormatGaplessInfo` stamps it on the audio `Format` (`MetadataUtil.java:130-137`).
`iTunSMPB` would be read from `udta` first (`Mp4Extractor.java:629-635`,
`GaplessInfoHolder.java:33`, `:90-99`) but is absent and not needed.

What this file does **not** establish: whether 1024 is the true delay of the encoder that made
the beds (typical AAC-LC delays are 1024 or 2112 depending on encoder). That is a pipeline
question, not a looper one; the audition's 0.00 ms lead/tail measurement in
`scripts/audio/README.md` was taken on decoded PCM and is the evidence the map already has.

### 2.4 Documented or reported gap

- Media3 documents none; the playlists page says transitions are seamless.
- ExoPlayer history: [google/ExoPlayer#8594](https://github.com/google/ExoPlayer/issues/8594)
  "Gapless playback is not working" (2021-02-16 → closed 2023-03-23) is the codec
  timestamp-ordering case that `MediaCodecRenderer.updateOutputFormatForTime` still works around
  by comment (`MediaCodecRenderer.java:685-691`). Not a 1.9.0 defect.
- expo/expo: nothing reports an Android loop gap (§5); #42880 states Android looped seamlessly
  while iOS did not.
- A Google-authored write-up of the mechanism exists ("ExoPlayer 2 - New audio features", Andrew
  Lewis, medium.com/google-exoplayer) but returned HTTP 403 to my fetch; it is **not** used as
  evidence here — the 1.9.0 source above is.

---

## 3. What else `expo-audio@57.0.2` exposes (for the alternatives)

From `build/AudioModule.types.d.ts`, `build/Audio.types.d.ts`, `build/ExpoAudio.d.ts` and the
native sources:

| affordance                                                                          | iOS                                                                                                                                                                     | Android                                                                                                        | notes                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Several simultaneous players                                                        | each `createAudioPlayer` is its own `AVQueuePlayer`                                                                                                                     | its own `ExoPlayer`                                                                                            | Nothing in the module caps the count; the app already runs a bed and one-shot bells side by side (`src/lib/native-audio.ts`). A crossfade needs two lane players and a second set of invariants (`src/lib/lane-player.ts:174-177`). |
| `volume`                                                                            | `AVPlayer.volume` (`AudioPlayer.swift:493-496`)                                                                                                                         | `ExoPlayer.volume`                                                                                             | Per-player, immediate. No native ramp/fade API exists; the app's 400 ms ramp is a JS `setInterval` (`lane-player.ts:83-126`).                                                                                                       |
| `seekTo(seconds, toleranceMillisBefore?, toleranceMillisAfter?)`                    | tolerances default to `CMTime.positiveInfinity` (`AudioPlayer.swift:181-186`) — i.e. _fastest_, not exact, unless both are passed                                       | `ExoPlayer.seekTo`; emits a `currentTime` status on `DISCONTINUITY_REASON_SEEK` (`BaseAudioPlayer.kt:114-122`) | On Android a seek to 0 does **not** re-trim priming (§2.2).                                                                                                                                                                         |
| `currentTime` getter                                                                | `currentItem.currentTime()` live                                                                                                                                        | `ExoPlayer.currentPosition`                                                                                    | Synchronous read across the bridge.                                                                                                                                                                                                 |
| `playbackStatusUpdate` event                                                        | periodic time observer at `updateInterval` (`:474-491`)                                                                                                                 | coroutine flow at `updateInterval` (`BaseAudioPlayer.kt:52-69`)                                                | Default 500 ms (`AudioPlayerOptions.updateInterval`).                                                                                                                                                                               |
| `didJustFinish`                                                                     | only when `!isLooping` (`:462-470`)                                                                                                                                     | only on `STATE_ENDED`, never under `REPEAT_MODE_ONE`                                                           | **No wrap event exists while looping.** A JS pre-roll would have to run `loop=false` and restart on `didJustFinish` (bridge + native start latency = the gap) or poll `currentTime`.                                                |
| `setPlaybackRate(rate, pitchCorrectionQuality)`                                     | `AVAudioTimePitchAlgorithm`                                                                                                                                             | `PlaybackParameters`, rate clamped 0.1–2.0 (`AudioPlayer.kt:183-187`)                                          | Not a loop tool.                                                                                                                                                                                                                    |
| `replace(source)` / `preload(source, preferredForwardBufferDuration)`               | `replaceCurrentSource` rebuilds the item (`:263-286`); preload keeps an `AVPlayerItem`                                                                                  | preload keeps the bytes in an in-memory cache (`AudioModule.kt:870-876`)                                       | Shortens the start of a _new_ player, which is what a second-player crossfade would want.                                                                                                                                           |
| `AudioPlaylist` (`createAudioPlaylist({ sources, loop: 'none'\|'single'\|'all' })`) | one `AVQueuePlayer` holding all items; `'single'` sets `actionAtItemEnd = .pause` and on end-time **`seek(to: .zero)` + `play`** (`AudioPlaylist.swift:73`, `:304-321`) | `repeatMode` (`AudioPlaylist.kt:64-77`)                                                                        | The playlist's single-loop on iOS is the pre-#43600 mechanism; `'all'` on a one-item list is not the same as the single player's queue trick either (it calls `skipTo(index: 0)`). Not an upgrade over `player.loop`.               |
| `setAudioSamplingEnabled` / `audioSampleUpdate`                                     | `MTAudioProcessingTap` on the item (`:355-399`)                                                                                                                         | `android.media.audiofx.Visualizer`, **requires `RECORD_AUDIO`** or logs and returns (`AudioPlayer.kt:166-172`) | Read-only observation of what is playing; no scheduling, no buffer injection. The Android permission is a privacy cost the app does not carry today.                                                                                |
| `useAudioStream` / `AudioStream`                                                    | `AVAudioEngine` **input** node (`AudioStream.swift:14`, `:115`)                                                                                                         | `AudioRecord` capture (`AudioStream.kt:140`)                                                                   | Microphone capture, not a PCM playback path.                                                                                                                                                                                        |

There is no PCM-push player, no `AVAudioEngine`/`AVAudioPlayerNode` scheduling, no
`AudioTrack` access, no native fade, and no crossfade in the module. `AudioPlayerOptions` at
57.0.2 are `updateInterval`, `downloadFirst`, `keepAudioSessionActive`,
`preferredForwardBufferDuration` (`build/Audio.types.d.ts:41-`); no `allowsExternalPlayback`.

---

## 4. Would a format change help natively?

**Android.** Opus decoder from Android 5.0, containers Ogg / MPEG-4 / Matroska; Vorbis and FLAC
decoders in Ogg, with MP4 from Android 10 ([Supported media formats](https://developer.android.com/media/platform/supported-formats),
last updated 2025-05-22). Media3 1.9.0 demuxes "Ogg ... Containing Vorbis, Opus and FLAC" and
M4A ([Supported formats](https://developer.android.com/media/media3/exoplayer/supported-formats),
2026-07-21); `BoxParser` recognises `Opus`/`dOps` in MP4 (`BoxParser.java:1266`, `:2225-2226`,
`:2344`); `OpusUtil` turns the OpusHead pre-skip into `encoderDelay` (`OpusUtil.java:58-65`), so
Opus rides the same trimming path as §2.2. Android is already gapless with AAC, so a format change
changes nothing there.

**iOS.** Primary statements found: `kAudioFormatOpus` exists from iOS 11.0 ("A key that specifies
the Opus codec, and uses no flags"); Safari 17.0 "Added support for stereo-only Opus in MPEG-4
and WebM containers on macOS Sonoma"; Safari 17.4 "Added support for the Vorbis audio codec on
iOS, iPadOS, and in visionOS"; Safari 18.4 "Added support for Ogg Opus and Ogg Vorbis on macOS
Sequoia 15.4, iOS 18.4, iPadOS 18.4, and visionOS 2.4" (Apple Safari release notes, read
2026-09-15). Those describe **WebKit**, not `AVPlayer`. Whether `AVPlayer`/`AVQueuePlayer`
decodes Opus in MP4 or CAF on the iOS versions the app supports is **not verified against a
primary source**; the only claim found is a non-Apple forum post ("it doesn't work on iOS 15, but
it does on iOS 17", Apple Developer Forums thread 775937, no Apple-staff reply). And a format
change would not remove the `AVQueuePlayer` non-guarantee in §1.2 — the transition mechanism is
the same whatever the codec.

**One asset for all three.** Ogg/Opus: Android yes; iOS `AVPlayer` no evidence; iOS Safari only
from 18.4. Opus-in-MP4: Android yes (5.0+); iOS `AVPlayer` unverified; Safari on iOS not stated in
Apple's notes (17.0 names macOS only). AAC-in-M4A is the only format verified on every player the
app uses today. Nothing here changes the `assets/sounds/` ceiling arithmetic in
`scripts/audio/README.md`.

---

## 5. expo-audio issue tracker, as searched on 2026-09-15

Queries via the GitHub search API, `repo:expo/expo ... is:issue`: `expo-audio loop` (30 hits) and
`expo-audio (gapless OR seamless OR "gap")` (30 hits). Everything loop-related:

| issue                                                                                                     | opened / state                             | what it is                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#42880](https://github.com/expo/expo/issues/42880) `[expo-audio] not looping seamlessly on iOS`          | 2026-02-04, closed 2026-03-03 by PR #43600 | Seek-to-zero loop: audible gap plus `playing:false` flicker at the wrap; Android fine. Fixed in 56.0.0 by the queue mechanism (§1.1).                        |
| [#48342](https://github.com/expo/expo/issues/48342) `player.loop silently fails on AirPlay`               | 2026-07-30, closed 2026-07-31              | Loop does not run at all under `allowsExternalPlayback = true`; proposed option not present in 57.0.2 (§1.3).                                                |
| [#18446](https://github.com/expo/expo/issues/18446) `[iOS] Expo-av setIsLoopingAsync Pause Between Loops` | 2022-08-01, closed 2025-05-07              | The **expo-av** predecessor: "a small break in-between the sounds on iOS ... On Android this break cannot be heard". Same platform asymmetry, older library. |
| [#36625](https://github.com/expo/expo/issues/36625) `no function to set loop property`                    | 2025-05-05, closed                         | API-surface request, not a gap report.                                                                                                                       |
| [#43819](https://github.com/expo/expo/issues/43819), [#47247](https://github.com/expo/expo/issues/47247)  | closed                                     | Playlist `currentIndex` bugs; the 57.0.1 fix is CHANGELOG line 21.                                                                                           |

No open issue reports a loop gap on either platform at 56.x or 57.x.

---

## 6. Where this leaves the seam question (facts only, no design)

- **Android**: the shipped mechanism is gapless by source and by Media3's documentation, and the
  files declare what it needs. If a wrap is audible on a device, the suspect is the file's declared
  delay versus its true delay, not the looper.
- **iOS**: the shipped mechanism is the manual `AVQueuePlayer` advance Apple names as equivalent to
  `AVPlayerLooper`; Apple calls both "as gapless as possible" and "not guaranteed to be gapless"
  and documents no figure. Nothing in expo-audio's tracker quantifies it after 56.0.0. Only a
  device measurement can say what the owner would hear.
- **Library affordances**: many independent players and per-player `volume`; `seekTo`,
  `currentTime`, status polling at ≥ 100 ms granularity; no fade, no crossfade, no PCM scheduling,
  and no wrap event while `loop` is on. Any app-driven alternative is built from those and pays
  bridge latency at the seam it creates.

---

## Sources

expo-audio (pinned version; the tarball is the primary artefact)

- `expo-audio@57.0.2` tarball: <https://registry.npmjs.org/expo-audio/-/expo-audio-57.0.2.tgz>
  (`package/ios/AudioPlayer.swift`, `AudioModule.swift`, `AudioUtils.swift`, `AudioPlaylist.swift`,
  `AudioStream.swift`; `package/android/src/main/java/expo/modules/audio/AudioPlayer.kt`,
  `BaseAudioPlayer.kt`, `AudioModule.kt`, `AudioPlaylist.kt`, `AudioStream.kt`;
  `package/android/build.gradle`; `package/build/*.d.ts`; `package/CHANGELOG.md`)
- Same files on the `sdk-57` branch (57.0.5, not the pinned version):
  <https://github.com/expo/expo/tree/sdk-57/packages/expo-audio>
- PR "[ios][audio] Improve looping support": <https://github.com/expo/expo/pull/43600>
- Issues: <https://github.com/expo/expo/issues/42880>, <https://github.com/expo/expo/issues/48342>,
  <https://github.com/expo/expo/issues/18446>
- Selftend `package-lock.json` (`expo-audio` 57.0.2, `expo` 57.0.7), `src/lib/lane-player.ts`,
  `src/lib/native-audio.ts`, `scripts/audio/README.md`, `assets/sounds/breathing/*.m4a` on `origin/dev`

Apple

- AVPlayerLooper: <https://developer.apple.com/documentation/avfoundation/avplayerlooper>
- `init(player:templateItem:timeRange:)`: <https://developer.apple.com/documentation/avfoundation/avplayerlooper/init(player:templateitem:timerange:)>
- `loopingPlayerItems`: <https://developer.apple.com/documentation/avfoundation/avplayerlooper/loopingplayeritems>
- AVQueuePlayer: <https://developer.apple.com/documentation/avfoundation/avqueueplayer>
- `AVPlayer.ActionAtItemEnd.advance`: <https://developer.apple.com/documentation/avfoundation/avplayer/actionatitemend-swift.enum/advance>
- `AVAudioPlayer.numberOfLoops`: <https://developer.apple.com/documentation/avfaudio/avaudioplayer/numberofloops>
- `kAudioFormatOpus`: <https://developer.apple.com/documentation/coreaudiotypes/kaudioformatopus>
- SDK headers `AVPlayerLooper.h`, `AVPlayer.h` (iPhoneOS 18.5 SDK), read from the mirror
  <https://github.com/xybp888/iOS-SDKs> — Apple's text, third-party hosting
- Safari release notes: <https://developer.apple.com/documentation/safari-release-notes/safari-17-release-notes>,
  <https://developer.apple.com/documentation/safari-release-notes/safari-17_4-release-notes>,
  <https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes>
- WebKit blog, Safari 17.0 (2023-09-18): <https://webkit.org/blog/14445/webkit-features-in-safari-17-0/>
- Apple Developer Forums thread 775937 (non-Apple author; cited only as the unverified claim it is):
  <https://developer.apple.com/forums/thread/775937>

AndroidX Media3 / ExoPlayer

- Release 1.9.0 (2025-12-17): <https://github.com/androidx/media/releases/tag/1.9.0>
- Sources at tag `1.9.0`: `libraries/common/.../Player.java`, `Timeline.java`;
  `libraries/exoplayer/.../MediaPeriodQueue.java`, `mediacodec/MediaCodecRenderer.java`,
  `audio/MediaCodecAudioRenderer.java`, `audio/DefaultAudioSink.java`, `audio/TrimmingAudioProcessor.java`,
  `source/SampleQueue.java`; `libraries/extractor/.../GaplessInfoHolder.java`, `OpusUtil.java`,
  `mp4/BoxParser.java`, `mp4/Mp4Extractor.java`, `mp4/MetadataUtil.java` —
  <https://github.com/androidx/media/tree/1.9.0/libraries>
- Playlists (repeat modes, seamless transitions): <https://developer.android.com/media/media3/exoplayer/playlists>
- Supported formats: <https://developer.android.com/media/media3/exoplayer/supported-formats>
- Android platform supported media formats: <https://developer.android.com/media/platform/supported-formats>
- google/ExoPlayer#8594: <https://github.com/google/ExoPlayer/issues/8594>
