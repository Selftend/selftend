#!/usr/bin/env python3
"""Synthesize the breathing-tool audio catalog (royalty-free, generated from scratch).

Honest *synthesized* textures - calm, soothing, seamlessly loopable. The runner loops each
clip for the whole phase, so these are STEADY seamless loops (not one-shot breaths): they
tile to any phase length. Breath sounds are a soft tonal pad + resonant (vowel-like) airy
breath - warm and continuous, not hissy. Swap in field recordings later with the same
filenames; src/constants/breathing-sounds.ts needs no change.

Pure stdlib (wave/struct/math/random) - no numpy/ffmpeg. Deterministic (seeded).
Run:  python3 scripts/generate-breathing-sounds.py
Output: assets/sounds/breathing/*.wav  (mono, 22050 Hz, 16-bit)
"""
import math
import os
import random
import struct
import wave

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds", "breathing")


def write_wav(name, samples):
    path = os.path.join(OUT, name)
    frames = bytearray()
    for s in samples:
        v = int(max(-1.0, min(1.0, s)) * 32767)
        frames += struct.pack("<h", v)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))
    print(f"  {name}: {len(samples)/SR:.1f}s  {os.path.getsize(path)//1024} KB")


def white(n):
    return [random.uniform(-1.0, 1.0) for _ in range(n)]


def lowpass(x, a):
    y = [0.0] * len(x)
    prev = 0.0
    for i, v in enumerate(x):
        prev += a * (v - prev)
        y[i] = prev
    return y


def normalize(x, peak=0.8):
    m = max(1e-9, max(abs(v) for v in x))
    return [v * (peak / m) for v in x]


def a_for(fc):
    return 1.0 - math.exp(-2.0 * math.pi * fc / SR)


def biquad_bandpass(x, f0, q):
    """Resonant band-pass - gives noise a tonal 'vowel'/formant colour (not hiss)."""
    w0 = 2.0 * math.pi * f0 / SR
    alpha = math.sin(w0) / (2.0 * q)
    cw = math.cos(w0)
    b0, b1, b2 = alpha, 0.0, -alpha
    a0, a1, a2 = 1.0 + alpha, -2.0 * cw, 1.0 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = [0.0] * len(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, xn in enumerate(x):
        yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, xn
        y2, y1 = y1, yn
        y[i] = yn
    return y


def seamless(sig, n, cf):
    """Fold the tail (n..n+cf) into the head so a buffer of length n loops with no seam."""
    out = sig[:n][:]
    for i in range(cf):
        w = i / cf
        out[i] = out[i] * w + sig[n + i] * (1.0 - w)
    return out


def raised_cos_up(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)


# ---------------------------------------------------------------------------
# Breath sounds - STEADY seamless 3s loops: soft tonal pad + resonant airy breath.
# Loop length is exactly 3.0s, so integer partial frequencies complete whole cycles and
# the tonal layer is seam-clean; the noise layer is crossfaded.
# ---------------------------------------------------------------------------
B_N = int(3.0 * SR)
B_CF = int(0.3 * SR)
B_GEN = B_N + B_CF


def pad_layer(fund, lp_fc):
    n = B_GEN
    # root + octave + fifth-ish + integer detune for warmth (all integer Hz -> seam-clean)
    partials = [(fund, 1.0), (fund * 2, 0.30), (fund * 3, 0.12), (fund + 1, 0.55)]
    pad = [0.0] * n
    for f, amp in partials:
        wstep = 2.0 * math.pi * f / SR
        for i in range(n):
            pad[i] += amp * math.sin(wstep * i)
    return normalize(lowpass(pad, a_for(lp_fc)), 1.0)


def air_layer(formants, lp_fc, gust):
    n = B_GEN
    base = normalize(lowpass(white(n), a_for(2200.0)), 1.0)  # pink-ish, pre-smoothed
    air = [0.0] * n
    for fc, q, amp in formants:
        bp = biquad_bandpass(base, fc, q)
        for i in range(n):
            air[i] += bp[i] * amp
    air = lowpass(air, a_for(lp_fc))
    if gust:
        g = normalize(lowpass(white(n), a_for(3.0)), 1.0)
        air = [air[i] * (0.55 + 0.45 * (0.5 + 0.5 * g[i])) for i in range(n)]
    return normalize(air, 1.0)


def make_breath(fund, pad_level, formants, noise_level, lp_fc, gust=False, peak=0.6):
    n = B_GEN
    pad = pad_layer(fund, lp_fc)
    air = air_layer(formants, lp_fc, gust)
    # one very gentle swell per loop (±12%), seamless (integer cycles over B_N)
    swell = [0.88 + 0.12 * (0.5 - 0.5 * math.cos(2.0 * math.pi * i / B_N)) for i in range(n)]
    mix = [(pad[i] * pad_level + air[i] * noise_level) * swell[i] for i in range(n)]
    return seamless(normalize(mix, peak), B_N, B_CF)


print("breath sounds (steady seamless 3s loops):")
# soft-breath: warm tonal, nasal-ish inhale / mouth-ish exhale
write_wav("soft-breath_inhale.wav", make_breath(196, 0.6, [(330, 3.0, 1.0), (950, 3.0, 0.45)], 0.4, 2200))
write_wav("soft-breath_exhale.wav", make_breath(147, 0.6, [(260, 3.0, 1.0), (680, 3.0, 0.45)], 0.42, 1500))
# ocean-swell: noise-forward wash with a low undercurrent
write_wav("ocean-swell_inhale.wav", make_breath(98, 0.22, [(220, 1.2, 1.0), (520, 1.6, 0.6)], 0.7, 1400))
write_wav("ocean-swell_exhale.wav", make_breath(87, 0.22, [(180, 1.2, 1.0), (430, 1.6, 0.6)], 0.7, 1100))
# wind: airy, breathy, gentle gusts
write_wav("wind_inhale.wav", make_breath(294, 0.10, [(700, 2.0, 1.0), (1800, 2.5, 0.5)], 0.6, 2600, gust=True, peak=0.55))
write_wav("wind_exhale.wav", make_breath(220, 0.10, [(560, 2.0, 1.0), (1500, 2.5, 0.5)], 0.6, 2200, gust=True, peak=0.55))


# ---------------------------------------------------------------------------
# Ambient loops (8.0s, crossfaded to loop seamlessly)
# ---------------------------------------------------------------------------
AMB_N = int(8.0 * SR)
CF = int(0.4 * SR)
GEN = AMB_N + CF


def make_brown():
    n = GEN
    y = [0.0] * n
    prev = 0.0
    for i in range(n):
        prev = 0.99 * prev + 0.04 * random.uniform(-1, 1)
        y[i] = prev
    return seamless(normalize(y, 0.55), AMB_N, CF)


def make_rain():
    n = GEN
    bed = normalize(lowpass(white(n), a_for(1400.0)), 0.28)
    drops = [0.0] * n
    for _ in range(int(8.0 * 55)):
        start = random.randint(0, n - 1)
        dur = random.randint(int(0.012 * SR), int(0.045 * SR))
        amp = random.uniform(0.15, 0.55)
        burst = biquad_bandpass(white(dur), random.uniform(2600, 4200), 1.5)
        for j in range(dur):
            idx = start + j
            if idx >= n:
                break
            drops[idx] += burst[j] * raised_cos_up(1.0 - j / dur) * amp
    return seamless(normalize([bed[i] + drops[i] for i in range(n)], 0.7), AMB_N, CF)


def make_forest():
    n = GEN
    leaves = biquad_bandpass(normalize(lowpass(white(n), a_for(2600.0)), 1.0), 1100, 0.8)
    gust = normalize(lowpass(white(n), a_for(4.0)), 1.0)
    leaves = normalize([leaves[i] * (0.4 + 0.6 * (0.5 + 0.5 * gust[i])) for i in range(n)], 0.32)
    chirps = [0.0] * n
    t = CF
    while t < AMB_N - int(0.5 * SR):
        t += random.randint(int(1.4 * SR), int(3.2 * SR))
        if t >= AMB_N - int(0.5 * SR):
            break
        dur = random.randint(int(0.10 * SR), int(0.22 * SR))
        f0 = random.uniform(2200, 3200)
        f1 = f0 + random.uniform(-600, 900)
        amp = random.uniform(0.12, 0.22)
        for j in range(dur):
            if t + j >= n:
                break
            f = f0 + (f1 - f0) * (j / dur)
            chirps[t + j] += math.sin(2 * math.pi * f * j / SR) * (math.sin(math.pi * j / dur) ** 2) * amp
    return seamless(normalize([leaves[i] + chirps[i] for i in range(n)], 0.6), AMB_N, CF)


def make_night():
    n = GEN
    drone = [0.18 * math.sin(2 * math.pi * 70 * i / SR) + 0.12 * math.sin(2 * math.pi * 96 * i / SR) for i in range(n)]
    drone = lowpass(drone, a_for(200.0))
    crickets = [0.0] * n
    for i in range(n):
        trem = max(0.0, math.sin(2 * math.pi * 22.0 * i / SR))
        crickets[i] = math.sin(2 * math.pi * 4600 * i / SR) * (trem ** 6) * 0.10
    return seamless(normalize([drone[i] + crickets[i] for i in range(n)], 0.5), AMB_N, CF)


print("ambient sounds:")
write_wav("rain.wav", make_rain())
write_wav("forest.wav", make_forest())
write_wav("night.wav", make_night())
write_wav("brown-noise.wav", make_brown())
print("done.")
