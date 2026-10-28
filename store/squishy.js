// Squishy plush dragons in real 3D, drawn with WebGL and no library. Each
// dragon is a few soft shapes (a round body, stubby feet, a tail, horns,
// wings, and maybe spikes or a crown) melted together with signed distance
// functions and ray-marched in a fragment shader, then lit like soft fabric.
// The face and belly are painted on by position, so they turn with the body.
//
//   import { createSquishy } from './squishy.js?v=0.7.2';
//   const view = createSquishy(canvas, { maxRatio: 1.25 }); // null without WebGL
//   view.draw(look, { angle: 0.4, squish: 0 });
//
// A look is colors (hex strings: body, belly, horn, wing, cheek, spike, eye)
// and features (spikes, crown, stars: true or false). angle turns the dragon
// (radians); squish squashes it toward the floor (up to about 1) or
// stretches it up (negative, down to about -0.6). The picture fills the canvas's on-screen size, at up to
// maxRatio pixels per CSS pixel (default 2), and the dragon is zoomed to be
// as big as fits.

const VERTEX = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';

const FRAGMENT = [
  'precision highp float;',
  'uniform vec2 uRes;',
  'uniform float uFocal, uAngle, uSquish, uSpikes, uCrown, uStars;',
  'uniform vec3 uBody, uBelly, uHorn, uWing, uCheek, uSpike, uEye;',
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

  'float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }',

  'float smin(float a, float b, float k) {',
  '  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);',
  '  return mix(b, a, h) - k * h * (1.0 - h);',
  '}',

  // Melts a part into the shape so far; the closer one gives the material.
  'vec2 add(vec2 a, float d, float m, float k) { return vec2(smin(a.x, d, k), d < a.x ? m : a.y); }',

  // From the world into the dragon's own space: turned, then squashed toward
  // the floor and bulged out (or stretched up for a negative squish).
  'vec3 local(vec3 p) {',
  '  p.xz = rot(uAngle) * p.xz;',
  '  p.y = (p.y - FLOOR) / (1.0 - 0.3 * uSquish) + FLOOR;',
  '  p.xz /= 1.0 + 0.18 * uSquish;',
  '  return p;',
  '}',

  // Distance to the dragon, and its material: 1 body, 2 horn, 3 wing, 4 spike.
  'vec2 map(vec3 world) {',
  '  vec3 p = local(world);',
  '  vec3 q = vec3(abs(p.x), p.y, p.z);',
  '  float body = sdEllipsoid(p - vec3(0.0, -0.02, 0.0), vec3(1.0, 0.86, 0.84));',
  '  body = -smin(-body, p.y - FLOOR - 0.04, 0.1);',
  '  vec2 res = vec2(body, 1.0);',
  '  res.x = smin(res.x, sdEllipsoid(q - vec3(0.42, -0.72, 0.42), vec3(0.22, 0.13, 0.2)), 0.08);',
  '  res.x = smin(res.x, sdRoundCone(p, vec3(0.0, -0.5, -0.66), vec3(0.0, -0.3, -1.1), 0.18, 0.06), 0.1);',
  '  res = add(res, sdRoundCone(q, vec3(0.34, 0.6, -0.02), vec3(0.5, 1.02, -0.1), 0.14, 0.05), 2.0, 0.05);',
  '  vec3 w = q - vec3(0.74, 0.2, -0.44);',
  '  w.xy = rot(-0.5) * w.xy;',
  '  w.xz = rot(0.5) * w.xz;',
  '  res = add(res, sdEllipsoid(w, vec3(0.08, 0.34, 0.26)), 3.0, 0.06);',
  '  if (uSpikes > 0.5) {',
  '    for (int i = 0; i < 3; i++) {',
  '      float t = float(i);',
  '      vec3 a = vec3(0.0, 0.76 - 0.22 * t, -0.2 - 0.27 * t);',
  '      res = add(res, sdRoundCone(p, a, a + vec3(0.0, 0.2, -0.1), 0.1, 0.03), 4.0, 0.04);',
  '    }',
  '  }',
  '  if (uCrown > 0.5) {',
  '    res = add(res, sdTorus(p - vec3(0.0, 0.83, 0.02), vec2(0.27, 0.05)), 4.0, 0.02);',
  '    for (int i = 0; i < 5; i++) {',
  '      float a = 6.2832 * float(i) / 5.0;',
  '      vec3 c = vec3(0.27 * sin(a), 0.85, 0.02 + 0.27 * cos(a));',
  '      res = add(res, sdRoundCone(p, c, c + vec3(0.0, 0.2, 0.0), 0.06, 0.02), 4.0, 0.02);',
  '    }',
  '  }',
  // Squashing and stretching change distances; scale down to the smaller
  // factor so the march never steps past the surface.
  '  res.x *= min(1.0 - 0.3 * uSquish, 1.0 + 0.18 * uSquish);',
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

  // The colors on the surface: parts, then a belly and a face on the front.
  'vec3 paint(vec3 world, float m) {',
  '  if (m > 3.5) return uSpike;',
  '  if (m > 2.5) return uWing;',
  '  if (m > 1.5) return uHorn;',
  '  vec3 p = local(world);',
  '  vec3 col = uBody;',
  '  if (uStars > 0.5) {',
  '    vec3 f = fract(p * 5.0) - 0.5;',
  '    if (hash(floor(p * 5.0)) > 0.55 && length(f) < 0.17) col = vec3(1.0, 0.96, 0.75);',
  '  }',
  '  if (p.z > 0.15) {',
  '    vec2 f = p.xy;',
  '    vec2 e = vec2(abs(f.x), f.y);',
  '    if (length((f - vec2(0.0, -0.33)) / vec2(0.46, 0.31)) < 1.0) col = uBelly;',
  '    if (length((e - vec2(0.56, -0.1)) / vec2(0.12, 0.07)) < 1.0) col = uCheek;',
  '    if (length((e - vec2(0.31, 0.12)) / vec2(0.085, 0.115)) < 1.0) {',
  '      col = uEye;',
  '      if (length(e - vec2(0.29, 0.17)) < 0.035) col = vec3(1.0);',
  '    }',
  '    float arc = abs(length(f - vec2(0.0, 0.03)) - 0.12);',
  '    if (f.y < -0.03 && arc < 0.017) col = mix(uEye, uBody, 0.25);',
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
  '  vec3 rd = normalize(uv.x * uu + uv.y * vv + uFocal * ww);',
  // Only march rays that hit a sphere around the dragon.
  '  vec3 oc = ro - vec3(0.0, 0.05, -0.05);',
  '  float b = dot(oc, rd);',
  '  float disc = b * b - dot(oc, oc) + 1.6 * 1.6;',
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
  '      col *= 0.97 + 0.05 * hash(floor(p * 140.0));',
  '      gl_FragColor = vec4(col, 1.0);',
  '      return;',
  '    }',
  '  }',
  // The floor: a soft round shadow (premultiplied black).
  '  if (rd.y < 0.0) {',
  '    vec3 p = ro + rd * ((FLOOR - ro.y) / rd.y);',
  '    vec2 q = p.xz * vec2(1.0, 1.4) / (1.0 + 0.18 * uSquish);', // wider when squashed
  '    float a = 0.26 * (1.0 - smoothstep(0.3, 1.25, length(q)));',
  '    gl_FragColor = vec4(0.0, 0.0, 0.0, a);',
  '    return;',
  '  }',
  '  gl_FragColor = vec4(0.0);',
  '}',
].join('\n');

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
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
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
  const names = ['uRes', 'uFocal', 'uAngle', 'uSquish', 'uSpikes', 'uCrown', 'uStars', 'uBody', 'uBelly',
    'uHorn', 'uWing', 'uCheek', 'uSpike', 'uEye'];
  const u = {};
  names.forEach(function (name) {
    u[name] = gl.getUniformLocation(program, name);
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
    // Zoom in as far as the dragon still fits, 3.7 units from the camera,
    // at any turn, squash, or stretch: 1.48 units either side (the tail
    // pointing sideways and a little forward in a full squash) and 1.52 above
    // the aim (a horn turned toward the camera in a full stretch). Checked by
    // rendering every squishy at full squash and stretch, every 3° of turn.
    gl.uniform1f(u.uFocal, Math.min(3.7 / 1.52, (3.7 * width) / height / 1.48));
    gl.uniform1f(u.uAngle, (state && state.angle) || 0);
    gl.uniform1f(u.uSquish, (state && state.squish) || 0);
    gl.uniform1f(u.uSpikes, look.spikes ? 1 : 0);
    gl.uniform1f(u.uCrown, look.crown ? 1 : 0);
    gl.uniform1f(u.uStars, look.stars ? 1 : 0);
    ['body', 'belly', 'horn', 'wing', 'cheek', 'spike', 'eye'].forEach(function (part) {
      const c = rgb(look[part]);
      gl.uniform3f(u['u' + part.charAt(0).toUpperCase() + part.slice(1)], c[0], c[1], c[2]);
    });
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { canvas: canvas, draw: draw };
}
