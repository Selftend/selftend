# Which web loopers are gapless for AAC-in-MP4, and what each does with the declared encoder delay

Date: 2026-09-15 · Map: [#2428](https://github.com/Selftend/selftend/issues/2428) · Ticket:
[#2437](https://github.com/Selftend/selftend/issues/2437) · Branch: `research/web-aac-loop-gaplessness`
(never merged; the branch name is the citation)

**Source policy for this file.** Every claim is either (a) quoted from a spec (WHATWG HTML, W3C Web
Audio, W3C MSE, IETF RFC 7845), (b) read from engine source at `main` on 2026-09-15 (Chromium via
`raw.githubusercontent.com/chromium/chromium`, WebKit via `WebKit/WebKit`, Gecko via
`mozilla-firefox/firefox` and `mozilla/gecko-dev`, FFmpeg via `FFmpeg/FFmpeg`) with the file path and
the function or line quoted, (c) read from the engine's own bug tracker or commit log, with the id and
date, or (d) explicitly labelled **not verified against a primary source**. Where the engine's
behaviour lives inside a closed Apple framework (AVFoundation, CoreAudio) this file says so rather than
guessing. Nothing from a blog, Stack Overflow or caniuse is used as evidence; caniuse and MDN were used
only as pointers.

---

## 0. Headline

1. **`HTMLMediaElement.loop` is gapless in exactly one engine: Gecko.** Firefox implements
   "seamless looping" inside the decoder state machine (`LoopingDecodingState`, shipped for audio in
   Firefox 59, bug 654787) — the audio sink is never stopped and the demuxer is re-seeked to zero
   while samples keep flowing with a running offset. Chromium's `loop` is a full pipeline seek
   (flush renderer, reset decoder, seek demuxer, re-buffer), and Chromium ruled it **Won't Fix
   (Infeasible)** on 2024-06-27 (issue 349781051); a 2026 community CL to change that was abandoned
   on 2026-03-03. WebKit's `loop` is `seekInternal(0)` → `[AVPlayerItem seekToTime:…]`; the audible
   pause is WebKit bug 230553, open since 2021 with duplicates back to 2009.
2. **The declared encoder delay is honoured on every restart in Chromium and Gecko — the pause is
   not the priming frames.** FFmpeg's MOV demuxer converts the `elst` into per-packet skip-sample
   side data both on open and on every seek (`mov_get_skip_samples`), Chromium turns that into
   `DecoderBuffer` discard padding and re-arms `AudioDiscardHelper` on every decoder reset; Gecko's
   demuxer re-emits a negative-pts first sample after the loop seek and `AudioTrimmer` trims it. So
   in those two engines the priming is discarded at every wrap. WebKit hands the file to
   AVFoundation; whether AVPlayer re-trims after a seek is Apple-internal and **not verifiable from
   source** (Apple's own QTFF appendix says a player _should_ trim at start and after every seek).
3. **What the owner most likely hears.** The "short pause" is the pipeline restart (Chromium) or
   the AVPlayer seek (WebKit). No fade, ramp or gain envelope exists in Chromium's audio-renderer,
   mixer or output-device code, nor in WebKit's AVFoundation player wrapper (grep on 2026-09-15,
   §3.5). The MDCT "first frame ramps up" signature is real in principle (§3.5) but it sits inside
   the priming region that Chromium and Gecko discard, so it cannot be the fade-in in those engines;
   the most economical reading is a silent gap followed by the broadband bed's onset, which the ear
   reports as a fade-in. Settling it needs one measurement (a loopback recording of the wrap), not
   more reading.
4. **Web Audio is the sample-accurate looper by spec** ("The playback of a looped buffer should
   behave identically to an unlooped buffer containing consecutive occurrences of the looped audio
   content"), and `decodeAudioData` trims AAC priming in all three engines _today_: Chromium via
   the same discard-padding path plus a 2026-06-09 end-trim fix; Gecko via `AudioTrimmer` plus a
   last-packet trim in the MP4 demuxer; WebKit via an AVAssetReader rewrite merged 2026-03-12 that
   reads CoreMedia's trim attachments — which Safari version ships that is **not verified**.
   The decoded bed is `30 s × contextSampleRate × 2 ch × 4 B`: 10,584,000 B at 44.1 kHz,
   11,520,000 B if the context runs at 48 kHz (the spec resamples to the context rate).
5. **MSE gapless is documented by Google and viable as an infinite "double-buffered" append**, in
   Dale Curtis's own words; it keeps the media element but brings sequence/append-window bookkeeping,
   a ~12 MB desktop audio buffer cap, and on iPhone only `ManagedMediaSource` (Safari 17.1+).
6. **Opus is honoured by spec (RFC 7845 pre-skip) and is playable in `<audio>` and
   `decodeAudioData` in all three engines now**: Chromium and Gecko in Ogg, WebM and MP4; WebKit in
   WebM (macOS Safari 15, iOS 17.4) and Ogg (Safari 18.4), with Opus-in-MP4 for `decodeAudioData`
   fixed 2026-03-12 but the `<audio>` feature request (bug 176650) still open. WAV has no encoder
   delay by construction.

---

## 1. Premises checked against the code

- `src/lib/lane-player.ts:44-55` (`openWeb`): `const el = new window.Audio(asset)`, `el.loop = loop`,
  `el.volume = volume`, `await el.play()`. No `ended` handler, no second element. Confirmed on
  `origin/dev` 2026-09-15. The fade (`LOOP_FADE_MS = 400`, `FADE_STEP_MS = 20`) is a `setInterval`
  ramp on `el.volume` and runs only from `play()`/`stop()` of the lane, as the map says.
- The ticket's "`ffprobe` reports `start_time=0.000000`, so the delay is declared" is consistent
  with FFmpeg's own accounting: `libavformat/demux.c` adds `skip_samples` to `st->start_time`
  (`st->start_time = av_sat_add64(st->start_time, av_rescale_q(sti->skip_samples, …))`, two sites
  around lines 907 and 919), so a stream whose first packet carries a negative pts equal to the
  priming reports `start_time = 0`. That is exactly the edit-list case.
- Why an edit list is there at all: `libavformat/movenc.c` defaults `use_editlist` to auto (`-1`) and
  resolves it to `1` for non-fragmented output (`if (mov->use_editlist < 0) { mov->use_editlist = 1;
…}`, ~line 8290); `mov_write_edts_tag` writes `delay = start_dts + start_cts` as the edit's
  media time (~line 4170). Apple's QTFF appendix describes the same convention: "The media time
  field of the edit list must indicate the first sample to be presented and will correspond in time
  to the first audio sample following the encoder delay in that track."

## 2. What the spec says `loop` is

WHATWG HTML, §4.8.11 (fetched 2026-09-15):

> The loop attribute is a boolean attribute that, if specified, indicates that the media element is
> to seek back to the start of the media resource upon reaching the end.

and the playback-end steps:

> When the current playback position reaches the end of the media resource when the direction of
> playback is forwards, then the user agent must follow these steps: If the media element has a
> loop attribute specified, then seek to the earliest possible position of the media resource and
> return. […] Fire an event named `ended` at the media element.

Two consequences. The loop is defined as a _seek_, and the seek algorithm is asynchronous with no
timing or continuity requirement; the spec is silent on sample accuracy. And `ended` does not fire
while `loop` is set (the "return" precedes it), so the lane could not hook the wrap even if it wanted
to — the only observable is `seeking`/`seeked`.

## 3. `HTMLMediaElement.loop` per engine, for AAC-in-MP4

### 3.1 Chromium — not gapless, by the owners' ruling

**The loop path is a full pipeline seek.**

- Blink `third_party/blink/renderer/core/html/media/html_media_element.cc`,
  `HTMLMediaElement::TimeChanged()`: `if (EndedPlayback(LoopCondition::kIgnored)) { if (Loop()) {
Seek(EarliestPossiblePosition()); } …}`.
- `third_party/blink/renderer/platform/media/web_media_player_impl.cc`, `DoSeek()`: seeks are elided
  only for `seeking_to_same_paused_time` or `seeking_for_zero_duration_loop` (a zero-duration clip).
  A loop of a 30 s clip is neither, so it falls through to `ended_ = false; seeking_ = true; …
pipeline_controller_->Seek(time, time_updated);`.
- `media/base/pipeline_impl.cc`, `RendererWrapper::Seek()`: `SetState(State::kSeeking)`, then a
  serial queue of `Renderer::Flush` followed by `Demuxer::Seek`, then `CompleteSeek`.
- `media/renderers/audio_renderer_impl.cc`, `Flush()`: `sink_->Flush()` (or `null_sink_`), state →
  `kFlushing`/`kFlushed`, then `DoFlush_Locked()` → `audio_decoder_stream_->Reset(…)`; and
  `StopRendering_Locked()`: `sink_->Pause()`. Rendering resumes only after the renderer reports
  `BUFFERING_HAVE_ENOUGH` again.

**Chromium's own ruling** — issue [349781051](https://issues.chromium.org/issues/349781051),
"HTML 5 audio loops with gaps", filed 2024-06-27 (read in a browser 2026-09-15 — the tracker is not
fetchable headlessly):

> Status: Won't Fix (Infeasible). Unfortunately, we don't support seamless looping with the audio
> element. It'd be difficult to support in our pipeline, so it isn't something we've prioritized
> since there are workarounds for this use case. You can use WebAudio or MSE to do this seamlessly.
> — dalecurtis@chromium.org, comment 2, 2024-06-27

> Fixing this would end up needing at least two things: Simulate all spec compliant events that need
> to be emitted for the seek routine. Tell the media pipeline ahead of time that this is a looping
> clip and shouldn't end, but rather restart decoder, renderers, and demuxer from the beginning. I
> don't think this is worth doing. — comment 4, 2024-06-28

The reporter later uploaded a CL, "Enable gapless looping for audio-only playback"
(chromium-review 7619957, created 2026-02-28); Gerrit reports it **ABANDONED** on 2026-03-03 after a
Code-Review −1. The older issue [40564535](https://issues.chromium.org/issues/40564535) ("Looping
<audio> files should be seamless", 2011) was closed Obsolete in 2011 with no fix. Comment 6 on
349781051 records the reporter's own workaround measurements: Web Audio works but "requires the whole
file to be downloaded before playback can begin".

**The edit list is honoured on every restart.**

- FFmpeg `libavformat/mov.c`: `mov_fix_index()` turns the first non-zero audio edit into
  `sti->skip_samples` / `st->codecpar->initial_padding` (lines ~4600-4720, "skip %d audio samples
  from curr_cts"); and on **every seek** `mov_read_seek()` recomputes it:
  `sti->skip_samples = mov_get_skip_samples(st, sample)` where
  `mov_get_skip_samples` returns `FFMAX(st->codecpar->initial_padding - off, 0)` (lines ~12390-12440).
- FFmpeg `libavformat/demux.c` (~line 1545): `if (sti->skip_samples || discard_padding) { … p =
av_packet_new_side_data(pkt, AV_PKT_DATA_SKIP_SAMPLES, 10); AV_WL32(p, sti->skip_samples); …
sti->skip_samples = 0; }`.
- Chromium `media/ffmpeg/ffmpeg_common.cc`, `GetDiscardPaddingFromAVPacket()`: reads
  `AV_PKT_DATA_SKIP_SAMPLES` and returns `(front_discard, end_discard)`. In
  `AVCodecContextToAudioDecoderConfig`: "FFmpeg exports AAC edit list padding in
  `AVCodecParameters::initial_padding`, which propagates to `codec_context->delay`. AAC does not have
  a pipeline decoder delay, and this padding is already discarded using container-level discard
  padding. Pass 0 here" (`if (codec == AudioCodec::kAAC) { codec_delay = 0; }`).
- Chromium `media/filters/ffmpeg_demuxer.cc`, `FFmpegDemuxerStream::EnqueuePacket()`:
  `buffer->set_discard_padding(*discard_padding)`; and the comment "Only the first buffer should
  have discard padding."
- Chromium `media/filters/ffmpeg_audio_decoder.cc`: `Reset()` → `ResetTimestampState(config_)` →
  a fresh `AudioDiscardHelper(...)` and `discard_helper_->Reset(codec_delay)`; the helper's
  `ProcessBuffers()` applies each buffer's own discard padding
  (`media/base/audio_discard_helper.cc`). Because the pipeline seek resets the decoder and the
  demuxer re-emits the side data, the priming is discarded again at each wrap.

So in Chromium the audible artefact at the wrap is the seek itself (sink paused and flushed, decoder
reset, demuxer seek, re-buffer), and its length is whatever that round-trip costs on the machine —
Chromium does not document a figure and this file does not invent one.

### 3.2 Gecko — gapless, by design, on by default

- `dom/html/HTMLMediaElement.cpp`: setting the `loop` attribute calls `mDecoder->SetLooping(!!aValue)`;
  `PlaybackEnded()` falls back to `SetCurrentTime(0)` only when there is no decoder (a
  `MediaStream` source).
- `dom/media/MediaDecoderStateMachine.cpp`, `class LoopingDecodingState`: "Purpose: decode audio data
  for playback when media is in seamless looping, we will adjust media time to make samples time
  monotonically increasing." On audio EOS: "received audio EOS when seamless looping, starts seeking"
  → `RequestDataFromStartPosition(kAudioTrack)` → `Reader()->ResetDecode(aType)` and
  `Reader()->Seek(SeekTarget(TimeUnit::Zero(), SeekTarget::Type::Accurate, AudioOnly))`, while
  `AudioQueue().SetOffset(offset + decodedDuration)` keeps the timeline monotonic. The clock
  comment at `AdjustByLooping`: "When seamless looping happens at least once … `aTime = aTime %
mOriginalDecodedDuration`." Nothing stops the audio sink.
- Gate: `mSeamlessLoopingAllowed = StaticPrefs::media_seamless_looping()` (audio) and
  `media_seamless_looping_video()` when there is video. `modules/libpref/init/StaticPrefList.yaml`:
  `media.seamless-looping` **value: true**, `media.seamless-looping-video` **value: true**.
- History: Bugzilla [654787](https://bugzilla.mozilla.org/show_bug.cgi?id=654787) "Looping <audio>
  files should be seamless" — RESOLVED FIXED, target **mozilla59**, patches landed 2017-11-27
  ("part1: Add pref for audio seamless looping … part5: Add the looping-offset time to audio
  data"); [1262276](https://bugzilla.mozilla.org/show_bug.cgi?id=1262276) "Seamless video looping"
  — FIXED in 108; meta bug 1498733 remains open for follow-ups.
- The edit list on restart: `dom/media/mp4/MP4Demuxer.cpp`, `GetNextSample()`: `if
(sample->mTime.IsNegative()) { sample->mTime = 0; … sample->mOriginalPresentationWindow =
Some(TimeInterval{originalPts, originalEnd}); }`. The negative time comes from mp4parse:
  `third_party/rust/mp4parse_capi/src/lib.rs` computes `offset_time` from the `elst`
  (`'media_time' maps start time onward, 'empty_duration' adds time offset`) and passes it to
  `create_sample_table`, so the first sample's composition range starts below zero by the priming.
  Decoding goes through `dom/media/platforms/wrappers/AudioTrimmer.cpp`, which is in the default
  wrapper set for every audio decoder (`PlatformDecoderModule.h`,
  `GetDefaultWrapperSet`: `if (aInfo.IsAudio()) set += Wrapper::AudioTrimmer;`) and trims each
  decoded buffer to the sample's presentation window (`sample->SetTrimWindow(trim)`). The loop seek
  is a reader seek to zero, so the demuxer re-emits that first sample and the trimmer re-trims it.
  The Chromium reporter's "It works well in Firefox 127.0.1" (issue 349781051) matches.

### 3.3 WebKit — not gapless; an open bug since 2021 (duplicates since 2009)

- `Source/WebCore/html/HTMLMediaElement.cpp`, `mediaPlayerTimeChanged()` → the end-of-media steps:
  `if (loop() && !m_mediaController && playbackRate > 0) { … if (now >= dur && (now + dur) >
MediaTime::zeroTime()) { … seekInternal(MediaTime::zeroTime()); } }`. `seekInternal` calls
  `seekWithTolerance({ time, MediaTime::zeroTime(), MediaTime::zeroTime() }, false)`, i.e. a
  `Precise` seek.
- `Source/WebCore/platform/graphics/avfoundation/objc/MediaPlayerPrivateAVFoundationObjC.mm`,
  `seekToTargetInternal()`: `[m_avPlayerItem seekToTime:cmTime toleranceBefore:cmBefore
toleranceAfter:cmAfter completionHandler:…]` with both tolerances `kCMTimeZero`. Everything after
  that — flush, decoder restart, whether the `elst`/priming is re-applied — happens inside
  AVFoundation and is **not verifiable from source**.
- WebKit bug [230553](https://bugs.webkit.org/show_bug.cgi?id=230553) "Playing back
  MediaElementAudioSources with loop: true do not loop seamlessly" — status **NEW**, filed
  2021-09-21, last changed 2023-06-01. Chris Dumez (Apple), 2021-09-22: "I definitely hear a pause
  between the loops now. The behavior is different than in Chrome." (his comparison was against
  Chrome 93 on the same test suite) and "The looping logic happens on media side and not on
  WebAudio side." Bugs 28748 ("Looping audio is not seamless", 2009) and 134929 ("HTML5 audio
  looping is not seamless", 2014) were marked duplicates of it on 2022-10-10, with the note "The old
  issues which I've dupe'd here … imply this also happens with an audio element."
- On the edit list itself, Apple's QTFF appendix "Audio priming – handling encoder delay in AAC"
  states the platform's intent: "a playback system must trim the silent priming samples to preserve
  correct synchronization. This trimming by the playback system should be done in two places: When
  playback first begins; When the playback position is moved to another location." That is a
  statement of what AVFoundation is designed to do, not evidence of what a given Safari build does
  at a loop seek.

### 3.4 Summary table — `loop` on a 30 s AAC-in-MP4

| Engine   | Wrap mechanism                                                                                         | Gapless?                                                               | Priming discarded on restart?                                                                              | Primary source                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromium | Blink `Seek(0)` → full pipeline seek: renderer flush, decoder reset, demuxer seek, re-buffer           | **No** — Won't Fix (Infeasible), 2024-06-27                            | **Yes** (FFmpeg re-emits `AV_PKT_DATA_SKIP_SAMPLES` on seek; `AudioDiscardHelper` reset per decoder reset) | `html_media_element.cc`, `web_media_player_impl.cc`, `pipeline_impl.cc`, `audio_renderer_impl.cc`, `ffmpeg_common.cc`, `mov.c`, `demux.c`; issue 349781051 |
| Gecko    | `LoopingDecodingState`: reader seek to 0 while the queue offset keeps time monotonic; sink never stops | **Yes** — default on (`media.seamless-looping=true`), since Firefox 59 | **Yes** (`MP4Demuxer` negative-pts window → `AudioTrimmer`)                                                | `MediaDecoderStateMachine.cpp`, `StaticPrefList.yaml`, `MP4Demuxer.cpp`, `AudioTrimmer.cpp`, bug 654787                                                    |
| WebKit   | `seekInternal(0)` → `[AVPlayerItem seekToTime:… kCMTimeZero]`                                          | **No** — bug 230553 open                                               | **Unknown** (inside AVFoundation)                                                                          | `HTMLMediaElement.cpp`, `MediaPlayerPrivateAVFoundationObjC.mm`, bug 230553, Apple QTFF appendix                                                           |

### 3.5 What the "short pause and fade in" most likely is

**The pause.** In Chromium it is the seek round-trip described in §3.1; in WebKit it is the
AVPlayer seek (§3.3). Neither engine documents a duration.

**The MDCT signature, stated precisely.** Apple's appendix: "AAC encoding uses a transform over
consecutive sets of 2048 audio samples, applied every 1024 audio samples (overlapped). For correct
audio to be decoded, both transforms for any period of 1024 audio samples are needed. For this
reason, encoders add at least 1024 samples of silence before the first 'true' audio sample" and
"Decoder delay … For AAC this number is typically 1024". RFC 7845 §4.2 says the same of Opus/CELT:
"if the first Opus frame uses the CELT mode, it will always produce 120 samples of windowed
overlap-add data. However, the overlap data is initially all zeros (since there is no prior frame),
meaning this cannot, in general, accurately represent the original audio." A decoder restarted with
no history therefore produces a first block whose predecessor half of the overlap-add is missing —
attenuated by the rising half of the window over the first 1024 samples (~23 ms at 44.1 kHz). That
is the only mechanism in the codec that produces a _fade-in_ rather than silence. **It is only
audible if those samples are not discarded.**

**Why it is probably not that, in Chromium or Gecko.** Both engines discard at least the declared
priming on every restart (§3.1, §3.2), and the declared priming is never less than the 1024-sample
decoder delay (Apple: "decoder delay establishes the minimum encoder delay possible (that is, 1024
for AAC)"; FFmpeg's `mov.c` takes it from the `elst`). The corrupted first block lies inside the
discarded region.

**No fade exists in the players' own code.** On 2026-09-15 a grep for `fade|ramp` over Chromium's
`media/renderers/audio_renderer_impl.cc`, `media/filters/audio_renderer_algorithm.cc`,
`media/audio/audio_output_device.cc` and WebKit's `MediaPlayerPrivateAVFoundationObjC.mm` /
`MediaPlayerPrivateAVFoundation.cpp` returned nothing. Whether CoreAudio or the OS mixer ramps a
freshly started stream is **not verifiable from source**.

**Most likely reading.** A silent gap followed by the onset of a broadband, noise-like bed (rain) —
the ear reports the abrupt re-entry of a diffuse sound after silence as a fade-in. Three candidates
remain distinguishable only by measurement: (i) pure gap + perceptual onset; (ii) a platform ramp
outside the engine's source; (iii) in WebKit only, un-trimmed priming (silence, then a ~23 ms ramp).
A loopback recording of one wrap (e.g. `ffmpeg -f dshow`/`pulse` capture of the browser output,
then inspect the waveform at the wrap) decides it; the tell for (iii) is ~23 ms of window-shaped
rise, for (i) a hard onset after silence, and (ii) a rise longer than one AAC frame. Recording that
measurement is a task for the seam ticket, not a finding here.

## 4. Web Audio

### 4.1 `AudioBufferSourceNode.loop` is sample-accurate by spec

W3C Web Audio API (fetched 2026-09-15), §1.9 AudioBufferSourceNode playback algorithm:

> Loop points, which can be expressed with sub-sample precision and can vary dynamically during
> playback. […] Sub-sample start offsets or loop points may require additional interpolation
> between sample frames. The playback of a looped buffer should behave identically to an unlooped
> buffer containing consecutive occurrences of the looped audio content, excluding any effects from
> interpolation.

With `loopStart = 0` and `loopEnd` left at its default ("If loopEnd is less than or equal to 0, or if
loopEnd is greater than the duration of the buffer, looping will end at the end of the buffer"), the
loop is an integer-frame wrap with no interpolation.

### 4.2 `decodeAudioData` and the encoder delay

Spec: "attempt to decode the encoded audioData into linear PCM. […] Take the result, representing
the decoded linear PCM audio data, and resample it to the sample-rate of the BaseAudioContext if it
is different from the sample-rate of audioData." The spec says nothing about encoder delay; it is
per-engine.

**Chromium.** `decodeAudioData` runs `media/filters/audio_file_reader.cc` (`AudioFileReader`) over
FFmpeg with an `FFmpegAudioDecoder` in synchronous mode. The front trim is the same discard-padding
path as playback (§3.1). `FinalizeDecodedBuffer()` additionally drops or trims buffers whose
timestamps are negative ("Trim buffers that start before the zero start time"), and
`MaybeTrimAacFinalBuffer()` trims the tail: "AAC encoders introduce padding (priming and remainder
samples) to fill fixed-size transform blocks. We need to trim these padding samples from the end of
the stream to ensure gapless playback." — method 1 from the last packet's `stts` duration, method 2
from the container duration. Method 2 is new: commit `a708cddb59` "media: Fix AAC end trimming gap
in AudioFileReader" (2026-06-09, reviewed by dalecurtis, bug 439644164): "While some
containers/encoders store this info in packet durations (which we already trim), others (like
Apple's afconvert) only specify the target duration in the edit list." Which Chrome milestone
carries `Cr-Commit-Position 1644192` is **not verified**; before it, an AAC file whose last packet
duration is not shortened in `stts` could come back with trailing remainder samples. For the beds
that means: whether the buffer is exactly `30.000 × rate` frames depends on how the pipeline's
encoder wrote the last packet duration and the `elst` duration — checkable with `ffprobe
-show_packets` on `rain.m4a`, not decidable from the engine alone.

The MP3/LAME case the ticket asked to confirm: FFmpeg `libavformat/mp3dec.c` parses the Xing/Info
frame's "Encoder delays" field for `LAME`, `Lavf` and `Lavc` tags and sets
`sti->start_skip_samples = mp3->start_pad + 528 + 1` plus `first_discard_sample`/`last_discard_sample`
from `end_pad`; `demux.c` turns those into the same `AV_PKT_DATA_SKIP_SAMPLES` side data, so
Chromium trims MP3 by the identical mechanism. Confirmed from source; the claim in the ticket is
right.

Resampling: `third_party/blink/renderer/platform/audio/audio_bus.cc`
`CreateBusFromInMemoryAudioFile` resamples to the context rate with `media::SincResampler` when the
rates differ ("If this becomes problematic, we'll have the refactor DecodeAudioFileData…").

**Gecko.** `dom/media/webaudio/MediaBufferDecoder.cpp`: creates the demuxer via
`DecoderTraits::CreateDemuxer`, then `PDMFactory::CreateDecoder({*audioInfo, kAudioTrack})` with a
default `CreateDecoderParams` — which, per `GetDefaultWrapperSet`, wraps every audio decoder in
`AudioTrimmer` (§3.2). The MP4 demuxer also fixes the last packet: "The demuxer only knows the
presentation time of the packet, not the actual number of samples that will be decoded from this
packet. However we need to trim the last packet to the correct duration" (`MP4Demuxer.cpp`, AAC
branch computing `totalMediaDurationIncludingTrimming = info->mDuration - info->mMediaTime`).
Resampling to the context rate uses the Speex resampler in the same file.

**WebKit.** `Source/WebCore/platform/audio/cocoa/AudioFileReaderCocoa.mm`, as of commit
`2cfd74cacfc8` (2026-03-12, bug 307632 "MP4 with Opus track isn't usable with decodeAudioData"):
"We instead rewrite the AudioFileReader to use an AVAssetReader with an AVAssetReaderTrackOutput to
demux the content and extract each compressed audio frame. […] An AudioFile would ignore the encoder
delay and output several silent audio frame. The AVAssetReaderTrackOutput properly determines the
number of frames to be trimmed and we can correctly drop those." The code reads
`kCMSampleBufferAttachmentKey_TrimDurationAtStart` / `…AtEnd` off each sample buffer and feeds the
totals to `AudioConverterPrimeInfo primeInfo = { framesTrimmedAtStart, framesTrimmedAtEnd }`. The
regression fix `c3244cf76d` (2026-07-27, bug 320198, titled "REGRESSION (iOS 27 beta)") shows this
path is in the iOS 27 / Safari 27 line and fixed M4A files whose `ftyp` brands are `M4A `/`isom`/
`iso2` rather than `mp4*` (they failed to sniff as MP4 and were rejected with `EncodingError`); its
test note says "the number of frames trimmed for encoder delay is decoder-dependent". **Not
verified:** which shipping Safari (26.x vs 27) a user has today, and what the pre-rewrite
AudioToolbox path did with an M4A edit list — the commit message only states the ADTS case. The
beds' brands are checkable with `ffprobe -show_format` (`major_brand`, `compatible_brands`).

### 4.3 Memory of a decoded bed

`AudioBuffer` channel data is `Float32Array` (spec IDL: `Float32Array getChannelData(unsigned long
channel)`). 30 s × 44,100 × 2 × 4 B = **10,584,000 B** per bed; at a 48 kHz context, which the spec
requires the decode to be resampled to, 30 × 48,000 × 2 × 4 = **11,520,000 B**. Both engines above
keep a second copy transiently during resampling.

## 5. Media Source Extensions

- Google's technique is documented at
  [web.dev/articles/mse-seamless-playback](https://web.dev/articles/mse-seamless-playback) (Dale
  Curtis, "Last updated 2015-06-11"; "On Chrome 38+ this will playback seamlessly!"): set
  `sourceBuffer.appendWindowStart = appendTime; sourceBuffer.appendWindowEnd = appendTime +
gaplessMetadata.audioDuration;` and `sourceBuffer.timestampOffset = appendTime -
gaplessMetadata.frontPaddingDuration;` — i.e. the page itself supplies the priming/remainder
  (from `iTunSMPB` or the `elst`) and MSE trims by the append window. Chrome's buffer budget in the
  same article: "On desktop Chrome, you can keep approximately 12 megabytes of audio content … in
  memory at once."
- For a _loop_, Dale Curtis on the WHATWG list, 2014-10-28: "The way you could do it with
  MediaSource would be to 'double buffer' the track such that you're creating an infinite stream.
  I.e. append a new copy of the track as time reaches the end of the previously appended track. To
  avoid unnecessary memory usage you would remove stale copies of the data once played." He repeated
  "You can use WebAudio or MSE to do this seamlessly" on issue 349781051 in 2024.
- Spec support: MSE `timestampOffset` ("Controls the offset applied to timestamps inside subsequent
  media segments"), `appendWindowStart`/`appendWindowEnd`, and `AppendMode "sequence"` ("Media
  segments will be treated as adjacent in time independent of the timestamps in the media segment").
  The ISO BMFF byte-stream spec: "The user agent MUST support setting the offset from media
  composition time to movie presentation time by handling an Edit Box (edts) containing a single
  Edit List Box (elst) that contains a single edit with media rate one." So a fragmented MP4 with
  the ffmpeg edit list is legal MSE input, but MSE only _offsets_ by the edit; the trimming of
  priming is the page's append window, not the engine's.
- Reach: WebKit shipped `ManagedMediaSource` on iPhone in Safari 17.1 (WebKit blog, 2023-10-25:
  "Safari 17.1 now brings the new Managed Media Source API to iPhone. Originally shipped in Safari
  17.0 for iPad and Mac"), with the caveat "support for Managed Media Source is only available when
  an AirPlay source alternative is present, or remote playback is explicitly disabled".
- Cost shape (facts, not a recommendation): the file must be a fragmented MP4 or WebM (a plain
  `.m4a` is not an MSE byte stream — **not re-verified here beyond the byte-stream spec's structure
  requirements**); the page manages appends, eviction and the timeline forever; playback stays on
  the media element (its volume, its background-audio semantics). Web Audio needs the whole file
  downloaded and decoded (~10–12 MB per bed, §4.3) before the first sample, which is the exact
  complaint in comment 6 of issue 349781051.

## 6. Autoplay and lifecycle

### 6.1 Starting from the `Begin` tap

- Spec: "An AudioContext is said to be allowed to start if the user agent allows the context state
  to transition from 'suspended' to 'running'. A user agent may disallow this initial transition,
  and to allow it only when the AudioContext's relevant global object has sticky activation."
- Chromium: `third_party/blink/renderer/modules/webaudio/audio_context.cc` — the constructor calls
  `MaybeAllowAutoplayWithUnlockType(AutoplayUnlockType::kContextConstructor)` and starts rendering
  if `IsAllowedToStart()`; `resume()` does the same with `kContextResume`; a source node `start()`
  with `kSourceNodeStart`. `AreAutoplayRequirementsFulfilled()` accepts a transient user activation
  or the document-level allowance. Chrome's policy doc (developer.chrome.com/blog/autoplay, "Last
  updated 2017-09-13"): "For the Web Audio API, the autoplay policy launched in Chrome 71."
  Creating or resuming the context inside the `Begin` click handler satisfies it.
- WebKit: `AudioContext::willBeginPlayback()` — `if (userGestureRequiredForAudioStart()) { if
(!shouldDocumentAllowWebAudioToAutoPlay(*document)) … completionHandler(false) }`, then
  `m_mediaSession->clientWillBeginPlayback()`. WebKit's iOS post (2016-07-25) defines the gesture:
  the call must "have directly resulted from a handler for a touchend, click, doubleclick, or
  keydown event"; the macOS post (2017-06) says "Websites should assume any use of <video> or
  <audio> requires a user gesture click to play." Both apply to the tap the lane already has.

### 6.2 Backgrounded tab / app

- Spec (§2.7, added with the `"interrupted"` state): "An interruption is an event generated by the
  user agent when it needs to halt audio playback for an AudioContext. […] When an interruption
  ends, the user agent MUST queue a control message to end the AudioContext interruption" and
  restore `running` if that was the state before.
- Chromium: a hidden tab does **not** stop a running context. `audio_context.cc` interrupts on
  hidden frames only when `should_interrupt_when_frame_is_hidden_ = !CanPlayWhileHidden()`, i.e.
  when the `media-playback-while-not-visible` permissions policy has been changed from its default.
  `BaseAudioContext::ContextLifecycleStateChanged()` pauses the destination on
  `FrameLifecycleState::kFrozen` (page freezing) and resumes on `kRunning`.
- Chromium timers, which the lane's `setInterval` ramp depends on (developer.chrome.com,
  "Timer throttling in Chrome 88"): minimal throttling applies while "The page has made noises in
  the past 30 seconds. This can be from any of the sound-making APIs, but a silent audio track
  doesn't count"; otherwise hidden pages are checked "once per second", and after "hidden for more
  than 5 minutes … silent for at least 30 seconds" once per minute. A playing bed keeps the page
  audible, so the 20 ms fade steps are unthrottled while it plays; a fade that starts from silence
  in a hidden tab is not.
- WebKit iOS: `AudioContext::defaultDestinationWillBecomeConnected()` begins an
  `InterruptionType::EnteringBackground` interruption, and
  `shouldOverrideBackgroundPlaybackRestriction()` lets the context keep running in the background
  only when the destination is not connected or `hasPlayBackAudioSession(document)` — i.e.
  `navigator.audioSession.type` is `"playback"` or `"play-and-record"`. Exiting the background ends
  the interruption with `MayResumePlaying`. Bug 237878 "AudioContext is suspended on iOS when page is
  backgrounded" (fixed r291390, 2022-03-17; the thread records it still reproducing in WKWebView
  through iOS 16.3) and bug 231105 (macOS, fixed r291267, 2022-03-15: "On MacOS, AudioContext only
  gets suspended in case of visibility change only if it is not producing audio") are the history.
  Web Audio spec issue 2585 ("AudioContext stuck on 'interrupted' in Safari") is a pointer, not
  evidence.
- The `"interrupted"` state exists in the spec enum today; which Chrome and Firefox versions expose
  it is **not verified** here.

### 6.3 `GainNode` ramps versus the lane's `setInterval` ramp

- `linearRampToValueAtTime(value, endTime)`: "Schedules a linear continuous change in parameter
  value from the previous scheduled parameter value to the given value. The value during the time
  interval T₀ ≤ t < T₁ … v(t) = V₀ + (V₁ − V₀)(t − T₀)/(T₁ − T₀)". Automation is computed on the
  rendering thread, so it does not depend on main-thread timers at all (the throttling in §6.2 does
  not apply to it).
- Retargeting a running fade — the invariant `lane-player.test.ts` pins ("`setVolume` retargets a
  fade-in … re-aimed at the new target from wherever the volume is now") — has a direct spec
  primitive: `cancelAndHoldAtTime(cancelTime)`: "cancels all scheduled parameter changes with times
  greater than or equal to cancelTime. However, in addition, the automation value that would have
  happened at cancelTime is then propagated for all future time", and for a ramp in progress:
  "Effectively rewrite E₂ to be the same kind of ramp ending at time t_c with an end value that
  would be the value of the original ramp at time t_c." A new ramp scheduled after that starts from
  the held value.
- What would change observably: the fade would no longer be a sequence of `volume` writes on a
  20 ms interval, so the existing fake-timer assertions (`FADE_STEP_MS`, step counts) could not
  observe it; the semantic (400 ms linear, retarget from current) is expressible one-to-one. That is
  a test-harness consequence, recorded here, not a recommendation.

## 7. Formats

### 7.1 Opus

- RFC 7845 §4.2 "Pre-skip": "A 'pre-skip' field in the ID header (see Section 5.1) signals the
  number of samples that SHOULD be skipped (decoded but discarded) at the beginning of the stream …
  These samples are not valid audio." and §5.1: "This is the number of samples (at 48 kHz) to
  discard from the decoder output when starting playback". So for Opus the delay is part of the
  codec's container format, not an MP4 edit convention — and RFC 7845 §4.2 also spells out the
  same first-frame overlap problem that §3.5 describes for AAC.
- Chromium: `media/base/mime_util_internal.cc` codec sets — `ogg_audio_codecs{FLAC, OPUS, VORBIS}`,
  `webm_audio_codecs{OPUS, VORBIS}`, `mp4_audio_codecs{FLAC, MP3, OPUS}` (plus AAC where the
  proprietary-codecs build flag is on), registered for `audio/ogg`, `audio/webm`, `audio/mp4`,
  `audio/wav`. Decoder delay: `ffmpeg_audio_decoder.cc` `ResetTimestampState`: "Opus codec delay is
  handled by ffmpeg" (`codec_delay = 0` for Opus). `decodeAudioData` specifics: commit `9abfc1f7a9`
  (2026-04-01) "Fix double discard of ogg-opus during decodeAudioData" documents that Ogg signalled
  both front and back discard _and_ internal trimming, WebM only the end padding, and MP4 neither
  (internally trimmed); the fix forces manual discard for Ogg (`config.disable_discard_decoder_delay()`
  in `audio_file_reader.cc`). Builds before that could double-trim Ogg Opus in `decodeAudioData`.
- Gecko: `dom/media/ogg/OggDecoder.cpp` (`MediaDecoder::IsOpusEnabled() && codec == "opus"`),
  `dom/media/webm/WebMDecoder.cpp` (`"opus" || "vorbis"`), `dom/media/mp4/MP4Decoder.cpp` (`"Opus"`,
  `"opus"`). Trimming goes through the same `AudioTrimmer` wrapper as AAC.
- WebKit: WebM Opus — Safari 15 (WebKit blog: "new support for the Opus audio codec in WebM
  containers"; bug 226922 "Safari 15 breaks all Web Audio content using WebM Opus" fixed 2021-06-22),
  and on iOS only from 17.4 (WebKit blog 17.4: "WebM is fully supported everywhere"; bug 238546
  comment 2024-03-11: "As of Safari 17.4 … WebM Opus is now finally supported consistently across
  iOS and macOS devices"). Ogg Opus — Safari 18.4 (WebKit blog: "adding Ogg container support for
  both Opus and Vorbis audio on macOS Sequoia 15.4, iOS 18.4, iPadOS 18.4, and visionOS 2.4").
  Opus in MP4 — `decodeAudioData` fixed by the 2026-03-12 rewrite (bug 307632); for `<audio>` no
  primary source establishes Opus-in-MP4 playback: the umbrella request, bug 176650 "Support Opus in
  WebM and Ogg Containers", is still **NEW** (a radar was attached 2026-03-03) even though those two
  containers now ship, and its thread carries the MP4 request ("Every other major browser supports
  Opus in MP4 as well", 2023-02-20) with no Apple reply. `decodeAudioData` for WebM
  Opus uses `SourceBufferParserWebM` and trims by `track->codecDelay()` / `discardPadding()`
  (`AudioFileReaderCocoa.mm`, `demuxWebMData`), i.e. RFC 7845 pre-skip and end padding.

### 7.2 WAV

Uncompressed PCM has no encoder delay to declare (no transform, no priming); the loop point is the
file's edge in all three engines. Supported everywhere (`audio/wav` in Chromium's table above; Gecko
and WebKit support is not re-verified here beyond long-standing ubiquity — **pointer only**). It
does not change what the looper does: Chromium and WebKit would still seek, Gecko would still loop
seamlessly. Size per bed is bundle arithmetic and belongs to the seam ticket.

## 8. Things this file could not verify against a primary source

1. What AVFoundation does at a zero-tolerance seek on an AAC track with an edit list — whether the
   priming is re-trimmed, and whether any start-up ramp is applied. Closed framework; only Apple's
   QTFF appendix (design intent) and WebKit bug 230553 (observed pause) exist.
2. The length of Chromium's loop gap on any given machine. Chromium documents the mechanism, not a
   figure.
3. Which shipping Safari version carries the AVAssetReader `decodeAudioData` rewrite
   (2026-03-12) and its brand-sniffing fix (2026-07-27); the bug title says "iOS 27 beta".
4. Which Chrome milestone carries the AAC end-trim fallback (2026-06-09) and the Ogg-Opus
   double-discard fix (2026-04-01).
5. Whether the beds' last-packet `stts` duration and `elst` duration make `decodeAudioData` return
   exactly `30.000 × rate` frames in Chromium — decidable only by probing `rain.m4a`
   (`ffprobe -show_packets`, `-show_format` for the brands) or by decoding it in each engine.
6. Whether `"interrupted"` is exposed by current Chrome and Firefox.
7. WAV support in Gecko and WebKit was not re-read from source.
8. The exact identity of the owner's "fade in" — three candidates in §3.5, separable only by a
   loopback recording.

## Sources

Specs

- WHATWG HTML, media elements — https://html.spec.whatwg.org/multipage/media.html (loop attribute;
  "reaches the end of the media resource" steps)
- W3C Web Audio API — https://webaudio.github.io/web-audio-api/ (AudioBufferSourceNode playback
  algorithm; decodeAudioData; AudioContextState "interrupted"; §2.7 interruptions; "allowed to
  start"; linearRampToValueAtTime; cancelAndHoldAtTime; AudioBuffer IDL)
- W3C Media Source Extensions — https://w3c.github.io/media-source/ (timestampOffset,
  appendWindowStart/End, AppendMode)
- W3C ISO BMFF Byte Stream Format — https://w3c.github.io/mse-byte-stream-format-isobmff/ (edit list
  requirement)
- RFC 7845, Ogg Encapsulation for the Opus Audio Codec — https://www.rfc-editor.org/rfc/rfc7845.txt
  (§4.2 Pre-skip, §5.1 ID header)
- Apple, QuickTime File Format, Appendix G "Audio priming – handling encoder delay in AAC" —
  https://developer.apple.com/documentation/quicktime-file-format/appendix_g_audio_priming_handling_encoder_delay_in_aac
  (subpages: Background AAC encoding; The timing and synchronization problem; Historical solution;
  Using track structures…; Example; Summary)

Chromium (all at `main`, read 2026-09-15 via raw.githubusercontent.com/chromium/chromium)

- third_party/blink/renderer/core/html/media/html_media_element.cc (`TimeChanged`)
- third_party/blink/renderer/platform/media/web_media_player_impl.cc (`DoSeek`)
- media/base/pipeline_impl.cc (`RendererWrapper::Seek`)
- media/renderers/audio_renderer_impl.cc (`Flush`, `StopRendering_Locked`)
- media/filters/ffmpeg_demuxer.cc (`ExtractStartTime`, `EnqueuePacket`, `SeekInternal`)
- media/ffmpeg/ffmpeg_common.cc (`AVCodecContextToAudioDecoderConfig`, `GetDiscardPaddingFromAVPacket`)
- media/filters/ffmpeg_audio_decoder.cc (`Reset`, `ResetTimestampState`)
- media/base/audio_discard_helper.cc
- media/filters/audio_file_reader.cc (`FinalizeDecodedBuffer`, `MaybeTrimAacFinalBuffer`)
- third_party/blink/renderer/platform/audio/audio_bus.cc (`CreateBusFromInMemoryAudioFile`)
- third_party/blink/renderer/modules/webaudio/audio_context.cc; base_audio_context.cc
- media/base/mime_util_internal.cc; media/filters/audio_renderer_algorithm.cc;
  media/audio/audio_output_device.cc (fade/ramp grep)
- Commits: a708cddb59 (2026-06-09, AAC end trimming), 9abfc1f7a9 (2026-04-01, Ogg-Opus double
  discard)
- Issues: https://issues.chromium.org/issues/349781051 (2024, Won't Fix Infeasible);
  https://issues.chromium.org/issues/40564535 (2011, Obsolete)
- Gerrit: https://chromium-review.googlesource.com/c/chromium/src/+/7619957 (abandoned 2026-03-03)
- Chrome for Developers: https://developer.chrome.com/blog/timer-throttling-in-chrome-88 ;
  https://developer.chrome.com/blog/autoplay
- web.dev, "Media Source Extensions for Audio" (Dale Curtis, 2015-06-11) —
  https://web.dev/articles/mse-seamless-playback
- WHATWG list, Dale Curtis, 2014-10-28 —
  https://lists.w3.org/Archives/Public/public-whatwg-archive/2014Oct/0251.html (and 0247.html)

FFmpeg (at `master`, read 2026-09-15)

- libavformat/mov.c (`mov_fix_index`, `mov_get_skip_samples`, `mov_read_seek`)
- libavformat/demux.c (skip-samples side data; start_time adjustment)
- libavformat/movenc.c (`use_editlist` default, `mov_write_edts_tag`)
- libavformat/mp3dec.c (Xing/LAME encoder delays)

Gecko (read 2026-09-15 via raw.githubusercontent.com/mozilla-firefox/firefox and mozilla/gecko-dev)

- dom/html/HTMLMediaElement.cpp (loop attribute → `SetLooping`; `PlaybackEnded`)
- dom/media/MediaDecoderStateMachine.cpp (`LoopingDecodingState`, `AdjustByLooping`)
- dom/media/MediaDecoder.cpp; modules/libpref/init/StaticPrefList.yaml (`media.seamless-looping`)
- dom/media/mp4/MP4Demuxer.cpp; dom/media/mp4/SampleIterator.cpp;
  third_party/rust/mp4parse/src/lib.rs; third_party/rust/mp4parse_capi/src/lib.rs
- dom/media/platforms/wrappers/AudioTrimmer.cpp; dom/media/platforms/PlatformDecoderModule.h
  (`GetDefaultWrapperSet`); dom/media/platforms/PDMFactory.cpp
- dom/media/webaudio/MediaBufferDecoder.cpp
- dom/media/ogg/OggDecoder.cpp; dom/media/webm/WebMDecoder.cpp; dom/media/mp4/MP4Decoder.cpp
- Bugzilla: 654787, 1262276, 1498733, 1524890 (REST API, read 2026-09-15)

WebKit (read 2026-09-15 via raw.githubusercontent.com/WebKit/WebKit)

- Source/WebCore/html/HTMLMediaElement.cpp (`mediaPlayerTimeChanged`, `seekInternal`,
  `seekWithTolerance`)
- Source/WebCore/platform/graphics/avfoundation/objc/MediaPlayerPrivateAVFoundationObjC.mm
  (`seekToTargetInternal`, `didEnd`); …/MediaPlayerPrivateAVFoundation.cpp
- Source/WebCore/platform/audio/cocoa/AudioFileReaderCocoa.mm (`demuxAVFData`, `demuxWebMData`,
  `decodeData`); Source/WebCore/platform/graphics/cocoa/WebMAudioUtilitiesCocoa.mm
- Source/WebCore/Modules/webaudio/AudioContext.cpp (`willBeginPlayback`,
  `shouldOverrideBackgroundPlaybackRestriction`, `defaultDestinationWillBecomeConnected`,
  `hasPlayBackAudioSession`)
- Commits: 2cfd74cacfc8 (2026-03-12, bug 307632), c3244cf76d (2026-07-27, bug 320198)
- Bugs: https://bugs.webkit.org/show_bug.cgi?id=230553 ; 28748 ; 134929 ; 176650 ; 226922 ; 238546 ;
  231105 ; 237878 ; 307632 ; 320198
- WebKit blog: https://webkit.org/blog/11989/new-webkit-features-in-safari-15/ ;
  https://webkit.org/blog/15063/webkit-features-in-safari-17-4/ ;
  https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ ;
  https://webkit.org/blog/14735/ (Safari 17.1, Managed Media Source) ;
  https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/ ;
  https://webkit.org/blog/6784/new-video-policies-for-ios/

Repo

- src/lib/lane-player.ts (`openWeb`, `LOOP_FADE_MS`, `FADE_STEP_MS`), origin/dev 2026-09-15
