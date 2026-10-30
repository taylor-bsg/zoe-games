// Template game: add two small numbers. It shows the pattern every game
// follows: a Start screen whose tap unlocks sound, a Home button, the shared
// keypad, sound and celebration feedback, and progress saved between visits.
// New games start as a copy of this folder; see CLAUDE.md.

import { createKeypad } from '../shared/keypad.js?v=0.7.15';
import * as sound from '../shared/sound.js?v=0.7.15';
import * as storage from '../shared/storage.js?v=0.7.15';
import { stars, confetti } from '../shared/celebrate.js?v=0.7.15';

const GAME_ID = 'template'; // the folder name; also the save key
const ROUND_LENGTH = 5; // right answers to finish a round
const PRAISE = ['Great job!', 'Yes!', 'You got it!', 'Awesome!', 'Super!'];
const NUDGES = ['Almost! Try again.', 'Good try! One more time.', 'So close! Try again.'];

// One star per finished round. Works the same when nothing is saved yet.
const progress = storage.load(GAME_ID, { stars: 0 });

function $(id) {
  return document.getElementById(id);
}

const screens = { start: $('start'), play: $('play'), done: $('done') };
const dots = $('dots');
const message = $('message');
const pad = createKeypad($('keypad'), {
  display: $('answer'),
  maxLength: 2,
  onSubmit: check,
});

let a = 0;
let b = 0;
let solved = 0;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function show(name) {
  Object.keys(screens).forEach(function (key) {
    screens[key].hidden = key !== name;
  });
  dots.hidden = name !== 'play';
}

function showStars() {
  $('star-count').textContent = '⭐ ' + progress.stars;
}

function say(text, kind) {
  message.textContent = text;
  message.className = kind ? 'message ' + kind : 'message';
}

// Marks the answer box right or wrong (or neither), replaying the animation.
function feedback(kind) {
  const box = pad.display;
  box.classList.remove('is-correct', 'is-wrong');
  if (!kind) return;
  void box.offsetWidth; // forces a reflow so the animation restarts
  box.classList.add(kind);
}

function startRound() {
  sound.unlock(); // this tap is what lets iOS play sound
  solved = 0;
  dots.innerHTML = '';
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dots.appendChild(dot);
  }
  nextProblem();
  show('play');
}

function nextProblem() {
  let x;
  let y;
  do {
    x = randomInt(1, 5);
    y = randomInt(1, 5);
  } while (x === a && y === b); // never the same problem twice in a row
  a = x;
  b = y;
  $('question').textContent = a + ' + ' + b + ' =';
  say('');
  feedback(null);
  pad.clear();
  pad.setEnabled(true);
}

function check(value) {
  pad.setEnabled(false);
  if (Number(value) === a + b) {
    solved += 1;
    dots.children[solved - 1].classList.add('on');
    feedback('is-correct');
    say(pick(PRAISE), 'good');
    sound.correct();
    stars(pad.display);
    setTimeout(solved < ROUND_LENGTH ? nextProblem : finishRound, 1100);
  } else {
    feedback('is-wrong');
    say(pick(NUDGES), 'oops');
    sound.wrong();
    setTimeout(function () {
      feedback(null);
      pad.clear();
      pad.setEnabled(true);
    }, 900);
  }
}

function finishRound() {
  progress.stars += 1;
  storage.save(GAME_ID, progress);
  showStars();
  $('done-text').textContent = 'You earned a star! Now you have ' + progress.stars +
    (progress.stars === 1 ? ' star.' : ' stars.');
  show('done');
  sound.celebrate();
  confetti();
}

$('goal').textContent = 'Get ' + ROUND_LENGTH + ' right to earn a star!';
$('start-button').addEventListener('click', startRound);
$('again-button').addEventListener('click', startRound);
showStars();
show('start');
