// The Squishy Store: spend the coins earned in the games on squishy plush
// dragons, drawn in real 3D. See SPEC.md. The big view spins when dragged and
// squishes when tapped; the shelf below shows every squishy, with a check on
// the ones Zoe owns.

import * as coins from '../shared/coins.js?v=0.7.0';
import * as sound from '../shared/sound.js?v=0.7.0';
import { confetti } from '../shared/celebrate.js?v=0.7.0';
import { createSquishy } from './squishy.js?v=0.7.0';
import { ITEMS } from './items.js?v=0.7.0';

const SPIN = 0.5; // radians per second while nobody is touching it
const IDLE_AFTER = 2500; // ms after a drag before it starts spinning again
const DRAG = 0.012; // radians per pixel dragged
const IDLE_FRAME = 33; // ms between pictures while just spinning: 30 a second, easy on older iPads

function $(id) {
  return document.getElementById(id);
}

let picked = ITEMS[0];
let angle = 0.5;
let squishAt = -1e9; // when the last squish started (ms)
let touchedAt = -1e9; // when the stage was last dragged
let lastFrame = 0;
let lastDraw = 0;
const stage = createSquishy($('stage'), { maxRatio: 1.5 });

function showBalance() {
  const t = coins.totals();
  $('balance').innerHTML = coins.ICON + ' ' + t.balance;
  $('ledger').innerHTML = 'Earned ' + t.earned + ' ' + coins.ICON + ' · Spent ' + t.spent + ' ' + coins.ICON;
}

// A wobbly squash: squished at first, then bouncing back.
function squishAmount(now) {
  const t = (now - squishAt) / 1000;
  return t < 1.6 ? 0.55 * Math.exp(-4.5 * t) * Math.cos(14 * t) : 0;
}

function frame(now) {
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  const idle = now - touchedAt > IDLE_AFTER && now - squishAt > 1600;
  if (now - touchedAt > IDLE_AFTER) angle += SPIN * dt;
  if (stage && !document.hidden && (!idle || now - lastDraw >= IDLE_FRAME)) {
    stage.draw(picked.look, { angle: angle, squish: squishAmount(now) });
    lastDraw = now;
  }
  requestAnimationFrame(frame);
}

function squish() {
  squishAt = performance.now();
  sound.squeak();
}

function showPicked() {
  const owned = coins.owns(picked.id);
  const short = picked.price - coins.balance();
  const buy = $('buy');
  $('stage-name').textContent = picked.name;
  buy.classList.toggle('is-owned', owned);
  buy.classList.toggle('is-short', !owned && short > 0);
  if (owned) buy.textContent = '💖 It’s yours!';
  else if (short > 0) buy.innerHTML = 'Need ' + short + ' more ' + coins.ICON;
  else buy.innerHTML = 'Buy for ' + picked.price + ' ' + coins.ICON;
  Array.prototype.forEach.call($('shelf').children, function (card) {
    card.classList.toggle('is-picked', card.getAttribute('data-id') === picked.id);
  });
}

function showShelf() {
  Array.prototype.forEach.call($('shelf').children, function (card) {
    const item = ITEMS.filter(function (i) {
      return i.id === card.getAttribute('data-id');
    })[0];
    const owned = coins.owns(item.id);
    card.classList.toggle('is-owned', owned);
    card.querySelector('.item-price').innerHTML = owned ? '✓ Mine' : item.price + ' ' + coins.ICON;
  });
}

function buy() {
  const button = $('buy');
  if (coins.owns(picked.id)) {
    squish();
    return;
  }
  if (!coins.spend(picked.id, picked.price)) {
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
  $('stage-hint').textContent = 'You got ' + picked.name + '! 🎉';
  $('purse').classList.remove('is-paid');
  void $('purse').offsetWidth;
  $('purse').classList.add('is-paid');
  showBalance();
  showShelf();
  showPicked();
}

function pick(item) {
  picked = item;
  angle = 0.5;
  touchedAt = -1e9;
  $('stage-hint').textContent = 'Drag to spin. Tap to squish!';
  showPicked();
}

// The shelf's pictures come from one hidden 3D canvas, copied into images.
function buildShelf() {
  const shelf = $('shelf');
  const painter = createSquishy(document.createElement('canvas'), { preserve: true });
  ITEMS.forEach(function (item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'btn item';
    card.setAttribute('data-id', item.id);
    let picture;
    if (painter) {
      painter.draw(item.look, { angle: 0.55, pixels: [240, 168] });
      picture = document.createElement('img');
      picture.src = painter.canvas.toDataURL('image/png');
      picture.alt = '';
    } else {
      picture = document.createElement('span');
      picture.className = 'item-fallback';
      picture.textContent = '🐉';
    }
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name;
    const price = document.createElement('span');
    price.className = 'item-price';
    card.appendChild(picture);
    card.appendChild(name);
    card.appendChild(price);
    card.addEventListener('click', function () {
      pick(item);
    });
    shelf.appendChild(card);
  });
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
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
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

$('buy').addEventListener('click', buy);
buildShelf();
// Start on the first squishy she doesn't own yet (or the first one).
pick(ITEMS.filter(function (item) {
  return !coins.owns(item.id);
})[0] || ITEMS[0]);
showBalance();
showShelf();
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
