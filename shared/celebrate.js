// Star bursts and confetti, drawn on a temporary full-screen canvas.
//
//   import { stars, confetti, zip } from '../shared/celebrate.js?v=0.7.2';
//   stars(answerElement);  // small burst of stars, e.g. for a right answer
//   confetti();            // big party, e.g. for finishing a round
//   zip();                 // a cute animal zips across the screen
//   coins(element, 5);     // "+5" and a gold coin float up from an element
//
// stars() bursts from the center of an element, from a point {x, y} in CSS
// pixels, or from the middle of the screen if given nothing. zip() picks a
// random animal unless given an emoji. All of them return right away. The canvas sits above the page, lets taps through, and
// removes itself when the last piece has fallen.

// Animals for zip(). Apple draws these facing left, so they're flipped when
// flying right. (Its snail faces right, so it's left out.)
import { ICON } from './coins.js?v=0.7.2';

const CRITTERS = ['🐕', '🐈', '🐇', '🐢', '🦖', '🦕', '🐳', '🐬', '🐠', '🦔', '🦦', '🐘',
  '🦄', '🐤', '🐝', '🦭', '🐧', '🦆', '🐿️', '🐁', '🐖', '🦘', '🐉', '🦓'];
const COLORS = ['#ffd23f', '#ff6b6b', '#4cc9f0', '#80ed99', '#c77dff', '#ff9f1c', '#ff8fab'];
const GOLDS = ['#ffd23f', '#ffe066', '#ffb703'];
const GRAVITY = 1500; // px/s², scaled to the screen like everything else

let canvas = null;
let g = null;
let pieces = [];
let lastFrame = 0;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

// Sizes and speeds are tuned for an 800px screen and scaled from there.
function unit() {
  return Math.min(window.innerWidth, window.innerHeight) / 800;
}

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function start() {
  if (canvas) return; // already animating; new pieces join in
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1000';
  document.body.appendChild(canvas);
  g = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  lastFrame = 0;
  requestAnimationFrame(frame);
}

function stop() {
  window.removeEventListener('resize', resize);
  canvas.parentNode.removeChild(canvas);
  canvas = null;
  g = null;
}

function add(x, y, angle, speed, kind, color, size, life) {
  pieces.push({
    x: x,
    y: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    kind: kind, // 'star' or 'paper'
    color: color,
    size: size,
    turn: random(0, Math.PI * 2),
    spin: random(-8, 8), // radians per second
    flip: random(0, Math.PI * 2), // paper tumbles by squashing
    age: 0,
    life: life, // seconds
  });
}

function frame(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
  lastFrame = now;
  const gravity = GRAVITY * unit();
  const height = window.innerHeight;
  pieces = pieces.filter(function (p) {
    const drag = p.kind === 'paper' ? 2.4 : 1.4; // paper floats down slowly
    p.age += dt;
    p.vy += gravity * dt;
    p.vx -= p.vx * drag * dt;
    p.vy -= p.vy * drag * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.turn += p.spin * dt;
    p.flip += 7 * dt;
    return p.age < p.life && p.y < height + 50;
  });
  g.clearRect(0, 0, window.innerWidth, height);
  pieces.forEach(draw);
  if (pieces.length) requestAnimationFrame(frame);
  else stop();
}

function draw(p) {
  g.save();
  g.globalAlpha = Math.max(0, Math.min(1, (p.life - p.age) / 0.4)); // fade at the end
  g.translate(p.x, p.y);
  g.rotate(p.turn);
  g.fillStyle = p.color;
  if (p.kind === 'star') {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? p.size * 0.45 : p.size;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  } else {
    g.scale(1, Math.cos(p.flip));
    g.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
  }
  g.restore();
}

function centerOf(from) {
  if (from && from.getBoundingClientRect) {
    const r = from.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  if (from && typeof from.x === 'number') return from;
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function stars(from) {
  const at = centerOf(from);
  const u = unit();
  for (let i = 0; i < 20; i++) {
    add(at.x, at.y, random(0, Math.PI * 2), random(350, 900) * u, 'star', pick(GOLDS),
      random(10, 20) * u, random(0.8, 1.3));
  }
  start();
}

export function confetti() {
  const u = unit();
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Two party poppers in the bottom corners, aimed up and inward.
  [[0, h, -Math.PI / 3], [w, h, (-2 * Math.PI) / 3]].forEach(function (popper) {
    for (let i = 0; i < 80; i++) {
      const star = Math.random() < 0.25;
      add(popper[0], popper[1], popper[2] + random(-0.35, 0.35), random(1600, 3000) * u,
        star ? 'star' : 'paper', star ? pick(GOLDS) : pick(COLORS),
        (star ? random(10, 18) : random(12, 20)) * u, random(2.5, 3.5));
    }
  });
  start();
}

export function zip(emoji) {
  const u = unit();
  const w = window.innerWidth;
  const size = Math.round(150 * u);
  const rightward = Math.random() < 0.5;
  const middle = window.innerHeight * random(0.3, 0.6);
  const wave = window.innerHeight * random(0.05, 0.1);
  const duration = random(1400, 1800); // ms
  const critter = document.createElement('div');
  critter.textContent = emoji || pick(CRITTERS);
  critter.setAttribute('aria-hidden', 'true');
  critter.style.cssText = 'position:fixed;left:0;top:0;z-index:1001;pointer-events:none;' +
    'line-height:1;will-change:transform;font-size:' + size + 'px';
  document.body.appendChild(critter);
  let begin = 0;
  let lastSparkle = 0;
  function step(now) {
    if (!begin) begin = now;
    const t = Math.min(1, (now - begin) / duration);
    const x = rightward ? -size + t * (w + size) : w - t * (w + size);
    const y = middle + Math.sin(t * Math.PI * 3) * wave - size / 2;
    const tilt = Math.cos(t * Math.PI * 3) * 12;
    critter.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + tilt + 'deg)' +
      (rightward ? ' scaleX(-1)' : '');
    if (now - lastSparkle > 70) { // a trail of little stars
      lastSparkle = now;
      const tail = x + size * (rightward ? 0.1 : 0.9);
      for (let i = 0; i < 2; i++) {
        add(tail, y + size / 2, random(0, Math.PI * 2), random(40, 160) * u, 'star', pick(GOLDS),
          random(5, 10) * u, random(0.5, 0.8));
      }
      start();
    }
    if (t < 1) requestAnimationFrame(step);
    else critter.parentNode.removeChild(critter);
  }
  requestAnimationFrame(step);
}

// "+5" and a gold coin floating up from an element (or point), then fading.
export function coins(from, count) {
  const at = centerOf(from);
  const label = document.createElement('div');
  label.innerHTML = '+' + Number(count) + ' ' + ICON;
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;z-index:1002;pointer-events:none;white-space:nowrap;' +
    'font:900 30px ui-rounded,system-ui,sans-serif;color:#f59f00;' +
    'text-shadow:0 2px 0 #fff,0 -2px 0 #fff,2px 0 0 #fff,-2px 0 0 #fff;' +
    'transition:transform 1s ease-out,opacity 1s ease-in;left:' + at.x + 'px;top:' + at.y + 'px;' +
    'transform:translate(-50%,-50%)';
  document.body.appendChild(label);
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      label.style.transform = 'translate(-50%,-150%)';
      label.style.opacity = '0';
    });
  });
  setTimeout(function () {
    if (label.parentNode) label.parentNode.removeChild(label);
  }, 1100);
}
