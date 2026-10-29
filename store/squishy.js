// Squishy plush dragons in real 3D, drawn with WebGL and no library. Each
// dragon is a few soft shapes (a round body, stubby feet, a tail, horns,
// wings, and maybe spikes, a crown, or other flair) melted together with
// signed distance functions and ray-marched in a fragment shader, then lit
// like soft fabric. The face and belly are painted on by position, so they
// turn with the body.
//
//   import { createSquishy } from './squishy.js?v=0.7.9';
//   const view = createSquishy(canvas, { maxRatio: 1.25 }); // null without WebGL
//   view.draw(look, { angle: 0.4, squish: 0 });
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
//   heads       2 for two heads up on long, skinny necks, each with a face
//               and horns. Spikes, crown, glasses, headphones, hat, and halo
//               are placed for one head.
//   egg         draws a mystery egg instead of a dragon, at the look's size:
//               body color, spots in the belly, wing, and spike colors (gold
//               stars if stars), and a big question mark in the eye color.
//               With glasses, it wears them instead of the question mark.
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
  'uniform vec4 uMore;', // tilt, two heads, and two to spare
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

  // A two-headed dragon's head on this side (q is the dragon's space with x
  // made positive), in the head's own space: centered, turned a little away
  // from the other head, and tipped out.
  'vec3 headSpace(vec3 q) {',
  '  vec3 h = q - vec3(0.57, 1.02, 0.24);',
  '  h.xz = rot(0.35) * h.xz;',
  '  h.xy = rot(0.12) * h.xy;',
  '  return h;',
  '}',

  // Distance to the dragon, and its material: 1 body, 2 horn, 3 wing, 4 spike,
  // 5 acc, 6 acc2, 7 halo, 8 striped hat, 9 white pom-pom, 10 egg.
  'vec2 map(vec3 world) {',
  '  vec3 p = local(world);',
  // The mystery egg: rounder and wider at the bottom, resting on the floor.
  // Its taper bends distances a little, so they're scaled down to be safe.
  '  if (EGG > 0.5) {',
  '    float y = p.y + 0.06;',
  '    float k = 1.0 - 0.14 * clamp(y / 0.8, -1.0, 1.0);',
  '    vec2 egg = vec2(0.8 * sdEllipsoid(vec3(p.x / k, y, p.z / k), vec3(0.64, 0.8, 0.64)), 10.0);',
  // Glasses on an egg, fitted to its curve: each lens faces out from the
  // egg's face, leaning back with it, and the arms wrap back to its sides.
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
  '    egg.x *= SIZE * min(1.0 - 0.3 * SQUISH, 1.0 + 0.18 * SQUISH);',
  '    return egg;',
  '  }',
  '  vec3 q = vec3(abs(p.x), p.y, p.z);',
  // With one head, the round body is the head. Two heads sit up on long,
  // skinny necks from a lower body, each with its own little horns.
  '  float body = TWO_HEADS > 0.5 ? sdEllipsoid(p - vec3(0.0, -0.22, 0.0), vec3(0.96, 0.66, 0.8)) :',
  '    sdEllipsoid(p - vec3(0.0, -0.02, 0.0), vec3(1.0, 0.86, 0.84));',
  '  body = -smin(-body, p.y - FLOOR - 0.04, 0.1);',
  '  vec2 res = vec2(body, 1.0);',
  '  if (TWO_HEADS > 0.5) {',
  '    res.x = smin(res.x, sdRoundCone(q, vec3(0.24, 0.25, 0.04), vec3(0.53, 0.86, 0.2), 0.13, 0.08), 0.12);',
  '    vec3 h = headSpace(q);',
  '    res.x = smin(res.x, sdEllipsoid(h, vec3(0.39, 0.35, 0.35)), 0.06);',
  '    vec3 hq = vec3(abs(h.x), h.y, h.z);',
  '    res = add(res, sdRoundCone(hq, vec3(0.11, 0.22, -0.02), vec3(0.16, 0.39, -0.05), 0.055, 0.022), 2.0, 0.03);',
  '  } else {',
  '    res = add(res, sdRoundCone(q, vec3(0.34, 0.6, -0.02), vec3(0.5, 1.02, -0.1), 0.14, 0.05), 2.0, 0.05);',
  '  }',
  '  res.x = smin(res.x, sdEllipsoid(q - vec3(0.42, -0.72, 0.42), vec3(0.22, 0.13, 0.2)), 0.08);',
  // The tail: a big one is longer and thicker, curving up behind (which also
  // keeps it inside the view), maybe with a ball on the tip.
  '  vec3 tip = vec3(0.0, -0.5, -0.66) + vec3(0.0, 0.2 + 0.6 * (TAIL - 1.0), -0.44 - 0.1 * (TAIL - 1.0));',
  '  res.x = smin(res.x, sdRoundCone(p, vec3(0.0, -0.5, -0.66), tip, 0.18 * min(TAIL, 1.3), 0.06 * TAIL), 0.1);',
  '  if (TAIL_TIP > 0.5) res = add(res, length(p - tip) - 0.11 * TAIL, 6.0, 0.04);',
  // Wings: bigger ones reach further up and out.
  '  float big = WINGS - 1.0;',
  '  vec3 w = q - vec3(0.74 + 0.24 * big, 0.2 + 0.24 * big - 0.18 * TWO_HEADS, -0.44 - 0.08 * big);',
  '  w.xy = rot(-0.5 - 0.15 * big) * w.xy;',
  '  w.xz = rot(0.5) * w.xz;',
  '  res = add(res, sdEllipsoid(w, vec3(0.08 + 0.03 * big, 0.34 * WINGS, 0.26 * WINGS)), 3.0, 0.06);',
  '  if (SPIKES > 0.5) {',
  '    for (int i = 0; i < 3; i++) {',
  '      float t = float(i);',
  '      vec3 a = vec3(0.0, 0.76 - 0.22 * t, -0.2 - 0.27 * t);',
  '      res = add(res, sdRoundCone(p, a, a + vec3(0.0, 0.2, -0.1), 0.1, 0.03), 4.0, 0.04);',
  '    }',
  '  }',
  '  if (CROWN > 0.5) {',
  '    res = add(res, sdTorus(p - vec3(0.0, 0.83, 0.02), vec2(0.27, 0.05)), 4.0, 0.02);',
  '    for (int i = 0; i < 5; i++) {',
  '      float a = 6.2832 * float(i) / 5.0;',
  '      vec3 c = vec3(0.27 * sin(a), 0.85, 0.02 + 0.27 * cos(a));',
  '      res = add(res, sdRoundCone(p, c, c + vec3(0.0, 0.2, 0.0), 0.06, 0.02), 4.0, 0.02);',
  '    }',
  '  }',
  // Glasses: rings over the painted eyes, turned to follow the round head,
  // with a bridge and arms that run back along the head. Away from the face,
  // a sphere around them stands in (it's never farther than they are), which
  // saves work on slower iPads.
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
  // Headphones: a band over the top, in front of the horns, and two cups.
  '  if (HEADPHONES > 0.5) {',
  '    vec3 h = p - vec3(0.0, -0.12, 0.15);',
  '    res = add(res, max(sdTorus(h.xzy, vec2(1.005, 0.05)), -0.02 - p.y), 5.0, 0.02);',
  '    res = add(res, sdEllipsoid(q - vec3(1.0, -0.02, 0.15), vec3(0.11, 0.21, 0.21)), 6.0, 0.03);',
  '  }',
  // A party hat between the horns, tipped a little, with a pom-pom.
  '  if (HAT > 0.5) {',
  '    res = add(res, sdRoundCone(p, vec3(0.0, 0.75, 0.03), vec3(0.11, 1.33, 0.05), 0.26, 0.022), 8.0, 0.03);',
  '    res = add(res, length(p - vec3(0.12, 1.37, 0.05)) - 0.09, 9.0, 0.02);',
  '  }',
  '  if (HALO > 0.5) {',
  '    vec3 hl = p - vec3(0.0, 1.17, -0.05);',
  '    hl.yz = rot(0.22) * hl.yz;',
  '    res = add(res, sdTorus(hl, vec2(0.3, 0.035)), 7.0, 0.01);',
  '  }',
  '  if (BOWTIE > 0.5) {',
  '    res = add(res, sdEllipsoid(q - vec3(0.1, -0.17, 0.84), vec3(0.1, 0.065, 0.045)), 6.0, 0.02);',
  '    res = add(res, length(p - vec3(0.0, -0.17, 0.865)) - 0.042, 6.0, 0.02);',
  '  }',
  // Squashing, stretching, and size change distances; scale down to the
  // smallest factor so the march never steps past the surface.
  '  res.x *= SIZE * min(1.0 - 0.3 * SQUISH, 1.0 + 0.18 * SQUISH);',
  '  return res;',
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

  // The egg: in the squishy's colors, with a big question mark on the front
  // (unless it wears glasses).
  'vec3 eggPaint(vec3 p) {',
  '  vec3 col = uBody;',
  '  if (STARS > 0.5) {',
  '    vec3 s = fract(p * 5.0) - 0.5;',
  '    if (hash(floor(p * 5.0)) > 0.5 && length(s) < 0.22) col = vec3(1.0, 0.96, 0.75);',
  '  } else {',
  '    vec3 f = fract(p * 3.2) - 0.5;',
  '    float h = hash(floor(p * 3.2));',
  '    if (length(f) < 0.26) col = h > 0.66 ? uBelly : (h > 0.33 ? uWing : uSpike);',
  '  }',
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
  '  return col;',
  '}',

  // A face, at the size of a one-headed dragon's: cheeks, eyes with a shine,
  // and a smile.
  'vec3 face(vec2 f, vec3 col) {',
  '  vec2 e = vec2(abs(f.x), f.y);',
  '  if (length((e - vec2(0.56, -0.1)) / vec2(0.12, 0.07)) < 1.0) col = uCheek;',
  '  if (length((e - vec2(0.31, 0.12)) / vec2(0.085, 0.115)) < 1.0) {',
  '    col = uEye;',
  '    if (length(e - vec2(0.29, 0.17)) < 0.035) col = vec3(1.0);',
  '  }',
  '  float arc = abs(length(f - vec2(0.0, 0.03)) - 0.12);',
  '  if (f.y < -0.03 && arc < 0.017) col = mix(uEye, uBody, 0.25);',
  '  return col;',
  '}',

  // The colors on the surface: parts, then a belly and a face on the front.
  'vec3 paint(vec3 world, float m) {',
  '  if (m > 9.5) return eggPaint(local(world));',
  '  if (m > 8.5) return vec3(1.0, 0.98, 0.95);',
  '  if (m > 7.5) {',
  '    vec3 p = local(world);',
  '    float s = dot(p - vec3(0.0, 0.75, 0.03), vec3(0.186, 0.982, 0.034));', // along the hat
  '    return mod(floor(s * 11.5), 2.0) < 1.0 ? uAcc : uAcc2;',
  '  }',
  '  if (m > 6.5) return uAcc;',
  '  if (m > 5.5) return uAcc2;',
  '  if (m > 4.5) return uAcc;',
  '  if (m > 3.5) return uSpike;',
  '  if (m > 2.5) return uWing;',
  '  if (m > 1.5) return uHorn;',
  '  vec3 p = local(world);',
  '  vec3 col = uBody;',
  '  if (STARS > 0.5) {',
  '    vec3 f = fract(p * 5.0) - 0.5;',
  '    if (hash(floor(p * 5.0)) > 0.55 && length(f) < 0.17) col = vec3(1.0, 0.96, 0.75);',
  '  }',
  '  if (TWO_HEADS > 0.5) {',
  '    if (p.z > 0.15 && length((p.xy - vec2(0.0, -0.4)) / vec2(0.44, 0.27)) < 1.0) col = uBelly;',
  '    vec3 h = headSpace(vec3(abs(p.x), p.y, p.z));',
  '    if (h.z > 0.1) col = face(h.xy / 0.47, col);',
  '  } else if (p.z > 0.15) {',
  '    if (length((p.xy - vec2(0.0, -0.33)) / vec2(0.46, 0.31)) < 1.0) col = uBelly;',
  '    col = face(p.xy, col);',
  '  }',
  '  return col;',
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
  '    vec2 q = p.xz * vec2(1.0, 1.4) / ((1.0 + 0.18 * SQUISH) * SIZE * (EGG > 0.5 ? 0.62 : 1.0));',
  '    float a = 0.26 * (1.0 - smoothstep(0.3, 1.25, length(q)));',
  '    gl_FragColor = vec4(0.0, 0.0, 0.0, a);',
  '    return;',
  '  }',
  '  gl_FragColor = vec4(0.0);',
  '}',
].join('\n');

const COLORS = ['body', 'belly', 'horn', 'wing', 'cheek', 'spike', 'eye', 'acc', 'acc2'];

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
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
  const program = gl.createProgram();
  try {
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (e) {
    if (window.console) console.error('squishy: ' + e.message);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  ['uRes', 'uView', 'uMore', 'uShape', 'uExtras', 'uGear'].forEach(function (name) {
    u[name] = gl.getUniformLocation(program, name);
  });
  COLORS.forEach(function (part) {
    u[part] = gl.getUniformLocation(program, 'u' + part.charAt(0).toUpperCase() + part.slice(1));
  });
  const maxRatio = opts.maxRatio || 2;

  function draw(look, state) {
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
    gl.uniform4f(u.uMore, (state && state.tilt) || 0, flag(look.heads === 2), 0, 0);
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

  return { canvas: canvas, draw: draw };
}
