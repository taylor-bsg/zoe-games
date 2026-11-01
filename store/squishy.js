// Squishy plush dragons in real 3D, drawn with WebGL and no library. Each
// dragon is a few soft shapes (a round body, stubby feet, a tail, horns,
// wings, and maybe spikes, a crown, or other flair) melted together with
// signed distance functions and ray-marched in a fragment shader, then lit
// like soft fabric. The face and belly are painted on by position, so they
// turn with the body.
//
//   import { createSquishy } from './squishy.js?v=0.8.3';
//   const view = createSquishy(canvas, { maxRatio: 1.25 }); // null without WebGL
//   view.draw(look, { angle: 0.4, squish: 0 });
//   view.status(look); // 'compiling', 'ready', or 'failed'
//
// Each look is drawn by a 3D program compiled with only the parts it needs
// (see parts), since a slower computer takes seconds per program: on a
// Chromebook with Intel UHD 600 graphics, one program with every part took
// 15 s, an egg's 0.8 s. Programs are compiled when a look first needs one,
// and kept. status(look) starts compiling its program and, where the browser
// compiles in the background (view.background, KHR_parallel_shader_compile),
// answers without waiting, so a page can show something else until it's
// 'ready'; elsewhere it waits. view.compiling() says whether any program is
// still compiling. draw() waits for the look's program, and draws nothing if
// it failed.
//
// A look has colors (hex strings): body, belly, horn, wing, cheek, spike, eye,
// and acc and acc2 for accessories. Everything else is optional:
//   size        overall size, 1 = full (cheaper squishies are smaller)
//   wings, tail size of the wings and tail, 1 = normal
//   tailTip     a ball on the end of the tail (acc2)
//   spikes, crown, stars
//   glasses     'round' (acc frames) or 'sun' (acc frames, acc2 lenses)
//   headphones  acc band, acc2 cups
//   hat         a party hat striped acc and acc2, with a white pom-pom
//   halo        a glowing ring above the head (acc)
//   bowtie      acc2
//   chubby      a big round body with a head on top, a round snout, stubby
//               arms, floppy dog ears instead of horns (horn color), wings
//               up on the back, and a big striped belly
//   serpent     a sea serpent instead of a dragon: a coil on the floor, a
//               neck rising to a head with a crest and fins (spike color)
//               and a big smile with two little fangs, and a tail with a
//               fin. No wings, feet, horns, or other flair.
//   fluffyTail  a big, bushy tail like a chinchilla's, curling up behind,
//               with a tip in the belly color (instead of the usual tail)
//   heads       2 for two heads up on long, skinny necks, each with a face
//               and horns. Spikes, crown, glasses, headphones, hat, and halo
//               are placed for one head.
//   hearts      a love dragon: heart-shaped wings and a heart on the tail
//               (wing color), a heart-shaped belly and cheeks, and little
//               hearts (acc) over its back and sides, placed for one head.
//               On an egg, little hearts instead of spots.
//   egg         draws a mystery egg instead of a dragon, at the look's size:
//               body color, spots in the belly, wing, and spike colors (gold
//               stars if stars, hearts in the belly, wing, and acc colors if
//               hearts), and a big question mark in the eye color.
//               With glasses, it wears them instead of the question mark.
//   cube        with egg: a soft cube-shaped egg instead of an oval one
//   sphere      with egg: a ball instead of an oval egg; it rocks by turning
//               in place
//   heart       with egg: a puffy heart standing on its point instead of an
//               oval egg
// angle turns the dragon (radians); tilt rocks it sideways about the spot
// where it touches the floor (radians, small; used for eggs); squish squashes
// it toward the floor (up to about 1) or stretches it up (negative, down to
// about -0.6). The picture
// fills the canvas's on-screen size, at up to maxRatio pixels per CSS pixel
// (default 2), with the same zoom for every squishy so that sizes compare.

const VERTEX = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';

const FRAGMENT = [
  'precision highp float;',
  'uniform vec2 uRes;',
  // Packed four to a vector, to stay within the 16 uniform vectors every
  // WebGL device has.
  'uniform vec4 uView;', // zoom, turn, squish, egg
  'uniform vec4 uMore;', // tilt, two heads, fluffy tail, kind
  'uniform vec4 uShape;', // size, wing size, tail size, tail tip
  'uniform vec4 uExtras;', // spikes, crown, stars, bow tie
  'uniform vec4 uGear;', // glasses (1 round, 2 sun), headphones, hat, halo
  'uniform vec3 uBody, uBelly, uHorn, uWing, uCheek, uSpike, uEye, uAcc, uAcc2;',
  '#define FOCAL uView.x',
  '#define ANGLE uView.y',
  '#define SQUISH uView.z',
  '#define EGG uView.w',
  '#define SIZE uShape.x',
  '#define WINGS uShape.y',
  '#define TAIL uShape.z',
  '#define TAIL_TIP uShape.w',
  '#define SPIKES uExtras.x',
  '#define CROWN uExtras.y',
  '#define STARS uExtras.z',
  '#define BOWTIE uExtras.w',
  '#define GLASSES uGear.x',
  '#define HEADPHONES uGear.y',
  '#define HAT uGear.z',
  '#define HALO uGear.w',
  '#define TILT uMore.x',
  '#define TWO_HEADS uMore.y',
  '#define FLUFFY_TAIL uMore.z',
  '#define KIND uMore.w', // 0 a dragon, 1 a sea serpent, 2 a chubby dragon; for an egg, 3 a cube, 4 a ball, 5 a heart
  'const float FLOOR = -0.86;',

  'mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }',

  'float sdEllipsoid(vec3 p, vec3 r) {',
  '  float k0 = length(p / r);',
  '  float k1 = length(p / (r * r));',
  '  return k0 * (k0 - 1.0) / k1;',
  '}',

  // A cone with rounded ends, from a (radius r1) to b (radius r2).
  'float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {',
  '  vec3 ba = b - a;',
  '  float l2 = dot(ba, ba);',
  '  float rr = r1 - r2;',
  '  float a2 = l2 - rr * rr;',
  '  float il2 = 1.0 / l2;',
  '  vec3 pa = p - a;',
  '  float y = dot(pa, ba);',
  '  float z = y - l2;',
  '  vec3 xv = pa * l2 - ba * y;',
  '  float x2 = dot(xv, xv);',
  '  float y2 = y * y * l2;',
  '  float z2 = z * z * l2;',
  '  float k = sign(rr) * rr * rr * x2;',
  '  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;',
  '  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;',
  '  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;',
  '}',

  // A ring lying flat (around the y axis); pass p.xzy for one facing forward.
  'float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }',

  // A box b across from the middle to each face, with edges rounded by r.
  'float sdRoundBox(vec3 p, vec3 b, float r) {',
  '  vec3 q = abs(p) - b + r;',
  '  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;',
  '}',

  // A cube egg's own space, centered in the cube. It's 1.24 across with
  // edges rounded by 0.16, and as it rocks it rises just enough that its
  // lowest rounded corner stays on the floor, at any turn.
  '#ifdef IS_CUBE',
  'vec3 cubeSpace(vec3 p) {',
  '  float e = 0.46 * (abs(cos(ANGLE)) + abs(sin(ANGLE)));', // half its bottom, across the rocking
  '  float lift = (0.16 + e * sin(abs(TILT))) / cos(TILT) - 0.16;',
  '  return p - vec3(0.0, FLOOR + 0.62 + lift, 0.0);',
  '}',
  '#endif',

  // A heart in 2D, its point at the origin, 1.1 tall and 1.2 across: exact
  // distance (after Inigo Quilez's 2D distance functions).
  '#if defined(HAS_HEARTS) || defined(IS_HEART)',
  'float sdHeart(vec2 p) {',
  '  p.x = abs(p.x);',
  '  if (p.y + p.x > 1.0) return length(p - vec2(0.25, 0.75)) - 0.35355;',
  '  vec2 a = p - vec2(0.0, 1.0);',
  '  vec2 b = p - 0.5 * max(p.x + p.y, 0.0);',
  '  return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);',
  '}',
  '#endif',

  'float smin(float a, float b, float k) {',
  '  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);',
  '  return mix(b, a, h) - k * h * (1.0 - h);',
  '}',

  // Melts a part into the shape so far; the closer one gives the material.
  'vec2 add(vec2 a, float d, float m, float k) { return vec2(smin(a.x, d, k), d < a.x ? m : a.y); }',

  // From the world into the dragon's own space: rocked, turned, squashed
  // toward the floor and bulged out (or stretched up for a negative squish),
  // and scaled to its size, still standing on the floor.
  'vec3 local(vec3 p) {',
  '  p.xy = rot(TILT) * (p.xy - vec2(0.0, FLOOR)) + vec2(0.0, FLOOR);',
  '  p.xz = rot(ANGLE) * p.xz;',
  '  p.y = (p.y - FLOOR) / ((1.0 - 0.3 * SQUISH) * SIZE) + FLOOR;',
  '  p.xz /= (1.0 + 0.18 * SQUISH) * SIZE;',
  '  return p;',
  '}',

  // A ball egg (radius BALL, on the floor) doesn't roll away when it rocks:
  // its shape stays put, without the rocking, and its paint turns about its
  // middle instead (in ball's space).
  '#ifdef IS_SPHERE',
  'const float BALL = 0.74;',
  'vec3 upright(vec3 p) {',
  '  p.xz = rot(ANGLE) * p.xz;',
  '  p.y = (p.y - FLOOR) / ((1.0 - 0.3 * SQUISH) * SIZE) + FLOOR;',
  '  p.xz /= (1.0 + 0.18 * SQUISH) * SIZE;',
  '  return p;',
  '}',
  'vec3 ball(vec3 world) {',
  '  vec3 c = upright(world) - vec3(0.0, FLOOR + BALL, 0.0);',
  '  c.xy = rot(TILT) * c.xy;',
  '  return c;',
  '}',
  '#endif',

  // A heart egg, standing on its rounded point on the floor: a rounded cone
  // from the point up to each of its two round lobes, melted together, a
  // little flatter front to back.
  '#ifdef IS_HEART',
  'float heartEgg(vec3 p) {',
  '  vec3 q = vec3(p.x, p.y - FLOOR, p.z * 1.2);',
  '  float d = smin(sdRoundCone(q, vec3(0.0, 0.08, 0.0), vec3(0.37, 1.04, 0.0), 0.08, 0.5),',
  '    sdRoundCone(q, vec3(0.0, 0.08, 0.0), vec3(-0.37, 1.04, 0.0), 0.08, 0.5),',
  '    0.02 + 0.1 * clamp(q.y / 0.5, 0.0, 1.0));', // less melting at the point, which stays slim
  '  return d / 1.2;',
  '}',
  '#endif',

  // A two-headed dragon's head on this side (q is the dragon's space with x
  // made positive), in the head's own space: centered, turned a little away
  // from the other head, and tipped out.
  '#ifdef HAS_TWO_HEADS',
  'vec3 headSpace(vec3 q) {',
  '  vec3 h = q - vec3(0.57, 1.02, 0.24);',
  '  h.xz = rot(0.35) * h.xz;',
  '  h.xy = rot(0.12) * h.xy;',
  '  return h;',
  '}',
  '#endif',

  // A sea serpent: a coil on the floor, a neck rising from its front to a
  // head with a crest and fins, and a tail curling up at the back with a
  // fin. Materials as in map.
  '#ifdef IS_SERPENT',
  'vec2 serpent(vec3 p) {',
  '  vec3 q = vec3(abs(p.x), p.y, p.z);',
  '  float coil = sdTorus(p - vec3(0.0, -0.62, -0.12), vec2(0.56, 0.24));',
  '  coil = -smin(-coil, p.y - FLOOR - 0.04, 0.08);', // flat underneath
  '  vec2 res = vec2(coil, 1.0);',
  '  res.x = smin(res.x, sdRoundCone(p, vec3(0.0, -0.52, 0.4), vec3(0.0, -0.1, 0.38), 0.25, 0.27), 0.1);',
  '  res.x = smin(res.x, sdRoundCone(p, vec3(0.0, -0.1, 0.38), vec3(0.0, 0.18, 0.18), 0.27, 0.3), 0.1);',
  '  res.x = smin(res.x, sdEllipsoid(p - vec3(0.0, 0.36, 0.14), vec3(0.56, 0.5, 0.52)), 0.12);',
  '  res.x = smin(res.x, sdRoundCone(p, vec3(-0.42, -0.58, -0.42), vec3(-0.62, -0.08, -0.68), 0.2, 0.07), 0.1);',
  '  vec3 f = p - vec3(-0.66, 0.08, -0.72);', // the tail's fin
  '  f.xz = rot(0.6) * f.xz;',
  '  res = add(res, sdEllipsoid(f, vec3(0.04, 0.22, 0.3)), 4.0, 0.04);',
  '  res = add(res, sdRoundCone(p, vec3(0.0, 0.78, 0.02), vec3(0.0, 1.2, -0.12), 0.1, 0.03), 4.0, 0.04);', // the crest
  '  res = add(res, sdRoundCone(q, vec3(0.2, 0.76, 0.04), vec3(0.34, 1.06, -0.08), 0.08, 0.025), 4.0, 0.04);',
  '  vec3 g = q - vec3(0.5, 0.46, -0.06);', // fins on the head, swept back
  '  g.yz = rot(0.55) * g.yz;',
  '  return add(res, sdEllipsoid(g, vec3(0.035, 0.11, 0.26)), 4.0, 0.03);',
  '}',
  '#endif',

  // Distance to the dragon, and its material: 1 body, 2 horn, 3 wing, 4 spike,
  // 5 acc, 6 acc2, 7 halo, 8 striped hat, 9 white pom-pom, 10 egg,
  // 11 fluffy tail.
  'vec2 map(vec3 world) {',
  '  vec3 p = local(world);',
  // The mystery egg: rounder and wider at the bottom, resting on the floor.
  // Its taper bends distances a little, so they're scaled down to be safe.
  // A cube egg is a soft cube, lifted as it rocks so a corner stays on the
  // floor, and a ball egg is a ball that stays put (see ball).
  '#ifdef IS_EGG',
  '  {',
  '    vec2 egg;',
  '#if defined(IS_CUBE)',
  '    egg = vec2(sdRoundBox(cubeSpace(p), vec3(0.62), 0.16), 10.0);',
  '#elif defined(IS_SPHERE)',
  '    egg = vec2(length(upright(world) - vec3(0.0, FLOOR + BALL, 0.0)) - BALL, 10.0);',
  '#elif defined(IS_HEART)',
  '    egg = vec2(heartEgg(p), 10.0);',
  '#else',
  '    float y = p.y + 0.06;',
  '    float k = 1.0 - 0.14 * clamp(y / 0.8, -1.0, 1.0);',
  '    egg = vec2(0.8 * sdEllipsoid(vec3(p.x / k, y, p.z / k), vec3(0.64, 0.8, 0.64)), 10.0);',
  '#endif',
  // Glasses on an egg, fitted to its curve: each lens faces out from the
  // egg's face, leaning back with it, and the arms wrap back to its sides.
  '#ifdef HAS_GLASSES',
  '    if (GLASSES > 0.5) {',
  '      vec3 q = vec3(abs(p.x), p.y, p.z);',
  '      vec3 l = q - vec3(0.251, 0.214, 0.562);',
  '      l.xz = rot(0.42) * l.xz;',
  '      l.yz = rot(0.35) * l.yz;',
  '      float frame = sdTorus(l.xzy, vec2(0.135, 0.021));',
  '      frame = min(frame, sdRoundCone(p, vec3(-0.127, 0.242, 0.606), vec3(0.127, 0.242, 0.606), 0.02, 0.02));',
  '      frame = min(frame, sdRoundCone(q, vec3(0.374, 0.214, 0.507), vec3(0.536, 0.214, 0.287), 0.02, 0.02));',
  '      frame = min(frame, sdRoundCone(q, vec3(0.536, 0.214, 0.287), vec3(0.615, 0.214, -0.018), 0.02, 0.02));',
  '      egg = add(egg, frame, 5.0, 0.006);',
  '      if (GLASSES > 1.5) egg = add(egg, sdEllipsoid(l, vec3(0.13, 0.13, 0.012)), 6.0, 0.003);',
  '    }',
  '#endif',
  '    egg.x *= SIZE * min(1.0 - 0.3 * SQUISH, 1.0 + 0.18 * SQUISH);',
  '    return egg;',
  '  }',
  '#elif defined(IS_SERPENT)',
  '  {',
  '    vec2 s = serpent(p);',
  '    s.x *= SIZE * min(1.0 - 0.3 * SQUISH, 1.0 + 0.18 * SQUISH);',
  '    return s;',
  '  }',
  '#else',
  '  vec3 q = vec3(abs(p.x), p.y, p.z);',
  // With one head, the round body is the head. Two heads sit up on long,
  // skinny necks from a lower body, each with its own little horns. A
  // chubby dragon has a big round body with a head on top, a snout, and
  // stubby arms.
  '  float body = sdEllipsoid(p - vec3(0.0, -0.02, 0.0), vec3(1.0, 0.86, 0.84));',
  '#ifdef HAS_TWO_HEADS',
  '  if (TWO_HEADS > 0.5) body = sdEllipsoid(p - vec3(0.0, -0.22, 0.0), vec3(0.96, 0.66, 0.8));',
  '#endif',
  '#ifdef IS_CHUBBY',
  '  if (KIND > 1.5) {',
  '    body = sdEllipsoid(p - vec3(0.0, -0.2, 0.0), vec3(0.86, 0.68, 0.74));',
  '    body = smin(body, sdEllipsoid(p - vec3(0.0, 0.56, 0.06), vec3(0.5, 0.44, 0.46)), 0.14);',
  '    body = smin(body, sdEllipsoid(p - vec3(0.0, 0.46, 0.4), vec3(0.3, 0.2, 0.22)), 0.08);',
  '    vec3 arm = q - vec3(0.58, -0.04, 0.42);',
  '    arm.xy = rot(-0.35) * arm.xy;', // tipped out at the hand
  '    body = smin(body, sdEllipsoid(arm, vec3(0.14, 0.25, 0.15)), 0.06);',
  '  }',
  '#endif',
  '  body = -smin(-body, p.y - FLOOR - 0.04, 0.1);',
  '  vec2 res = vec2(body, 1.0);',
  '#if defined(HAS_TWO_HEADS)',
  '  if (TWO_HEADS > 0.5) {',
  '    res.x = smin(res.x, sdRoundCone(q, vec3(0.24, 0.25, 0.04), vec3(0.53, 0.86, 0.2), 0.13, 0.08), 0.12);',
  '    vec3 h = headSpace(q);',
  '    res.x = smin(res.x, sdEllipsoid(h, vec3(0.39, 0.35, 0.35)), 0.06);',
  '    vec3 hq = vec3(abs(h.x), h.y, h.z);',
  '    res = add(res, sdRoundCone(hq, vec3(0.11, 0.22, -0.02), vec3(0.16, 0.39, -0.05), 0.055, 0.022), 2.0, 0.03);',
  '  }',
  '#elif defined(IS_CHUBBY)',
  '  if (KIND > 1.5) {', // floppy dog ears down the sides of the head
  '    vec3 ear = q - vec3(0.48, 0.6, 0.0);',
  '    ear.xy = rot(-0.5) * ear.xy;', // the top tucked in at the head, the tip out
  '    res = add(res, sdEllipsoid(ear, vec3(0.08, 0.34, 0.2)), 2.0, 0.05);',
  '  }',
  '#else',
  '  res = add(res, sdRoundCone(q, vec3(0.34, 0.6, -0.02), vec3(0.5, 1.02, -0.1), 0.14, 0.05), 2.0, 0.05);',
  '#endif',
  '  res.x = smin(res.x, sdEllipsoid(q - vec3(0.42, -0.72, 0.42), vec3(0.22, 0.13, 0.2)), 0.08);',
  // The tail: a big one is longer and thicker, curving up behind (which also
  // keeps it inside the view), maybe with a ball on the tip. A fluffy one,
  // like a chinchilla's, is puffs that grow fatter as they curl up behind the
  // back and over to one side, so its tip peeks up by the head from the
  // front.
  '#ifdef HAS_FLUFFY_TAIL',
  '  if (FLUFFY_TAIL > 0.5) {',
  '    float t = length(p - vec3(0.0, -0.5, -0.7)) - 0.17;',
  '    t = smin(t, length(p - vec3(0.0, -0.38, -0.96)) - 0.25, 0.16);',
  '    t = smin(t, length(p - vec3(0.05, -0.1, -1.06)) - 0.31, 0.16);',
  '    t = smin(t, length(p - vec3(0.12, 0.22, -1.06)) - 0.33, 0.16);',
  '    t = smin(t, length(p - vec3(0.22, 0.55, -0.95)) - 0.32, 0.16);',
  '    t = smin(t, length(p - vec3(0.32, 0.86, -0.78)) - 0.28, 0.16);',
  '    t = smin(t, length(p - vec3(0.4, 1.06, -0.52)) - 0.22, 0.16);',
  '    res = add(res, t, 11.0, 0.08);',
  '  }',
  '#else',
  '  {',
  '    vec3 tip = vec3(0.0, -0.5, -0.66) + vec3(0.0, 0.2 + 0.6 * (TAIL - 1.0), -0.44 - 0.1 * (TAIL - 1.0));',
  '    res.x = smin(res.x, sdRoundCone(p, vec3(0.0, -0.5, -0.66), tip, 0.18 * min(TAIL, 1.3), 0.06 * TAIL), 0.1);',
  '#ifdef HAS_TAIL_TIP',
  '    if (TAIL_TIP > 0.5) res = add(res, length(p - tip) - 0.11 * TAIL, 6.0, 0.04);',
  '#endif',
  '#ifdef HAS_HEARTS',
  '    float d = sdHeart(vec2(p.z - tip.z, p.y - tip.y + 0.06) / 0.3) * 0.3;', // a puffy heart, facing the sides
  '    res = add(res, length(vec2(max(d + 0.05, 0.0), p.x)) - 0.05, 3.0, 0.04);',
  '#endif',
  '  }',
  '#endif',
  // Wings: bigger ones reach further up and out. A love dragon's are puffy
  // hearts, their points at the shoulders and their lobes out and up,
  // facing front and back.
  '#ifdef HAS_HEARTS',
  '  {',
  '    vec3 k = q - vec3(0.28, 0.22, -0.55);',
  '    vec2 h = vec2(dot(k, vec3(-0.819, 0.574, 0.0)), dot(k, vec3(0.565, 0.808, -0.168)));',
  '    float d = sdHeart(h / (0.68 * WINGS)) * 0.68 * WINGS;',
  '    res = add(res, length(vec2(max(d + 0.07, 0.0), dot(k, vec3(0.096, 0.137, 0.986)))) - 0.07, 3.0, 0.04);',
  '  }',
  '#else',
  '  float big = WINGS - 1.0;',
  '  vec3 w = q - vec3(0.74 + 0.24 * big, 0.2 + 0.24 * big - 0.18 * TWO_HEADS, -0.44 - 0.08 * big);',
  '#ifdef IS_CHUBBY',
  '  if (KIND > 1.5) w = q - vec3(0.5 + 0.24 * big, 0.32 + 0.24 * big, -0.5 - 0.08 * big);', // up on the back
  '#endif',
  '  w.xy = rot(-0.5 - 0.15 * big) * w.xy;',
  '  w.xz = rot(0.5) * w.xz;',
  '  res = add(res, sdEllipsoid(w, vec3(0.08 + 0.03 * big, 0.34 * WINGS, 0.26 * WINGS)), 3.0, 0.06);',
  '#endif',
  '#ifdef HAS_SPIKES',
  '  if (SPIKES > 0.5) {',
  '    for (int i = 0; i < 3; i++) {',
  '      float t = float(i);',
  '      vec3 a = vec3(0.0, 0.76 - 0.22 * t, -0.2 - 0.27 * t);',
  '      res = add(res, sdRoundCone(p, a, a + vec3(0.0, 0.2, -0.1), 0.1, 0.03), 4.0, 0.04);',
  '    }',
  '  }',
  '#endif',
  '#ifdef HAS_CROWN',
  '  if (CROWN > 0.5) {',
  '    res = add(res, sdTorus(p - vec3(0.0, 0.83, 0.02), vec2(0.27, 0.05)), 4.0, 0.02);',
  '    for (int i = 0; i < 5; i++) {',
  '      float a = 6.2832 * float(i) / 5.0;',
  '      vec3 c = vec3(0.27 * sin(a), 0.85, 0.02 + 0.27 * cos(a));',
  '      res = add(res, sdRoundCone(p, c, c + vec3(0.0, 0.2, 0.0), 0.06, 0.02), 4.0, 0.02);',
  '    }',
  '  }',
  '#endif',
  // Glasses: rings over the painted eyes, turned to follow the round head,
  // with a bridge and arms that run back along the head. Away from the face,
  // a sphere around them stands in (it's never farther than they are), which
  // saves work on slower iPads.
  '#ifdef HAS_GLASSES',
  '  if (GLASSES > 0.5) {',
  '    float bound = length(p - vec3(0.0, 0.15, 0.62)) - 0.95;',
  '    if (bound > 0.05) {',
  '      res = add(res, bound, 5.0, 0.01);',
  '    } else {',
  '      vec3 l = q - vec3(0.31, 0.12, 0.84);',
  '      l.xz = rot(0.35) * l.xz;',
  '      float frame = sdTorus(l.xzy, vec2(0.155, 0.026));',
  '      frame = min(frame, sdRoundCone(p, vec3(-0.165, 0.15, 0.885), vec3(0.165, 0.15, 0.885), 0.024, 0.024));',
  '      frame = min(frame, sdRoundCone(q, vec3(0.455, 0.13, 0.79), vec3(0.66, 0.16, 0.66), 0.024, 0.024));',
  '      frame = min(frame, sdRoundCone(q, vec3(0.66, 0.16, 0.66), vec3(0.82, 0.19, 0.45), 0.024, 0.024));',
  '      res = add(res, frame, 5.0, 0.01);',
  '      if (GLASSES > 1.5) res = add(res, sdEllipsoid(l, vec3(0.15, 0.15, 0.018)), 6.0, 0.005);',
  '    }',
  '  }',
  '#endif',
  // Headphones: a band over the top, in front of the horns, and two cups.
  '#ifdef HAS_HEADPHONES',
  '  if (HEADPHONES > 0.5) {',
  '    vec3 h = p - vec3(0.0, -0.12, 0.15);',
  '    res = add(res, max(sdTorus(h.xzy, vec2(1.005, 0.05)), -0.02 - p.y), 5.0, 0.02);',
  '    res = add(res, sdEllipsoid(q - vec3(1.0, -0.02, 0.15), vec3(0.11, 0.21, 0.21)), 6.0, 0.03);',
  '  }',
  '#endif',
  // A party hat between the horns, tipped a little, with a pom-pom.
  '#ifdef HAS_HAT',
  '  if (HAT > 0.5) {',
  '    res = add(res, sdRoundCone(p, vec3(0.0, 0.75, 0.03), vec3(0.11, 1.33, 0.05), 0.26, 0.022), 8.0, 0.03);',
  '    res = add(res, length(p - vec3(0.12, 1.37, 0.05)) - 0.09, 9.0, 0.02);',
  '  }',
  '#endif',
  '#ifdef HAS_HALO',
  '  if (HALO > 0.5) {',
  '    vec3 hl = p - vec3(0.0, 1.17, -0.05);',
  '    hl.yz = rot(0.22) * hl.yz;',
  '    res = add(res, sdTorus(hl, vec2(0.3, 0.035)), 7.0, 0.01);',
  '  }',
  '#endif',
  '#ifdef HAS_BOWTIE',
  '  if (BOWTIE > 0.5) {',
  '    res = add(res, sdEllipsoid(q - vec3(0.1, -0.17, 0.84), vec3(0.1, 0.065, 0.045)), 6.0, 0.02);',
  '    res = add(res, length(p - vec3(0.0, -0.17, 0.865)) - 0.042, 6.0, 0.02);',
  '  }',
  '#endif',
  // Squashing, stretching, and size change distances; scale down to the
  // smallest factor so the march never steps past the surface.
  '  res.x *= SIZE * min(1.0 - 0.3 * SQUISH, 1.0 + 0.18 * SQUISH);',
  '  return res;',
  '#endif',
  '}',

  'vec3 normal(vec3 p) {',
  '  const vec2 e = vec2(1.0, -1.0) * 0.0015;',
  '  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x +',
  '    e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);',
  '}',

  // Darker in creases, like where a plush folds.
  'float occlusion(vec3 p, vec3 n) {',
  '  float occ = 0.0;',
  '  float weight = 1.0;',
  '  for (int i = 1; i <= 4; i++) {',
  '    float h = 0.05 * float(i);',
  '    occ += weight * (h - map(p + n * h).x);',
  '    weight *= 0.6;',
  '  }',
  '  return clamp(1.0 - 2.4 * occ, 0.0, 1.0);',
  '}',

  'float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }',

  'float sdSegment(vec2 p, vec2 a, vec2 b) {',
  '  vec2 pa = p - a;',
  '  vec2 ba = b - a;',
  '  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));',
  '}',

  // Little hearts printed around a middle, upright, about the same size and
  // spacing everywhere: in rows of latitude, with fewer in a row nearer the
  // top or bottom. d is the direction from the middle. None where a heart's
  // direction is within a cone around the direction away (where dot > most).
  // Gives the heart's random 0-1 value, or -1 off the hearts.
  '#ifdef HAS_HEARTS',
  'float heartPrint(vec3 d, float rows, vec3 away, float most) {',
  '  float band = 3.1416 / rows;',
  '  float lat = asin(clamp(d.y, -1.0, 1.0));',
  '  float row = floor(lat / band + 0.5);',
  '  if (abs(row * band) > 1.1) return -1.0;', // none on the top or bottom
  '  float count = floor(2.0 * rows * cos(row * band) + 0.5);',
  '  float lon = atan(d.x, d.z) * count / 6.2832;', // in hearts around
  '  float col = floor(lon + 0.5);',
  '  float a = col * 6.2832 / count;',
  '  if (dot(vec3(cos(row * band) * sin(a), sin(row * band), cos(row * band) * cos(a)), away) > most) return -1.0;',
  '  float h = hash(vec3(row, mod(col, count), rows));',
  '  if (h < 0.4) return -1.0;',
  '  vec2 uv = vec2((lon - col) * 6.2832 / count * cos(lat), lat - row * band) / band;',
  '  return sdHeart(uv / 0.5 + vec2(0.0, 0.55)) < 0.0 ? h : -1.0;',
  '}',
  '#endif',

  // The egg: in the squishy's colors, with a big question mark on the front
  // (unless it wears glasses).
  '#ifdef IS_EGG',
  'vec3 eggPaint(vec3 world) {',
  '  vec3 p = local(world);',
  '#ifdef IS_SPHERE',
  '  p = ball(world) + vec3(0.0, 0.08, 0.0);', // the ? centered on the ball's front
  '#endif',
  '  vec3 col = uBody;',
  '#if defined(IS_CUBE)',
  '  {', // a cube: spots scattered on its flat faces
  '    vec3 c = cubeSpace(p);',
  '    vec3 f = fract(c * 3.2 + 0.5) - 0.5;', // the faces cut through the spot centers
  '    vec3 cell = floor(c * 3.2 + 0.5);',
  '    float h = hash(cell + 7.0);',
  '    if (hash(cell) > 0.6 && length(f) < 0.26) col = h > 0.66 ? uBelly : (h > 0.33 ? uWing : uSpike);',
  // The ? below goes in the middle of the front face only.
  '    p = vec3(c.x, c.y + 0.08, c.z > 0.4 ? 1.0 : 0.0);',
  '  }',
  '#elif defined(HAS_STARS)',
  '  {',
  '    vec3 s = fract(p * 5.0) - 0.5;',
  '    if (hash(floor(p * 5.0)) > 0.5 && length(s) < 0.22) col = vec3(1.0, 0.96, 0.75);',
  '  }',
  '#elif defined(HAS_HEARTS)',
  '  {', // little hearts in its other colors, but none by the ? or the point
  '    float h = heartPrint(normalize((p - vec3(0.0, FLOOR + 0.85, 0.0)) * vec3(1.0, 1.0, 2.0)), 6.0, vec3(0.0, -0.45, 0.89), 0.5);',
  '    if (h > 0.0) col = h > 0.8 ? uBelly : (h > 0.6 ? uWing : uAcc);',
  '  }',
  '#else',
  '  {',
  '    vec3 f = fract(p * 3.2) - 0.5;',
  '    float h = hash(floor(p * 3.2));',
  '    if (length(f) < 0.26) col = h > 0.66 ? uBelly : (h > 0.33 ? uWing : uSpike);',
  '  }',
  '#endif',
  '#ifdef IS_HEART',
  '  p = vec3(p.x, p.y + 0.14, p.z > 0.1 ? 1.0 : 0.0);', // the ? on the front, a little lower
  '#endif',
  '#ifndef HAS_GLASSES',
  '  if (p.z > 0.25 && GLASSES < 0.5) {',
  '    vec2 g = p.xy;',
  '    vec2 c = vec2(0.0, 0.22);',
  '    float a = atan(g.y - c.y, g.x - c.x);',
  '    float d = (a > 2.75 || a < -0.95) ? 1.0 : abs(length(g - c) - 0.15) - 0.055;', // the hook
  '    d = min(d, length(g - vec2(-0.139, 0.277)) - 0.055);',
  '    d = min(d, sdSegment(g, vec2(0.087, 0.098), vec2(0.0, 0.02)) - 0.055);',
  '    d = min(d, sdSegment(g, vec2(0.0, 0.02), vec2(0.0, -0.06)) - 0.055);', // the stem
  '    d = min(d, length(g - vec2(0.0, -0.21)) - 0.06);', // the dot
  '    if (d < 0.0) col = uEye;',
  '  }',
  '#endif',
  '  return col;',
  '}',
  '#endif',

  // A face, at the size of a one-headed dragon's: cheeks, eyes with a shine,
  // and a smile.
  '#if !defined(IS_EGG) && !defined(IS_SERPENT)',
  'vec3 face(vec2 f, vec3 col) {',
  '  vec2 e = vec2(abs(f.x), f.y);',
  '#ifdef HAS_HEARTS',
  '  if (sdHeart((e - vec2(0.56, -0.19)) / 0.13) < 0.0) col = uCheek;',
  '#else',
  '  if (length((e - vec2(0.56, -0.1)) / vec2(0.12, 0.07)) < 1.0) col = uCheek;',
  '#endif',
  '  if (length((e - vec2(0.31, 0.12)) / vec2(0.085, 0.115)) < 1.0) {',
  '    col = uEye;',
  '    if (length(e - vec2(0.29, 0.17)) < 0.035) col = vec3(1.0);',
  '  }',
  '  float arc = abs(length(f - vec2(0.0, 0.03)) - 0.12);',
  '  if (f.y < -0.03 && arc < 0.017) col = mix(uEye, uBody, 0.25);',
  '  return col;',
  '}',
  '#endif',

  // A sea serpent's colors: a pale belly down the front of its neck, and a
  // friendly face: round eyes, rosy cheeks, and a big open smile with a pink
  // tongue and two little fangs.
  '#ifdef IS_SERPENT',
  'vec3 serpentPaint(vec3 p) {',
  '  vec3 col = uBody;',
  '  if (p.y < 0.08 && p.z > 0.3 && abs(p.x) < 0.13 + 0.12 * clamp(0.08 - p.y, 0.0, 0.6)) {',
  '    col = uBelly;', // wider lower down, in bands like belly scales
  '    if (fract((p.y + 0.62) / 0.1) < 0.12) col = mix(uBelly, uBody, 0.35);',
  '  }',
  '  vec3 h = p - vec3(0.0, 0.36, 0.14);',
  '  if (h.z < 0.2) return col;',
  '  vec2 e = vec2(abs(h.x), h.y);',
  '  if (length((e - vec2(0.2, 0.08)) / vec2(0.075, 0.08)) < 1.0) {',
  '    col = vec3(1.0);',
  '    if (length(e - vec2(0.19, 0.07)) < 0.042) col = uEye;',
  '    if (length(e - vec2(0.175, 0.09)) < 0.014) col = vec3(1.0);',
  '  }',
  '  if (length((e - vec2(0.32, -0.06)) / vec2(0.07, 0.045)) < 1.0) col = uCheek;',
  '  if (h.y < -0.1 && length((h.xy - vec2(0.0, -0.1)) / vec2(0.22, 0.15)) < 1.0) {', // the smile
  '    col = vec3(0.45, 0.07, 0.13);',
  '    if (length((h.xy - vec2(0.0, -0.22)) / vec2(0.11, 0.05)) < 1.0) col = vec3(1.0, 0.45, 0.55);', // tongue
  '    if (h.y > -0.16 && abs(e.x - 0.1) < 0.03 * (h.y + 0.16) / 0.06) col = vec3(1.0);', // fangs
  '  }',
  '  return col;',
  '}',
  '#endif',

  // The face of a chubby dragon, on its head and snout: eyes, cheeks,
  // nostrils, and a smile across the snout.
  '#ifdef IS_CHUBBY',
  'vec3 snoutFace(vec3 p, vec3 col) {',
  '  vec2 e = vec2(abs(p.x), p.y);',
  '  if (p.z > 0.3 && length((e - vec2(0.2, 0.68)) / vec2(0.07, 0.09)) < 1.0) {',
  '    col = uEye;',
  '    if (length(e - vec2(0.185, 0.71)) < 0.025) col = vec3(1.0);',
  '  }',
  '  if (p.z > 0.3 && length((e - vec2(0.34, 0.55)) / vec2(0.07, 0.045)) < 1.0) col = uCheek;',
  '  if (p.z > 0.55 && length(e - vec2(0.07, 0.52)) < 0.025) col = mix(uEye, uBody, 0.4);',
  '  float arc = abs(length(p.xy - vec2(0.0, 0.5)) - 0.13);',
  '  if (p.z > 0.45 && p.y < 0.45 && arc < 0.015) col = mix(uEye, uBody, 0.25);',
  '  return col;',
  '}',
  '#endif',

  // The colors on the surface: parts, then a belly and a face on the front.
  'vec3 paint(vec3 world, float m) {',
  '#ifdef HAS_FLUFFY_TAIL',
  '  if (m > 10.5) return mix(uBody, uBelly, smoothstep(0.7, 0.95, local(world).y));', // fluffy tail, pale tip
  '#endif',
  '#ifdef IS_EGG',
  '  if (m > 9.5) return eggPaint(world);',
  '#endif',
  '#ifdef HAS_HAT',
  '  if (m > 8.5) return vec3(1.0, 0.98, 0.95);',
  '  if (m > 7.5) {',
  '    vec3 p = local(world);',
  '    float s = dot(p - vec3(0.0, 0.75, 0.03), vec3(0.186, 0.982, 0.034));', // along the hat
  '    return mod(floor(s * 11.5), 2.0) < 1.0 ? uAcc : uAcc2;',
  '  }',
  '#endif',
  '  if (m > 6.5) return uAcc;',
  '  if (m > 5.5) return uAcc2;',
  '  if (m > 4.5) return uAcc;',
  '  if (m > 3.5) return uSpike;',
  '  if (m > 2.5) return uWing;',
  '  if (m > 1.5) return uHorn;',
  '  vec3 p = local(world);',
  '#if defined(IS_SERPENT)',
  '  return serpentPaint(p);',
  '#elif defined(IS_EGG)',
  '  return uBody;', // not reached: an egg's colors come from eggPaint
  '#else',
  '  vec3 col = uBody;',
  '#ifdef HAS_STARS',
  '  if (STARS > 0.5) {',
  '    vec3 f = fract(p * 5.0) - 0.5;',
  '    if (hash(floor(p * 5.0)) > 0.55 && length(f) < 0.17) col = vec3(1.0, 0.96, 0.75);',
  '  }',
  '#endif',
  '#ifdef HAS_HEARTS',
  '  {',
  '    float h = heartPrint(normalize(p - vec3(0.0, -0.02, 0.0)), 7.0, vec3(0.0, 0.0, 1.0), 0.25);',
  '    if (h > 0.0) col = uAcc;',
  '  }',
  '#endif',
  '#if defined(HAS_TWO_HEADS)',
  '  if (p.z > 0.15 && length((p.xy - vec2(0.0, -0.4)) / vec2(0.44, 0.27)) < 1.0) col = uBelly;',
  '  vec3 h = headSpace(vec3(abs(p.x), p.y, p.z));',
  '  if (h.z > 0.1) col = face(h.xy / 0.47, col);',
  '#elif defined(IS_CHUBBY)',
  '  if (p.z > 0.15) {', // a big belly with stripes across it, and the face
  '    if (p.y < 0.2 && length((p.xy - vec2(0.0, -0.24)) / vec2(0.56, 0.46)) < 1.0) {',
  '      col = uBelly;',
  '      if (fract((p.y + 0.74) / 0.12) < 0.15) col = mix(uBelly, uBody, 0.5);',
  '    }',
  '    return snoutFace(p, col);',
  '  }',
  '#else',
  '  if (p.z > 0.15) {',
  '#ifdef HAS_HEARTS',
  '    if (sdHeart((p.xy - vec2(0.0, -0.78)) / 0.55) < 0.0) col = uBelly;',
  '#else',
  '    if (length((p.xy - vec2(0.0, -0.33)) / vec2(0.46, 0.31)) < 1.0) col = uBelly;',
  '#endif',
  '    col = face(p.xy, col);',
  '  }',
  '#endif',
  '  return col;',
  '#endif',
  '}',

  'void main() {',
  '  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;',
  // Aimed a little above the middle, leaving headroom for a stretch.
  '  vec3 ro = vec3(0.0, 0.42, 3.7);',
  '  vec3 ww = normalize(vec3(0.0, 0.12, 0.0) - ro);',
  '  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));',
  '  vec3 vv = cross(uu, ww);',
  '  vec3 rd = normalize(uv.x * uu + uv.y * vv + FOCAL * ww);',
  // Only march rays that hit a sphere around the dragon.
  '  vec3 oc = ro - vec3(0.0, 0.05, -0.05);',
  '  float b = dot(oc, rd);',
  '  float disc = b * b - dot(oc, oc) + 1.85 * 1.85;',
  '  if (disc > 0.0) {',
  '    float t = max(-b - sqrt(disc), 0.0);',
  '    float tmax = -b + sqrt(disc);',
  '    float m = 0.0;',
  '    for (int i = 0; i < 80; i++) {',
  '      vec2 h = map(ro + rd * t);',
  '      if (h.x < 0.0012) { m = h.y; break; }',
  '      t += h.x;',
  '      if (t > tmax) break;',
  '    }',
  '    if (m > 0.5) {',
  '      vec3 p = ro + rd * t;',
  '      vec3 n = normal(p);',
  '      vec3 l = normalize(vec3(-0.5, 0.85, 0.6));',
  '      float wrap = clamp((dot(n, l) + 0.45) / 1.45, 0.0, 1.0);',
  '      float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.2);',
  '      float sheen = pow(clamp(dot(reflect(rd, n), l), 0.0, 1.0), 10.0);',
  '      float front = clamp(dot(n, -rd), 0.0, 1.0);',
  '      vec3 col = paint(p, m) * (0.36 + 0.55 * wrap + 0.3 * front) * (0.6 + 0.4 * occlusion(p, n));',
  '      col += vec3(0.16) * rim + vec3(0.09) * sheen;',
  '      if (m > 6.5 && m < 7.5) col = mix(col, uAcc * 1.2 + 0.1, 0.7);', // the halo glows
  '      col *= 0.97 + 0.05 * hash(floor(p * 140.0));',
  '      gl_FragColor = vec4(col, 1.0);',
  '      return;',
  '    }',
  '  }',
  // The floor: a soft round shadow (premultiplied black), sized with the
  // squishy (smaller under an egg) and wider when squashed.
  '  if (rd.y < 0.0) {',
  '    vec3 p = ro + rd * ((FLOOR - ro.y) / rd.y);',
  '    vec2 q = p.xz * vec2(1.0, 1.4) / ((1.0 + 0.18 * SQUISH) * SIZE * (EGG > 0.5 ? (KIND > 4.5 ? 0.8 : KIND > 3.5 ? 0.88 : KIND > 2.5 ? 0.8 : 0.62) : 1.0));',
  '    float a = 0.26 * (1.0 - smoothstep(0.3, 1.25, length(q)));',
  '    gl_FragColor = vec4(0.0, 0.0, 0.0, a);',
  '    return;',
  '  }',
  '  gl_FragColor = vec4(0.0);',
  '}',
].join('\n');

const COLORS = ['body', 'belly', 'horn', 'wing', 'cheek', 'spike', 'eye', 'acc', 'acc2'];

// The parts of the 3D program a look needs, as #define names. Everything
// else is left out of its program.
function parts(look) {
  const list = [];
  if (look.egg) {
    list.push('IS_EGG');
    if (look.cube) list.push('IS_CUBE');
    if (look.sphere) list.push('IS_SPHERE');
    if (look.heart) list.push('IS_HEART');
  } else if (look.serpent) {
    list.push('IS_SERPENT');
  } else {
    if (look.heads === 2) list.push('HAS_TWO_HEADS');
    if (look.chubby) list.push('IS_CHUBBY');
    if (look.fluffyTail) list.push('HAS_FLUFFY_TAIL');
    if (look.tailTip) list.push('HAS_TAIL_TIP');
    if (look.spikes) list.push('HAS_SPIKES');
    if (look.crown) list.push('HAS_CROWN');
    if (look.headphones) list.push('HAS_HEADPHONES');
    if (look.hat) list.push('HAS_HAT');
    if (look.halo) list.push('HAS_HALO');
    if (look.bowtie) list.push('HAS_BOWTIE');
  }
  if (look.glasses) list.push('HAS_GLASSES');
  if (look.stars) list.push('HAS_STARS');
  if (look.hearts) list.push('HAS_HEARTS');
  return list;
}

// Starts compiling a shader; checking it waits for it, so that comes later.
function shader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return s;
}

// Starts compiling and linking the program for some parts.
function build(gl, list) {
  const defines = list.map(function (name) {
    return '#define ' + name + '\n';
  }).join('');
  const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, defines + FRAGMENT);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  return { status: 'compiling', program: program, vertex: vertex, fragment: fragment, u: {} };
}

function rgb(hex) {
  const n = parseInt((hex || '#1d2b53').slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function flag(on) {
  return on ? 1 : 0;
}

export function createSquishy(canvas, options) {
  const opts = options || {};
  let gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  } catch (e) {
    gl = null;
  }
  if (!gl) return null;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const programs = {}; // the parts, joined with spaces -> its program
  let using = null; // the program in use
  const maxRatio = opts.maxRatio || 2;
  // The one big triangle every picture is drawn on, for every program.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // The program for a look, which starts compiling the first time.
  function programFor(look) {
    const list = parts(look);
    const key = list.join(' ');
    if (!programs[key]) programs[key] = build(gl, list);
    return programs[key];
  }

  // Once compiled: checks the program and finds its uniforms.
  function finish(entry) {
    if (!gl.getProgramParameter(entry.program, gl.LINK_STATUS)) {
      if (window.console) {
        console.error('squishy: ' + (gl.getShaderInfoLog(entry.fragment) || gl.getShaderInfoLog(entry.vertex) ||
          gl.getProgramInfoLog(entry.program)));
      }
      entry.status = 'failed';
      return;
    }
    ['uRes', 'uView', 'uMore', 'uShape', 'uExtras', 'uGear'].forEach(function (name) {
      entry.u[name] = gl.getUniformLocation(entry.program, name);
    });
    COLORS.forEach(function (part) {
      entry.u[part] = gl.getUniformLocation(entry.program, 'u' + part.charAt(0).toUpperCase() + part.slice(1));
    });
    entry.status = 'ready';
  }

  // Checks on a program without waiting, where the browser compiles in the
  // background.
  function check(entry) {
    if (entry.status === 'compiling' && (!parallel ||
        gl.getProgramParameter(entry.program, parallel.COMPLETION_STATUS_KHR))) {
      finish(entry);
    }
    return entry.status;
  }

  function status(look) {
    return check(programFor(look));
  }

  function compiling() {
    return Object.keys(programs).some(function (key) {
      return check(programs[key]) === 'compiling';
    });
  }

  function draw(look, state) {
    const entry = programFor(look);
    if (entry.status === 'compiling') finish(entry); // waits for it
    if (entry.status !== 'ready') return;
    if (using !== entry) {
      gl.useProgram(entry.program);
      using = entry;
    }
    const u = entry.u;
    const ratio = Math.min(window.devicePixelRatio || 1, maxRatio);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.uRes, width, height);
    // The same zoom for every squishy, so smaller ones look smaller: as far
    // in as the biggest still fits, 3.7 units from the camera, at any turn,
    // squash, or stretch. That's 1.67 units either side and 1.69 above the
    // aim, which a full-size squishy with big flair (Dragon King's crown,
    // wings, and big tail) needs. Each squishy's size in items.js keeps it
    // inside that, checked by rendering every squishy at full squash and
    // stretch, every 6° of turn.
    gl.uniform4f(u.uView, Math.min(3.7 / 1.69, (3.7 * width) / height / 1.67),
      (state && state.angle) || 0, (state && state.squish) || 0, flag(look.egg));
    gl.uniform4f(u.uMore, (state && state.tilt) || 0, flag(look.heads === 2), flag(look.fluffyTail),
      look.serpent ? 1 : look.chubby ? 2 : look.cube ? 3 : look.sphere ? 4 : look.heart ? 5 : 0);
    gl.uniform4f(u.uShape, look.size || 1, look.wings || 1, look.tail || 1, flag(look.tailTip));
    gl.uniform4f(u.uExtras, flag(look.spikes), flag(look.crown), flag(look.stars), flag(look.bowtie));
    gl.uniform4f(u.uGear, look.glasses === 'sun' ? 2 : flag(look.glasses), flag(look.headphones),
      flag(look.hat), flag(look.halo));
    COLORS.forEach(function (part) {
      const c = rgb(look[part]);
      gl.uniform3f(u[part], c[0], c[1], c[2]);
    });
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { canvas: canvas, draw: draw, status: status, compiling: compiling, background: !!parallel };
}
