// Fun mode for the shelf: the bookcase turns into a climbing maze, like an
// old arcade game. Her squishies walk up slanted shelves and climb ladders,
// jumping over the barrels a monkey throws down from the top, then ride a
// winding slide back to the bottom and go around again. See SPEC.md.
//
//   import { createMaze } from './maze.js?v=0.8.7';
//   const maze = createMaze(canvas, squishies);
//   maze.start();
//   maze.stop();
//
// squishies is a list of { name, picture }, where picture() returns a canvas
// of the squishy facing three-quarters to the right and standing on its
// bottom edge, or null while it isn't drawn yet (a 🐉 stands in). Tapping a
// squishy makes it hop and say its name; tapping the monkey makes it throw a
// barrel right away.
//
// Everything moves by the clock: where a squishy is on its way around, and
// where a barrel is on its way down, depend only on the time, so nothing
// drifts. Squishies always walk toward the barrels on their shelf, and jump
// so that a barrel passes under them at the top of the jump.

import * as sound from '../shared/sound.js?v=0.8.7';
import * as speech from '../shared/speech.js?v=0.8.7';

// Sizes are in units: a full-size squishy's width.
const WALK = 1.3; // walking speed, units a second
const ROLL = 2.1; // how fast barrels roll, units a second
const CLIMB = 0.6; // climbing speed, shelves a second
const FALL = 9; // how fast falling barrels speed up, shelves a second each second
const SLIDE = 3.2; // seconds down the slide
const JUMP = 0.55; // seconds a jump lasts
const JUMP_HEIGHT = 0.42; // units
const BARREL = 0.13; // a barrel's radius, units
const THROW = [2.6, 4.4]; // seconds between barrels, at random in this range
const WINDUP = 0.5; // seconds the monkey holds a barrel up before throwing it
const TOSS = 0.75; // seconds a thrown barrel flies before it lands
const BONK = 0.5; // seconds a squishy stays squashed if a barrel bumps it
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// A smooth curve through points (Catmull-Rom), as many short straight steps.
function curve(points, steps) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([0, 1].map(function (k) {
        return 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t +
          (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t);
      }));
    }
  }
  out.push(points[points.length - 1].slice());
  return out;
}

export function createMaze(canvas, squishies) {
  const g = canvas.getContext('2d');
  const scenery = document.createElement('canvas'); // what doesn't move, drawn once for each size
  let m = null; // where everything goes, for the canvas's size (see build)
  let frameId = 0;
  let clock0 = 0; // when the maze started (ms)
  let barrels = []; // { at: when it was thrown (s), bumped: the squishies it has met, by number }
  let nextThrow = 0;
  let hitBoxes = []; // where each squishy was drawn, for taps
  let hopped = -1e9; // when the last hop sounded, so lots of squishies don't chatter
  const pictures = {}; // emoji drawn once, by name, for each size
  const actors = squishies.map(function (squishy) {
    return { squishy: squishy, jumpAt: -1e9, bonkAt: -1e9, segment: -1 };
  });

  // The height of a shelf's top at x.
  function shelfY(level, x) {
    const s = m.levels[level];
    return s.y0 + ((s.y1 - s.y0) * (x - s.x0)) / (s.x1 - s.x0);
  }

  // Where everything goes, in CSS pixels, for a canvas W wide and H tall.
  // Levels: 0 the floor, 1 to 4 slanted shelves, 5 the top, where the
  // monkey has a ledge of its own, with an opening beside it to throw
  // barrels down through. Barrels roll down each shelf toward its open end
  // and drop to the one below; ladders are at the other ends, so squishies
  // always walk toward the barrels.
  function build(W, H) {
    m = { W: W, H: H };
    const slideW = Math.max(64, 0.17 * W); // the slide's side
    const mw = W - slideW; // the maze's side
    const gap = 0.07 * mw; // where a shelf ends, open, for barrels to drop
    const S = (H - 10) / 6; // from one level to the next
    const u = Math.min(0.95 * S, 0.22 * mw);
    const tilt = 0.16 * S;
    const thick = Math.max(8, 0.12 * S);
    const floor = H - thick - 2;
    m.monkeyX = 1.15 * u;
    const ledge = m.monkeyX + 0.55 * u;
    const opening = 0.6 * u;
    m.S = S;
    m.u = u;
    m.thick = thick;
    m.floor = floor;
    m.levels = [];
    for (let k = 0; k < 6; k++) {
      const y = floor - k * S;
      if (k === 0) m.levels.push({ x0: 0, x1: W, y0: y, y1: y });
      else if (k === 5) m.levels.push({ x0: ledge + opening, x1: mw + 0.12 * slideW, y0: y, y1: y });
      // The slanted shelves: odd ones low and open at the left, even ones at the right.
      else if (k % 2) m.levels.push({ x0: gap, x1: mw, y0: y + tilt / 2, y1: y - tilt / 2 });
      else m.levels.push({ x0: 0, x1: mw - gap, y0: y - tilt / 2, y1: y + tilt / 2 });
    }
    m.ledge = { x0: 0, x1: ledge, y0: m.levels[5].y0, y1: m.levels[5].y0 };
    m.basketX = gap;
    const left = Math.max(0.16 * mw, gap + u);
    const right = Math.min(0.84 * mw, mw - gap - 0.8 * u);
    m.ladders = [left, right, left, right, Math.max(0.3 * mw, ledge + opening + 0.5 * u)];
    // The slide winds down its side from the top to the floor.
    const cx = mw + slideW / 2;
    const a = 0.26 * slideW;
    const top = m.levels[5].y0;
    m.slide = curve([[m.levels[5].x1, top], [cx + a, top + 0.6 * S], [cx - a, top + 1.6 * S],
      [cx + a, top + 2.6 * S], [cx - a, top + 3.6 * S], [cx + 0.3 * a, floor - 0.35 * S],
      [mw + 0.08 * slideW, floor]], 24);
    m.slideAt = [0]; // distance along the slide at each point
    for (let i = 1; i < m.slide.length; i++) {
      const p = m.slide[i - 1];
      const q = m.slide[i];
      m.slideAt.push(m.slideAt[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1]));
    }
    // The way around for squishies: in from the slide along the floor, up
    // each ladder and along each shelf, along the top, and down the slide.
    m.route = [];
    let x = m.slide[m.slide.length - 1][0];
    m.ladders.forEach(function (lx, level) {
      walk(level, x, lx);
      const ya = shelfY(level, lx);
      const yb = shelfY(level + 1, lx);
      m.route.push({ kind: 'climb', x: lx, ya: ya, yb: yb, time: (ya - yb) / (CLIMB * S) });
      x = lx;
    });
    walk(5, x, m.levels[5].x1);
    m.route.push({ kind: 'slide', time: SLIDE });
    m.loop = m.route.reduce(function (sum, part) {
      return sum + part.time;
    }, 0);
    // The way down for barrels: tossed onto shelf 4, then rolling to each
    // shelf's open end and dropping, until the last one drops in the basket.
    const r = BARREL * u;
    m.path = [];
    const land = ledge + opening / 2;
    m.path.push({ kind: 'toss', x0: m.monkeyX + 0.42 * u, y0: top - 0.78 * u, x1: land, y1: shelfY(4, land) - r,
      time: TOSS });
    x = land;
    for (let level = 4; level >= 1; level--) {
      const end = level % 2 ? m.levels[level].x0 : m.levels[level].x1;
      m.path.push({ kind: 'roll', level: level, xa: x, xb: end, time: Math.abs(end - x) / (ROLL * u) });
      const ya = shelfY(level, end) - r;
      const yb = level > 1 ? shelfY(level - 1, end) - r : floor - 0.3 * u;
      m.path.push({ kind: 'fall', x: end, ya: ya, yb: yb, time: Math.sqrt((2 * (yb - ya)) / (FALL * S)) });
      x = end;
    }
    m.pathTime = m.path.reduce(function (sum, part) {
      return sum + part.time;
    }, 0);
    drawScenery();

    function walk(level, xa, xb) {
      m.route.push({ kind: 'walk', level: level, xa: xa, xb: xb, time: Math.abs(xb - xa) / (WALK * u) });
    }
  }

  // Where a squishy is at route time t (seconds around the loop).
  function placeOnRoute(t) {
    let i = 0;
    while (t >= m.route[i].time && i < m.route.length - 1) {
      t -= m.route[i].time;
      i += 1;
    }
    const part = m.route[i];
    const f = Math.min(1, t / part.time);
    if (part.kind === 'walk') {
      const x = part.xa + (part.xb - part.xa) * f;
      const facing = part.xb > part.xa ? 1 : -1;
      return { kind: 'walk', segment: i, level: part.level, x: x, y: shelfY(part.level, x), facing: facing,
        vx: facing * WALK * m.u, walked: Math.abs(x - part.xa), length: Math.abs(part.xb - part.xa) };
    }
    if (part.kind === 'climb') {
      const y = part.ya + (part.yb - part.ya) * f;
      return { kind: 'climb', segment: i, x: part.x, y: y, facing: 1, climbed: part.ya - y };
    }
    // Sliding: slow at the top, fast in the middle, slowing onto the floor.
    const along = m.slideAt[m.slideAt.length - 1] * f * f * (3 - 2 * f);
    let k = 1;
    while (k < m.slideAt.length - 1 && m.slideAt[k] < along) k += 1;
    const p = m.slide[k - 1];
    const q = m.slide[k];
    const w = (along - m.slideAt[k - 1]) / Math.max(1e-6, m.slideAt[k] - m.slideAt[k - 1]);
    const dx = q[0] - p[0];
    const facing = dx >= 0 ? 1 : -1;
    return { kind: 'slide', segment: i, x: p[0] + dx * w, y: p[1] + (q[1] - p[1]) * w, facing: facing,
      lean: facing * Math.max(-0.7, Math.min(0.7, Math.atan2(q[1] - p[1], Math.abs(dx)))) };
  }

  // Where a barrel is, age seconds after it was thrown, or null once it's
  // in the basket.
  function placeBarrel(age) {
    if (age < 0 || age >= m.pathTime) return null;
    const r = BARREL * m.u;
    let rolled = 0;
    let i = 0;
    while (age >= m.path[i].time) {
      if (m.path[i].kind === 'roll') rolled += Math.abs(m.path[i].xb - m.path[i].xa);
      age -= m.path[i].time;
      i += 1;
    }
    const part = m.path[i];
    const f = age / part.time;
    if (part.kind === 'toss') { // out from the monkey's hands, dropping faster and faster
      return { kind: 'toss', x: part.x0 + (part.x1 - part.x0) * f, y: part.y0 + (part.y1 - part.y0) * f * f,
        spin: f * 3 };
    }
    if (part.kind === 'roll') {
      const x = part.xa + (part.xb - part.xa) * f;
      const dir = part.xb > part.xa ? 1 : -1;
      return { kind: 'roll', level: part.level, x: x, y: shelfY(part.level, x) - r, vx: dir * ROLL * m.u,
        spin: (rolled + Math.abs(x - part.xa)) / r };
    }
    return { kind: 'fall', x: part.x, y: part.ya + (part.yb - part.ya) * f * f, spin: rolled / r };
  }

  function jumpHeight(since) {
    if (since < 0 || since > JUMP) return 0;
    const f = since / JUMP;
    return 4 * JUMP_HEIGHT * m.u * f * (1 - f);
  }

  // Where each squishy starts on the way around: spread out evenly.
  function routeTime(i, t) {
    return (t + (i * m.loop) / actors.length) % m.loop;
  }

  function drawPlank(s) {
    const c = scenery.getContext('2d');
    c.fillStyle = '#b97a42';
    c.beginPath();
    c.moveTo(s.x0, s.y0);
    c.lineTo(s.x1, s.y1);
    c.lineTo(s.x1, s.y1 + m.thick);
    c.lineTo(s.x0, s.y0 + m.thick);
    c.closePath();
    c.fill();
    c.fillStyle = '#e3ac70';
    c.beginPath();
    c.moveTo(s.x0, s.y0);
    c.lineTo(s.x1, s.y1);
    c.lineTo(s.x1, s.y1 + 0.35 * m.thick);
    c.lineTo(s.x0, s.y0 + 0.35 * m.thick);
    c.closePath();
    c.fill();
  }

  function drawBarrel(c, x, y, spin) {
    const r = BARREL * m.u;
    c.save();
    c.translate(x, y);
    c.rotate(spin);
    c.fillStyle = '#9a5b2a';
    c.beginPath();
    c.arc(0, 0, r, 0, 2 * Math.PI);
    c.fill();
    c.fillStyle = '#c98a4b';
    c.beginPath();
    c.arc(0, 0, 0.72 * r, 0, 2 * Math.PI);
    c.fill();
    c.strokeStyle = '#5c3a1a';
    c.lineWidth = 0.18 * r;
    c.beginPath();
    c.moveTo(-0.72 * r, -0.3 * r);
    c.lineTo(0.72 * r, -0.3 * r);
    c.moveTo(-0.72 * r, 0.3 * r);
    c.lineTo(0.72 * r, 0.3 * r);
    c.stroke();
    c.restore();
  }

  // The shelves, ladders, slide, and the monkey's pile of barrels.
  function drawScenery() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    scenery.width = canvas.width;
    scenery.height = canvas.height;
    const c = scenery.getContext('2d');
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, m.W, m.H);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    // The slide: a pink chute with a darker rim.
    [['#c2255c', 0.44], ['#ff8fab', 0.34], ['#ffc2d1', 0.1]].forEach(function (layer) {
      c.strokeStyle = layer[0];
      c.lineWidth = layer[1] * m.u;
      c.beginPath();
      m.slide.forEach(function (p, i) {
        if (i) c.lineTo(p[0], p[1] + 0.12 * m.u);
        else c.moveTo(p[0], p[1] + 0.12 * m.u);
      });
      c.stroke();
    });
    m.levels.concat([m.ledge]).forEach(drawPlank);
    // Ladders: two rails and rungs, from a shelf's top to the next one's.
    c.lineCap = 'butt';
    m.ladders.forEach(function (x, level) {
      const ya = shelfY(level, x);
      const yb = shelfY(level + 1, x);
      const half = 0.17 * m.u;
      c.strokeStyle = '#8a5529';
      c.lineWidth = Math.max(3, 0.06 * m.u);
      c.beginPath();
      c.moveTo(x - half, ya);
      c.lineTo(x - half, yb);
      c.moveTo(x + half, ya);
      c.lineTo(x + half, yb);
      c.stroke();
      c.strokeStyle = '#a8713f';
      c.lineWidth = Math.max(2, 0.045 * m.u);
      c.beginPath();
      for (let y = ya - 0.16 * m.S; y > yb + 0.04 * m.S; y -= 0.16 * m.S) {
        c.moveTo(x - half, y);
        c.lineTo(x + half, y);
      }
      c.stroke();
    });
    // The monkey's pile of barrels, in the corner.
    const r = BARREL * m.u;
    const top = m.levels[5].y0;
    drawBarrel(c, 0.3 * m.u, top - r, 0);
    drawBarrel(c, 0.3 * m.u + 2.05 * r, top - r, 0.6);
    drawBarrel(c, 0.3 * m.u + 1.02 * r, top - 2.9 * r, 1.1);
  }

  // Draws an emoji with its bottom middle at x, y. Each is drawn once into
  // its own little canvas, which is quicker to copy than text to draw.
  function emoji(text, size, x, y) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const key = text + size;
    let p = pictures[key];
    if (!p) {
      p = document.createElement('canvas');
      p.width = Math.ceil(1.4 * size * ratio);
      p.height = Math.ceil(1.4 * size * ratio);
      const c = p.getContext('2d');
      c.font = size * ratio + 'px ' + EMOJI;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.fillText(text, p.width / 2, 1.15 * size * ratio);
      pictures[key] = p;
    }
    g.drawImage(p, x - p.width / ratio / 2, y - (1.15 * p.height) / 1.4 / ratio, p.width / ratio, p.height / ratio);
  }

  function drawMonkey(t) {
    const top = m.levels[5].y0;
    const holding = nextThrow - t <= WINDUP;
    const bob = holding ? -0.08 * m.u : -Math.abs(Math.sin(t * 2.6)) * 0.05 * m.u;
    emoji('🐒', 0.95 * m.u, m.monkeyX, top - 0.06 * m.u + bob);
    if (holding) drawBarrel(g, m.monkeyX + 0.42 * m.u, top - 0.78 * m.u + bob, 0);
  }

  function drawSquishy(a, place, t) {
    const u = m.u;
    let sx = 1;
    let sy = 1;
    let lift = 0;
    let lean = 0;
    const jumped = t - a.jumpAt;
    const bonked = t - a.bonkAt;
    if (place.kind === 'walk') {
      lift = jumpHeight(jumped);
      if (jumped >= 0 && jumped < 0.1 * JUMP) { // stretching up to jump
        sy = 1.12;
        sx = 0.92;
      } else if (jumped > 0.88 * JUMP && jumped < JUMP) { // landing
        sy = 0.88;
        sx = 1.1;
      } else if (!lift) { // hopping along
        lift = Math.abs(Math.sin((Math.PI * place.walked) / (0.42 * u))) * 0.06 * u;
      }
    } else if (place.kind === 'climb') {
      lean = 0.07 * Math.sin((Math.PI * place.climbed) / (0.16 * m.S));
    } else {
      lean = place.lean;
    }
    if (bonked >= 0 && bonked < BONK) { // squashed flat, then bouncing back
      const f = bonked / BONK;
      sy *= 1 - 0.4 * (1 - f) * Math.cos(f * 9);
      sx *= 1 + 0.25 * (1 - f) * Math.cos(f * 9);
    }
    g.save();
    g.translate(place.x, place.y - lift);
    g.rotate(lean);
    g.scale(place.facing * sx, sy);
    const picture = a.squishy.picture();
    if (picture && picture.width) {
      const h = (u * picture.height) / picture.width;
      g.drawImage(picture, -u / 2, -h, u, h);
    } else {
      emoji('🐉', 0.5 * u, 0, -0.04 * u);
    }
    g.restore();
    return { x: place.x - u / 2, y: place.y - lift - 0.62 * u, w: u, h: 0.62 * u };
  }

  // Each squishy walking along a shelf jumps when a barrel coming its way
  // will reach it in half a jump, so the barrel passes under the middle of
  // the jump. By a ladder (at each end of a walk), a barrel rolls behind the
  // ladder and whoever is on it, so there's no jumping there. A barrel that
  // still touches a squishy bumps it, squashing it.
  function dodge(a, i, place, t, rolling) {
    if (place.kind !== 'walk') return;
    const zone = 0.45 * m.u;
    const jumped = t - a.jumpAt;
    // A barrel meeting it by a ladder touches it a little before and after,
    // so that counts as by the ladder too.
    const reach = zone + 0.4 * m.u;
    const byLadder = place.walked < reach || place.length - place.walked < reach;
    rolling.forEach(function (b) {
      if (b.place.level !== place.level) return;
      const meet = (b.place.x - place.x) / (place.vx - b.place.vx);
      const there = place.walked + meet * WALK * m.u; // how far along it will be when they meet
      const clear = there > zone && place.length - there > zone;
      if (clear && jumped > JUMP && meet > 0 && meet <= JUMP / 2) {
        a.jumpAt = t;
        if (t - hopped > 0.35) {
          sound.hop();
          hopped = t;
        }
      }
      const touching = Math.abs(b.place.x - place.x) < (0.25 + BARREL) * m.u;
      if (touching && byLadder) b.barrel.bumped[i] = true; // it passed behind
      if (touching && jumpHeight(t - a.jumpAt) < 2 * BARREL * m.u && !b.barrel.bumped[i] && t > 1) {
        b.barrel.bumped[i] = true;
        a.bonkAt = t;
        sound.squeak();
      }
    });
  }

  function frame(now) {
    frameId = requestAnimationFrame(frame);
    if (document.hidden) return;
    fit();
    const t = (now - clock0) / 1000;
    if (t >= nextThrow) {
      barrels.push({ at: nextThrow, bumped: {} });
      nextThrow += THROW[0] + Math.random() * (THROW[1] - THROW[0]);
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(scenery, 0, 0);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawMonkey(t);
    const rolling = [];
    barrels = barrels.filter(function (b) {
      const place = placeBarrel(t - b.at);
      if (!place) return false;
      drawBarrel(g, place.x, place.y, place.spin * (place.vx < 0 ? -1 : 1));
      if (place.kind === 'roll') rolling.push({ barrel: b, place: place });
      return true;
    });
    hitBoxes = actors.map(function (a, i) {
      const place = placeOnRoute(routeTime(i, t));
      if (place.segment !== a.segment) {
        if (place.kind === 'slide' && a.segment >= 0) sound.whee();
        a.segment = place.segment;
      }
      dodge(a, i, place, t, rolling);
      return drawSquishy(a, place, t);
    });
    // The basket the barrels drop into, in front of them.
    emoji('🧺', 0.62 * m.u, m.basketX, m.floor + 0.04 * m.u);
  }

  // Sizes the canvas to its box (at up to twice the pixels), and lays out the
  // maze again when that changes.
  function fit() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (m && canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    build(canvas.clientWidth, canvas.clientHeight);
  }

  function tap(event) {
    if (!m) return;
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const t = (performance.now() - clock0) / 1000;
    sound.unlock();
    for (let i = hitBoxes.length - 1; i >= 0; i--) {
      const b = hitBoxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h + 0.1 * m.u) {
        const a = actors[i];
        sound.squeak();
        speech.speak(a.squishy.name);
        if (t - a.jumpAt > JUMP) a.jumpAt = t;
        return;
      }
    }
    const top = m.levels[5].y0;
    if (Math.hypot(x - m.monkeyX, y - (top - 0.45 * m.u)) < 0.7 * m.u) {
      speech.speak('Ooh ooh, ah ah!');
      if (nextThrow - t > WINDUP) nextThrow = t + WINDUP;
    }
  }

  canvas.addEventListener('click', tap);

  return {
    start: function () {
      if (frameId) return;
      m = null;
      fit();
      clock0 = performance.now();
      // Some barrels already on their way down, and the next one soon.
      barrels = [];
      for (let k = 1; k <= 6; k++) barrels.push({ at: -k * 3.5, bumped: {} });
      nextThrow = 1;
      actors.forEach(function (a) {
        a.jumpAt = -1e9;
        a.bonkAt = -1e9;
        a.segment = -1;
      });
      frameId = requestAnimationFrame(frame);
    },
    stop: function () {
      cancelAnimationFrame(frameId);
      frameId = 0;
    },
  };
}
