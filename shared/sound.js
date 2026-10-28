// Sound effects synthesized with Web Audio, so there are no audio files.
//
//   import * as sound from '../shared/sound.js?v=0.7.2';
//   startButton.addEventListener('click', () => { sound.unlock(); ... });
//   sound.correct();
//   sound.wrong();
//   sound.celebrate();
//   sound.cheer();
//   sound.trumpet();
//   sound.zap();
//   sound.bounce();
//   sound.coin();
//   sound.squeak();
//
// iOS keeps Web Audio silent until the page calls unlock() from a tap: use a
// click handler (pointerdown doesn't count). After that, sounds can play at
// any time. iOS can suspend audio again, for example when the app goes to the
// background, so later taps resume it automatically.
//
// The mute setting is shared by every game and remembered on the device.
// On iOS 17 and later, sounds play even when the iPad is in silent mode, just
// like the read-aloud voice, so the launcher's speaker button is the way to
// turn them off. Older iOS versions mute them in silent mode.

import * as storage from './storage.js?v=0.7.2';

const settings = storage.load('sound', { muted: false });

let ctx = null;
let output = null;

function context() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    // Master volume, loud enough to sit near the read-aloud voice, into a
    // limiter so overlapping sounds don't distort.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    output = ctx.createGain();
    output.gain.value = 2.5;
    output.connect(limiter);
    limiter.connect(ctx.destination);
  }
  return ctx;
}

// Call from a tap (click handler) before the first sound.
export function unlock() {
  if (navigator.audioSession) {
    try {
      navigator.audioSession.type = 'playback'; // play through silent mode
    } catch (e) {
      // Not allowed here: keep the default.
    }
  }
  const c = context();
  if (!c || c.state === 'running') return;
  try {
    const resumed = c.resume();
    if (resumed && resumed.catch) resumed.catch(function () {});
  } catch (e) {
    // Older Safari: the silent sound below does the unlocking.
  }
  // Older iOS versions also need a sound started during the tap.
  const silence = c.createBufferSource();
  silence.buffer = c.createBuffer(1, 1, c.sampleRate);
  silence.connect(c.destination);
  silence.start(0);
}

// Resume after iOS suspends audio, on the next tap or key press. This only
// kicks in once a page has used sound.
['pointerup', 'touchend', 'click', 'keydown'].forEach(function (type) {
  document.addEventListener(type, function () {
    if (ctx) unlock();
  }, true);
});

export function isMuted() {
  return settings.muted;
}

export function setMuted(muted) {
  settings.muted = !!muted;
  storage.save('sound', settings);
}

// Plays one note: frequency in Hz, start and length in seconds from now.
// glideTo (optional) slides the pitch to that frequency over the note.
function note(freq, start, length, type, volume, glideTo) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + length);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(env);
  env.connect(output);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

function canPlay() {
  return !settings.muted && context() !== null;
}

// A bright rising "ding-ding".
export function correct() {
  if (!canPlay()) return;
  note(784, 0, 0.16, 'triangle', 0.35); // G5
  note(1047, 0.09, 0.34, 'triangle', 0.35); // C6
  note(2093, 0.09, 0.25, 'sine', 0.05); // sparkle an octave up
}

// A soft, low "uh-oh". Gentle on purpose: a nudge, not a buzzer.
export function wrong() {
  if (!canPlay()) return;
  note(392, 0, 0.16, 'sine', 0.22); // G4
  note(330, 0.15, 0.32, 'sine', 0.22, 300); // E4, drooping a little
}

// A happy fanfare: a quick arpeggio up to a ringing chord, with sparkles.
export function celebrate() {
  if (!canPlay()) return;
  [523, 659, 784, 1047, 1319].forEach(function (freq, i) { // C5 E5 G5 C6 E6
    note(freq, i * 0.08, 0.22, 'triangle', 0.3);
  });
  [1047, 1319, 1568].forEach(function (freq) { // C6 major chord
    note(freq, 0.45, 0.9, 'triangle', 0.16);
  });
  [2093, 2637, 3136, 2637, 3136].forEach(function (freq, i) {
    note(freq, 0.55 + i * 0.1, 0.14, 'sine', 0.05);
  });
}

let noise = null;

// One second of white noise, made once and looped: claps and crowd.
function noiseBuffer() {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// Band-passed noise that rises and fades: a clap when short, a crowd when long.
function hiss(start, length, freq, q, volume, rise) {
  const t = ctx.currentTime + start;
  const src = ctx.createBufferSource();
  const band = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = noiseBuffer();
  src.loop = true;
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = q;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + rise);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(band);
  band.connect(env);
  env.connect(output);
  src.start(t, Math.random() * 0.9);
  src.stop(t + length + 0.05);
}

// A buzzy voice sliding up with a wobble, like a "woo!" from the crowd.
function woo(start, length, from, to, volume) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const wobble = ctx.createOscillator();
  const depth = ctx.createGain();
  const soften = ctx.createBiquadFilter();
  const env = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length * 0.6);
  wobble.frequency.value = 6;
  depth.gain.value = to * 0.03;
  soften.type = 'lowpass';
  soften.frequency.value = 2000;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + 0.05);
  env.gain.setValueAtTime(volume, t + length * 0.7);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  wobble.connect(depth);
  depth.connect(osc.frequency);
  osc.connect(soften);
  soften.connect(env);
  env.connect(output);
  osc.start(t);
  wobble.start(t);
  osc.stop(t + length + 0.05);
  wobble.stop(t + length + 0.05);
}

// Hooray, e.g. for a new record: a cheering crowd, applause, two "woo!"s,
// and sparkles on top.
export function cheer() {
  if (!canPlay()) return;
  hiss(0, 1.6, 800, 0.8, 0.12, 0.3);
  hiss(0.05, 1.5, 2000, 1, 0.07, 0.35);
  for (let i = 0; i < 26; i++) {
    const at = Math.pow(Math.random(), 1.5) * 1.3; // claps bunch up early
    hiss(at, 0.08, 900 + Math.random() * 1700, 1.2, 0.25 + Math.random() * 0.2, 0.004);
  }
  woo(0.05, 0.4, 330, 700, 0.1);
  woo(0.45, 0.5, 420, 880, 0.09);
  [1568, 2093, 2637, 3136].forEach(function (freq, i) {
    note(freq, 0.3 + i * 0.08, 0.2, 'sine', 0.05);
  });
}

// One brass note: a buzzy attack that settles, a scoop up into the pitch,
// and vibrato on long notes.
function horn(freq, start, length, volume) {
  const t = ctx.currentTime + start;
  const settle = Math.min(0.15, length * 0.8);
  const osc = ctx.createOscillator();
  const tone = ctx.createBiquadFilter();
  const env = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq * 0.97, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
  tone.type = 'lowpass';
  tone.Q.value = 1.5;
  tone.frequency.setValueAtTime(freq * 1.5, t);
  tone.frequency.exponentialRampToValueAtTime(freq * 6, t + 0.04);
  tone.frequency.exponentialRampToValueAtTime(freq * 3.5, t + 0.25);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + 0.03);
  env.gain.exponentialRampToValueAtTime(volume * 0.75, t + settle);
  env.gain.setValueAtTime(volume * 0.75, t + length);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.12);
  if (length > 0.3) {
    const wobble = ctx.createOscillator();
    const depth = ctx.createGain();
    wobble.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(freq * 0.008, t + 0.3);
    wobble.connect(depth);
    depth.connect(osc.frequency);
    wobble.start(t);
    wobble.stop(t + length + 0.15);
  }
  osc.connect(tone);
  tone.connect(env);
  env.connect(output);
  osc.start(t);
  osc.stop(t + length + 0.15);
}

// A royal trumpet fanfare: three quick pickups, then a held chord with a
// timpani hit. For example, when a fact is mastered.
export function trumpet() {
  if (!canPlay()) return;
  [0, 0.13, 0.26].forEach(function (at) {
    horn(392, at, 0.1, 0.12); // G4
  });
  horn(523, 0.4, 0.75, 0.12); // C5, E5, G5: a C major chord
  horn(659, 0.4, 0.75, 0.08);
  horn(784, 0.4, 0.75, 0.07);
  note(98, 0.4, 0.7, 'sine', 0.25, 82); // timpani
}

// A soft-clipping curve for a WaveShaper: drive adds overtones.
function grit(drive) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / curve.length - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

// Noise through a filter with a quick decay: a crack when bright and short.
function burst(start, length, type, freq, volume) {
  const t = ctx.currentTime + start;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = noiseBuffer();
  src.loop = true;
  filter.type = type;
  filter.frequency.value = freq;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(filter);
  filter.connect(env);
  env.connect(output);
  src.start(t, Math.random() * 0.9);
  src.stop(t + length + 0.05);
}

// A lightning strike: a sharp crack, then a short boom that rattles as it
// dies away, under a second. Close-up thunder crackles rather than whooshes,
// and its lowest notes are too deep for small speakers, so the boom is
// distorted to add overtones that iPhone and iPad speakers can play.
export function zap() {
  if (!canPlay()) return;
  const t = ctx.currentTime;
  burst(0, 0.09, 'highpass', 1500, 0.9); // crack
  const src = ctx.createBufferSource();
  const low = ctx.createBiquadFilter();
  const shaper = ctx.createWaveShaper();
  const tame = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = noiseBuffer();
  src.loop = true;
  low.type = 'lowpass';
  low.frequency.value = 220;
  shaper.curve = grit(6);
  tame.type = 'lowpass';
  tame.frequency.value = 1400;
  // The rattle: random levels every few hundredths of a second, fading out.
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.15, t + 0.012);
  let at = t + 0.012;
  while (at < t + 0.82) {
    at += 0.025 + Math.random() * 0.04;
    const fade = Math.pow(Math.max(0, 1 - (at - t) / 0.9), 1.6);
    env.gain.linearRampToValueAtTime(0.15 * fade * (0.3 + Math.random() * 0.7), at);
  }
  env.gain.linearRampToValueAtTime(0, t + 0.92);
  src.connect(low);
  low.connect(shaper);
  shaper.connect(tame);
  tame.connect(env);
  env.connect(output);
  src.start(t, Math.random() * 0.9);
  src.stop(t + 0.95);
  note(75, 0, 0.7, 'sine', 0.22, 38); // deep tone, for headphones and bigger speakers
}

// A springy "boing": a wobbling tone that jumps up and settles back down.
function boing(start, length, volume) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const wobble = ctx.createOscillator();
  const depth = ctx.createGain();
  const env = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(330, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.07);
  osc.frequency.exponentialRampToValueAtTime(350, t + length);
  wobble.frequency.value = 13;
  depth.gain.value = 45;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  wobble.connect(depth);
  depth.connect(osc.frequency);
  osc.connect(env);
  env.connect(output);
  osc.start(t);
  wobble.start(t);
  osc.stop(t + length + 0.05);
  wobble.stop(t + length + 0.05);
}

// A lightning bolt bouncing off something: a small crack and a "boing", with
// no thunder. Playful, for a miss.
export function bounce() {
  if (!canPlay()) return;
  hiss(0, 0.12, 2500, 0.6, 0.6, 0.004);
  boing(0.04, 0.45, 0.24);
}

// Coins: a bright two-note "ching", e.g. for earning or buying.
export function coin() {
  if (!canPlay()) return;
  note(988, 0, 0.09, 'triangle', 0.3); // B5
  note(1319, 0.07, 0.4, 'triangle', 0.3); // E6
  note(2637, 0.07, 0.3, 'sine', 0.06);
}

// A squeaky-toy chirp, e.g. when a plush is squeezed.
export function squeak() {
  if (!canPlay()) return;
  note(560, 0, 0.13, 'triangle', 0.25, 930);
  note(760, 0.1, 0.1, 'triangle', 0.15, 1120);
}
