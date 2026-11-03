// Zoe's shelf: every squishy she has bought, sitting on a bookcase in the
// order she got them. See SPEC.md. Each is a still picture, drawn in 3D once
// its program has compiled (an emoji stands in until then, and for good
// without WebGL). Tapping one spins it around with a squish and a squeak, and
// says its name. The 🐒 button turns the bookcase into a monkey maze
// (maze.js), with the same pictures climbing it.

import * as coins from '../shared/coins.js?v=0.8.7';
import * as sound from '../shared/sound.js?v=0.8.7';
import * as speech from '../shared/speech.js?v=0.8.7';
import { createMaze } from './maze.js?v=0.8.7';
import { createSquishy } from './squishy.js?v=0.8.7';
import { ITEMS } from './items.js?v=0.8.7';

const ANGLE = 0.5; // facing three-quarters forward, as in the store
const SPIN_MS = 1200; // how long a tapped squishy takes to turn all the way around
const SQUISH = 0.35; // how hard a tap squishes it
// The 3D view leaves room around a squishy for squashing, stretching, and
// turning, more than a still picture needs, so the shelf zooms in: each
// picture is drawn this much wider than its spot, overlapping the gaps.
const ZOOM = 1.2;
// The part of the square picture that shows: most of the room above for
// stretching is left out, and everything below the floor, so the squishy
// stands on the plank. Each row in shelf.html must fit this.
const TOP = 0.12;
const BOTTOM = 0.8;

function $(id) {
  return document.getElementById(id);
}

// Hers, in the order she bought them.
const mine = [];
coins.purchases().forEach(function (buy) {
  ITEMS.forEach(function (item) {
    if (item.id === buy.item && mine.indexOf(item) < 0) mine.push(item);
  });
});

const lens = $('lens');
const view = createSquishy(lens, { maxRatio: 2 });
let frames = 0;
let resizeTimer = 0;
let maze = null;

// A spot on the shelf: the picture, an emoji until it's drawn, and the name.
const spots = mine.map(function (item) {
  const spot = { item: item, drawn: false, spinAt: -1 };
  spot.button = document.createElement('button');
  spot.button.type = 'button';
  spot.button.className = 'spot';
  spot.button.setAttribute('aria-label', item.name);
  spot.picture = document.createElement('canvas');
  spot.picture.className = 'spot-picture';
  spot.picture.hidden = true;
  spot.emoji = document.createElement('span');
  spot.emoji.className = 'spot-emoji';
  spot.emoji.textContent = '🐉';
  const name = document.createElement('span');
  name.className = 'spot-name';
  name.textContent = item.name;
  [spot.picture, spot.emoji, name].forEach(function (part) {
    spot.button.appendChild(part);
  });
  spot.button.addEventListener('click', function () {
    tap(spot);
  });
  $('shelves').appendChild(spot.button);
  return spot;
});

// The 3D view draws off screen, square, as wide as a picture; each picture
// is centered over its spot.
function fitLens() {
  const width = ZOOM * spots[0].button.clientWidth;
  lens.style.width = width + 'px';
  lens.style.height = width + 'px';
  spots.forEach(function (spot) {
    spot.picture.style.width = ZOOM * 100 + '%';
    spot.picture.style.left = ((1 - ZOOM) / 2) * 100 + '%';
    spot.picture.style.height = width * (BOTTOM - TOP) + 'px';
  });
}

// Draws a squishy into its spot: the 3D view draws it, then the part that
// shows is copied in.
function paint(spot, state) {
  view.draw(spot.item.look, state);
  const width = lens.width;
  const height = Math.round(lens.height * (BOTTOM - TOP));
  if (spot.picture.width !== width || spot.picture.height !== height) {
    spot.picture.width = width;
    spot.picture.height = height;
  }
  const g = spot.picture.getContext('2d');
  g.clearRect(0, 0, width, height);
  g.drawImage(lens, 0, Math.round(lens.height * TOP), width, height, 0, 0, width, height);
}

// Draws the squishies whose programs are ready, in shelf order, compiling
// one program at a time. Where compiling holds up the page (no background
// compiling), it draws one a frame, so the page keeps moving.
function drawReady() {
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    if (spot.drawn) continue;
    const status = view.status(spot.item.look);
    if (status === 'compiling') return;
    spot.drawn = true;
    if (status === 'ready') {
      paint(spot, { angle: ANGLE, squish: 0 });
      spot.picture.hidden = false;
      spot.emoji.hidden = true;
    }
    if (!view.background) return;
  }
}

// A wobbly squash and a turn all the way around, easing in and out.
function spin(spot, now) {
  const t = (now - spot.spinAt) / SPIN_MS;
  if (t >= 1) {
    spot.spinAt = -1;
    paint(spot, { angle: ANGLE, squish: 0 });
    return;
  }
  const turn = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  const s = (now - spot.spinAt) / 1000;
  paint(spot, { angle: ANGLE + 2 * Math.PI * turn, squish: SQUISH * Math.exp(-4.5 * s) * Math.cos(14 * s) });
}

// Asks for programs only after a couple of frames, so the page shows first
// even where asking waits for the compile.
function frame(now) {
  frames += 1;
  if (view && frames >= 3 && !document.hidden) {
    drawReady();
    spots.forEach(function (spot) {
      if (spot.spinAt >= 0) spin(spot, now);
    });
  }
  requestAnimationFrame(frame);
}

function tap(spot) {
  sound.unlock();
  sound.squeak();
  speech.speak(spot.item.name);
  if (!spot.picture.hidden) {
    spot.spinAt = performance.now();
    return;
  }
  spot.emoji.classList.remove('is-bounced');
  void spot.emoji.offsetWidth; // restarts the bounce
  spot.emoji.classList.add('is-bounced');
}

// A new size (turning the iPad, say) redraws every picture to fit. The
// shelves are hidden in fun mode, so that waits until they're back.
function refit() {
  if (!view || !spots.length || $('shelves').hidden) return;
  const before = lens.style.width;
  fitLens();
  if (lens.style.width === before) return;
  spots.forEach(function (spot) {
    if (!spot.picture.hidden) spot.drawn = false;
  });
}

// Fun mode: the monkey maze in place of the shelves, or the shelves again.
function setFun(on) {
  $('case').classList.toggle('is-fun', on);
  $('case').scrollTop = 0;
  $('shelves').hidden = on;
  $('maze').hidden = !on;
  $('fun').textContent = on ? '🧸' : '🐒';
  $('fun').setAttribute('aria-label', on ? 'Shelf' : 'Monkey maze');
  if (!on) {
    if (maze) maze.stop();
    refit();
    return;
  }
  if (!maze) {
    maze = createMaze($('maze'), spots.map(function (spot) {
      return {
        name: spot.item.name,
        picture: function () {
          return spot.picture.hidden ? null : spot.picture;
        },
      };
    }));
  }
  maze.start();
}

$('count').textContent = mine.length + ' of ' + ITEMS.length;
$('empty').hidden = mine.length > 0;
$('fun').hidden = !mine.length;
$('fun').addEventListener('click', function () {
  sound.unlock();
  setFun($('maze').hidden);
});
if (view && spots.length) {
  fitLens();
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refit, 200);
  });
  requestAnimationFrame(frame);
}
// ?fun=1 opens in fun mode, for testing.
if (mine.length && /[?&]fun=1/.test(location.search)) setFun(true);
