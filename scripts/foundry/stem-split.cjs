#!/usr/bin/env node
/**
 * Solo every v7c sound source. Does not change a bed.
 *
 * The mp3s are peak-normalized so a quiet layer can be heard.
 * STEMS-v7c.md records the in-mix level.
 *
 *   node scripts/foundry/stem-split.cjs --out dir --md scripts/foundry/STEMS-v7c.md
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const P = require("./sound-pro.cjs");
const M = require("./sound-magnetic.cjs");

const SR = P.SAMPLE_RATE;
const BEAT = M.BEAT;
const BAR = 4 * BEAT;
const SEG = 2 * BAR;
const CUES = M.CUES;
const PROG = M.PROG;
const SECONDS = M.SECONDS;
const LEVEL_A = 5.5;
const LEVEL_B = 15.4;

function inBody(t) {
  return (t >= CUES.drop && t < CUES.cut) || t >= CUES.final;
}

function times(start, step, end, allow) {
  const out = [];
  for (let t = start; t < end; t += step) if (allow(t)) out.push(t);
  return out;
}

function chordAt(t) {
  const i = Math.floor(t / SEG);
  return PROG[((i % 4) + 4) % 4];
}

function sectionEnv(t, edge, from, to) {
  if (t < from - edge || t >= to + edge) return t >= from && t < to ? 1 : 0;
  if (t < from) return 0;
  if (t < from + edge) return P.smoothstep((t - from) / edge);
  if (t < to - edge) return 1;
  if (t < to) return 1 - P.smoothstep((t - (to - edge)) / edge);
  return 0;
}

function padLevel(t) {
  let g = 1;
  if (t < CUES.air) g = P.smoothstep(t / CUES.air);
  g *= 1 - 0.62 * sectionEnv(t, 0.02, CUES.cut, CUES.final);
  return g;
}

function masterFade(t) {
  if (t < CUES.fade) return 1;
  if (t >= SECONDS) return 0;
  return 1 - P.smoothstep((t - CUES.fade) / (SECONDS - CUES.fade));
}

function lpCoeffs(cutoff) {
  const w0 = (2 * Math.PI * cutoff) / SR;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * 0.707);
  const a0 = 1 + alpha;
  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

function highpassed(samples, freq) {
  return P.applyBiquad(P.applyBiquad(samples, "highpass", freq, 0.707, SR), "highpass", freq, 0.707, SR);
}

function unisonSide(mono, delayA, delayB) {
  const hp = highpassed(mono, 180);
  const a = P.delaySamples(hp, SR, delayA);
  const b = P.delaySamples(hp, SR, delayB);
  const side = P.silence(mono.length);
  for (let i = 0; i < mono.length; i++) side[i] = a[i] * 0.62 - b[i] * 0.38;
  return side;
}

function hatPingSide(hat) {
  const hp = highpassed(hat, 300);
  const side = P.silence(hat.length);
  const step = Math.max(1, Math.floor((BEAT / 2) * SR));
  for (let i = 0; i < hat.length; i++) {
    const sign = Math.floor(i / step) % 2 === 0 ? 1 : -1;
    side[i] = hp[i] * sign;
  }
  return side;
}

function pingPong(mono, timeSec, feedback, dampHz) {
  const d = Math.max(8, Math.floor(timeSec * SR));
  const bufL = new Float64Array(d);
  const bufR = new Float64Array(d);
  let iL = 0;
  let iR = 0;
  let lpL = 0;
  let lpR = 0;
  const damp = Math.exp((-2 * Math.PI * dampHz) / SR);
  const left = P.silence(mono.length);
  const right = P.silence(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const dL = bufL[iL];
    const dR = bufR[iR];
    lpL = (1 - damp) * dL + damp * lpL;
    lpR = (1 - damp) * dR + damp * lpR;
    left[i] = dL;
    right[i] = dR;
    bufL[iL] = mono[i] + lpR * feedback;
    bufR[iR] = lpL * feedback;
    iL = (iL + 1) % d;
    iR = (iR + 1) % d;
  }
  const mid = P.silence(mono.length);
  const side = P.silence(mono.length);
  for (let i = 0; i < mono.length; i++) {
    mid[i] = (left[i] + right[i]) * 0.5;
    side[i] = (left[i] - right[i]) * 0.5;
  }
  return { mid, side };
}

function maxAbs(a, b) {
  let m = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}

function sumInto(dest, src) {
  for (let i = 0; i < dest.length; i++) dest[i] += src[i];
}

/** One chord tone of the v7 pad, through the same moving lowpass. */
function renderPadVoice(n, voice) {
  const out = P.silence(n);
  const base = [1, 0.52, 0.16, 0.05];
  const alt = [0.92, 0.34, 0.28, 0.08];
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  const xfade = 0.05;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const u = 0.35 - 0.35 * Math.cos(2 * Math.PI * 0.07 * t);
    const weights = [
      base[0] * (1 - u) + alt[0] * u,
      base[1] * (1 - u) + alt[1] * u,
      base[2] * (1 - u) + alt[2] * u,
      base[3] * (1 - u) + alt[3] * u,
    ];
    let norm = 0;
    for (let v = 0; v < 4; v++) norm += weights[v];
    const boundary = Math.floor(t / SEG) * SEG;
    const into = t - boundary;
    const curr = chordAt(t).pad;
    const prev = chordAt(boundary - 0.001).pad;
    const usePrev = boundary > 0 && into < xfade;
    const a = usePrev ? Math.cos((into / xfade) * Math.PI * 0.5) : 0;
    const b = usePrev ? Math.sin((into / xfade) * Math.PI * 0.5) : 1;
    const tone = (notes) => (weights[voice] * Math.sin(2 * Math.PI * P.midiHz(notes[voice]) * t)) / norm;
    const sample = (a * tone(prev) + b * tone(curr)) * padLevel(t);
    const cutoff = 980 + 40 * Math.sin(2 * Math.PI * 0.05 * t);
    const c = lpCoeffs(cutoff);
    const y = c.b0 * sample + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = sample;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

function placeKick(n, hit) {
  const out = P.silence(n);
  const kicks = times(CUES.drop, BEAT, SECONDS - 0.05, inBody);
  for (let i = 0; i < kicks.length; i++) {
    const vel = 0.86 + 0.14 * ((i % 5) / 4);
    P.addAt(out, hit, kicks[i] * SR, vel);
  }
  return out;
}

function isolateTick(sampleRate) {
  const full = P.renderKickFull(sampleRate);
  const body = P.renderKickBody(sampleRate);
  const n = Math.max(full.length, body.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = (full[i] || 0) - (body[i] || 0);
  return out;
}

function placeHats(n) {
  const closed = P.silence(n);
  const open = P.silence(n);
  const hatClosed = P.renderHatSoft(SR, false);
  const hatOpen = P.renderHatSoft(SR, true);
  const hats = times(CUES.hats, BEAT / 2, SECONDS - 0.02, inBody);
  for (let i = 0; i < hats.length; i++) {
    const isOpen = hats[i] >= CUES.peak && hats[i] < CUES.cut && i % 4 === 2;
    const base = isOpen ? 0.85 : 0.55;
    const vel = base * (0.75 + 0.25 * ((i % 4) / 3));
    P.addAt(isOpen ? open : closed, isOpen ? hatOpen : hatClosed, hats[i] * SR, vel);
  }
  return { closed, open };
}

function placePlucks(n, voiceFor) {
  const bus = P.silence(n);
  const pattern = [0, 2, 1, 3];
  const steps = [0.5, 1.25, 2.5, 3.25];
  const vels = [0.72, 1, 0.64, 0.88];
  const cache = new Map();
  const startBar = Math.floor(CUES.air / BAR);
  const endBar = Math.ceil(SECONDS / BAR);
  for (let bar = startBar; bar < endBar; bar++) {
    const barT = bar * BAR;
    for (let s = 0; s < steps.length; s++) {
      const t = barT + steps[s] * BEAT;
      if (t < CUES.air || t >= SECONDS - 0.05) continue;
      if (t >= CUES.cut && t < CUES.final) continue;
      if (t >= CUES.drop && !inBody(t)) continue;
      const midi = chordAt(t).pad[pattern[s] % 4];
      if (!cache.has(midi)) cache.set(midi, voiceFor(midi));
      const intro = t < CUES.drop ? 0.28 : 1;
      const peak = t >= CUES.peak && t < CUES.cut ? 1.15 : 1;
      P.addAt(bus, cache.get(midi), t * SR, 0.9 * intro * peak * vels[s]);
    }
  }
  return bus;
}

function fmHits(midi) {
  const freq = P.midiHz(midi);
  const decay = 0.045;
  const dur = 0.14;
  const count = Math.floor(dur * SR);
  const full = new Float64Array(count);
  const bare = new Float64Array(count);
  let carrier = 0;
  let mod = 0;
  let one = 0;
  let carrierB = 0;
  let oneB = 0;
  for (let i = 0; i < count; i++) {
    const t = i / SR;
    const fade = t < 0.003 ? t / 0.003 : 1;
    const env = Math.exp(-t / decay) * fade;
    const index = 4.2 * Math.exp(-t / 0.03);
    const cutoff = 1100 + 900 * Math.exp(-t / 0.03);
    const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
    const tone = Math.sin(carrier + Math.sin(mod) * index);
    one += alpha * (tone - one);
    full[i] = one * env;
    const sine = Math.sin(carrierB);
    oneB += alpha * (sine - oneB);
    bare[i] = oneB * env;
    carrier += (2 * Math.PI * freq) / SR;
    carrierB += (2 * Math.PI * freq) / SR;
    mod += (2 * Math.PI * freq * 2) / SR;
  }
  const peak = P.samplePeak(full);
  const gain = peak > 0 ? 1 / peak : 0;
  const residual = new Float64Array(count);
  for (let i = 0; i < count; i++) residual[i] = (full[i] - bare[i]) * gain;
  return residual;
}

function stabVoices(freqs) {
  const dur = 0.08;
  const decay = 0.028;
  const count = Math.floor(dur * SR);
  const harms = [1, 0.5, 0.22, 0.09];
  const harmSum = harms.reduce((sum, h) => sum + h, 0);
  const weight = freqs.length * harmSum;
  const parts = [];
  for (let v = 0; v < freqs.length; v++) {
    const raw = new Float64Array(count);
    const f = P.midiHz(freqs[v]);
    for (let i = 0; i < count; i++) {
      const t = i / SR;
      let mix = 0;
      for (let h = 0; h < harms.length; h++) mix += harms[h] * Math.sin(2 * Math.PI * f * (h + 1) * t);
      raw[i] = mix / weight;
    }
    const filtered = P.applyBiquad(raw, "lowpass", 980, 0.75, SR);
    for (let i = 0; i < count; i++) {
      const t = i / SR;
      const fade = t < 0.004 ? t / 0.004 : 1;
      filtered[i] *= Math.exp(-t / decay) * fade;
    }
    parts.push(filtered);
  }
  const sum = P.silence(count);
  for (let v = 0; v < parts.length; v++) sumInto(sum, parts[v]);
  const peak = P.samplePeak(sum);
  const gain = peak > 0 ? 1 / peak : 0;
  for (let v = 0; v < parts.length; v++) {
    for (let i = 0; i < count; i++) parts[v][i] *= gain;
  }
  return parts;
}

function placeStabs(n) {
  const buses = [P.silence(n), P.silence(n), P.silence(n), P.silence(n)];
  const cache = new Map();
  const claps = times(CUES.clap, BEAT * 2, SECONDS - 0.05, inBody);
  const extra = times(CUES.peak, BEAT, CUES.cut, () => true);
  const when = claps.concat(extra.filter((t) => !claps.some((c) => Math.abs(c - t) < 0.02)));
  const vels = [0.78, 1, 0.7, 0.9];
  for (let i = 0; i < when.length; i++) {
    const chord = chordAt(when[i]);
    if (!cache.has(chord.name)) cache.set(chord.name, stabVoices(chord.pad));
    const peak = when[i] >= CUES.peak && when[i] < CUES.cut ? 1.1 : 0.92;
    const vel = vels[i % vels.length];
    const parts = cache.get(chord.name);
    for (let v = 0; v < 4; v++) P.addAt(buses[v], parts[v], when[i] * SR, peak * vel);
  }
  return buses;
}

function scaleSend(src, gain) {
  const out = P.silence(src.length);
  for (let i = 0; i < src.length; i++) out[i] += src[i] * gain;
  return out;
}

function stereoRms(left, right, t0, t1) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(left.length, Math.floor(t1 * SR));
  let acc = 0;
  const count = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) acc += left[i] * left[i] + right[i] * right[i];
  return Math.sqrt(acc / (count * 2));
}

function applyFade(buf) {
  const out = new Float64Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * masterFade(i / SR);
  return out;
}

function heardStereo(mono, fitGain, kind, sideScale) {
  let left;
  let right;
  if (kind === "side") {
    const hp = highpassed(mono, 200);
    left = new Float64Array(mono.length);
    right = new Float64Array(mono.length);
    for (let i = 0; i < mono.length; i++) {
      const s = hp[i] * sideScale * fitGain;
      left[i] = s;
      right[i] = -s;
    }
  } else {
    left = new Float64Array(mono.length);
    right = new Float64Array(mono.length);
    for (let i = 0; i < mono.length; i++) {
      left[i] = mono[i] * fitGain;
      right[i] = mono[i] * fitGain;
    }
  }
  return { left: applyFade(left), right: applyFade(right) };
}

function hitsOf(mono) {
  const peak = P.samplePeak(mono);
  if (peak < 1e-8) return [];
  const floor = peak * P.dbLin(-20);
  const hits = [];
  let i = 0;
  while (i < mono.length) {
    if (Math.abs(mono[i]) < floor) {
      i += 1;
      continue;
    }
    let last = i;
    let local = 0;
    let at = i;
    const limit = Math.min(mono.length, i + Math.floor(0.45 * SR));
    for (let j = i; j < limit; j++) {
      const a = Math.abs(mono[j]);
      if (a >= floor) last = j;
      else if (j > last + Math.floor(0.012 * SR)) break;
      if (a > local) {
        local = a;
        at = j;
      }
    }
    hits.push({ at: at / SR, start: i / SR, dur: (last - i + 1) / SR, i0: i, i1: last + 1 });
    i = last + Math.floor(0.02 * SR);
  }
  return hits;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function inharmonic(peaks) {
  if (peaks.length < 3) return false;
  const ordered = peaks.map((p) => p.hz).sort((a, b) => a - b);
  const f0 = ordered[0];
  if (!(f0 > 40)) return false;
  let odd = 0;
  for (let i = 1; i < ordered.length; i++) {
    const ratio = ordered[i] / f0;
    const n = Math.max(1, Math.round(ratio));
    if (Math.abs(ratio - n) / n > 0.08) odd += 1;
  }
  return odd >= 2;
}

function describe(mono) {
  const hits = hitsOf(mono);
  if (!hits.length) {
    return { onsets: "none", centroid: 0, peakHz: 0, hitMs: 0, count: 0, sustained: false, inharm: false, repeating: false };
  }
  let loudest = hits[0];
  for (let h = 1; h < hits.length; h++) {
    const a = Math.abs(mono[Math.min(mono.length - 1, Math.round(hits[h].at * SR))]);
    const b = Math.abs(mono[Math.min(mono.length - 1, Math.round(loudest.at * SR))]);
    if (a > b) loudest = hits[h];
  }
  const span = mono.subarray(loudest.i0, Math.min(mono.length, Math.max(loudest.i1, loudest.i0 + 64)));
  const peaks = P.topPeaks(span, SR, 5, 80, 12000);
  const centroid = Math.round(P.spectralCentroid(span, SR));
  const peakHz = peaks.length ? Math.round(peaks[0].hz) : 0;
  const sustained = hits.length <= 4 && median(hits.map((h) => h.dur)) > 0.4;
  const hitMs = Math.round(median(hits.map((h) => h.dur)) * 1000);
  const gaps = [];
  for (let i = 1; i < hits.length; i++) gaps.push(hits[i].at - hits[i - 1].at);
  const gap = median(gaps);
  const first = hits.slice(0, 4).map((h) => `${(Math.round(h.at * 1000) / 1000).toFixed(3)}s`);
  const onsets = sustained
    ? `sustained from ${(hits[0].start).toFixed(3)}s`
    : `${hits.length} hits, first ${first.join(", ")}${hits.length > 4 ? ", …" : ""}, median gap ${Math.round(gap * 1000)} ms`;
  return {
    onsets,
    centroid,
    peakHz,
    hitMs: sustained ? 0 : hitMs,
    count: hits.length,
    sustained,
    inharm: inharmonic(peaks),
    repeating: hits.length >= 6 && gap > 0.05 && gap < 1.2,
  };
}

function flagOf(row) {
  const audible = row.levelDb > -36 || row.peakDb > -18;
  const high = row.centroid >= 1800;
  const short = !row.sustained && row.hitMs > 0 && row.hitMs <= 45;
  const flags = [];
  if (short && high && row.repeating && audible) flags.push("tick");
  if (audible && ((row.inharm && high) || (short && high && row.peakHz >= 2000))) flags.push("bell");
  if (audible && (row.name.startsWith("room") || row.name.startsWith("echo")) && (row.hitMs >= 40 || row.sustained) && row.centroid >= 900) {
    flags.push("tail");
  }
  if (!audible && short && high && row.repeating) flags.push("buried");
  return flags.length ? flags.join(", ") : "—";
}

function stereoPeak(left, right) {
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  return peak;
}

function source(name, where, mono, fitGain, kind, sideScale, mixRms, mixPeak, inside) {
  const heard = heardStereo(mono, fitGain, kind, sideScale);
  const level = stereoRms(heard.left, heard.right, LEVEL_A, LEVEL_B);
  const info = describe(mono);
  const row = {
    name,
    where,
    inside: inside || "",
    ...info,
    levelDb: Math.round(P.linDb(level / Math.max(mixRms, 1e-12)) * 10) / 10,
    peakDb: Math.round(P.linDb(stereoPeak(heard.left, heard.right) / Math.max(mixPeak, 1e-12)) * 10) / 10,
    left: heard.left,
    right: heard.right,
  };
  row.flag = flagOf(row);
  return row;
}

async function collect() {
  const v7 = M.renderBed("v7");
  const bed = await M.loadBed("v7c");
  const n = v7.stems.pad.length;
  const g = bed.gains;
  const fitGain = bed.fitGain;
  const padVoices = [0, 1, 2, 3].map((v) => renderPadVoice(n, v));
  const padSum = P.silence(n);
  for (let v = 0; v < 4; v++) sumInto(padSum, padVoices[v]);
  const tick = placeKick(n, isolateTick(SR));
  const kickBody = placeKick(n, P.renderKickBody(SR));
  const kickSum = P.silence(n);
  sumInto(kickSum, kickBody);
  sumInto(kickSum, tick);
  const hats = placeHats(n);
  const hatSum = P.silence(n);
  sumInto(hatSum, hats.closed);
  sumInto(hatSum, hats.open);
  const pluck = v7.stems.pluck;
  const pluckFm = placePlucks(n, (midi) => fmHits(midi));
  const pluckCheck = placePlucks(n, (midi) => P.renderFmPluck(SR, P.midiHz(midi), {
    decay: 0.045, dur: 0.14, moving: true, dark: true,
  }));
  const stabs = placeStabs(n);
  const stabSum = P.silence(n);
  for (let v = 0; v < 4; v++) sumInto(stabSum, stabs[v]);
  const overlaySub = P.silence(n);
  const overlayMid = P.silence(n);
  for (let i = 0; i < n; i++) {
    overlaySub[i] = bed.stems.sub[i] - v7.stems.sub[i];
    overlayMid[i] = bed.stems.mid[i] - v7.stems.mid[i];
  }
  const sendPluck = scaleSend(pluck, 0.55);
  const sendStab = scaleSend(stabSum, 0.7);
  const roomPluck = P.shortReverb(sendPluck, SR, 0.16, 3200);
  const roomStab = P.shortReverb(sendStab, SR, 0.16, 3200);
  const room = P.silence(n);
  sumInto(room, roomPluck);
  sumInto(room, roomStab);
  const echo = pingPong(pluck, BEAT * 0.75, 0.12, 2400);

  const midParts = [
    [padSum, g.pad],
    [v7.stems.sub, g.sub],
    [v7.stems.mid, g.mid],
    [overlaySub, g.sub],
    [overlayMid, g.mid],
    [kickSum, g.kick],
    [v7.stems.clap, g.clap],
    [hatSum, g.hat],
    [pluck, g.pluck],
    [stabSum, g.stab],
    [room, g.room],
    [echo.mid, g.echo],
  ];
  const sideParts = [
    [unisonSide(padSum, 0.013, 0.019), g.pad * 0.95],
    [unisonSide(pluck, 0.007, 0.011), g.pluck * 0.9],
    [unisonSide(stabSum, 0.011, 0.017), g.stab * 0.85],
    [hatPingSide(hatSum), g.hat],
    [unisonSide(room, 0.023, 0.031), g.room],
    [echo.side, g.echo * 1.35],
  ];
  const mid = P.silence(n);
  const side = P.silence(n);
  for (let p = 0; p < midParts.length; p++) {
    for (let i = 0; i < n; i++) mid[i] += midParts[p][0][i] * midParts[p][1];
  }
  for (let p = 0; p < sideParts.length; p++) {
    for (let i = 0; i < n; i++) side[i] += sideParts[p][0][i] * sideParts[p][1];
  }
  const sideHp = highpassed(side, 200);
  const midR = stereoRms(mid, mid, LEVEL_A, LEVEL_B);
  const sideR = stereoRms(sideHp, P.silence(n), LEVEL_A, LEVEL_B);
  let sideScale = sideR > 1e-8 ? (midR * P.dbLin(-14)) / (sideR * Math.SQRT2) : 0;
  if (!(sideScale >= 0)) sideScale = 0;
  const rebuilt = busRms(sideHp, LEVEL_A, LEVEL_B);
  const midMono = busRms(mid, LEVEL_A, LEVEL_B);
  sideScale = rebuilt > 1e-8 ? (midMono * P.dbLin(-14)) / rebuilt : 0;
  if (sideScale > 6) sideScale = 6;
  if (sideScale < 0) sideScale = 0;

  const mixRms = stereoRms(bed.left, bed.right, LEVEL_A, LEVEL_B);
  const mixPeak = stereoPeak(bed.left, bed.right);
  const gain = (mono, amount) => scaleSend(mono, amount);
  const rows = [];
  const add = (name, where, mono, amount, kind, inside) => {
    rows.push(source(name, where, gain(mono, amount), fitGain, kind, sideScale, mixRms, mixPeak, inside));
  };
  const toneWhere = "sound-magnetic.cjs renderPad / chordSines. Four exact sines, no detune. Lowpass near 980 Hz, ±40 Hz at 0.05 Hz. Weights crossfade at 0.07 Hz.";
  for (let v = 0; v < 4; v++) {
    add(`pad-voice-${v + 1}`, toneWhere, padVoices[v], g.pad, "mid", "");
  }
  add("pad-side", "sound-magnetic.cjs unisonSide(pad, 13 ms, 19 ms), then the 200 Hz side highpass", unisonSide(padSum, 0.013, 0.019), g.pad * 0.95, "side", "");
  add("bass-sub", "sound-pro.cjs renderBassNote sub. sound-magnetic.cjs renderBassPattern. Off-beat 16ths, 90 ms, pitch drift.", v7.stems.sub, g.sub, "mid", "");
  add("bass-mid", "sound-pro.cjs renderBassNote mid. Odd harmonics, cutoff falls from about 160 Hz toward 70 Hz.", v7.stems.mid, g.mid, "mid", "");
  add("overlay-sub", "sound-magnetic.cjs renderV7c. sound-elementary.mjs renderLibBass sub, lowpassed at 100 Hz, phase-aligned, from 7.0 s.", overlaySub, g.sub, "mid", "");
  add("overlay-mid", "sound-magnetic.cjs renderV7c. Elementary harmonic mid, highpassed at 100 Hz, same delay as the sub.", overlayMid, g.mid, "mid", "");
  add("kick-body", "sound-pro.cjs renderKickBody. Sine falling to 44 Hz, lowpass 160 Hz.", kickBody, g.kick, "mid", "");
  add("kick-tick", "sound-pro.cjs addKickTick via renderKickFull. 2.8 kHz sine, about 4 ms. Blaze has rejected this as the cricket.", tick, g.kick, "mid", "");
  add("clap", "sound-pro.cjs renderSnap. 210 Hz plus two harmonics, 4 ms flam, lowpass 700 Hz. Every 2 beats from 7.7 s.", v7.stems.clap, g.clap, "mid", "");
  add("hat-closed", "sound-pro.cjs renderHatSoft(false). FM sine, carrier 5800 Hz, modulator 8100 Hz, index 0.4, 11 ms, band 3.8–7.8 kHz.", hats.closed, g.hat, "mid", "");
  add("hat-open", "sound-pro.cjs renderHatSoft(true). Carrier 4600 Hz, modulator 6400 Hz, 28 ms. Only on some peak 8ths.", hats.open, g.hat, "mid", "");
  add("hat-side", "sound-magnetic.cjs hatPingSide. Same hats, highpass 300 Hz, sign flips each 8th.", hatPingSide(hatSum), g.hat, "side", "");
  add("pluck", "sound-pro.cjs renderFmPluck. Dark moving lowpass, harmonicity 2, index 4.2 falling. From 2.6 s.", pluck, g.pluck, "mid", "");
  add("pluck-fm", "sound-pro.cjs renderFmPluck, FM tone minus the settled sine. Already contained in pluck, not a second mix layer.", pluckFm, g.pluck, "mid", "");
  add("pluck-side", "sound-magnetic.cjs unisonSide(pluck, 7 ms, 11 ms)", unisonSide(pluck, 0.007, 0.011), g.pluck * 0.9, "side", "");
  const stabWhere = "sound-pro.cjs renderWarmStab. Four chord tones, harmonics 1, 0.5, 0.22, 0.09, lowpass 980 Hz, 80 ms.";
  for (let v = 0; v < 4; v++) add(`stab-voice-${v + 1}`, stabWhere, stabs[v], g.stab, "mid", "");
  add("stab-side", "sound-magnetic.cjs unisonSide(stab, 11 ms, 17 ms)", unisonSide(stabSum, 0.011, 0.017), g.stab * 0.85, "side", "");
  add("room-pluck", "sound-pro.cjs shortReverb of the pluck send (0.55). Combs 31/37/41/47 ms, damp 3200 Hz, highpass 220 Hz. Mix gain room 0.06.", roomPluck, g.room, "mid", "");
  add("room-stab", "sound-pro.cjs shortReverb of the stab send (0.7). Same combs.", roomStab, g.room, "mid", "");
  add("room-side", "sound-magnetic.cjs unisonSide(room, 23 ms, 31 ms)", unisonSide(room, 0.023, 0.031), g.room, "side", "");
  add("echo-mid", "sound-magnetic.cjs pingPong(pluck, 0.75 beat, feedback 0.12, damp 2400 Hz), mid. Mix gain echo 0.07.", echo.mid, g.echo, "mid", "");
  add("echo-side", "Same pingPong side, gain echo × 1.35, then the bus side scale.", echo.side, g.echo * 1.35, "side", "");

  return {
    rows,
    meta: {
      padMaxAbs: maxAbs(padSum, v7.stems.pad),
      kickMaxAbs: maxAbs(kickSum, v7.stems.kick),
      hatMaxAbs: maxAbs(hatSum, v7.stems.hat),
      pluckMaxAbs: maxAbs(pluckCheck, v7.stems.pluck),
      stabMaxAbs: maxAbs(stabSum, v7.stems.stab),
      sideScaleDelta: Math.abs(sideScale - bed.sideScale),
      sideScale,
      bedSideScale: bed.sideScale,
      fitGain,
    },
  };
}

function busRms(samples, start, end) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(samples.length, Math.floor(end * SR));
  let acc = 0;
  const count = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) acc += samples[i] * samples[i];
  return Math.sqrt(acc / count);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function markdown(rows, meta) {
  const flagged = rows.filter((row) => row.flag !== "—" && row.flag !== "buried" && row.name !== "kick-tick");
  const lines = [
    "# v7c stems",
    "",
    "Each file is one v7c source across the full 22.87 s bed, with silence where that source is silent.",
    "The mp3 is peak-normalized to about −6 dBFS so the tone can be heard.",
    "Level vs mix is that source after its mix gain, the bed fit gain, and the master fade, against the finished v7c mix.",
    "RMS is over 5.5–15.4 s. Peak is the source peak against the mix peak. Both are before the bus glue. Glue on v7c is about 1 dB.",
    "",
    "There is no detune stack, no riser, and no noise shimmer in this render.",
    "Pad motion is the 0.07 Hz weight crossfade and the slow lowpass drift, not a separate oscillator.",
    "Blaze has listened to `kick-tick` and it is not the cricket or bell.",
    "",
    `Rebuild check: pad ${meta.padMaxAbs.toExponential(2)}, kick ${meta.kickMaxAbs.toExponential(2)}, hat ${meta.hatMaxAbs.toExponential(2)}, pluck ${meta.pluckMaxAbs.toExponential(2)}, stab ${meta.stabMaxAbs.toExponential(2)}, side scale delta ${meta.sideScaleDelta.toExponential(2)}.`,
    "",
    "| Name | Code | Onsets | Peak Hz | Centroid Hz | Hit | RMS vs mix | Peak vs mix | Flag |",
    "|---|---|---|---:|---:|---:|---:|---:|---|",
  ];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hit = row.sustained ? "sustained" : `${row.hitMs} ms`;
    const inside = row.inside ? ` ${row.inside}.` : "";
    lines.push(`| ${row.name} | ${row.where}${inside} | ${row.onsets} | ${row.peakHz} | ${row.centroid} | ${hit} | ${round1(row.levelDb)} dB | ${round1(row.peakDb)} dB | ${row.flag} |`);
  }
  lines.push("");
  lines.push("## Flagged, kick tick excluded");
  lines.push("");
  if (!flagged.length) lines.push("None.");
  for (let i = 0; i < flagged.length; i++) {
    const row = flagged[i];
    lines.push(`- \`${row.name}\` (${row.flag}, RMS ${round1(row.levelDb)} dB, peak ${round1(row.peakDb)} dB, tone ${row.peakHz} Hz, centroid ${row.centroid} Hz, ${row.sustained ? "sustained" : `${row.hitMs} ms`})`);
  }
  lines.push("");
  lines.push("## Files");
  lines.push("");
  for (let i = 0; i < rows.length; i++) lines.push(`- STEM-v7c-${rows[i].name}.mp3`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function peakNormalize(left, right) {
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const gain = peak > 1e-8 ? 0.5 / peak : 0;
  const l = new Float64Array(left.length);
  const r = new Float64Array(right.length);
  for (let i = 0; i < left.length; i++) {
    l[i] = left[i] * gain;
    r[i] = right[i] * gain;
  }
  return { left: l, right: r };
}

function writeMp3(outDir, name, left, right) {
  fs.mkdirSync(outDir, { recursive: true });
  const wav = path.join(outDir, `${name}.wav`);
  const mp3 = path.join(outDir, `${name}.mp3`);
  const norm = peakNormalize(left, right);
  P.writeWav(wav, norm.left, norm.right, SR, fs);
  const encoded = spawnSync("ffmpeg", ["-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "320k", mp3], { stdio: "pipe" });
  fs.unlinkSync(wav);
  if (encoded.status !== 0) {
    process.stderr.write(encoded.stderr ? encoded.stderr.toString() : "ffmpeg failed\n");
    return 1;
  }
  return 0;
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return "";
  return argv[i + 1];
}

async function cli(argv) {
  const outDir = argValue(argv, "--out");
  const mdPath = argValue(argv, "--md");
  if (!outDir && !mdPath) {
    process.stderr.write("Usage: node scripts/foundry/stem-split.cjs --out dir [--md file]\n");
    return 1;
  }
  const { rows, meta } = await collect();
  const bad = [
    ["pad", meta.padMaxAbs],
    ["kick", meta.kickMaxAbs],
    ["hat", meta.hatMaxAbs],
    ["pluck", meta.pluckMaxAbs],
    ["stab", meta.stabMaxAbs],
  ].filter((pair) => pair[1] > 1e-5);
  if (bad.length || meta.sideScaleDelta > 1e-3) {
    process.stderr.write(`${JSON.stringify({ bad, sideScaleDelta: meta.sideScaleDelta })}\n`);
    return 1;
  }
  if (mdPath) {
    fs.mkdirSync(path.dirname(path.resolve(mdPath)), { recursive: true });
    fs.writeFileSync(mdPath, markdown(rows, meta));
    process.stdout.write(`${mdPath}\n`);
  }
  if (outDir) {
    for (let i = 0; i < rows.length; i++) {
      const status = writeMp3(outDir, `STEM-v7c-${rows[i].name}`, rows[i].left, rows[i].right);
      if (status !== 0) return status;
      process.stdout.write(`STEM-v7c-${rows[i].name}.mp3 ${rows[i].flag} ${rows[i].levelDb}\n`);
    }
  }
  return 0;
}

module.exports = { collect, markdown, cli };

if (require.main === module) {
  cli(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
}
