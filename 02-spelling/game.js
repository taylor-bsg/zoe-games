// Zoe Spells: pick the right spelling to zap a brick in the castle wall that
// keeps the dragon out. Each of the 100 words is one brick. See SPEC.md. Play
// never ends; the Home button is the way out.

import * as sound from '../shared/sound.js?v=0.3.7';
import * as speech from '../shared/speech.js?v=0.3.7';
import * as storage from '../shared/storage.js?v=0.3.7';
import { stars, confetti } from '../shared/celebrate.js?v=0.3.7';
import { WORDS } from './words.js?v=0.3.7';

const GAME_ID = '02-spelling'; // the folder name; also the save key
const TOP = 2; // brick levels: 0, 1, 2 (gold)
const START = 1; // new bricks start in the middle: one right answer makes them gold
const COLORS = ['#a7adbd', '#5aa9ff', '#ffd23f']; // gray stone, blue, gold
const NEXT_AFTER_RIGHT = 1400; // ms before the next word, once the sounds have finished
const SHOW_ANSWER = 2000; // ms the right spelling glows after a wrong pick
const BOLT_HITS = 160; // ms from the wand flash to the brick changing color
const HOLD_TO_CLEAR = 1500; // ms; matches the fill animation in index.html
const CLEAR_LABEL = 'Hold to clear the wall';

// The wall, in the scene's SVG units: 10 rows of 10 bricks, laid like real
// brickwork with a half brick finishing each row.
const WALL_X = 360;
const WALL_BOTTOM = 720;
const BRICK_W = 60;
const BRICK_H = 38;
const PER_ROW = 10;
const ROWS = WORDS.length / PER_ROW;
const WAND = { x: 316, y: 477 }; // center of the wand's star

// levels: word -> 0..TOP. Words not in it are at START.
const saved = storage.load(GAME_ID, { levels: {} });
if (!isObject(saved.levels)) saved.levels = {};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function $(id) {
  return document.getElementById(id);
}

const bricks = {}; // word -> its <rect>
let current = null; // the WORDS entry being asked
let answering = false;
let clearTimer = 0;
let labelTimer = 0;
let holding = false;

function svg(tag, attrs, parent) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.keys(attrs).forEach(function (name) {
    element.setAttribute(name, attrs[name]);
  });
  parent.appendChild(element);
  return element;
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

function level(word) {
  const value = saved.levels[word];
  return value === 0 || value === 1 || value === 2 ? value : START;
}

function goldCount() {
  return WORDS.filter(function (entry) {
    return level(entry.word) === TOP;
  }).length;
}

function buildWall() {
  const wall = $('wall');
  const top = WALL_BOTTOM - ROWS * BRICK_H;
  svg('rect', { x: WALL_X, y: top, width: (PER_ROW + 0.5) * BRICK_W, height: ROWS * BRICK_H,
    rx: 6, fill: '#5d6273' }, wall);
  for (let k = 0; k < 5; k++) { // battlements
    svg('rect', { x: WALL_X + k * 140, y: top - 42, width: 70, height: 46, rx: 6,
      fill: '#8a8fa0', stroke: '#5d6273', 'stroke-width': 4 }, wall);
  }
  for (let row = 0; row < ROWS; row++) { // row 0 is at the bottom
    const y = WALL_BOTTOM - (row + 1) * BRICK_H + 2;
    const shift = row % 2 ? BRICK_W / 2 : 0;
    svg('rect', { x: row % 2 ? WALL_X + 2 : WALL_X + PER_ROW * BRICK_W + 2, y: y,
      width: BRICK_W / 2 - 4, height: BRICK_H - 4, rx: 5, fill: '#8a8fa0' }, wall);
    for (let col = 0; col < PER_ROW; col++) {
      const word = WORDS[row * PER_ROW + col].word;
      bricks[word] = svg('rect', { x: WALL_X + shift + col * BRICK_W + 2, y: y,
        width: BRICK_W - 4, height: BRICK_H - 4, rx: 5, class: 'brick' }, wall);
      paint(word);
    }
  }
}

function paint(word) {
  bricks[word].style.fill = COLORS[level(word)];
}

function showTally() {
  $('tally').textContent = goldCount() + ' / ' + WORDS.length;
}

function pop(element, kind) {
  element.classList.remove(kind);
  void element.getBoundingClientRect(); // forces a reflow so the animation restarts
  element.classList.add(kind);
}

// A random word, weighted toward weaker bricks: (TOP + 1 - level)³, so gray
// bricks come up 27 times and blue ones 8 times as often as gold. Never the
// same word twice in a row.
function choose() {
  const options = [];
  let total = 0;
  WORDS.forEach(function (entry) {
    if (entry === current) return;
    const weight = Math.pow(TOP + 1 - level(entry.word), 3);
    options.push({ entry: entry, weight: weight });
    total += weight;
  });
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= options[i].weight;
    if (r < 0) return options[i].entry;
  }
  return options[options.length - 1].entry;
}

// Says the word, then the sentence with the word in it.
function say() {
  speech.speak(current.word + '. ' + current.sentence.replace('___', current.word));
}

function showSentence() {
  const parts = current.sentence.split('___');
  const sentence = $('sentence');
  const gap = document.createElement('span');
  gap.className = 'gap';
  gap.id = 'gap';
  gap.innerHTML = '&nbsp;';
  sentence.innerHTML = '';
  sentence.appendChild(document.createTextNode(parts[0]));
  sentence.appendChild(gap);
  sentence.appendChild(document.createTextNode(parts[1]));
}

function next() {
  if (current) bricks[current.word].classList.remove('is-target');
  current = choose();
  const target = bricks[current.word];
  target.classList.add('is-target');
  target.parentNode.appendChild(target); // draws its outline over the neighbors
  showSentence();
  const choices = $('choices');
  choices.innerHTML = '';
  shuffle([current.word].concat(current.wrong)).forEach(function (text) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn choice';
    button.textContent = text;
    button.addEventListener('click', function () {
      answer(button, text);
    });
    choices.appendChild(button);
  });
  answering = true;
  say();
}

function centerOf(rect) {
  return {
    x: Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2,
    y: Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')) / 2,
  };
}

// A zigzag of light from one point to another, in scene units.
function bolt(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const steps = 7;
  const points = [from];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const jitter = (Math.random() - 0.5) * Math.min(56, length * 0.24);
    points.push({ x: from.x + dx * t - (dy / length) * jitter, y: from.y + dy * t + (dx / length) * jitter });
  }
  points.push(to);
  const d = 'M' + points.map(function (p) {
    return p.x.toFixed(1) + ',' + p.y.toFixed(1);
  }).join(' L');
  const layer = $('bolts');
  const glow = svg('path', { d: d, class: 'bolt', stroke: 'rgba(255, 230, 110, 0.6)', 'stroke-width': 18 }, layer);
  const core = svg('path', { d: d, class: 'bolt', stroke: '#fffbe0', 'stroke-width': 6 }, layer);
  setTimeout(function () {
    layer.removeChild(glow);
    layer.removeChild(core);
  }, 600);
}

// The wand flashes and a bolt hits the brick. A miss bounces off, up and away.
function cast(rect, hits) {
  const target = centerOf(rect);
  pop($('wand-star'), 'is-casting');
  bolt(WAND, target);
  if (!hits) {
    setTimeout(function () {
      bolt(target, { x: target.x - 110 - Math.random() * 60, y: target.y - 150 - Math.random() * 40 });
    }, BOLT_HITS);
  }
}

function answer(button, text) {
  if (!answering) return;
  answering = false;
  speech.stop();
  const word = current.word;
  const rect = bricks[word];
  const before = level(word);
  const right = text === word;
  const after = right ? Math.min(TOP, before + 1) : Math.max(0, before - 1);
  const wasComplete = goldCount() === WORDS.length;
  saved.levels[word] = after;
  storage.save(GAME_ID, saved);

  const gold = before < TOP && after === TOP;
  const gap = $('gap');
  gap.textContent = word;
  gap.classList.add('is-filled');
  cast(rect, right);
  // Right answers get thunder, then a clearly happy sound just after the
  // crack: the trumpet when the brick turns gold (played below), otherwise
  // the ding. A miss bounces off with no thunder, then the soft "uh-oh".
  if (right) {
    button.classList.add('is-right');
    sound.zap();
    if (!gold) setTimeout(sound.correct, 120);
  } else {
    button.classList.add('is-wrong');
    sound.bounce();
    setTimeout(sound.wrong, 300);
    Array.prototype.forEach.call($('choices').children, function (choice) {
      if (choice.textContent === word) choice.classList.add('is-answer');
    });
  }

  const complete = !wasComplete && goldCount() === WORDS.length;
  setTimeout(function () {
    paint(word);
    showTally();
    pop(rect, gold ? 'is-gold' : 'is-hit');
    if (gold) {
      sound.trumpet();
      stars(rect);
    }
    if (before === TOP && after < TOP) $('dragon').classList.remove('is-gone'); // it's back
  }, BOLT_HITS);
  if (complete) {
    setTimeout(finishWall, 1400);
    setTimeout(next, 6000);
  } else {
    setTimeout(next, right ? NEXT_AFTER_RIGHT : SHOW_ANSWER);
  }
}

// Every brick is gold: the dragon gives up and flies away.
function finishWall() {
  $('sentence').textContent = 'The wall is all gold! The dragon flew away!';
  $('choices').innerHTML = '';
  sound.celebrate();
  confetti();
  const dragon = $('dragon');
  dragon.classList.remove('is-peeking');
  pop(dragon, 'is-leaving');
  setTimeout(function () {
    dragon.classList.remove('is-leaving');
    dragon.classList.add('is-gone');
  }, 2500);
}

// Now and then the dragon peeks over the wall.
function peekLater() {
  setTimeout(function () {
    const dragon = $('dragon');
    if (!dragon.classList.contains('is-gone') && !dragon.classList.contains('is-leaving')) {
      pop(dragon, 'is-peeking');
      setTimeout(function () {
        dragon.classList.remove('is-peeking');
      }, 2700);
    }
    peekLater();
  }, 8000 + Math.random() * 8000);
}

function start() {
  sound.unlock(); // this tap is what lets iOS play sound
  $('intro').hidden = true;
  $('setup').hidden = true;
  $('sentence').hidden = false;
  $('say-again').hidden = false;
  $('choices').hidden = false;
  $('prompt').classList.add('is-playing');
  next(); // its speech starts inside this tap, which iOS requires
}

// Shows text on the clear button, going back to the usual label after ms.
function clearLabel(text, ms) {
  clearTimeout(labelTimer);
  $('clear-label').textContent = text;
  if (ms) {
    labelTimer = setTimeout(function () {
      $('clear-label').textContent = CLEAR_LABEL;
    }, ms);
  }
}

function startHolding(event) {
  event.preventDefault();
  if (holding) return;
  holding = true;
  $('clear-button').classList.add('is-holding');
  clearLabel('Keep holding…');
  clearTimer = setTimeout(clearWall, HOLD_TO_CLEAR);
}

// Let go before the bar filled: nothing is cleared.
function stopHolding() {
  if (!holding) return;
  holding = false;
  clearTimeout(clearTimer);
  $('clear-button').classList.remove('is-holding');
  clearLabel('Hold until the bar fills', 1500);
}

// Every brick back to the start (blue), and the dragon back behind the wall.
function clearWall() {
  holding = false;
  $('clear-button').classList.remove('is-holding');
  saved.levels = {};
  storage.save(GAME_ID, saved);
  WORDS.forEach(function (entry) {
    paint(entry.word);
  });
  showTally();
  $('dragon').classList.remove('is-gone');
  clearLabel('Wall cleared', 2000);
}

$('start-button').addEventListener('click', start);
$('say-again').addEventListener('click', say);
$('clear-button').addEventListener('pointerdown', startHolding);
['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
  $('clear-button').addEventListener(type, stopHolding);
});
// On iPad, keep a long touch from becoming a system long-press (text
// selection, menus, drag and drop), which would cut the hold short.
$('clear-button').addEventListener('touchstart', function (event) {
  event.preventDefault();
}, { passive: false });
document.addEventListener('visibilitychange', function () {
  if (document.hidden) speech.stop();
});

buildWall();
showTally();
if (goldCount() === WORDS.length) $('dragon').classList.add('is-gone');
peekLater();
