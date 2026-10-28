// Zoe Spells: pick the right spelling to zap a brick in the castle wall that
// keeps the dragon out. Each level is a wall of 100 bricks, one per word, with
// its own dragon; finishing a level opens the next. See SPEC.md. Play never
// ends; the Home button is the way out.

import * as sound from '../shared/sound.js?v=0.7.1';
import * as speech from '../shared/speech.js?v=0.7.1';
import * as storage from '../shared/storage.js?v=0.7.1';
import * as coins from '../shared/coins.js?v=0.7.1';
import { stars, confetti, coins as floatCoins } from '../shared/celebrate.js?v=0.7.1';
import { WORDS as WORDS_1 } from './words-1.js?v=0.7.1';
import { WORDS as WORDS_2 } from './words-2.js?v=0.7.1';
import { WORDS as WORDS_3 } from './words-3.js?v=0.7.1';
import { WORDS as WORDS_4 } from './words-4.js?v=0.7.1';

const GAME_ID = '02-spelling'; // the folder name; also the save key
const TOP = 2; // brick levels: 0, 1, 2 (gold)
const START = 1; // new bricks start in the middle: one right answer makes them gold
const COLORS = ['#a7adbd', '#5aa9ff', '#ffd23f']; // gray stone, blue, gold
const NEXT_AFTER_RIGHT = 1400; // ms before the next word, once the sounds have finished
const NEXT_AFTER_FOUND = 3000; // ms to look at the right spelling, when found after a miss
const BOLT_HITS = 160; // ms from the wand flash to the brick changing color
const HOLD_TO_CLEAR = 1500; // ms; matches the fill animation in index.html
const CLEAR_LABEL = 'Hold to clear the wall';
const PRIZE = 100; // coins for finishing a wall, times the level

// The levels, in order: their words, dragon, hill colors, start-screen line,
// and what a finished brick is (with a non-breaking hyphen, so lines don't
// break inside see-through). Level 4's middle bricks are green, not blue, so
// they can't be mistaken for see-through panes showing the blue sky. Level 4's finished bricks are see-through
// glass, with no mortar behind them, so they show the dragon lurking behind
// the wall; its words are sound-alikes, so the voice reads just the sentence.
const LEVELS = [
  { words: WORDS_1, dragon: 'dragon-1', name: 'dragon', hill: ['#62c370', '#4fae5d'],
    intro: 'Tap the right spelling to zap a brick!', top: 'gold' },
  { words: WORDS_2, dragon: 'dragon-2', name: 'ice dragon', hill: ['#eef7ff', '#d3e8f8'],
    intro: 'Level 2: keep the ice dragon out!', top: 'gold' },
  { words: WORDS_3, dragon: 'dragon-3', name: 'fire dragon', hill: ['#c4623f', '#9c4329'],
    intro: 'Level 3: keep the fire dragon out!', top: 'gold' },
  { words: WORDS_4, dragon: 'dragon-4', name: 'shadow dragon', hill: ['#7183a3', '#5b6b8a'],
    intro: 'Level 4: turn the wall see‑through!', top: 'see‑through', glass: true,
    colors: ['#a7adbd', '#2f9e44', 'rgba(255, 255, 255, 0.12)'], sentenceOnly: true },
];

// The wall, in the scene's SVG units: 10 rows of 10 bricks, laid like real
// brickwork with a half brick finishing each row.
const WALL_X = 360;
const WALL_BOTTOM = 720;
const BRICK_W = 60;
const BRICK_H = 38;
const PER_ROW = 10;
const ROWS = 10;
const WAND = { x: 316, y: 477 }; // center of the wand's star

// levels: word -> 0..TOP, for the words of every level (no word is in two
// levels). Words not in it are at START.
// missed: word -> { count, last, picked } for every word ever missed: how many
// wrong picks, when the last one was (ms since 1970), and which wrong
// spellings were picked how often. Kept for a future level; never cleared.
// unlocked: the highest level that's open. wall: the level last chosen.
// paid: level -> true once its wall prize is paid; clearing the wall resets
// it, so a wall that slips and comes back can't pay twice.
const saved = storage.load(GAME_ID, { levels: {}, missed: {}, unlocked: 1, wall: 1 });
if (!isObject(saved.levels)) saved.levels = {};
if (!isObject(saved.missed)) saved.missed = {};
if (!isLevel(saved.unlocked)) saved.unlocked = 1;
if (!isLevel(saved.wall) || saved.wall > saved.unlocked) saved.wall = 1;
if (!isObject(saved.paid)) { // walls finished before coins existed were paid by the head start
  saved.paid = {};
  for (let n = 1; n < saved.unlocked; n++) saved.paid[n] = true;
}

// For testing, game/?level=2 opens that level for this visit, locked or not.
const preview = Number((/[?&]level=(\d+)/.exec(location.search) || [])[1]);

function isLevel(value) {
  return typeof value === 'number' && value >= 1 && value <= LEVELS.length && value % 1 === 0;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function $(id) {
  return document.getElementById(id);
}

let bricks = {}; // word -> its <rect>, for the level on screen
let wall = 1; // the level on screen
let words = WORDS_1; // its words
let current = null; // the entry being asked
let answering = false;
let missedThisTime = false; // a wrong pick on the current word
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

function goldCount(list) {
  return (list || words).filter(function (entry) {
    return level(entry.word) === TOP;
  }).length;
}

function buildWall() {
  const group = $('wall');
  const glass = LEVELS[wall - 1].glass;
  while (group.firstChild) group.removeChild(group.firstChild);
  bricks = {};
  const top = WALL_BOTTOM - ROWS * BRICK_H;
  if (!glass) { // the mortar behind the bricks
    svg('rect', { x: WALL_X, y: top, width: (PER_ROW + 0.5) * BRICK_W, height: ROWS * BRICK_H,
      rx: 6, fill: '#5d6273' }, group);
  }
  for (let k = 0; k < 5; k++) { // battlements
    svg('rect', { x: WALL_X + k * 140, y: top - 42, width: 70, height: 46, rx: 6,
      fill: '#8a8fa0', stroke: '#5d6273', 'stroke-width': 4 }, group);
  }
  for (let row = 0; row < ROWS; row++) { // row 0 is at the bottom
    const y = WALL_BOTTOM - (row + 1) * BRICK_H + 2;
    const shift = row % 2 ? BRICK_W / 2 : 0;
    const half = svg('rect', { x: row % 2 ? WALL_X + 2 : WALL_X + PER_ROW * BRICK_W + 2, y: y,
      width: BRICK_W / 2 - 4, height: BRICK_H - 4, rx: 5, fill: '#8a8fa0' }, group);
    if (glass) half.setAttribute('class', 'brick glass');
    for (let col = 0; col < PER_ROW; col++) {
      const word = words[row * PER_ROW + col].word;
      bricks[word] = svg('rect', { x: WALL_X + shift + col * BRICK_W + 2, y: y,
        width: BRICK_W - 4, height: BRICK_H - 4, rx: 5, class: glass ? 'brick glass' : 'brick' }, group);
      paint(word);
    }
  }
}

function isOpen(n) {
  return n <= saved.unlocked || n === preview;
}

// Shows a level: its wall, dragon, hill, and the start-screen line.
function showLevel(n) {
  const info = LEVELS[n - 1];
  wall = n;
  words = info.words;
  current = null;
  buildWall();
  showTally();
  LEVELS.forEach(function (other) {
    $(other.dragon).setAttribute('display', other === info ? 'inline' : 'none');
  });
  const dragon = $('dragon');
  dragon.classList.remove('is-peeking', 'is-leaving');
  dragon.classList.toggle('is-gone', goldCount() === words.length);
  $('hill-back').setAttribute('fill', info.hill[0]);
  $('hill-front').setAttribute('fill', info.hill[1]);
  $('intro-text').textContent = info.intro;
  $('tally-label').textContent = 'Level ' + n + ' ' + info.top + ' bricks';
  showPrize();
  showLevelButtons();
}

function showPrize() {
  $('prize').innerHTML = saved.paid[wall] ? 'Wall prize won: ' + PRIZE * wall + ' ' + coins.ICON + ' ✓' :
    'Finish the wall to win ' + PRIZE * wall + ' ' + coins.ICON;
}

function showLevelButtons() {
  levelButtons.forEach(function (button) {
    const n = Number(button.getAttribute('data-level'));
    const open = isOpen(n);
    button.textContent = open ? String(n) : '🔒';
    button.setAttribute('aria-label', 'Level ' + n + (open ? '' : ', locked'));
    button.classList.toggle('is-locked', !open);
    button.setAttribute('aria-pressed', String(n === wall));
  });
}

function pickLevel(button) {
  const n = Number(button.getAttribute('data-level'));
  if (!isOpen(n)) { // locked: say how to open it
    pop(button, 'is-nudged');
    $('intro-text').textContent = 'Make every brick in level ' + (n - 1) + ' ' + LEVELS[n - 2].top +
      ' to open level ' + n + '!';
    setTimeout(function () {
      $('intro-text').textContent = LEVELS[wall - 1].intro;
    }, 3000);
    return;
  }
  if (n !== preview) {
    saved.wall = n;
    storage.save(GAME_ID, saved);
  }
  showLevel(n);
}

function paint(word) {
  const info = LEVELS[wall - 1];
  bricks[word].style.fill = (info.colors || COLORS)[level(word)];
  if (info.glass) bricks[word].classList.toggle('is-clear', level(word) === TOP);
}

function showTally() {
  $('tally').textContent = goldCount() + ' / ' + words.length;
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
  words.forEach(function (entry) {
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

// Says the word, then the sentence with the word in it. Sound-alikes sound
// the same alone, so for them it's just the sentence.
function say() {
  const sentence = current.sentence.replace('___', current.word);
  speech.speak(LEVELS[wall - 1].sentenceOnly ? sentence : current.word + '. ' + sentence);
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
  if (current && bricks[current.word]) bricks[current.word].classList.remove('is-target');
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
  missedThisTime = false;
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

// Remembers a wrong pick for the future level.
function rememberMiss(word, picked) {
  const entry = isObject(saved.missed[word]) ? saved.missed[word] : {};
  entry.count = (typeof entry.count === 'number' ? entry.count : 0) + 1;
  entry.last = Date.now();
  entry.picked = isObject(entry.picked) ? entry.picked : {};
  entry.picked[picked] = (typeof entry.picked[picked] === 'number' ? entry.picked[picked] : 0) + 1;
  saved.missed[word] = entry;
}

// A wrong pick: the bolt bounces off, the brick steps down (never below
// gray), and the button is crossed out. Zoe stays on the word until she
// finds the right spelling.
function miss(button, text) {
  const word = current.word;
  const rect = bricks[word];
  const before = level(word);
  missedThisTime = true;
  saved.levels[word] = Math.max(0, before - 1);
  rememberMiss(word, text);
  storage.save(GAME_ID, saved);
  button.disabled = true;
  button.classList.add('is-wrong');
  setTimeout(function () {
    button.classList.remove('is-wrong');
    button.classList.add('is-out');
  }, 500);
  cast(rect, false);
  sound.bounce();
  setTimeout(sound.wrong, 300);
  setTimeout(function () {
    paint(word);
    showTally();
    pop(rect, 'is-hit');
    if (before === TOP) $('dragon').classList.remove('is-gone'); // it's back
  }, BOLT_HITS);
}

function answer(button, text) {
  if (!answering) return;
  speech.stop();
  if (text !== current.word) {
    miss(button, text);
    return;
  }
  answering = false;
  const word = current.word;
  const rect = bricks[word];
  const gap = $('gap');
  gap.textContent = word;
  gap.classList.add('is-filled');
  button.classList.add('is-right');
  if (missedThisTime) {
    // Found it after a miss: well done, but the brick only climbs on a first try.
    sound.correct();
    setTimeout(next, NEXT_AFTER_FOUND);
    return;
  }

  const before = level(word);
  const after = Math.min(TOP, before + 1);
  const wasComplete = goldCount() === words.length;
  saved.levels[word] = after;
  storage.save(GAME_ID, saved);
  const gold = before < TOP && after === TOP;
  const complete = !wasComplete && goldCount() === words.length;
  // Thunder, then a clearly happy sound just after the crack: the trumpet
  // when the brick turns gold (played below), otherwise the ding.
  cast(rect, true);
  sound.zap();
  if (!gold) setTimeout(sound.correct, 120);
  setTimeout(function () {
    paint(word);
    showTally();
    pop(rect, gold ? 'is-gold' : 'is-hit');
    if (gold) {
      sound.trumpet();
      stars(rect);
    }
  }, BOLT_HITS);
  if (complete) {
    setTimeout(finishWall, 1400);
  } else {
    setTimeout(next, NEXT_AFTER_RIGHT);
  }
}

// Every brick is gold: the dragon gives up and flies away. Finishing a level
// for the first time opens the next one, and goes to its start screen.
function finishWall() {
  const opens = wall < LEVELS.length && saved.unlocked === wall ? wall + 1 : 0;
  const prize = saved.paid[wall] ? 0 : PRIZE * wall;
  if (opens) {
    saved.unlocked = opens;
    saved.wall = opens;
  }
  if (prize) {
    saved.paid[wall] = true;
    coins.earn(GAME_ID, prize);
    setTimeout(function () {
      sound.coin();
      floatCoins($('tally'), prize);
    }, 1300);
  }
  storage.save(GAME_ID, saved);
  $('sentence').textContent = 'The wall is all ' + LEVELS[wall - 1].top + '! The ' + LEVELS[wall - 1].name +
    ' flew away!' + (prize ? ' You won ' + prize + ' coins!' : '') +
    (opens ? ' Level ' + opens + ' is open!' : '');
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
  setTimeout(function () {
    if (opens) {
      showStart();
      showLevel(opens);
    } else {
      next();
    }
  }, 4600);
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

// Back to the start screen: the level picker, Start, and clearing.
function showStart() {
  answering = false;
  speech.stop();
  if (current && bricks[current.word]) bricks[current.word].classList.remove('is-target');
  current = null;
  $('intro').hidden = false;
  $('setup').hidden = false;
  $('sentence').hidden = true;
  $('say-again').hidden = true;
  $('choices').hidden = true;
  $('prompt').classList.remove('is-playing');
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

// Every brick of this level back to the start (blue, or green in level 4),
// and the dragon back
// behind the wall. Other levels, the open levels, and the missed-word record
// stay.
function clearWall() {
  holding = false;
  $('clear-button').classList.remove('is-holding');
  words.forEach(function (entry) {
    delete saved.levels[entry.word];
  });
  delete saved.paid[wall]; // finishing it all over again wins the prize again
  storage.save(GAME_ID, saved);
  showPrize();
  words.forEach(function (entry) {
    paint(entry.word);
  });
  showTally();
  $('dragon').classList.remove('is-gone');
  clearLabel('Wall cleared', 2000);
}

const levelButtons = Array.prototype.slice.call(document.querySelectorAll('.level-button'));
levelButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    pickLevel(button);
  });
});
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

// Saved games from before a level existed: a finished wall opens the next.
while (saved.unlocked < LEVELS.length &&
    goldCount(LEVELS[saved.unlocked - 1].words) === LEVELS[saved.unlocked - 1].words.length) {
  saved.unlocked += 1;
  storage.save(GAME_ID, saved);
}
showLevel(isLevel(preview) ? preview : saved.wall);
peekLater();
