// The Squishy Store: spend the coins earned in the games on squishy plush
// dragons, drawn in real 3D. See SPEC.md. One squishy fills the store at a
// time: arrows go to the others, a sideways swipe spins it, a swipe down or
// up squashes or stretches it as far as the finger goes, and a tap squishes
// it. The dots show which one this is, gold for the ones Zoe owns.
//
// Zoe only sees a squishy she owns or has enough coins for. Any other is a
// mystery egg in its colors. When she first has enough for one, its egg
// wiggles until she taps it, and then it hatches.

import * as coins from '../shared/coins.js?v=0.7.12';
import * as sound from '../shared/sound.js?v=0.7.12';
import * as storage from '../shared/storage.js?v=0.7.12';
import { confetti, stars } from '../shared/celebrate.js?v=0.7.12';
import { createSquishy } from './squishy.js?v=0.7.12';
import { ITEMS } from './items.js?v=0.7.12';

const SPIN = 0.5; // radians per second while nobody is touching it
const IDLE_AFTER = 2500; // ms after a drag before it starts spinning again
const DRAG = 0.012; // radians per pixel dragged
const IDLE_FRAME = 33; // ms between pictures while just spinning: 30 a second, easy on older iPads
const SQUISH = 0.55; // how hard a tap squishes
const HOP = 0.3; // how much a squishy wobbles when it appears
const POP = -0.55; // the stretch a squishy hatches with
const PULL = 1.8; // squish per view height swiped: half the height squashes it fully
const MAX_SQUASH = 0.9;
const MAX_STRETCH = -0.6;
const DECIDE = 10; // px a swipe goes before it counts as sideways or up and down
const HATCH_MS = 1100; // how long an egg shakes before it hatches
// Lines in halves that wrap as units, so a narrow panel breaks between them.
const HINT = '<span>Swipe sideways to spin,</span> <span>down to squish!</span>';
const READY_HINT = '<span>It’s ready to hatch!</span> <span>Tap it!</span>';
const LOCKED_HINT = '<span>What’s inside?</span> <span>Earn coins to find out!</span>';

function $(id) {
  return document.getElementById(id);
}

// hatched: ids of squishies whose eggs Zoe has hatched.
const saved = storage.load('store', { hatched: [] });
if (!Array.isArray(saved.hatched)) saved.hatched = [];

let index = 0; // which squishy is showing
let angle = 0.5;
let squishAt = -1e9; // when the last squish started (ms)
let squishBy = SQUISH;
let held = null; // the squish while a finger is pulling it up or down
let touchedAt = -1e9; // when the stage was last dragged
let hatchAt = -1e9; // when the egg on screen started hatching
let popping = false; // it hasn't popped open yet
let lastFrame = 0;
let lastDraw = 0;
let wallet = coins.totals();
const owned = {}; // id -> true
const stage = createSquishy($('stage'), { maxRatio: 1.25 });

function picked() {
  return ITEMS[index];
}

function brightness(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// A squishy's mystery egg: its size, its body color, spots in its other
// colors (stars on a starry one), a question mark that stands out (white on
// a dark egg), and any egg parts from items.js.
const EGGS = ITEMS.map(function (item) {
  const look = item.look;
  const egg = { egg: true, size: look.size, body: look.body, belly: look.belly, wing: look.wing,
    spike: look.spike, eye: brightness(look.body) < 0.45 ? '#ffffff' : '#1d2b53', stars: look.stars,
    acc: look.acc, acc2: look.acc2 };
  Object.keys(item.egg || {}).forEach(function (part) {
    egg[part] = item.egg[part];
  });
  return egg;
});

// Reads the coins and purchases again, after buying.
function refresh() {
  wallet = coins.totals();
  ITEMS.forEach(function (item) {
    owned[item.id] = coins.owns(item.id);
  });
}

// What the store shows for a squishy:
//   owned    hers, always visible
//   visible  she has enough coins and has hatched it
//   ready    she has enough coins but hasn't hatched it yet: a wiggling egg
//   locked   she doesn't have enough coins: a calm egg
function stateOf(item) {
  if (owned[item.id]) return 'owned';
  if (wallet.balance < item.price) return 'locked';
  return saved.hatched.indexOf(item.id) >= 0 ? 'visible' : 'ready';
}

function isEgg(state) {
  return state === 'ready' || state === 'locked';
}

function showBalance() {
  $('balance').innerHTML = coins.ICON + ' ' + wallet.balance;
  $('ledger').innerHTML = 'Earned ' + wallet.earned + ' ' + coins.ICON + ' · Spent ' + wallet.spent +
    ' ' + coins.ICON;
}

// A wobbly squash: squished at first, then bouncing back.
function squishAmount(now) {
  const t = (now - squishAt) / 1000;
  return t < 1.6 ? squishBy * Math.exp(-4.5 * t) * Math.cos(14 * t) : 0;
}

// How an egg rocks side to side: gently when locked, in excited wiggles every
// so often when ready to hatch.
function eggTilt(now, ready) {
  if (!ready) return 0.1 * Math.sin(now / 700);
  const t = (now % 1600) / 1000;
  return t < 0.6 ? 0.22 * Math.sin(t * 26) * (1 - t / 0.6) : 0;
}

function frame(now) {
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  const state = stateOf(picked());
  const shaking = now - hatchAt < HATCH_MS;
  if (popping && !shaking) pop();
  const egg = shaking || isEgg(state);
  let tilt = 0;
  let squash = held !== null ? held : squishAmount(now);
  if (shaking) { // rocking harder and harder, about to hatch
    const t = (now - hatchAt) / HATCH_MS;
    tilt = 0.3 * t * Math.sin(now / 30);
    squash = 0.1 * t * Math.sin(now / 41);
  } else {
    if (now - touchedAt > IDLE_AFTER) {
      // Eggs turn back to face the front; squishies spin.
      if (egg) angle += (0.25 * Math.sin(now / 1300) - angle) * Math.min(1, dt * 4);
      else angle += SPIN * dt;
    }
    if (egg) tilt = eggTilt(now, state === 'ready');
  }
  const idle = !shaking && state !== 'ready' && held === null && now - touchedAt > IDLE_AFTER &&
    now - squishAt > 1600; // still moving, but slowly enough for fewer pictures
  if (stage && !document.hidden && (!idle || now - lastDraw >= IDLE_FRAME)) {
    stage.draw(egg ? EGGS[index] : picked().look, { angle: angle, tilt: tilt, squish: squash });
    lastDraw = now;
  }
  requestAnimationFrame(frame);
}

function squish() {
  squishAt = performance.now();
  squishBy = SQUISH;
  sound.squeak();
}

function showPicked() {
  const item = picked();
  const state = stateOf(item);
  const buy = $('buy');
  $('stage-name').textContent = isEgg(state) ? 'Mystery egg' : item.name;
  buy.classList.toggle('is-owned', state === 'owned');
  buy.classList.toggle('is-short', state === 'locked');
  if (state === 'owned') buy.textContent = '💖 It’s yours!';
  else if (state === 'ready') buy.textContent = '🥚 Hatch it!';
  else if (state === 'locked') buy.innerHTML = 'Need ' + (item.price - wallet.balance) + ' more ' + coins.ICON;
  else buy.innerHTML = 'Buy for ' + item.price + ' ' + coins.ICON;
  $('stage-hint').innerHTML = state === 'ready' ? READY_HINT : state === 'locked' ? LOCKED_HINT : HINT;
  const fallback = document.querySelector('.stage-fallback'); // without WebGL
  if (fallback) fallback.textContent = isEgg(state) ? '🥚' : '🐉';
  Array.prototype.forEach.call($('dots').children, function (dot, i) {
    dot.classList.toggle('is-here', i === index);
    dot.classList.toggle('is-owned', !!owned[ITEMS[i].id]);
  });
}

// The egg on screen shakes and peeps, then pops open (see pop).
function hatch() {
  const item = picked();
  if (stateOf(item) !== 'ready') return;
  saved.hatched.push(item.id);
  storage.save('store', saved);
  hatchAt = performance.now();
  popping = true;
  sound.squeak();
  setTimeout(sound.squeak, 400);
  setTimeout(sound.squeak, 750);
  $('buy').textContent = '🐣 Hatching…';
  $('stage-hint').textContent = 'It’s hatching!';
}

function pop() {
  popping = false;
  angle = 0.5;
  touchedAt = -1e9;
  squishAt = performance.now();
  squishBy = POP;
  sound.celebrate();
  if (stage) stars($('stage'));
  showPicked();
  $('stage-hint').textContent = 'Meet ' + picked().name + '! 🎉';
}

function buy() {
  const item = picked();
  const state = stateOf(item);
  const button = $('buy');
  if (state === 'ready') {
    hatch();
    return;
  }
  if (state === 'owned') {
    squish();
    return;
  }
  if (state === 'locked' || !coins.spend(item.id, item.price)) {
    button.classList.remove('is-nudged');
    void button.offsetWidth; // restarts the wiggle
    button.classList.add('is-nudged');
    $('stage-hint').textContent = 'Play games to earn more coins!';
    return;
  }
  refresh();
  sound.coin();
  setTimeout(sound.celebrate, 250);
  confetti();
  squish();
  $('purse').classList.remove('is-paid');
  void $('purse').offsetWidth;
  $('purse').classList.add('is-paid');
  showBalance();
  showPicked();
  $('stage-hint').textContent = 'You got ' + item.name + '! 🎉';
}

// Shows another squishy, which hops in with a little wobble.
function show(n) {
  index = (n + ITEMS.length) % ITEMS.length;
  angle = 0.5;
  touchedAt = -1e9;
  squishAt = performance.now();
  squishBy = HOP;
  held = null;
  hatchAt = -1e9;
  popping = false;
  showPicked();
}

// Letting go of a squash or stretch: it springs back with a jiggle.
function letGo() {
  if (held === null) return;
  squishBy = held;
  squishAt = performance.now();
  if (Math.abs(held) > 0.2) sound.squeak();
  held = null;
}

// A tap hatches an egg that's ready, and squishes anything else.
function tapStage() {
  if (stateOf(picked()) === 'ready') hatch();
  else squish();
}

// A swipe's first few pixels decide what it does: sideways spins, up or down
// stretches or squashes in step with the finger.
function watchStage() {
  const canvas = $('stage');
  let startX = 0;
  let startY = 0;
  let startAngle = 0;
  let moved = 0;
  let axis = ''; // 'x' or 'y' once decided
  let down = false;
  canvas.addEventListener('pointerdown', function (event) {
    down = true;
    axis = '';
    startX = event.clientX;
    startY = event.clientY;
    startAngle = angle;
    moved = 0;
    touchedAt = performance.now();
    try {
      canvas.setPointerCapture(event.pointerId); // keep the swipe even off the canvas
    } catch (e) {
      // The touch already ended; nothing to capture.
    }
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!down) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    if (!axis && moved >= DECIDE) axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    if (axis === 'x') angle = startAngle + dx * DRAG;
    if (axis === 'y') {
      held = Math.max(MAX_STRETCH, Math.min(MAX_SQUASH, (PULL * dy) / canvas.clientHeight));
    }
    touchedAt = performance.now();
  });
  canvas.addEventListener('pointerup', function () {
    if (down && moved < 8) tapStage();
    else letGo();
    down = false;
  });
  canvas.addEventListener('pointercancel', function () {
    letGo();
    down = false;
  });
}

// iOS plays sound only after a tap; the first one anywhere unlocks it.
document.addEventListener('click', function unlockOnce() {
  sound.unlock();
  document.removeEventListener('click', unlockOnce, true);
}, true);
$('stage').addEventListener('pointerup', function () {
  sound.unlock();
});

ITEMS.forEach(function () {
  const dot = document.createElement('span');
  dot.className = 'dot';
  $('dots').appendChild(dot);
});
$('prev').addEventListener('click', function () {
  show(index - 1);
});
$('next').addEventListener('click', function () {
  show(index + 1);
});
// Arrow keys too, for trying it on a laptop.
document.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowLeft') show(index - 1);
  else if (event.key === 'ArrowRight') show(index + 1);
});
$('buy').addEventListener('click', buy);

refresh();
if (!stage) {
  const canvas = $('stage');
  const fallback = document.createElement('div');
  fallback.className = 'stage-fallback';
  canvas.parentNode.replaceChild(fallback, canvas);
}
// Start on an egg that's ready to hatch, if there is one, then on the first
// squishy Zoe doesn't own, then on the first.
const first = ITEMS.filter(function (item) {
  return stateOf(item) === 'ready';
})[0] || ITEMS.filter(function (item) {
  return !owned[item.id];
})[0] || ITEMS[0];
show(ITEMS.indexOf(first));
showBalance();
if (stage) {
  watchStage();
  requestAnimationFrame(frame);
}
