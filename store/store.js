// The Squishy Store: spend the coins earned in the games on squishy plush
// dragons, drawn in real 3D. See SPEC.md. One squishy fills the store at a
// time: arrows go to the others, a drag spins it, and a tap squishes it. The
// dots show which one this is, gold for the ones Zoe owns.

import * as coins from '../shared/coins.js?v=0.7.1';
import * as sound from '../shared/sound.js?v=0.7.1';
import { confetti } from '../shared/celebrate.js?v=0.7.1';
import { createSquishy } from './squishy.js?v=0.7.1';
import { ITEMS } from './items.js?v=0.7.1';

const SPIN = 0.5; // radians per second while nobody is touching it
const IDLE_AFTER = 2500; // ms after a drag before it starts spinning again
const DRAG = 0.012; // radians per pixel dragged
const IDLE_FRAME = 33; // ms between pictures while just spinning: 30 a second, easy on older iPads
const SQUISH = 0.55; // how hard a tap squishes
const HOP = 0.3; // how much a squishy wobbles when it appears

function $(id) {
  return document.getElementById(id);
}

let index = 0; // which squishy is showing
let angle = 0.5;
let squishAt = -1e9; // when the last squish started (ms)
let squishBy = SQUISH;
let touchedAt = -1e9; // when the stage was last dragged
let lastFrame = 0;
let lastDraw = 0;
const stage = createSquishy($('stage'), { maxRatio: 1.25 });

function picked() {
  return ITEMS[index];
}

function showBalance() {
  const t = coins.totals();
  $('balance').innerHTML = coins.ICON + ' ' + t.balance;
  $('ledger').innerHTML = 'Earned ' + t.earned + ' ' + coins.ICON + ' · Spent ' + t.spent + ' ' + coins.ICON;
}

// A wobbly squash: squished at first, then bouncing back.
function squishAmount(now) {
  const t = (now - squishAt) / 1000;
  return t < 1.6 ? squishBy * Math.exp(-4.5 * t) * Math.cos(14 * t) : 0;
}

function frame(now) {
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  const idle = now - touchedAt > IDLE_AFTER && now - squishAt > 1600;
  if (now - touchedAt > IDLE_AFTER) angle += SPIN * dt;
  if (stage && !document.hidden && (!idle || now - lastDraw >= IDLE_FRAME)) {
    stage.draw(picked().look, { angle: angle, squish: squishAmount(now) });
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
  const owned = coins.owns(item.id);
  const short = item.price - coins.balance();
  const buy = $('buy');
  $('stage-name').textContent = item.name;
  buy.classList.toggle('is-owned', owned);
  buy.classList.toggle('is-short', !owned && short > 0);
  if (owned) buy.textContent = '💖 It’s yours!';
  else if (short > 0) buy.innerHTML = 'Need ' + short + ' more ' + coins.ICON;
  else buy.innerHTML = 'Buy for ' + item.price + ' ' + coins.ICON;
  Array.prototype.forEach.call($('dots').children, function (dot, i) {
    dot.classList.toggle('is-here', i === index);
    dot.classList.toggle('is-owned', coins.owns(ITEMS[i].id));
  });
}

function buy() {
  const item = picked();
  const button = $('buy');
  if (coins.owns(item.id)) {
    squish();
    return;
  }
  if (!coins.spend(item.id, item.price)) {
    button.classList.remove('is-nudged');
    void button.offsetWidth; // restarts the wiggle
    button.classList.add('is-nudged');
    $('stage-hint').textContent = 'Play games to earn more coins!';
    return;
  }
  sound.coin();
  setTimeout(sound.celebrate, 250);
  confetti();
  squish();
  $('stage-hint').textContent = 'You got ' + item.name + '! 🎉';
  $('purse').classList.remove('is-paid');
  void $('purse').offsetWidth;
  $('purse').classList.add('is-paid');
  showBalance();
  showPicked();
}

// Shows another squishy, which hops in with a little wobble.
function show(n) {
  index = (n + ITEMS.length) % ITEMS.length;
  angle = 0.5;
  touchedAt = -1e9;
  squishAt = performance.now();
  squishBy = HOP;
  $('stage-hint').textContent = 'Drag to spin. Tap to squish!';
  showPicked();
}

// Drag to spin; a tap without much dragging squishes.
function watchStage() {
  const canvas = $('stage');
  let startX = 0;
  let startAngle = 0;
  let moved = 0;
  let down = false;
  canvas.addEventListener('pointerdown', function (event) {
    down = true;
    startX = event.clientX;
    startAngle = angle;
    moved = 0;
    touchedAt = performance.now();
    try {
      canvas.setPointerCapture(event.pointerId); // keep the drag even off the canvas
    } catch (e) {
      // The touch already ended; nothing to capture.
    }
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!down) return;
    moved = Math.max(moved, Math.abs(event.clientX - startX));
    angle = startAngle + (event.clientX - startX) * DRAG;
    touchedAt = performance.now();
  });
  canvas.addEventListener('pointerup', function () {
    if (down && moved < 8) squish();
    down = false;
  });
  canvas.addEventListener('pointercancel', function () {
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

// Start on the first squishy Zoe doesn't own yet (or the first one).
const firstNew = ITEMS.filter(function (item) {
  return !coins.owns(item.id);
})[0];
show(firstNew ? ITEMS.indexOf(firstNew) : 0);
showBalance();
if (stage) {
  watchStage();
  requestAnimationFrame(frame);
} else {
  const canvas = $('stage');
  const fallback = document.createElement('div');
  fallback.className = 'stage-fallback';
  fallback.textContent = '🐉';
  canvas.parentNode.replaceChild(fallback, canvas);
  $('stage-hint').textContent = '';
}
