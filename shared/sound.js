// Sound effects synthesized with Web Audio, so there are no audio files.
//
//   import * as sound from '../shared/sound.js';
//   startButton.addEventListener('click', () => { sound.unlock(); ... });
//   sound.correct();
//   sound.wrong();
//   sound.celebrate();
//   sound.cheer();
//
// iOS keeps Web Audio silent until the page calls unlock() from a tap: use a
// click handler (pointerdown doesn't count). After that, sounds can play at
// any time. iOS can suspend audio again, for example when the app goes to the
// background, so later taps resume it automatically.
//
// The mute setting is shared by every game and remembered on the device.
// Sounds are also silent when the iPad itself is muted.

import * as storage from './storage.js';

const settings = storage.load('sound', { muted: false });

let ctx = null;
let output = null;

function context() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    output = ctx.createGain(); // master volume
    output.gain.value = 1;
    output.connect(ctx.destination);
  }
  return ctx;
}

// Call from a tap (click handler) before the first sound.
export function unlock() {
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
