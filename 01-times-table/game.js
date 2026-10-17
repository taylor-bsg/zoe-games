// Times Tables: multiplication facts against the clock, on a 10×10 or 15×15
// grid that shows how fast each fact is. See SPEC.md. Play never ends; the
// Home button is the way out.

import { createKeypad } from '../shared/keypad.js';
import * as sound from '../shared/sound.js';
import * as storage from '../shared/storage.js';
import { stars, zip } from '../shared/celebrate.js';

const GAME_ID = '01-times-table'; // the folder name; also the save key
const SIZES = [10, 15]; // normal and advanced grids
const KEEP = 3; // attempts remembered per problem
const SLOW = 5; // seconds: a wrong, missing, or slower attempt scores this
const GREEN = 3; // seconds: a cell whose average is under this is mastered
const GREEN_COLOR = 'rgb(64, 192, 87)';
const FLAME = [[255, 255, 255], [255, 224, 77], [255, 138, 0], [240, 62, 62]]; // white to red
// A new record must beat the last cheer by about ten good answers' worth: a
// 2 s answer takes a fresh cell from SLOW to (2 + SLOW * (KEEP - 1)) / KEEP.
const RECORD_STEP = 10 * Math.log((SLOW * KEEP) / (2 + SLOW * (KEEP - 1)));
const PRAISE = ['Yes!', 'Great!', 'Super!', 'Nice!', 'You got it!'];
const HOLD_TO_CLEAR = 2000; // ms; matches the fill animation in index.html

// times: 'AxB' -> the last KEEP attempt scores in seconds, oldest first.
// best: grid size -> the speed at the last cheer (lower is better).
const saved = storage.load(GAME_ID, { size: SIZES[0], times: {}, best: {} });
if (SIZES.indexOf(saved.size) < 0) saved.size = SIZES[0];
if (!isObject(saved.times)) saved.times = {};
if (!isObject(saved.best)) saved.best = {};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function $(id) {
  return document.getElementById(id);
}

const grid = $('grid');
const message = $('message');
const sizeButtons = Array.prototype.slice.call(document.querySelectorAll('.size-button'));
const pad = createKeypad($('keypad'), {
  display: $('answer'),
  maxLength: 3,
  digitsOnly: true,
  onChange: check,
});

let cells = {}; // 'AxB' -> grid cell
let a = 0; // the current problem is a × b
let b = 0;
let shownAt = 0; // performance.now() when it appeared
let clearTimer = 0;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function attempts(x, y) {
  const list = saved.times[x + 'x' + y];
  if (!Array.isArray(list)) return [];
  return list.filter(function (t) {
    return t > 0;
  }).map(function (t) {
    return Math.min(Number(t), SLOW);
  }).slice(-KEEP);
}

// A problem's score: the average of its last KEEP attempts, counting missing
// ones as SLOW.
function score(x, y) {
  const list = attempts(x, y);
  let total = SLOW * (KEEP - list.length);
  list.forEach(function (seconds) {
    total += seconds;
  });
  return total / KEEP;
}

// The speed: the geometric mean of the scores of every problem on the grid.
function speed() {
  const n = saved.size;
  let logs = 0;
  for (let x = 1; x <= n; x++) {
    for (let y = 1; y <= n; y++) logs += Math.log(score(x, y));
  }
  return Math.exp(logs / (n * n));
}

// Green under GREEN seconds. From there up to SLOW: white, yellow, orange,
// red.
function cellColor(seconds) {
  if (seconds < GREEN) return GREEN_COLOR;
  const last = FLAME.length - 1;
  const t = last * Math.min(1, (seconds - GREEN) / (SLOW - GREEN));
  const i = Math.min(last - 1, Math.floor(t));
  const from = FLAME[i];
  const to = FLAME[i + 1];
  return 'rgb(' + from.map(function (c, k) {
    return Math.round(c + (to[k] - c) * (t - i));
  }).join(',') + ')';
}

function addLabel(text) {
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = text;
  grid.appendChild(label);
}

// Rows are the first number, columns the second.
function buildGrid() {
  const n = saved.size;
  grid.innerHTML = '';
  cells = {};
  grid.style.gridTemplateColumns = 'repeat(' + (n + 1) + ', 1fr)';
  grid.style.gridTemplateRows = 'repeat(' + (n + 1) + ', 1fr)';
  grid.style.gap = n > 10 ? '2px' : '3px';
  addLabel('×');
  for (let y = 1; y <= n; y++) addLabel(y);
  for (let x = 1; x <= n; x++) {
    addLabel(x);
    for (let y = 1; y <= n; y++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.backgroundColor = cellColor(score(x, y));
      cells[x + 'x' + y] = cell;
      grid.appendChild(cell);
    }
  }
  fitGrid();
}

// Makes the grid the biggest square that fits its box, leaving room for the
// current cell's outline.
function fitGrid() {
  const box = $('grid-box');
  const side = Math.floor(Math.min(box.clientWidth, box.clientHeight)) - 8;
  grid.style.width = side + 'px';
  grid.style.height = side + 'px';
  grid.style.fontSize = Math.max(10, Math.round((side / (saved.size + 1)) * 0.45)) + 'px';
}

function showSpeed() {
  $('speed').textContent = '⏱ ' + speed().toFixed(2) + ' s';
}

function showSize() {
  sizeButtons.forEach(function (button) {
    const size = Number(button.getAttribute('data-size'));
    button.setAttribute('aria-pressed', String(size === saved.size));
  });
}

function say(text, kind) {
  message.textContent = text;
  message.className = kind ? 'message ' + kind : 'message';
}

// Marks the answer box (or clears it), replaying the animation.
function mark(kind) {
  const box = pad.display;
  box.classList.remove('is-correct', 'is-wrong', 'is-reveal');
  if (!kind) return;
  void box.offsetWidth; // forces a reflow so the animation restarts
  box.classList.add(kind);
}

function pop(element, kind) {
  element.classList.remove(kind);
  void element.offsetWidth;
  element.classList.add(kind);
}

function start() {
  sound.unlock(); // this tap is what lets iOS play sound
  if (typeof saved.best[saved.size] !== 'number') {
    saved.best[saved.size] = speed();
    storage.save(GAME_ID, saved);
  }
  $('intro').hidden = true;
  $('setup').hidden = true;
  $('playing').hidden = false;
  $('keypad').hidden = false;
  fitGrid();
  next();
}

// A random problem, weighted by score so slow ones come up more often, but
// never the same one twice in a row.
function choose() {
  const n = saved.size;
  const options = [];
  let total = 0;
  for (let x = 1; x <= n; x++) {
    for (let y = 1; y <= n; y++) {
      if (x === a && y === b) continue;
      const weight = score(x, y);
      options.push({ x: x, y: y, weight: weight });
      total += weight;
    }
  }
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= options[i].weight;
    if (r < 0) return options[i];
  }
  return options[options.length - 1];
}

function next() {
  const problem = choose();
  if (cells[a + 'x' + b]) cells[a + 'x' + b].classList.remove('is-current');
  a = problem.x;
  b = problem.y;
  cells[a + 'x' + b].classList.add('is-current');
  $('question').textContent = a + ' × ' + b + ' =';
  say('');
  mark(null);
  pad.clear();
  pad.setEnabled(true);
  shownAt = performance.now();
}

// Runs as each digit is typed: right as soon as the answer is complete,
// wrong as soon as a digit can't lead to it. No Enter key needed.
function check(value) {
  const answer = String(a * b);
  if (value === answer) right();
  else if (answer.indexOf(value) !== 0) wrong();
}

// Saves an attempt at the current problem, repaints its cell and the speed,
// and returns whether the cell just turned green.
function remember(seconds) {
  const key = a + 'x' + b;
  const before = score(a, b);
  saved.times[key] = attempts(a, b).concat(Math.round(seconds * 100) / 100).slice(-KEEP);
  storage.save(GAME_ID, saved);
  const after = score(a, b);
  const crowned = before >= GREEN && after < GREEN;
  cells[key].style.backgroundColor = cellColor(after);
  cells[key].classList.remove('is-updated', 'is-crowned');
  pop(cells[key], crowned ? 'is-crowned' : 'is-updated');
  showSpeed();
  return crowned;
}

// True when the speed beats the last cheer by RECORD_STEP, shared across the
// grid's cells.
function newRecord() {
  const n = saved.size;
  const now = speed();
  if (now > saved.best[n] * Math.exp(-RECORD_STEP / (n * n))) return false;
  saved.best[n] = now;
  storage.save(GAME_ID, saved);
  return true;
}

function right() {
  const seconds = Math.max(0.1, (performance.now() - shownAt) / 1000);
  const time = seconds.toFixed(1) + ' s';
  pad.setEnabled(false);
  const crowned = remember(Math.min(seconds, SLOW));
  const record = newRecord();
  mark('is-correct');
  sound.correct();
  stars(pad.display);
  if (record) say('New record! ' + time, 'record');
  else if (crowned) say('👑 Mastered! ' + time, 'good');
  else say(pick(PRAISE) + ' ' + time, 'good');
  let cheerAt = 250;
  if (crowned) {
    stars(cells[a + 'x' + b]);
    setTimeout(sound.trumpet, 250);
    cheerAt += 1300; // after the trumpet
  }
  if (record) {
    pop($('speed-box'), 'is-record');
    setTimeout(function () {
      sound.cheer();
      zip();
    }, cheerAt);
    setTimeout(function () {
      $('speed-box').classList.remove('is-record');
    }, 2000);
  }
  setTimeout(next, 700);
}

function wrong() {
  pad.setEnabled(false);
  remember(SLOW);
  mark('is-wrong');
  say('Almost! Remember this one.', 'oops');
  sound.wrong();
  setTimeout(function () {
    pad.display.textContent = String(a * b);
    mark('is-reveal');
  }, 500);
  setTimeout(next, 2300);
}

function stopHolding() {
  clearTimeout(clearTimer);
  $('clear-button').classList.remove('is-holding');
}

// Forgets every score, for both grid sizes, and the record marks.
function clearScores() {
  stopHolding();
  saved.times = {};
  saved.best = {};
  storage.save(GAME_ID, saved);
  buildGrid();
  showSpeed();
  $('clear-label').textContent = 'Scores cleared';
  setTimeout(function () {
    $('clear-label').textContent = 'Hold to clear scores';
  }, 2000);
}

$('clear-button').addEventListener('pointerdown', function (event) {
  event.preventDefault();
  $('clear-button').classList.add('is-holding');
  clearTimer = setTimeout(clearScores, HOLD_TO_CLEAR);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
  $('clear-button').addEventListener(type, stopHolding);
});

sizeButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    saved.size = Number(button.getAttribute('data-size'));
    storage.save(GAME_ID, saved);
    showSize();
    buildGrid();
    showSpeed();
  });
});
$('start-button').addEventListener('click', start);
window.addEventListener('resize', fitGrid);

// If the iPad leaves the game mid-problem, the clock starts over on return.
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) shownAt = performance.now();
});
window.addEventListener('pageshow', function (event) {
  if (event.persisted) shownAt = performance.now();
});

showSize();
buildGrid();
showSpeed();
