// Drawing: the hole as the server describes it, the balls and the aiming arrow. The course is built
// straight from the colliders and zones (toon shading, ink outlines, small patterns drawn here so that
// every material and modifier can be told apart); the props that show what a modifier does, the pin,
// the tee and the decor around the course are modelled in Blender (tools/models/kit.py).
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { mergeVertices, mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { SOLID, HOLED } from './net.js';
import { t } from './i18n.js';

const BOX = 0, FLOOR = 0, WALL = 1; // shape and kind of a collider, as in internal/physics/hole.go
// ---------------------------------------------------------------------------- look
// Stickers in relief: toon shading in three flat tones, ink outlines, the course floating over a sea
// of clouds. The colours are all here; the props (below) and the course take theirs from PALETTE.
const PALETTE = {
  ink: 0x17332b, cream: 0xfff7e6, sand: 0xe8d5ac, red: 0xe63946, sun: 0xffd23f, mint: 0xb9efc9, pink: 0xff5d8f, orange: 0xff8a1f,
  violet: 0x8b5cf6, violet2: 0x5b3fd6, leaf: 0x38aa6c, leaf2: 0x2f9e63, wood: 0xb07a4f, steel: 0x8e9aa8, dark: 0x2b3a36,
  white: 0xffffff, cloud: 0xffffff, tint: 0xffffff, stone: 0xa9b4c2, earth: 0xb07a4f, earth2: 0x8a5a3c, gold: 0xffc93c, water: 0x3db8e8,
  grass: 0x6fd36a, lip: 0x3fae5a, post: 0xfff7e6, sky: 0x5cc4e8, horizon: 0xfff2d6, below: 0x8fd0e8,
};
// toon shading: three flat tones (shade, middle, light); pale things get a softer ramp, or their
// shade turns to dirty grey
const ramp = values => {
  const t = new THREE.DataTexture(new Uint8Array(values), values.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
};
const tones = ramp([130, 200, 255]), softTones = ramp([205, 235, 255]);
const PALE = new Set([PALETTE.cream, PALETTE.white, PALETTE.sand]);
const toon = (color, more) => new THREE.MeshToonMaterial({ color, gradientMap: PALE.has(color) ? softTones : tones, ...more });
const INK_MAT = new THREE.MeshBasicMaterial({ color: PALETTE.ink });
const HULL_MAT = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide }); // an outline around a plain shape
const HULL = 0.035; // how far an outline stands out of its shape
// grass: mowed in diagonal bands, crossed more faintly, in course units, whatever floor it is on
const grass = new THREE.MeshToonMaterial({ color: PALETTE.grass, gradientMap: (() => { const t = ramp([120, 150, 178, 204, 226, 244, 255]); t.minFilter = t.magFilter = THREE.LinearFilter; return t; })() }); // shaded softly: a slope shows by its light
// Grass: mown in broad bands along the hole (tee to cup), with a soft unevenness, and lighter the
// higher it is on the hole: a slope reads as a change of shade, a hollow as a darker green (GRASS:
// set for each hole, see setHole).
const GRASS = { along: { value: new THREE.Vector2(0, -1) }, low: { value: 0 }, high: { value: 1 } };
grass.onBeforeCompile = s => {
  Object.assign(s.uniforms, { mowAlong: GRASS.along, mowLow: GRASS.low, mowHigh: GRASS.high });
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMow;\nvarying vec3 vUp;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvMow = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUp = normalize(mat3(modelMatrix) * objectNormal);');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMow;
varying vec3 vUp;
uniform vec2 mowAlong; uniform float mowLow, mowHigh;
float mowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mowNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mowHash(i), mowHash(i + vec2(1.0, 0.0)), f.x), mix(mowHash(i + vec2(0.0, 1.0)), mowHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
float across = dot(vMow.xz, vec2(-mowAlong.y, mowAlong.x)) / 1.6;
float band = smoothstep(0.45, 0.55, abs(fract(across) - 0.5) * 2.0); // broad bands, soft edged
float rise = clamp((vMow.y - mowLow) / (mowHigh - mowLow), 0.0, 1.0);
float patchy = mowNoise(vMow.xz * 0.18) * 0.6 + mowNoise(vMow.xz * 0.7) * 0.4;
diffuseColor.rgb *= (0.955 + 0.06 * band) * (0.96 + 0.08 * patchy);
diffuseColor.rgb *= mix(vec3(0.76, 0.83, 0.79), vec3(1.0, 1.0, 0.93), smoothstep(0.0, 1.0, rise)); // low: deeper and cooler; high: sunlit
// a slope turned to the sun is lit, one turned away in its shade: much more than the light alone would
// (the sun comes from -x, +z, see View)
float facing = vUp.y > 0.2 ? dot(vUp.xz, normalize(vec2(-0.5, 0.4))) : 0.0;
diffuseColor.rgb *= clamp(1.0 + 1.1 * facing, 0.7, 1.12);`);
};
const MAT = {
  floor: grass, side: toon(PALETTE.lip), wall: toon(PALETTE.cream), wallSide: toon(PALETTE.sand), post: toon(PALETTE.post),
  earth: toon(PALETTE.earth), rock: toon(PALETTE.earth2), dark: toon(PALETTE.dark), pad: toon(0x2ec4b6),
  cup: toon(0x1b1b1b), inside: toon(0x1b1b1b, { side: THREE.BackSide }), below: new THREE.MeshBasicMaterial({ color: PALETTE.below }),
};
// the faces of a box, in the order of THREE.BoxGeometry (+x, -x, +y, -y, +z, -z): a floor shows its
// surface on top and a lip of grass on its sides; a wall is cream on top, sand on its sides
const flat = geometry => geometry.rotateX(-Math.PI / 2); // from facing the viewer to lying on the ground
const floorFaces = (top, lip = MAT.side) => [lip, lip, top, lip, lip, lip];
const wallFaces = [MAT.wallSide, MAT.wallSide, MAT.wall, MAT.wall, MAT.wallSide, MAT.wallSide];

// ---------------------------------------------------------------------------- props
// The props are modelled in Blender (tools/models/kit.py) and come in one file. Each face names its
// colour, a key of PALETTE; "ink" is the outline, a shell around the prop seen from inside.
const PROP_MAT = Object.fromEntries(Object.entries(PALETTE).map(([k, c]) => [k, k === 'ink' ? INK_MAT : toon(c)]));
const KIT = {}; // prop name -> its object, to clone
for (const o of (await new GLTFLoader().loadAsync(new URL('./models/kit.glb', import.meta.url).href)).scene.children) {
  o.traverse(m => {
    if (!m.isMesh) return;
    if (!PROP_MAT[m.material.name]) throw new Error(`kit.glb: ${o.name} has a colour PALETTE does not know: ${m.material.name}`);
    m.material = PROP_MAT[m.material.name];
  });
  o.traverse(m => { if (m.userData.ink) m.add(inkShell(m, m.userData.ink)); });
  o.traverse(m => { if (m.isMesh) m.userData.kit = true; });
  KIT[o.name] = o;
}

// inkShell is the outline of an object of the kit (its own meshes, not those of the objects under
// it, which have theirs): a copy pushed out by t along its normals, its faces turned inwards, so
// that only its far side shows, around the silhouette. The normal of a point is the average of the
// faces around it, wherever the mesh is split there: the shell stays closed at sharp edges.
function inkShell(object, t) {
  const meshes = [object, ...object.children].filter(m => m.isMesh && (m === object || m.userData.ink === undefined));
  const points = new Map(), at = [], normals = [], tris = []; // a point per place
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const m of meshes) {
    const local = m === object ? new THREE.Matrix4() : m.matrix, p = m.geometry.attributes.position, index = m.geometry.index;
    const ids = Array.from({ length: p.count }, (_, i) => {
      v.fromBufferAttribute(p, i).applyMatrix4(local);
      const key = `${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}`;
      if (!points.has(key)) { points.set(key, at.length / 3); at.push(v.x, v.y, v.z); normals.push(0, 0, 0); }
      return points.get(key);
    });
    const n = index ? index.count : p.count;
    for (let i = 0; i < n; i += 3) {
      const [i0, i1, i2] = [0, 1, 2].map(k => ids[index ? index.getX(i + k) : i + k]);
      a.fromArray(at, i0 * 3); b.fromArray(at, i1 * 3); c.fromArray(at, i2 * 3);
      const face = b.sub(a).cross(c.sub(a)); // its length: twice its area
      for (const j of [i0, i1, i2]) { normals[j * 3] += face.x; normals[j * 3 + 1] += face.y; normals[j * 3 + 2] += face.z; }
      tris.push(i0, i2, i1);
    }
  }
  for (let j = 0; j < at.length; j += 3) {
    v.fromArray(normals, j).normalize();
    at[j] += v.x * t; at[j + 1] += v.y * t; at[j + 2] += v.z * t;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(at, 3));
  geometry.setIndex(tris);
  const shell = new THREE.Mesh(geometry, INK_MAT);
  shell.name = 'ink';
  return shell;
}
// the top of each prop over its origin, read from the models (what decor may reach depends on it)
const TOP = Object.fromEntries(Object.entries(KIT).map(([k, o]) => [k, new THREE.Box3().setFromObject(o).max.y]));
// what zones show that is not a prop: the dots of a launcher's arc, the streaks of a wind, the
// sparkles of a teleporter, a shadow under what floats
const DOT = new THREE.SphereGeometry(0.045, 10, 6), DOT_INK = new THREE.SphereGeometry(0.045 + 0.02, 10, 6);
const STREAK = new THREE.BoxGeometry(0.03, 0.03, 1), STREAK_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
const MOTE = new THREE.OctahedronGeometry(0.1);
const BEAM_MAT = new THREE.ShaderMaterial({ // light, fading as it rises
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { color: { value: new THREE.Color(0x9b6bff) } },
  vertexShader: 'varying float h; void main() { h = position.y / 1.8; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 color; varying float h; void main() { gl_FragColor = vec4(color, 0.42 * (1.0 - h) * (1.0 - h)); }',
});
const SPARK_MAT = new THREE.MeshBasicMaterial({ color: 0xe9ddff });
// the colours of the teleporters of a hole, in turn, so that a mouth and where it leads match:
// what is violet in the portal and its shards, the light, the sparkles
const PORTALS = [
  { swap: new Map(), beam: BEAM_MAT, spark: SPARK_MAT },
  ...[[0xff4dd2, 0xc3138e, 0xff75dd, 0xffe1f6], [0x4f6bff, 0x2f43c9, 0x7b93ff, 0xdfe5ff]].map(([ring, arm, light, spark]) => {
    const beam = BEAM_MAT.clone();
    beam.uniforms.color.value = new THREE.Color(light);
    return { swap: new Map([[PROP_MAT.violet, toon(ring)], [PROP_MAT.violet2, toon(arm)]]), beam, spark: new THREE.MeshBasicMaterial({ color: spark }) };
  }),
];
const recolor = (o, swap) => { o.traverse(m => { if (swap.has(m.material)) m.material = swap.get(m.material); }); return o; };
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x17332b, transparent: true, opacity: 0.2, depthWrite: false });
// prop gives a copy of a prop (it shares geometry and materials with the others); its faces of
// colour "tint", if any, in the colour given
const tints = new Map();
const prop = (name, tint) => {
  const o = KIT[name].clone();
  if (tint !== undefined) {
    if (!tints.has(tint)) tints.set(tint, toon(tint));
    o.traverse(m => { if (m.material === PROP_MAT.tint) m.material = tints.get(tint); });
  }
  return o;
};
const TAU = Math.PI * 2;
const COIL_H = 0.14; // the coil under a jump pad, as modelled
const ARROW_STEPS = 24;  // points of the ribbon the aiming arrow is laid along the ground with
const ARROW_SLOPE = 1;   // the steepest slope it follows (rise over run); a steeper drop or step, it stays level
const ARROW_LIFT = 0.03; // over the ground
const ARROW_HEAD = 0.55; // length of its head
const INK = 0x17332b;    // the outlines, as in web/style.css
const DOWN = new THREE.Vector3(0, -1, 0), UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------- surfaces
// A surface is a 256 px tile drawn once in the browser, repeated every TILE units of the course. No
// words and no signs: what a material or a zone does has to show in how it looks.
const TILE = 1;
const tiles = new Map();
function tile(name, draw) {
  if (!tiles.has(name)) {
    const canvas = document.createElement('canvas'), n = canvas.width = canvas.height = 256, g = canvas.getContext('2d');
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // the same tile every time
    // spread draws a shape at x, y and wherever it crosses the edge of the tile, so that it repeats
    const spread = (x, y, r, shape) => { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) if (Math.abs(x + dx - n / 2) < n / 2 + r && Math.abs(y + dy - n / 2) < n / 2 + r) shape(x + dx, y + dy); };
    draw(g, n, rand, spread);
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    tiles.set(name, t);
  }
  return tiles.get(name);
}
const fill = (g, n, color) => { g.fillStyle = color; g.fillRect(0, 0, n, n); };
const blob = (g, x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
// the tiles; the top of the canvas is the way a directed zone points
const LOOK = {
  // the surfaces, flat and bold like the rest: two or three tones, big round shapes, no noise
  // ice: pale blue, broad soft shines across it, a few fine cracks
  ice: () => tile('ice', (g, n, rand) => {
    fill(g, n, '#cdeef9');
    g.lineCap = 'round';
    for (const [x0, w, a] of [[0.12, 70, 0.32], [0.5, 30, 0.22], [0.78, 12, 0.45]]) {
      g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w;
      for (const dx of [-n, 0, n]) { g.beginPath(); g.moveTo(n * x0 + dx - n * 0.3, n); g.lineTo(n * x0 + dx + n * 0.3, 0); g.stroke(); }
    }
    g.strokeStyle = 'rgba(110,180,212,0.5)'; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      let x = 50 + rand() * (n - 100), y = 50 + rand() * (n - 100);
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 3; j++) { x += (rand() - 0.5) * 40; y += (rand() - 0.5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
  }),
  // sand: yellow, big soft dots, a few pale ones
  sand: () => tile('sand', (g, n, rand, spread) => {
    fill(g, n, '#f7d68c');
    for (let i = 0; i < 10; i++) { const r = 7 + rand() * 7; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, '#e6b863')); }
    for (let i = 0; i < 6; i++) { const r = 5 + rand() * 4; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, '#fff0c4')); }
  }),
  // water: deep blue, pale wave marks (it runs)
  water: () => tile('water', (g, n) => {
    fill(g, n, '#1f7fc9');
    g.strokeStyle = '#8fd6f5'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.5], [0.25, 0.75], [-0.25, 0.5], [0.75, 0]]) {
      g.beginPath();
      for (let k = 0; k <= 16; k++) { const s = k / 16; g.lineTo(n * (x - 0.15 + s * 0.3), n * y + Math.sin(s * TAU) * 9); }
      g.stroke();
    }
  }),
  // where a pickup lies: a burst of rays in its colour, drawn whole over the zone
  burst: color => tile('burst ' + color, (g, n) => {
    const c = new THREE.Color(color), light = '#' + c.clone().lerp(new THREE.Color(0xffffff), 0.55).getHexString();
    fill(g, n, light);
    g.fillStyle = color;
    for (let i = 0; i < 12; i += 2) { g.beginPath(); g.moveTo(n / 2, n / 2); g.arc(n / 2, n / 2, n, TAU * i / 12, TAU * (i + 1) / 12); g.fill(); }
    blob(g, n / 2, n / 2, n * 0.18, light);
  }),
  // a stroke less, all over: gold coins on pale gold
  coins: () => tile('coins', (g, n) => {
    fill(g, n, '#ffe7a3');
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.75]]) { blob(g, n * x, n * y, n * 0.17, '#17332b'); blob(g, n * x, n * y, n * 0.15, '#ffc93c'); blob(g, n * x, n * y, n * 0.09, '#ffe28a'); }
  }),
  bumper: () => tile('bumper', (g, n) => { fill(g, n, '#ff5d8f'); g.fillStyle = '#fff7e6'; for (let i = -1; i < 2; i++) { g.beginPath(); g.moveTo(i * n, n); g.lineTo(i * n + n / 2, n); g.lineTo(i * n + n * 1.5, 0); g.lineTo(i * n + n, 0); g.fill(); } }),
  // what moves: sun yellow, thin ink stripes
  tape: () => tile('tape', (g, n) => { fill(g, n, '#ffd23f'); g.fillStyle = '#17332b'; for (let i = -1; i < 2; i++) { g.beginPath(); g.moveTo(i * n, n); g.lineTo(i * n + n / 4, n); g.lineTo(i * n + n * 1.25, 0); g.lineTo(i * n + n, 0); g.fill(); } }),
  post: () => tile('post', (g, n) => { fill(g, n, '#fff7e6'); g.fillStyle = '#e63946'; g.fillRect(0, n * 0.3, n, n * 0.4); }),
  gate: k => tile('gate ' + k, (g, n) => { fill(g, n, KEY_COLOR[k - 1]); g.fillStyle = '#17332b'; for (let i = -1; i < 2; i++) { g.beginPath(); g.moveTo(i * n, n); g.lineTo(i * n + n / 4, n); g.lineTo(i * n + n * 1.25, 0); g.lineTo(i * n + n, 0); g.fill(); } }),
  // a booster: big cream chevrons on orange, running the way it pushes
  booster: () => tile('booster', (g, n) => {
    fill(g, n, '#ff8a1f');
    for (const [c, w] of [['#17332b', 46], ['#fff7e6', 30]]) { g.strokeStyle = c; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); g.moveTo(n * 0.2, n * 0.75); g.lineTo(n / 2, n * 0.4); g.lineTo(n * 0.8, n * 0.75); g.stroke(); }
  }),
  // a conveyor belt: dark rubber, cream slats across, running the way it carries
  belt: () => tile('belt', (g, n) => { fill(g, n, '#2b3a36'); g.fillStyle = '#4a5a55'; g.fillRect(0, n * 0.1, n, n * 0.3); g.fillStyle = '#fff7e6'; g.fillRect(0, n * 0.5, n, n * 0.12); }),
  // a magnet's plate: steel with rings that run in (a magnet) or out (a repeller)
  rings: color => tile('rings ' + color, (g, n) => { fill(g, n, '#c3ccd6'); g.fillStyle = color; g.fillRect(0, n * 0.25, n, n * 0.5); g.fillStyle = '#17332b'; g.fillRect(0, n * 0.25, n, n * 0.06); }),
  checker: () => tile('checker', (g, n) => { fill(g, n, '#fff7e6'); g.fillStyle = '#17332b'; g.fillRect(0, 0, n / 2, n / 2); g.fillRect(n / 2, n / 2, n / 2, n / 2); }),
};

// patternUV gives a geometry texture coordinates in course units, so that a pattern keeps its
// size on any face: a face is mapped on the two axes it lies along. at is where the geometry is.
function patternUV(geometry, at) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + at[0], y = p.getY(i) + at[1], z = p.getZ(i) + at[2];
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > 0.5) uv.setXY(i, x / TILE, -z / TILE);
    else if (ax > 0.5) uv.setXY(i, -z / TILE, y / TILE);
    else uv.setXY(i, x / TILE, y / TILE);
  }
  return geometry;
}

// What the colliders are made of, as the maps name it (internal/physics/material.go). Grass, wall
// and post keep their plain colours.
const SURFACE = { ice: LOOK.ice, sand: LOOK.sand, bumper: LOOK.bumper };
// a post: cream, a red band round it, its top cream (the groups of THREE.CylinderGeometry: side, top, bottom)
const POST_FACES = [toon(0xffffff, { map: LOOK.post() }), MAT.wall, MAT.wall];
// the first two are the ones maps use, blue and vermilion: no other element is drawn in them, and both
// stand out on grass. From the third on, a key shares its colour with something else.
const KEY_COLOR = ['#3fa7ff', '#ff6b3f', '#8ac926', '#9b5de5', '#2ec4b6', '#f15bb5', '#adb5bd', '#ffc300'];
const surfaces = new Map();
function surface(c) {
  const name = c.key ? `key ${c.key}` : c.motion ? `moving ${c.material ?? ''}` : c.material;
  if (!name || name === 'grass' || name === 'wall' || name === 'post') return null;
  if (!surfaces.has(name)) {
    surfaces.set(name, c.key
      ? toon(0xffffff, { map: LOOK.gate(c.key), transparent: true, opacity: 0.85 }) // a gate, in the colour of its key
      : c.motion && !SURFACE[c.material]
        ? toon(0xffffff, { map: LOOK.tape() }) // what moves stands out
        : toon(0xffffff, { map: SURFACE[c.material]?.() ?? LOOK.tape() }));
  }
  return surfaces.get(name);
}

// ---------------------------------------------------------------------------- themes
// The look a hole is dressed in (its "theme", docs/themes.md): the sky, the sea under it, the ground
// it stands on, the grass, its plain walls and posts (their sides, their tops and what crowns them),
// and the decor around it. What plays keeps its colours everywhere; nothing here changes the game.
const lum = c => { const k = new THREE.Color(c); return 0.2126 * k.r + 0.7152 * k.g + 0.0722 * k.b; };
const themeToon = (color, more) => new THREE.MeshToonMaterial({ color, gradientMap: lum(color) > 0.45 ? softTones : tones, ...more }); // pale: a soft shade
// the sides of the walls: tiles of 1 unit, seamless both ways (their UVs are in course units)
const SIDE = {
  ribs: (base, rib) => tile('ribs ' + base, (g, n) => { fill(g, n, base); g.fillStyle = rib; for (let i = 0; i < 4; i++) g.fillRect(i * n / 4 + n / 8 - 5, 0, 10, n); }),
  logs: (base, joint, light) => tile('logs ' + base, (g, n) => {
    fill(g, n, base);
    for (let i = 0; i < 4; i++) { const y = i * n / 4; g.fillStyle = light; g.fillRect(0, y + 12, n, 14); g.fillStyle = joint; g.fillRect(0, y, n, 7); }
  }),
  planks: (base, joint, nail) => tile('planks ' + base, (g, n) => {
    fill(g, n, base);
    for (let i = 0; i < 4; i++) { const x = i * n / 4; g.fillStyle = joint; g.fillRect(x, 0, 6, n); for (const y of [0.22, 0.72]) blob(g, x + n / 8 + 3, y * n, 6, nail); }
  }),
  strata: (base, light, dark) => tile('strata ' + base, (g, n) => {
    fill(g, n, base);
    for (const [y0, w, c] of [[0.12, 26, light], [0.46, 14, dark], [0.68, 34, light], [0.9, 10, dark]]) {
      g.fillStyle = c; g.beginPath(); g.moveTo(0, n * y0);
      for (let k = 0; k <= 32; k++) g.lineTo(k * n / 32, n * y0 + Math.sin(k / 32 * TAU * 2) * 5);
      for (let k = 32; k >= 0; k--) g.lineTo(k * n / 32, n * y0 + w + Math.sin(k / 32 * TAU * 2 + 1) * 4);
      g.fill();
    }
  }),
  stone: (joint, base, light, dark) => tile('stone ' + base, (g, n, rand) => { // 0.5 x 0.25, in a running bond
    fill(g, n, joint);
    for (let row = 0; row < 4; row++) for (let k = -1; k < 2; k++) {
      const x = k * n / 2 + (row % 2) * n / 4, y = row * n / 4, c = [base, base, light, dark][Math.floor(rand() * 4)];
      g.fillStyle = c; g.fillRect(x + 4, y + 4, n / 2 - 8, n / 4 - 8);
    }
  }),
  leaves: (base, mid, light) => tile('leaves ' + base, (g, n, rand, spread) => {
    fill(g, n, base);
    for (let i = 0; i < 26; i++) { const r = 15 + rand() * 11; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, mid)); }
    for (let i = 0; i < 14; i++) { const r = 10 + rand() * 8; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, light)); }
  }),
  brick: (joint, base, a, b) => tile('brick ' + base, (g, n, rand) => { // 0.25 x 0.125
    fill(g, n, joint);
    for (let row = 0; row < 8; row++) for (let k = -1; k < 5; k++) {
      const x = k * n / 4 + (row % 2) * n / 8, y = row * n / 8;
      g.fillStyle = [base, base, a, b][Math.floor(rand() * 4)]; g.fillRect(x + 3, y + 3, n / 4 - 6, n / 8 - 6);
    }
  }),
  post: (base, band) => tile('post ' + base + band, (g, n) => { fill(g, n, base); g.fillStyle = band; g.fillRect(0, n * 0.3, n, n * 0.4); }),
};
// what crowns a plain wall (half-height 0.5 at most: borders and rails) or a post: never more than 0.10
// over it nor 0.03 out of its sides (balls fly over walls: the drawing must not lie). A wall's crown
// runs along the whole wall (see wallMeshes): a rounded rod (rod: its height, r: its half-width for a
// wall w wide, w / 2 by default), a slab (its height, 0.03 out of each side), or pieces every step.
const crowns = new Map(); // key -> [geometry, its ink]
const dome = (r, h) => new THREE.SphereGeometry(r, 18, 8, 0, TAU, 0, Math.PI / 2).scale(1, h / r, 1);
const CROWN = {
  bocage: { rail: { rod: 0.1 }, post: r => dome(r, 0.1) },
  ville: { rail: { slab: 0.06 }, post: r => dome(r, 0.08) },
  quai: { rail: { slab: 0.05 } },
  chateau: { rail: { piece: w => new THREE.BoxGeometry(0.3, 0.1, w).translate(0, 0.05, 0), step: 0.6 }, post: r => new THREE.ConeGeometry(r + 0.03, Math.min(0.4 * r, 0.1), 24).translate(0, Math.min(0.4 * r, 0.1) / 2, 0) },
  banquise: { rail: { rod: 0.08, r: w => Math.min(0.11, w / 2 + 0.03) }, post: r => dome(r, 0.1) },
  nuit: { rail: { piece: () => dome(0.09, 0.09), step: 0.6 }, post: r => dome(r, 0.08), glow: true },
};
const THEMES = {
  bocage: { sky: '#5cc4e8', horizon: '#fff2d6', below: '#8fd0e8', grass: '#7ddb6b', lip: '#49b65c', skirt: ['#49b65c', '#b07a4f', '#8a5a3c'], top: '#175f3d', side: () => SIDE.leaves('#124f33', '#175f3d', '#1f7a4c'), crownColor: '#175f3d', clouds: 1, mill: true, fence: true,
    near: [['bush', 1], [['rock_a', 'rock_b'], 1], ['flower', 1], ['flower', 1.1], ['mushroom', 1]], trees: [['tree_ball', 1], ['tree_blossom', 1]], under: [['bush', 1], ['bush', 0.9], ['flower', 1], ['flower', 1], ['flower', 1.1]] },
  ville: { sky: '#7fb0e6', horizon: '#ffdcc4', below: '#f3b0c0', grass: '#6fd36a', lip: '#3fae5a', skirt: ['#3fae5a', '#b8644a', '#8f4a36'], top: '#fff7e6', side: () => SIDE.brick('#e8d5ac', '#b8644a', '#a85840', '#c9755a'), post: () => SIDE.post('#2b3a36', '#fff7e6'), crownColor: '#fff7e6', clouds: 1, fence: true,
    recolor: { earth: '#b8644a', earth2: '#8f4a36', cloud: '#ffe6ea' }, balloons: ['#e63946', '#ffd23f', '#3fa7ff'],
    near: [['bush', 1], ['bush', 0.9], ['flower', 1], ['flower', 1.1]], trees: [['tree_ball', 1]], under: [['bush', 1], ['flower', 1], ['flower', 1.1], ['flower', 1]] },
  quai: { sky: '#5cc4e8', horizon: '#e8f7ff', below: '#2b93d1', sea: true, grass: '#6fd36a', lip: '#3fae5a', skirt: ['#b98455', '#7d4f35', '#5d4630'], top: '#b98455', side: () => SIDE.planks('#96643f', '#6f472e', '#5d4630'), post: () => SIDE.post('#96643f', '#fff7e6'), postTop: '#fff7e6', crownColor: '#c99565', clouds: 0, fence: true,
    recolor: { leaf: '#f2d89a', earth: '#e0c080', earth2: '#b79a62' }, balloons: ['#e63946', '#ffd23f'],
    near: [[['rock_a', 'rock_b', 'rock_c'], 1], [['rock_a', 'rock_b'], 0.8]], trees: [['tree_pine', 1]], under: [['rock_c', 1], ['rock_a', 0.8]] },
  canyon: { sky: '#74c6e3', horizon: '#ffe2b8', below: '#a65a42', grass: '#93d65c', lip: '#66ad40', skirt: ['#66ad40', '#e0905e', '#c8704a'], top: '#c96a45', side: () => SIDE.strata('#a84f33', '#c96a45', '#8f3f2a'), clouds: 0.5, mill: true, fence: true,
    recolor: { leaf: '#e9b872', earth: '#e0905e', earth2: '#c8704a', stone: '#d9895c', cloud: '#ffe1c2' }, balloons: ['#e63946', '#ffd23f', '#9b5de5'],
    near: [[['rock_a', 'rock_b', 'rock_c'], 1], [['rock_a', 'rock_b'], 1.1], ['bush', 0.9]], trees: [['rock_c', 2], ['rock_a', 2.4]], under: [['bush', 1], ['rock_b', 1.2]] },
  chateau: { sky: '#7fb6dc', horizon: '#eef1f6', below: '#eef1f6', grass: '#62c873', lip: '#38a05e', skirt: ['#38a05e', '#9aa5b3', '#6e7989'], top: '#d5dbe3', side: () => SIDE.stone('#7f8a99', '#a9b4c2', '#bcc6d2', '#98a4b3'), crownColor: '#d5dbe3', postCrown: '#5d6b7c', clouds: 1, mill: true, fence: true,
    recolor: { earth: '#9aa5b3', earth2: '#6e7989' }, balloons: ['#e63946'],
    near: [[['rock_a', 'rock_b', 'rock_c'], 1], ['bush', 1], ['flower', 1]], trees: [['tree_pine', 1], ['tree_pine', 1.1], ['tree_ball', 1]], under: [['rock_c', 1], ['bush', 1]] },
  banquise: { sky: '#8fd0ee', horizon: '#f2faff', below: '#27587f', grass: '#7dd690', lip: '#4fb07a', skirt: ['#ffffff', '#a9d3ea', '#6fa3cc'], top: '#7d4f35', side: () => SIDE.logs('#7d4f35', '#5a3725', '#96643f'), crownColor: '#ffffff', clouds: 1, floes: true, fence: true,
    recolor: { leaf: '#ffffff', earth: '#a9d3ea', earth2: '#6fa3cc', water: '#d6f3ff' }, balloons: ['#e63946'],
    near: [[['rock_a', 'rock_b'], 1], ['bush', 1]], trees: [['tree_pine', 1]], under: [['rock_c', 1], ['bush', 1]] },
  nuit: { sky: '#141a3c', horizon: '#3a2f73', below: '#1c2350', stars: true, grass: '#5fcf86', lip: '#2f9a6a', skirt: ['#2f9a6a', '#5a4f8a', '#3a3463'], top: '#4a4a70', side: () => SIDE.ribs('#3d3f66', '#55578a'), crownColor: '#fff3c4', clouds: 1,
    recolor: { leaf: '#3f9a78', leaf2: '#2c7d66', earth: '#5a4f8a', earth2: '#3a3463', stone: '#8e88c0', cloud: '#5a5fb0' }, balloons: ['#ffd27a', '#ffd27a', '#ffb14a'],
    near: [['mushroom', 1], ['mushroom', 1.1], [['rock_a', 'rock_b'], 1], ['bush', 1]], trees: [['tree_pine', 1], ['tree_ball', 1]], under: [['rock_c', 1], ['mushroom', 1]] },
};
const PROP_KEY = new Map(Object.entries(PROP_MAT).map(([k, m]) => [m, k]));
const dressed = new Map();
// dress gives the materials and the rules of a theme (bocage when none), made once.
function dress(name) {
  name = THEMES[name] ? name : 'bocage';
  if (dressed.has(name)) return dressed.get(name);
  const t = THEMES[name], col = c => new THREE.Color(c);
  const side = t.side ? themeToon(0xffffff, { map: t.side() }) : themeToon(t.top), top = themeToon(t.top);
  const swaps = new Map(Object.entries(t.recolor ?? {}).map(([k, c]) => [PROP_MAT[k], themeToon(c)]));
  let below;
  if (t.sea) { // the sea under the course: waves, running
    const map = LOOK.water().clone();
    map.repeat.set(600, 600);
    below = new THREE.MeshBasicMaterial({ map, color: col(t.below).lerp(new THREE.Color(0xffffff), 0.35) });
  } else below = new THREE.MeshBasicMaterial({ color: t.below });
  const how = CROWN[name], crownMat = how?.glow ? new THREE.MeshBasicMaterial({ color: t.crownColor }) : themeToon(t.crownColor ?? t.top);
  const postCrownMat = t.postCrown ? themeToon(t.postCrown) : crownMat;
  const T = {
    name, sky: col(t.sky), horizon: col(t.horizon), below, sea: !!t.sea, stars: !!t.stars, grass: col(t.grass), lip: themeToon(t.lip),
    skirt: t.skirt.map(c => themeToon(c)), clouds: t.clouds, floes: !!t.floes, mill: !!t.mill, fence: !!t.fence, balloons: t.balloons,
    near: t.near, trees: t.trees, under: t.under,
    wall: [side, side, top, top, side, side],
    post: [t.post ? themeToon(0xffffff, { map: t.post() }) : side, t.postTop ? themeToon(t.postTop) : top, top],
    recolor: m => swaps.get(m) ?? m, // a prop's colour in the decor: the theme's
    rail: how?.rail ? { ...how.rail, material: crownMat, glow: !!how.glow } : null, // what crowns the plain walls (wallMeshes)
    // cap gives what crowns plain post c, in its frame (a wall's crown runs along it: rail)
    cap(c) {
      if (!how?.post || c.shape === BOX) return [];
      const key = name + ' post ' + c.r.toFixed(3), make = () => how.post(c.r), material = postCrownMat, y = c.hh;
      if (!crowns.has(key)) crowns.set(key, [make(), outlineAround(make())]);
      const got = crowns.get(key);
      if (!got) return [];
      const [geometry, ink] = got, mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y;
      mesh.userData.kit = true; // its geometry is shared: not the course's to dispose
      if (!how.glow) { const outline = new THREE.Mesh(ink.geometry, HULL_MAT); outline.name = 'ink'; outline.userData.kit = true; mesh.add(outline); }
      return [mesh];
    },
  };
  dressed.set(name, T);
  return T;
}

// ---------------------------------------------------------------------------- zones
const horizontal = v => v && Math.hypot(v[0], v[2]) > 1e-9 ? [v[0], v[2]] : null;
const num = v => +v.toFixed(2);
// a thin wind (0.3 high at most) is a conveyor belt
const thin = z => (z.shape === BOX ? z.h[1] : z.hh) <= 0.3;
// describe gives the words for a zone, for the banner that names what just acted on our ball (main.js)
const WORDS = {
  speedpad: p => t('speedpad', p.speed), jumppad: p => t('jumppad', p.speed), launcher: p => t('launcher', num(Math.hypot(...p.v))),
  teleport: p => p.turn ? t('teleport.turn', Math.round(p.turn * 180 / Math.PI)) : t('teleport'),
  hazard: () => t('hazard'), checkpoint: () => t('checkpoint'), strokes: p => t('bonus', -p.add),
  key: p => t('key', p.key), wind: (p, z) => t(thin(z) ? 'conveyor' : 'wind', num(Math.hypot(...p.accel))),
  magnet: p => p.accel > 0 ? t('magnet', p.accel) : t('repeller', -p.accel),
};
export const describe = zone => ({ text: (WORDS[zone.type] ?? (() => zone.type))(zone.params ?? {}, zone) });
// GROUND gives the look of the ground of a zone, from its params: its tile, the way it points
// (x, z), how fast it runs (tiles a second, along it; or out from the centre for a round one).
// whole: drawn once over the whole zone instead of repeated. None: the zone shows only by its props
// (a pad, a portal, a cannon, a fan).
// inLocal gives the params of a zone turned by rot with their directions (dir, accel) in the zone's
// own frame
const inLocal = (p, rot) => {
  if (!rot || rot.every(v => v === 0)) return p;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)).invert(), out = { ...p };
  for (const k of ['dir', 'accel']) if (Array.isArray(p[k])) out[k] = new THREE.Vector3(...p[k]).applyQuaternion(q).toArray();
  return out;
};
const GROUND = {
  speedpad: p => ({ map: LOOK.booster(), dir: horizontal(p.dir), run: p.speed / 5 }),
  // a bonus: a gold burst under a round zone, coins all over a long one
  strokes: (p, z) => z.shape === BOX && Math.max(z.h[0], z.h[2]) > 1.2 * Math.min(z.h[0], z.h[2])
    ? { map: LOOK.coins(), scale: 0.8 }
    : { map: LOOK.burst('#ffc93c'), whole: true },
  hazard: () => ({ map: LOOK.water(), run: 0.15 }),
  checkpoint: () => ({ map: LOOK.checker(), scale: 0.5 }),
  wind: (p, z) => thin(z) ? { map: LOOK.belt(), dir: horizontal(p.accel), run: Math.hypot(...p.accel) / 6, scale: 0.5 } : null,
  magnet: p => ({ map: LOOK.rings(p.accel > 0 ? '#e63946' : '#1f3fa6'), round: true, run: p.accel / 6, scale: 0.5 }), // red rings running in, or navy running out
};

// decal gives a flat geometry lying at y 0 around the origin texture coordinates along dir (x, z),
// in tiles of size units, or in rings around the origin.
// Across the way it points, the tiles are stretched a little to fit a whole number of times: no
// chevron is cut at an edge.
function decal(geometry, look, size = TILE) {
  const p = geometry.attributes.position, uv = geometry.attributes.uv;
  const [dx, dz] = look.dir ? [look.dir[0] / Math.hypot(...look.dir), look.dir[1] / Math.hypot(...look.dir)] : [0, -1];
  if (look.whole) { // the tile once over the zone
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - min.x) / (max.x - min.x), (p.getZ(i) - min.z) / (max.z - min.z));
    return geometry;
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) * -dz + p.getZ(i) * dx; lo = Math.min(lo, u); hi = Math.max(hi, u); }
  const across = (hi - lo) / Math.max(1, Math.round((hi - lo) / size));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (look.round) uv.setXY(i, 0, -Math.hypot(x, z) / size);
    else uv.setXY(i, (x * -dz + z * dx - lo) / across, (x * dx + z * dz) / size);
  }
  return geometry;
}

// label is a sign that always faces the camera: the name over a ball.
function label(text, color) {
  const canvas = document.createElement('canvas'), g = canvas.getContext('2d'), font = '800 44px Nunito, system-ui, sans-serif';
  g.font = font;
  canvas.width = Math.ceil(g.measureText(text).width) + 62;
  canvas.height = 72;
  g.font = font;
  // a sticker, as in the menus: cream, an ink line, a hard shadow under it; a dot of its colour
  g.fillStyle = '#17332b';
  g.beginPath(); g.roundRect(3, 9, canvas.width - 6, 60, 22); g.fill();
  g.fillStyle = '#fff7e6'; g.strokeStyle = '#17332b'; g.lineWidth = 5;
  g.beginPath(); g.roundRect(3, 3, canvas.width - 6, 58, 22); g.fill(); g.stroke();
  g.fillStyle = color;
  g.beginPath(); g.arc(25, 32, 9, 0, TAU); g.fill(); g.lineWidth = 3.5; g.stroke();
  g.fillStyle = '#17332b';
  g.textBaseline = 'middle';
  g.fillText(text, 44, 34);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthWrite: false }));
  sprite.scale.set(canvas.width / canvas.height * 0.36, 0.36, 1);
  sprite.renderOrder = 4;
  return sprite;
}

export class View {
  // size: [width, height] of a canvas that is not the page's (a preview); none: the window's
  constructor(canvas, size) {
    this.size = size;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this.target = new THREE.Vector3(); // what the camera looks at (look)
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-0.5, 0.85, 0.4);
    // shadows: what stands on the course (walls, props, balls) shades the ground, the light fitted to
    // the hole (setHole)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.below = new THREE.Mesh(flat(new THREE.PlaneGeometry(2400, 2400)), MAT.below); // where a ball out of bounds falls
    this.dome = sky();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8d8c8, 1.3), sun, sun.target, this.below, this.dome);
    this.scene.fog = new THREE.Fog(PALETTE.horizon, 80, 300);
    this.balls = new Map(); // player id -> mesh
    this.tags = new Map();  // player id -> { sprite, key }: the name over a ball
    this.moving = [];       // { mesh, c, rot, motion }: the colliders that move
    this.zones = [];        // a group per zone of the hole
    this.scrolling = [];    // { texture, speed }: patterns that run (a wind, a magnet)
    this.spinning = []; this.orbits = []; this.fans = []; this.drifting = []; this.sails = []; // props that move, see setHole
    this.turning = []; this.arcs = []; this.gusts = []; this.floating = []; this.bouncing = []; this.swimming = [];
    this.center = new THREE.Vector3(); // of the course, with its radius: what a camera has to frame
    this.radius = 10;
    this.lite = false;      // lighter graphics (setLite)
    this.makeArrow();
    if (!size) addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const [w, h] = this.size ?? [innerWidth, innerHeight];
    // past 1.5 pixels of the picture per point, a sharp screen shows no more (with the antialiasing) and
    // the picture costs nearly twice as much to draw
    this.renderer.setPixelRatio(this.size ? 1 : Math.min(devicePixelRatio, this.lite ? 1 : 1.5));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // setLite asks for lighter graphics, for a modest machine, or the full ones: lighter, nothing casts a
  // shadow (the balls keep theirs on the ground), and a sharp screen gets a pixel of the picture per
  // point, not per pixel.
  setLite(lite) {
    this.lite = lite;
    this.sun.castShadow = !lite; // (the materials are made again without the shadows, or with them)
    this.resize();
  }

  setHole(hole) {
    if (this.course) {
      this.scene.remove(this.course);
      this.course.traverse(o => { if (!o.userData.kit) o.geometry?.dispose(); if (o.userData.own) { o.material.map?.dispose(); o.material.userData.shore?.dispose(); o.material.dispose(); } });
    }
    this.moving = [];
    this.spinning = []; // { o, y, phase }: the props that turn and float (tokens, keys)
    this.fans = [];     // the blades of the fans, which turn
    this.orbits = [];   // { o, r, y, phase }: what circles over a teleporter
    this.turning = [];  // { o, speed }: what turns on itself (a portal)
    this.arcs = [];     // the dots along the arc of each launcher
    this.gusts = [];    // the streaks of each wind
    this.floating = []; // the sparkles of each teleporter
    this.bouncing = []; // the plates of the jump pads
    this.swimming = []; // { o, y, cx, cz, rx, rz, speed, phase }: the sharks in the hazards
    if (this.effects) { this.scene.remove(this.effects); this.effects.traverse(o => { if (o.isInstancedMesh) o.dispose(); else if (o.userData.own) o.geometry.dispose(); }); }
    this.effects = new THREE.Group(); // what moves through the zones, out of the course: the cameras frame the course alone
    this.scene.add(this.effects);
    this.hole = hole;
    this.zones = [];
    this.scrolling = [];
    this.floors = []; // what the aiming arrow lies on
    this.setBalls(new Map());
    this.ballShape?.dispose();
    this.ballShape = new THREE.SphereGeometry(hole.ballR, 24, 16);
    this.ballHull?.dispose();
    this.ballHull = new THREE.SphereGeometry(hole.ballR + 0.025, 16, 10);
    this.ballShadow ??= flat(new THREE.CircleGeometry(1, 20));
    const g = this.course = new THREE.Group();
    const T = this.theme = dress(hole.theme);
    this.dome.material.uniforms.top.value.copy(T.sky);
    this.dome.material.uniforms.low.value.copy(T.horizon);
    this.dome.material.uniforms.stars.value = T.stars ? 1 : 0;
    this.scene.fog?.color.copy(T.horizon); // (the previews draw without fog)
    this.below.material = T.below;
    if (T.sea) this.scrolling.push({ texture: T.below.map, speed: 0.03 });
    grass.color.copy(T.grass); // one hole at a time: the grass is the theme's
    const laid = [], walls = []; // the floors and the plain walls that stay put: merged (floorMeshes, wallMeshes)
    for (const c of hole.colliders) {
      if (c.hasCup) { // always a flat floor, see physics.Hole.Build
        const look = surface(c); // sand or ice under the cup too, not only grass
        const floor = new THREE.Mesh(look ? patternUV(cupFloor(c, hole.cup), [0, 0, 0]) : cupFloor(c, hole.cup), [look ?? MAT.floor, T.lip]); // its top and bottom, its sides
        g.add(floor);
        this.floors.push(floor);
        continue;
      }
      if (c.shape === BOX && !c.motion && !c.key) {
        if (c.kind === FLOOR) { laid.push(c); continue; }
        if (c.kind === WALL && !surface(c)) { walls.push(c); continue; }
      }
      const plain = c.shape === BOX ? (c.kind === FLOOR ? MAT.floor : c.kind === WALL ? MAT.wall : MAT.post) : MAT.post;
      const look = surface(c) ?? plain;
      const geometry = c.shape === BOX ? new THREE.BoxGeometry(c.h[0] * 2, c.h[1] * 2, c.h[2] * 2) : new THREE.CylinderGeometry(c.r, c.r, c.hh * 2, 24);
      const bare = !surface(c) && c.kind !== FLOOR; // a plain wall or post: the theme's
      const faces = bare ? (c.shape === BOX ? T.wall : T.post) : c.shape !== BOX ? (look === MAT.post ? POST_FACES : look) : c.kind === FLOOR ? floorFaces(look, T.lip) : look === MAT.wall ? wallFaces : look;
      const mesh = new THREE.Mesh(patternUV(geometry, c.motion ? [0, 0, 0] : c.c), faces);
      // an ink outline around what stands on the course; a floor has none, or its seams would show
      if (c.kind !== FLOOR) mesh.add(outline(c, hole.colliders));
      mesh.position.set(...c.c);
      mesh.rotation.set(...c.rot); // Euler XYZ on both sides
      if (bare) for (const o of T.cap(c)) mesh.add(o); // its coping, crest, battlements...
      if (c.material === 'bumper' && c.shape !== BOX) { // a bumper post wears its cap
        const cap = prop('bumper_cap');
        cap.position.y = c.hh;
        cap.scale.setScalar(c.r / 0.45); // modelled on a post of radius 0.45
        mesh.add(cap);
      }
      if (c.key) { // a gate shows its padlock, in the colour of its key
        const lock = prop('padlock', KEY_COLOR[c.key - 1]);
        lock.position.y = (c.shape === BOX ? c.h[1] : c.hh) + 0.03;
        mesh.add(lock);
      }
      if (c.motion) this.moving.push({ mesh, c: new THREE.Vector3(...c.c), rot: mesh.quaternion.clone(), motion: c.motion });
      if (c.kind === FLOOR) this.floors.push(mesh);
      g.add(mesh);
    }
    for (const m of floorMeshes(laid, T.lip)) { g.add(m); this.floors.push(m); }
    for (const m of wallMeshes(walls, hole.colliders, T)) g.add(m);
    (hole.zones ?? []).forEach(z => g.add(this.zone(z)));
    const box = new THREE.Box3().setFromObject(g);
    box.getCenter(this.center);
    this.radius = box.getSize(new THREE.Vector3()).length() / 2;

    const { x, y, z, r } = hole.cup, depth = hole.cupDepth;
    const add = (geometry, material, dy) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y + dy, z); g.add(m); };
    add(new THREE.CylinderGeometry(r * 0.995, r * 0.995, depth, 40, 1, true), MAT.inside, -depth / 2); // just inside the cut of the floor
    add(flat(new THREE.CircleGeometry(r, 40)), MAT.cup, -depth);
    const pin = prop('flag'), rim = prop('cup_rim');
    pin.position.set(x, y, z);
    rim.position.set(x, y, z);
    rim.scale.set(r / 0.45, 1, r / 0.45); // modelled on a cup of radius 0.45
    const [tx, ty, tz] = hole.tee, tee = prop('tee');
    tee.position.set(tx, ty - hole.ballR, tz);
    g.add(pin, rim, tee);

    this.below.position.y = hole.killY;
    this.scene.add(g);
    // shadows: everything of the course casts and takes them; the sun's view fitted round it
    g.traverse(o => { if (o.isMesh && o.name !== 'ink') { o.castShadow = true; o.receiveShadow = true; } });
    const bounds = new THREE.Box3().setFromObject(g), mid = bounds.getCenter(new THREE.Vector3()), reach = bounds.getSize(new THREE.Vector3()).length() / 2 + 1;
    const toSun = new THREE.Vector3(-0.5, 0.85, 0.4).normalize();
    this.sun.position.copy(mid).addScaledVector(toSun, reach * 2);
    this.sun.target.position.copy(mid);
    Object.assign(this.sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.1, far: reach * 4 });
    this.sun.shadow.camera.updateProjectionMatrix();
    const tops2 = hole.colliders.filter(c => c.kind === FLOOR && c.shape === BOX).map(c => c.c[1] + c.h[1]);
    GRASS.low.value = Math.min(...tops2); GRASS.high.value = Math.max(GRASS.low.value + 1, ...tops2); // the lowest and highest ground
    const run = new THREE.Vector2(hole.cup.x - hole.tee[0], hole.cup.z - hole.tee[2]);
    GRASS.along.value.copy(run.lengthSq() > 1e-6 ? run.normalize() : new THREE.Vector2(0, -1));
    this.decorate(hole, box);
  }

  // decorate surrounds the course with what does not play, placed from the hole alone (the same
  // hole, the same view), out of the course group (the cameras frame the course alone): the ground
  // under the course, islets with bushes, rocks and flowers close by, bigger ones with trees, fences
  // and a waterfall further, a windmill and balloons far away, a sea of clouds. Nothing comes between
  // the camera and a ball: whatever is gap units out of the course stays under floor + 0.12 × gap,
  // the line the camera looks along at its lowest pitch (main.js: 0.12), and what is taller is
  // farther than the camera goes (40).
  decorate(hole, box) {
    if (this.decor) {
      this.scene.remove(this.decor);
      this.decor.traverse(o => { if (!o.userData.kit) o.geometry?.dispose(); if (o.isInstancedMesh) o.dispose(); });
    }
    const d = this.decor = new THREE.Group();
    this.drifting = [];
    this.sails = [];
    const T = this.theme;
    d.add(skirt(hole.colliders, hole.killY - 1, T.skirt));
    let seed = [...hole.name].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) ^ hole.colliders.length;
    const rand = () => { seed = Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5 | 0; return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296; };
    const pick = list => list[Math.floor(rand() * list.length)];
    // the footprint of the course: the outline of each floor seen from above, and their lowest top
    const rects = hole.colliders.filter(c => c.kind === FLOOR).map(c => {
      const r = c.shape === BOX ? Math.hypot(c.h[0], c.h[2]) * (c.rot?.[1] ? 1 : 0) : c.r; // a floor turned around y: its circle
      const hx = c.shape === BOX ? (r || c.h[0]) : c.r, hz = c.shape === BOX ? (r || c.h[2]) : c.r;
      return [c.c[0] - hx, c.c[0] + hx, c.c[2] - hz, c.c[2] + hz];
    });
    const floor = Math.min(...hole.colliders.filter(c => c.kind === FLOOR).map(c => c.c[1] + (c.shape === BOX ? c.h[1] : c.hh)));
    const gapAt = (x, z) => Math.min(...rects.map(([x0, x1, z0, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1))));
    const ceiling = gap => floor + 0.12 * gap;
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, reach = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    // instances: one draw call per part of each model, whatever their number
    const many = new Map(); // model -> [{ matrix, color }]
    const put = (name, x, y, z, s, turn = rand() * TAU, color) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, turn), new THREE.Vector3(s, s, s));
      if (!many.has(name)) many.set(name, []);
      many.get(name).push({ m, color });
      return m;
    };
    const taken = []; // [x, z, r]: the islets placed
    const spot = (gap0, gap1, r) => { // a free place gap0 to gap1 from the course for an islet of radius r: out of the edge of a floor
      for (let tries = 0; tries < 60; tries++) {
        const [x0, x1, z0, z1] = pick(rects), a = rand() * TAU, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
        const edge = 1 / Math.max(Math.abs(Math.cos(a)) / hx, Math.abs(Math.sin(a)) / hz, 1e-9), dist = edge + gap0 + r * 1.35 + rand() * (gap1 - gap0);
        const x = (x0 + x1) / 2 + Math.cos(a) * dist, z = (z0 + z1) / 2 + Math.sin(a) * dist;
        const gap = gapAt(x, z) - r * 1.35;
        if (gap < gap0 || gap > gap1 || taken.some(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) < tr + r + 1.2)) continue;
        taken.push([x, z, r]);
        return { x, z, gap };
      }
      return null;
    };
    const FLOWERS = [PALETTE.pink, PALETTE.sun, PALETTE.cream, PALETTE.violet, PALETTE.orange];
    // on an islet at (x, y, z) of radius r: things scattered on its top, within reach
    const dress = (x, y, z, r, things) => {
      for (const [name, s] of things) {
        const a = rand() * TAU, at = rand() ** 0.5 * r * 0.6;
        put(name, x + Math.cos(a) * at, y, z + Math.sin(a) * at, s, undefined, name === 'flower' ? pick(FLOWERS) : undefined);
      }
    };
    // close by: small islets, low things only
    for (let i = 0, n = 4 + Math.floor(rand() * 3); i < n; i++) {
      const at = spot(3, 7, 1.6);
      if (!at) continue;
      const things = T.near.map(([name, s]) => [Array.isArray(name) ? pick(name) : name, s * (0.9 + rand() * 0.3)]);
      const high = Math.max(...things.map(([name, s]) => TOP[name] * s));
      const y = T.sea ? hole.killY + 0.25 : Math.min(floor - 1.5 - rand(), ceiling(at.gap) - high); // on the sea, or floating
      if (T.sea ? y + high > ceiling(at.gap) : y < hole.killY + 0.4) continue; // under the line of sight, over the sea
      put('islet_s', at.x, y, at.z, 1);
      dress(at.x, y, at.z, 1.6, things);
    }
    // further: bigger islets, with trees
    for (let i = 0, n = 3 + Math.floor(rand() * 2); i < n; i++) {
      const big = rand() < 0.4, r = big ? 4.5 : 3, at = spot(8, 20, r);
      if (!at) continue;
      const trees = Array.from({ length: big ? 3 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2) }, () => { const [name, s] = pick(T.trees); return [name, s * (0.85 + rand() * 0.35)]; });
      const top = Math.max(...trees.map(([name, s]) => TOP[name] * s));
      const y = T.sea ? hole.killY + 0.25 : Math.max(hole.killY + 0.4, Math.min(floor - 1.2 - rand() * 1.2, ceiling(at.gap) - top));
      if (y + top > ceiling(at.gap)) continue; // no room between the sea and the line of sight
      const turn = rand() * TAU;
      put(big ? 'islet_l' : 'islet_m', at.x, y, at.z, 1, turn);
      dress(at.x, y, at.z, r, [...trees, ...T.under.map(([name, s]) => [Array.isArray(name) ? pick(name) : name, s])]);
      if (big && T.fence) { // a fence at the edge, a waterfall over it
        const a = rand() * TAU;
        put('fence', at.x + Math.cos(a) * r * 0.55, y, at.z + Math.sin(a) * r * 0.55, 1, -(a + Math.PI / 2)); // along the edge (a big islet has its waterfall)
      }
    }
    // far away, taller than anything near: a windmill on its islet, balloons
    const far = (gap0, gap1) => { const a = rand() * TAU, dist = reach + gap0 + rand() * (gap1 - gap0); return [cx + Math.cos(a) * dist, cz + Math.sin(a) * dist]; };
    const [mx, mz] = far(45, 70);
    if (T.mill) {
      const mill = prop('windmill'), my = T.sea ? hole.killY + 0.25 : floor - 2;
      put('islet_l', mx, my, mz, 1.3);
      mill.position.set(mx, my, mz);
      mill.rotation.y = Math.atan2(cx - mx, cz - mz); // its sails (modelled facing +z) towards the course
      d.add(mill);
      this.sails.push(mill.getObjectByName('windmill_sails'));
    }
    for (const color of T.balloons ?? [PALETTE.red, pick([PALETTE.violet, PALETTE.sun, PALETTE.leaf])]) {
      const [bx, bz] = far(45, 70), balloon = prop('balloon', color);
      balloon.position.set(bx, floor + 5 + rand() * 6, bz);
      d.add(balloon);
      this.drifting.push({ o: balloon, y: balloon.position.y });
    }
    // the sea of clouds, on the plane where a ball is lost, the clouds lower where they are near
    if (T.clouds) for (let gx = -100; gx <= 100; gx += 20) for (let gz = -100; gz <= 100; gz += 20) {
      const x = cx + gx + (rand() - 0.5) * 16, z = cz + gz + (rand() - 0.5) * 16, s = 1.2 + rand() ** 2 * 3.3, name = pick(['cloud_a', 'cloud_b', 'cloud_c']);
      if (rand() > T.clouds) continue; // fewer clouds in some skies
      const gap = gapAt(x, z) - 2.2 * s;
      const m = put(name, x, Math.min(hole.killY - 0.1 * s, ceiling(Math.max(gap, 0)) - TOP[name] * s), z, s);
      if (T.floes) m.scale(new THREE.Vector3(1, 0.3, 1)); // flattened: ice floes on the sea
    }
    for (const [name, list] of many) {
      const model = KIT[name];
      model.updateMatrixWorld(true);
      const root = model.matrixWorld.clone().invert();
      model.traverse(m => {
        if (!m.isMesh) return;
        const local = root.clone().multiply(m.matrixWorld), im = new THREE.InstancedMesh(m.geometry, T.recolor(m.material), list.length);
        list.forEach(({ m: at, color }, i) => {
          im.setMatrixAt(i, at.clone().multiply(local));
          if (m.material === PROP_MAT.tint) im.setColorAt(i, new THREE.Color(color ?? 0xffffff));
        });
        im.userData.kit = true;
        im.computeBoundingSphere();
        d.add(im);
      });
    }
    this.scene.add(d);
  }

  // zone is the group that shows a zone: its ground, a sticker with an ink rim, and the props that
  // show what it does; for a teleporter, where it leads too. No sign: it shows by how it looks.
  zone(z) {
    const group = new THREE.Group();
    group.position.set(...z.c);
    group.rotation.set(...(z.rot ?? [0, 0, 0]));
    const halfY = z.shape === BOX ? z.h[1] : z.hh, floor = -halfY, p = z.params ?? {};
    const look = GROUND[z.type]?.(inLocal(p, z.rot), z); // its ground is drawn in its own frame (a belt on a ramp)
    if (look) {
      const shape = grow => z.shape === BOX
        ? flat(new THREE.PlaneGeometry(z.h[0] * 2 + grow, z.h[2] * 2 + grow, Math.ceil(z.h[0] * 4), Math.ceil(z.h[2] * 4)))
        : flat(new THREE.CircleGeometry(z.r + grow / 2, 48));
      const water = z.type === 'hazard'; // alive (waterOf), its foam for a rim
      const map = water ? null : look.map.clone(); // its own, to run at its own pace
      const top = new THREE.Mesh(water ? shape(0) : decal(shape(0), look, TILE * (look.scale ?? 1)),
        water ? waterOf(z, this.hole.zones, this.renderer) : toon(0xffffff, { map, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      top.userData.own = true;
      top.position.y = floor + 0.012; // the zones of the maps start on the ground
      if (look.run && !water) this.scrolling.push({ texture: map, speed: look.run });
      if (!water) {
        const rim = new THREE.Mesh(shape(0.09), new THREE.MeshBasicMaterial({ color: PALETTE.ink, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
        rim.userData.own = true;
        rim.position.y = floor + 0.008;
        group.add(rim);
      }
      group.add(top);
    }
    this.zoneProps(z, group, floor);
    this.zones.push(group);
    return group;
  }

  // zoneProps adds to the group of the zone z the props that show what it does: a token or a key
  // floating over it (with its shadow), a jump pad, a cannon and the arc it throws along, a portal
  // and where it leads, in the colours of its pair, a checkered pennant at each end of a checkpoint;
  // a fan where a wind starts, and the wind blowing through the zone. floor is the height of its ground in the group.
  zoneProps(z, group, floor) {
    const p = z.params ?? {}, size = z.shape === BOX ? Math.min(z.h[0], z.h[2]) : z.r;
    const float = (o, h, facing = false) => {
      o.position.y = floor + h;
      o.userData.facing = facing;
      const shadow = new THREE.Mesh(this.ballShadow, SHADOW_MAT);
      shadow.userData.kit = true; // its geometry is shared
      shadow.scale.setScalar(0.22);
      shadow.position.y = floor + 0.016;
      group.add(o, shadow);
      this.spinning.push({ o, y: floor + h, phase: this.spinning.length * 1.7 });
    };
    if (z.type === 'strokes') float(prop('bonus'), 0.7, true); // its number towards the camera
    else if (z.type === 'key') float(prop('key', KEY_COLOR[p.key - 1]), 0.7);
    else if (z.type === 'jumppad') this.jumppad(z, group, floor);
    else if (z.type === 'launcher') {
      // a cannon: the ball goes in at its breech, in the middle of the zone, and flies out of its
      // muzzle along the arc it throws, which dots go on showing after it
      const v = new THREE.Vector3(...p.v), flat = Math.hypot(v.x, v.z), yaw = flat > 1e-9 ? Math.atan2(v.x, v.z) : 0;
      const at = new THREE.Vector3(z.c[0], z.c[1] + floor, z.c[2]), barrel = prop('cannon'), carriage = prop('cannon_carriage');
      carriage.position.copy(at);
      carriage.rotation.y = yaw;
      barrel.position.copy(at).setY(at.y + this.hole.ballR);
      barrel.rotation.set(-Math.atan2(v.y, flat), yaw, 0, 'YXZ'); // modelled along +z: raised, then turned
      this.course.add(carriage, barrel);
      const g = -(this.hole.gravity || 18), start = barrel.position.clone();
      const out = 1.3 / v.length(); // when the ball leaves the muzzle
      const DT = 0.07, n = Math.min(40, Math.max(4, Math.ceil(((v.y + Math.sqrt(v.y * v.y + 2 * -g * 0.4)) / -g - out) / DT)));
      const dot = new THREE.InstancedMesh(DOT, MAT.wall, n), ink = new THREE.InstancedMesh(DOT_INK, HULL_MAT, n);
      dot.frustumCulled = ink.frustumCulled = false;
      this.effects.add(dot, ink);
      this.arcs.push({ dot, ink, start, v, g, n, DT, out });
    } else if (z.type === 'checkpoint' && z.shape === BOX) {
      const along = z.h[0] >= z.h[2] ? 0 : 2;
      for (const s of [-1, 1]) {
        const o = prop('pennant');
        o.position.set(along === 0 ? s * z.h[0] : 0, floor + 0.45, along === 2 ? s * z.h[2] : 0); // over a ball
        group.add(o);
      }
    } else if (z.type === 'hazard') this.sharks(z, group, floor);
    else if (z.type === 'teleport') {
      // a pad of light: a turning spiral, a column of light, sparkles sinking into it; where it
      // leads, the same, smaller, turning the other way, its sparkles rising out of it
      const look = PORTALS[this.hole.zones.filter(o => o.type === 'teleport').indexOf(z) % PORTALS.length];
      const mouth = recolor(prop('portal'), look.swap);
      mouth.position.y = floor + 0.01;
      mouth.scale.setScalar(size / 0.6); // modelled at a radius of 0.6
      group.add(mouth);
      this.turning.push({ o: mouth, speed: 2.5 });
      for (let i = 0; i < 3; i++) {
        const shard = recolor(prop('shard'), look.swap);
        group.add(shard);
        this.orbits.push({ o: shard, r: size * 0.85, y: floor + 0.55 + i * 0.12, phase: i * TAU / 3 });
      }
      const at = new THREE.Vector3(z.c[0], z.c[1] + floor, z.c[2]);
      this.beam(at, size, -0.6, look);
      const exit = recolor(prop('portal'), look.swap), to = p.to; // where it leads
      exit.position.set(to[0], to[1] - this.hole.ballR + 0.01, to[2]);
      exit.scale.setScalar(0.75);
      this.course.add(exit);
      this.turning.push({ o: exit, speed: -2.5 });
      this.beam(exit.position.clone(), 0.45, 0.6, look);
    } else if (z.type === 'wind' && !thin(z)) {
      const d = horizontal(p.accel);
      if (d) this.wind(z, group, floor, d, Math.hypot(...p.accel));
    }
  }

  // jumppad is a plate on springs the size of the zone, which keeps bouncing.
// (COIL_H: the height the coil prop is modelled at, see tools/models/kit.py)
  jumppad(z, group, floor) {
    const box = z.shape === BOX, w = box ? z.h[0] : z.r, d = box ? z.h[2] : z.r;
    const slab = (inset, height, material) => new THREE.Mesh(box ? new THREE.BoxGeometry(w * 2 - inset * 2, height, d * 2 - inset * 2) : new THREE.CylinderGeometry(z.r - inset, z.r - inset, height, 40), material);
    const base = slab(0, 0.03, MAT.dark), plate = slab(0.04, 0.05, MAT.pad);
    base.position.y = floor + 0.015;
    base.add(outlineAround(base.geometry));
    plate.add(outlineAround(plate.geometry));
    group.add(base, plate);
    const corners = box ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [sx * (w - 0.15), sz * (d - 0.15)]) : [0, 1, 2, 3].map(i => [Math.cos(i * TAU / 4 + TAU / 8) * (z.r - 0.15), Math.sin(i * TAU / 4 + TAU / 8) * (z.r - 0.15)]);
    const coils = corners.map(([x, zz]) => { const c = prop('coil'); c.position.set(x, floor + 0.03, zz); group.add(c); return c; });
    this.bouncing.push({ plate, coils, floor: floor + 0.03 });
  }

  // wind is a row of fans at the edge the wind comes from, as big as the zone is high, and streaks
  // of wind blowing through the zone, as fast as it pushes. dir is the way it blows (x, z).
  wind(z, group, floor, dir, accel) {
    const halfY = -floor, len = Math.hypot(...dir), dx = dir[0] / len, dz = dir[1] / len;
    const reach = z.shape === BOX ? Math.abs(dx) * z.h[0] + Math.abs(dz) * z.h[2] : z.r; // from the centre to the edge it comes from
    const wide = z.shape === BOX ? Math.abs(dz) * z.h[0] + Math.abs(dx) * z.h[2] : z.r; // half its width, across the wind
    // a row of fans along that edge, each as big as the zone is high, floating clear of a ball rolling under
    const radius = Math.min(Math.max(halfY * 0.9, 0.35), 1.2), count = Math.min(6, Math.max(1, Math.round(wide * 2 / (radius * 3))));
    const height = z.c[1] + Math.max(0, floor + this.hole.ballR * 2 + radius + 0.05);
    for (let i = 0; i < count; i++) {
      const across = (((i + 0.5) / count) * 2 - 1) * wide, fan = prop('fan');
      fan.scale.setScalar(radius / 0.5); // its ring is 0.5 across
      fan.position.set(z.c[0] - dx * (reach + 0.2) - dz * across, height, z.c[2] - dz * (reach + 0.2) + dx * across);
      fan.rotation.y = Math.atan2(dx, dz);
      this.course.add(fan);
      this.fans.push(fan.getObjectByName('fan_blades'));
    }
    const n = Math.round(Math.min(28, Math.max(8, reach * wide * 2.5)));
    const streaks = new THREE.InstancedMesh(STREAK, STREAK_MAT, n);
    streaks.frustumCulled = false;
    let seed = n * 7919;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const lanes = Array.from({ length: n }, () => ({ side: (rand() * 2 - 1) * wide * 0.9, up: floor + 0.08 + rand() * (halfY * 2 - 0.16), phase: rand() }));
    streaks.position.copy(group.position);
    streaks.quaternion.copy(group.quaternion);
    this.effects.add(streaks);
    // the way it blows, in the zone's own frame
    const way = new THREE.Vector3(dx, 0, dz).applyQuaternion(group.quaternion.clone().invert());
    this.gusts.push({ streaks, lanes, reach, way, speed: 2 + accel * 0.6 });
  }

  // beam is a column of light standing on the ground at at, of radius r, and sparkles in it, sinking
  // (speed < 0) or rising, in the colours of look (one of PORTALS).
  beam(at, r, speed, look) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 1.8, 32, 1, true).translate(0, 0.9, 0), look.beam);
    column.userData.own = true; // its geometry (its material is shared)
    column.position.copy(at);
    column.renderOrder = 2;
    const n = Math.round(8 + r * 10), sparks = new THREE.InstancedMesh(MOTE, look.spark, n);
    sparks.frustumCulled = false;
    sparks.position.copy(at);
    let seed = n * 31 + Math.round(at.x * 7 + at.z * 13);
    const rand = () => (seed = (Math.abs(seed) * 16807 + 1) % 2147483647) / 2147483647;
    const places = Array.from({ length: n }, () => { const a = rand() * TAU, d = Math.sqrt(rand()) * r * 0.85; return [Math.cos(a) * d, rand(), Math.sin(a) * d]; });
    this.effects.add(column, sparks);
    this.floating.push({ motes: sparks, at: places, floor: 0, height: 1.6, speed: speed * 1.6 });
  }

  // sharks are fins circling in a hazard: the water bites. One per 6 square units or so, up to three;
  // none in a puddle too small to swim round.
  sharks(z, group, floor) {
    const w = z.shape === BOX ? z.h[0] : z.r, d = z.shape === BOX ? z.h[2] : z.r;
    if (Math.min(w, d) < 0.6) return;
    const area = w * d * 4, n = area > 30 ? 2 : area > 5 ? 1 : 0; // a fin here and there, not a crowd
    if (!n) return;
    // where a fin may swim: on the water, not under a floor, a wall or a post standing in or over it at
    // the height of a fin (a pool partly under the course would put it through the ground)
    const wy = z.c[1] + floor, M = 0.35, hold = new THREE.Matrix4(), p = new THREE.Vector3();
    const over = this.hole.colliders.filter(c => {
      const e = c.shape === BOX ? (c.rot && c.rot.some(v => v) ? Math.hypot(...c.h) : c.h[1]) : c.hh;
      return c.c[1] + e > wy + 0.02 && c.c[1] - e < wy + 0.5;
    }).map(c => ({ c, inv: hold.clone().compose(new THREE.Vector3(...c.c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(c.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1)).invert() }));
    const open = (x, y) => { // x, y: in the zone's frame
      if (Math.abs(x) > w - 0.3 || Math.abs(y) > d - 0.3 || (z.shape !== BOX && Math.hypot(x, y) > z.r - 0.3)) return false;
      return !over.some(({ c, inv }) => {
        if (c.shape !== BOX) return Math.hypot(z.c[0] + x - c.c[0], z.c[2] + y - c.c[2]) < c.r + M;
        p.set(z.c[0] + x, c.c[1], z.c[2] + y).applyMatrix4(inv);
        return Math.abs(p.x) < c.h[0] + M && Math.abs(p.z) < c.h[2] + M;
      });
    };
    // the widest round a fin can swim within [x0, x1] × [y0, y1], all of it on open water
    const lane = (x0, x1, y0, y1) => {
      let best = null;
      for (let cx = x0; cx <= x1 + 1e-6; cx += 0.5) for (let cz = y0; cz <= y1 + 1e-6; cz += 0.5) {
        if (!open(cx, cz)) continue;
        for (const k of [1, 0.8, 0.6, 0.45, 0.3]) {
          const rx = Math.max(0.3, Math.min(cx - x0, x1 - cx) * k + 0.3), rz = Math.max(0.3, Math.min(cz - y0, y1 - cz) * k + 0.3);
          if (best && rx * rz <= best.rx * best.rz) break;
          let ok = true;
          for (let s = 0; s < 24 && ok; s++) ok = open(cx + Math.cos(s * TAU / 24) * rx, cz + Math.sin(s * TAU / 24) * rz);
          if (ok) { best = { cx, cz, rx, rz }; break; }
        }
      }
      return best;
    };
    const halves = n === 1 ? [[-w, w, -d, d]] : w > d ? [[-w, 0, -d, d], [0, w, -d, d]] : [[-w, w, -d, 0], [-w, w, 0, d]];
    halves.forEach(([x0, x1, y0, y1], i) => {
      const path = lane(x0, x1, y0, y1);
      if (!path || path.rx * path.rz < 0.25) return; // no room: no fin
      const fin = prop('fin');
      group.add(fin);
      this.swimming.push({ o: fin, y: floor, ...path, speed: 0.9 - i * 0.15, phase: i * 2.1 });
    });
  }


  // taken shows that the zone i, which acts once, has acted on our ball.
  taken(i) { const z = this.zones[i]; if (z) z.visible = false; }

  // move places what moves at hole time t (s), with the formulas of physics.Motion, and runs the
  // patterns that run.
  move(t) {
    WATER.uniforms.time.value = t;
    const q = new THREE.Quaternion(), axis = new THREE.Vector3(), v = new THREE.Vector3();
    for (const { mesh, c, rot, motion: m } of this.moving) {
      const u = TAU * (t / m.period + (m.phase ?? 0));
      const off = (1 - Math.cos(u)) / 2;
      axis.set(...m.axis);
      const angle = axis.lengthSq() === 0 ? 0 : m.swing ? m.swing * Math.sin(u) : u;
      q.setFromAxisAngle(axis.normalize(), angle);
      v.copy(c).sub(new THREE.Vector3(...m.pivot)).applyQuaternion(q).add(new THREE.Vector3(...m.pivot));
      mesh.position.set(v.x + m.move[0] * off, v.y + m.move[1] * off, v.z + m.move[2] * off);
      mesh.quaternion.copy(q).multiply(rot);
    }
    for (const { texture, speed } of this.scrolling) texture.offset.y = -t * speed;
    for (const { o, y, phase } of this.spinning) {
      if (o.userData.facing) o.userData.rock = Math.sin(t * 2 + phase) * 0.35; // turned to the camera when drawn
      else o.rotation.y = t * 2 + phase;
      o.position.y = y + Math.sin(t * 2.4 + phase) * 0.06;
    }
    for (const { o, r, y, phase } of this.orbits) { const a = t * 1.5 + phase; o.position.set(Math.cos(a) * r, y + Math.sin(t * 3 + phase) * 0.05, Math.sin(a) * r); o.rotation.y = t * 3; }
    for (const blades of this.fans) blades.rotation.z = -t * 9;
    for (const { o, y } of this.drifting) o.position.y = y + Math.sin(t * 0.5 + o.position.x) * 0.4;
    for (const sails of this.sails) sails.rotation.z = t * 0.6;
    for (const { o, speed } of this.turning) o.rotation.y = t * speed;
    for (const { o, y, cx, cz, rx, rz, speed, phase } of this.swimming) { // round and round, heading the way it swims
      const a = t * speed + phase;
      o.position.set(cx + Math.cos(a) * rx, y + Math.sin(t * 3 + phase) * 0.02, cz + Math.sin(a) * rz);
      o.rotation.y = Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz);
    }
    for (const { plate, coils, floor } of this.bouncing) { // springing up, again and again
      plate.position.y = floor + 0.045 + 0.07 * Math.abs(Math.sin(t * 3));
      for (const c of coils) c.scale.y = (plate.position.y - 0.025 - floor) / COIL_H; // the springs reach the plate, never through it
    }
    const m = new THREE.Matrix4(), at = new THREE.Vector3(), q0 = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const { dot, ink, start, v, g, n, DT, out } of this.arcs) { // dots flying along the arc from the muzzle, one step every DT / 0.22 s
      const shift = (t * 0.22 / DT) % 1;
      for (let k = 0; k < n; k++) {
        const tau = out + (k + shift) * DT;
        at.copy(start).addScaledVector(v, tau);
        at.y += 0.5 * g * tau * tau;
        s.setScalar(k === 0 ? shift : k === n - 1 ? 1 - shift : 1); // they grow in at the muzzle, shrink at the end
        m.compose(at, q0, s);
        dot.setMatrixAt(k, m);
        ink.setMatrixAt(k, m);
      }
      dot.instanceMatrix.needsUpdate = ink.instanceMatrix.needsUpdate = true;
    }
    const look = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
    for (const { streaks, lanes, reach, way, speed } of this.gusts) { // streaks crossing the zone, long in the middle, short at its edges
      look.setFromUnitVectors(Z, way);
      const side = new THREE.Vector3(-way.z, 0, way.x);
      lanes.forEach((lane, k) => {
        const u = (lane.phase + t * speed / (reach * 2)) % 1;
        at.copy(way).multiplyScalar((u * 2 - 1) * reach).addScaledVector(side, lane.side);
        at.y = lane.up;
        s.set(1, 1, 0.9 * Math.sin(Math.PI * u) + 0.05);
        m.compose(at, look, s);
        streaks.setMatrixAt(k, m);
      });
      streaks.instanceMatrix.needsUpdate = true;
    }
    for (const { motes, at: places, floor, height, speed } of this.floating) {
      places.forEach(([x, y0, z], k) => {
        const y = ((y0 + t * speed / height) % 1 + 1) % 1; // up, or down: round the zone's height
        at.set(x, floor + 0.05 + y * (height - 0.1), z);
        q0.setFromAxisAngle(UP, t * 2 + k);
        s.setScalar(Math.sin(Math.PI * y) * 0.8 + 0.2);
        m.compose(at, q0, s);
        motes.setMatrixAt(k, m);
      });
      motes.instanceMatrix.needsUpdate = true;
      q0.identity();
    }
  }

  // setBalls puts a ball of the scene on every ball of the game, and removes the others. colorOf
  // gives the colour of the ball of a player, when it is known; nameOf the name to show over it, or null.
  setBalls(balls, colorOf = () => null, nameOf = () => null) {
    for (const [id, mesh] of this.balls) {
      if (balls.has(id)) continue;
      this.scene.remove(mesh, mesh.userData.shadow);
      mesh.material.dispose();
      mesh.children[0].material.dispose();
      mesh.userData.shadow.material.dispose();
      this.balls.delete(id);
    }
    for (const [id, tag] of this.tags) {
      const name = balls.has(id) && nameOf(id), key = name && name + '\n' + colorOf(id);
      if (key === tag.key) continue;
      this.scene.remove(tag.sprite);
      tag.sprite.material.map.dispose();
      tag.sprite.material.dispose();
      this.tags.delete(id);
    }
    for (const b of balls.values()) {
      let mesh = this.balls.get(b.id);
      if (!mesh) {
        this.balls.set(b.id, mesh = new THREE.Mesh(this.ballShape, toon(0xffffff, { transparent: true })));
        mesh.castShadow = true;
        mesh.add(new THREE.Mesh(this.ballHull, new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide, transparent: true })));
        mesh.userData.shadow = new THREE.Mesh(this.ballShadow, new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.18, depthWrite: false }));
        mesh.userData.shadow.scale.setScalar(this.ballShape.parameters.radius * 1.1);
        this.scene.add(mesh, mesh.userData.shadow);
      }
      const color = colorOf(b.id);
      if (color && color !== mesh.userData.color) mesh.material.color.set(mesh.userData.color = color);
      mesh.position.set(b.x, b.y, b.z);
      mesh.material.opacity = mesh.children[0].material.opacity = b.flags & SOLID ? 1 : 0.45; // not shot yet: the other balls go through it
      mesh.visible = !(b.flags & HOLED && b.still); // in the cup for good: out of the way of the others' aim
      // its shadow, straight under it on the ground, if there is one close enough
      this.ray.set(mesh.position, DOWN);
      const under = mesh.visible && this.ray.intersectObjects(this.floors, false)[0], shadow = mesh.userData.shadow;
      shadow.visible = !!under;
      if (under) shadow.position.set(b.x, under.point.y + 0.01, b.z);
      const name = nameOf(b.id);
      let tag = this.tags.get(b.id);
      if (name && !tag) {
        const sprite = label(name, color ?? '#ffffff');
        sprite.scale.multiplyScalar(0.75);
        this.scene.add(sprite);
        this.tags.set(b.id, tag = { sprite, key: name + '\n' + color });
      }
      tag?.sprite.position.set(b.x, b.y + 0.42, b.z);
    }
  }

  // Aiming, drawn on the ground around our ball: a ring as soon as the button is down (grey while
  // letting go would cancel), and the arrow (a ribbon then a head, with an ink outline). It lies on
  // the ground along the aim: flat where
  // the ground is, bending where a slope starts, level over a drop or a step too steep to follow.
  // What stands in front of the arrow hides it, but the part a wall or an obstacle hides still shows,
  // faint: its length is the power.
  makeArrow() {
    const base = { transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 };
    const fill = new THREE.MeshBasicMaterial(base), ink = new THREE.MeshBasicMaterial({ ...base, color: INK });
    const ghost = new THREE.MeshBasicMaterial({ ...base, opacity: 0.3, depthFunc: THREE.GreaterDepth }); // only where something is in front
    const ribbon = () => {
      const g = new THREE.BufferGeometry(), index = [];
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARROW_STEPS * 2 * 3), 3));
      for (let i = 0; i + 1 < ARROW_STEPS; i++) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
      g.setIndex(index);
      return g;
    };
    const triangle = () => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    const shaft = ribbon(), head = triangle(), mesh = (geometry, material, order) => Object.assign(new THREE.Mesh(geometry, material), { renderOrder: order, frustumCulled: false });
    this.aiming = {
      ring: mesh(flat(new THREE.RingGeometry(0.27, 0.36, 32)), new THREE.MeshBasicMaterial({ ...base }), 5),
      edge: mesh(ribbon(), ink, 4), headEdge: mesh(triangle(), ink, 4),
      shaft: mesh(shaft, fill, 5), head: mesh(head, fill, 5),
      // drawn before the balls (order 0): only the course, not a ball, shows the arrow through
      ghostShaft: mesh(shaft, ghost, -1), ghostHead: mesh(head, ghost, -1),
    };
    this.aimGroup = new THREE.Group().add(...Object.values(this.aiming));
    this.aimGroup.visible = false;
    this.scene.add(this.aimGroup);
    this.ray = new THREE.Raycaster();
    this.ray.far = 3;
  }

  // ground is the height of the floor under (x, z) at most a unit above y, or null.
  ground(x, y, z) {
    this.ray.set(new THREE.Vector3(x, y + 1, z), DOWN);
    const hit = this.ray.intersectObjects(this.floors, false)[0];
    return hit ? hit.point.y : null;
  }

  // profile is the height of the ground at each distance of dists (in increasing order) from
  // (x, y, z) towards yaw: the floor, unless it rises or falls there faster than a slope.
  profile(x, y, z, yaw, dists) {
    const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
    let level = this.ground(x + dx * dists[0], y, z + dz * dists[0]) ?? y, prev = dists[0];
    return dists.map(s => {
      const g = this.ground(x + dx * s, level, z + dz * s);
      if (g !== null && Math.abs(g - level) <= (s - prev) * ARROW_SLOPE) level = g;
      prev = s;
      return level;
    });
  }

  hideAim() { this.aimGroup.visible = false; }

  // armed shows that the button is down on our ball, at (x, y, z) on the ground, letting go would cancel.
  armed(x, y, z) {
    this.aimGroup.visible = true;
    for (const m of Object.values(this.aiming)) m.visible = m === this.aiming.ring;
    this.placeRing(x, y, z, 0x8e9aa8);
  }

  placeRing(x, y, z, color) {
    const ring = this.aiming.ring;
    ring.position.set(x, (this.ground(x, y, z) ?? y) + 0.04, z);
    ring.material.color.set(color);
  }

  // aim shows the arrow from (x, y, z), on the ground under the ball, turned by yaw, length long; h
  // and l are its hue and lightness.
  aim(x, y, z, yaw, length, h, l) {
    const A = this.aiming;
    this.aimGroup.visible = true;
    for (const m of Object.values(A)) m.visible = true;
    this.placeRing(x, y, z, INK);
    const start = 0.32, end = start + length, tip = end + ARROW_HEAD; // clear of the ball, then the shaft, then the head
    const lay = (part, yaw, dists, heights, widths) => {
      const dx = -Math.sin(yaw), dz = -Math.cos(yaw), p = part.geometry.attributes.position;
      dists.forEach((s, i) => {
        const w = widths(i), py = heights[i] + ARROW_LIFT;
        p.setXYZ(2 * i, x + dx * s + dz * w, py, z + dz * s - dx * w);
        p.setXYZ(2 * i + 1, x + dx * s - dz * w, py, z + dz * s + dx * w);
      });
      p.needsUpdate = true;
    };
    // the arrow, along the swung yaw
    const dists = Array.from({ length: ARROW_STEPS }, (_, i) => start + i * length / (ARROW_STEPS - 1));
    const heights = this.profile(x, y, z, yaw, [...dists, tip]);
    lay(A.shaft, yaw, dists, heights, () => 0.065);
    lay(A.edge, yaw, dists, heights, () => 0.105);
    const dx = -Math.sin(yaw), dz = -Math.cos(yaw), tipY = heights[ARROW_STEPS - 1] + ARROW_LIFT, apexY = heights[ARROW_STEPS] + ARROW_LIFT;
    const head = (part, back, half, front) => {
      const q = part.geometry.attributes.position, s = end - back;
      q.setXYZ(0, x + dx * s + dz * half, tipY, z + dz * s - dx * half);
      q.setXYZ(1, x + dx * s - dz * half, tipY, z + dz * s + dx * half);
      q.setXYZ(2, x + dx * (tip + front), apexY, z + dz * (tip + front));
      q.needsUpdate = true;
    };
    head(A.head, 0, 0.22, 0);
    head(A.headEdge, 0.05, 0.29, 0.08);
    A.shaft.material.color.setHSL(h, 0.9, l);
    A.ghostShaft.material.color.copy(A.shaft.material.color);
  }

  // look places the camera at a distance from a point, turned by yaw and raised by pitch.
  look(x, y, z, yaw, pitch, dist) {
    this.camera.position.set(x + Math.sin(yaw) * Math.cos(pitch) * dist, y + Math.sin(pitch) * dist, z + Math.cos(yaw) * Math.cos(pitch) * dist);
    this.camera.lookAt(x, y, z);
    this.target.set(x, y, z);
  }

  render() {
    const at = new THREE.Vector3();
    for (const { o } of this.spinning) if (o.userData.facing) { // a token shows its number: it faces the camera
      o.getWorldPosition(at);
      o.rotation.y = Math.atan2(this.camera.position.x - at.x, this.camera.position.z - at.z) - (o.parent?.rotation.y ?? 0) + (o.userData.rock ?? 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

// ---------------------------------------------------------------------------- the course, merged
// Drawn one mesh per collider, a course made of pieces (tools/maps/lib.mjs: hundreds of facets) cost
// thousands of draw calls a frame, and its curved walls showed every facet. So the floors that stay
// put are merged, a few meshes per square of the course, without the sides that lie inside other
// floors (their seams showed as lines); and the plain walls are followed from end to end and drawn as
// one wall, mitred where two meet, shaded smooth through a gentle turn, with one outline and one crown.
const REGION = 8;  // floors are merged by squares this wide (what is off screen is not drawn)
const SMOOTH = Math.cos(30 * Math.PI / 180); // two walls meeting at a gentler turn than this are shaded as one
const SINK = 0.004; // the top of a wall's outline, under its top (a wall that joins it would show it as a line)
const boxMatrix = c => new THREE.Matrix4().compose(new THREE.Vector3(...c.c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(c.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
// inside gives a test of whether a point is inside collider c (a box or a post)
const inside = c => {
  const inv = boxMatrix(c).invert(), q = new THREE.Vector3();
  return p => {
    q.copy(p).applyMatrix4(inv);
    return c.shape === BOX ? Math.abs(q.x) < c.h[0] + 1e-4 && Math.abs(q.y) < c.h[1] + 1e-4 && Math.abs(q.z) < c.h[2] + 1e-4 : Math.hypot(q.x, q.z) < c.r && Math.abs(q.y) < c.hh;
  };
};
// Soup gathers triangles by material, each with its corners' normals and texture coordinates, and
// makes them one geometry, a group per material. A triangle faces the way its normals say.
class Soup {
  parts = new Map();
  tri(material, ps, ns, uvs) {
    if (!this.parts.has(material)) this.parts.set(material, { p: [], n: [], uv: [] });
    const t = this.parts.get(material), face = ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));
    const order = face.dot(ns[0].clone().add(ns[1]).add(ns[2])) < 0 ? [0, 2, 1] : [0, 1, 2];
    for (const i of order) { t.p.push(ps[i].x, ps[i].y, ps[i].z); t.n.push(ns[i].x, ns[i].y, ns[i].z); t.uv.push(uvs[i][0], uvs[i][1]); }
  }
  quad(material, ps, ns, uvs) {
    this.tri(material, [ps[0], ps[1], ps[2]], [ns[0], ns[1], ns[2]], [uvs[0], uvs[1], uvs[2]]);
    this.tri(material, [ps[0], ps[2], ps[3]], [ns[0], ns[2], ns[3]], [uvs[0], uvs[2], uvs[3]]);
  }
  get empty() { return this.parts.size === 0; }
  mesh(single) { // single: one material for all (an outline)
    const g = new THREE.BufferGeometry(), materials = [];
    let count = 0;
    for (const t of this.parts.values()) count += t.p.length / 3;
    const p = new Float32Array(count * 3), n = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let at = 0;
    for (const [m, t] of this.parts) {
      p.set(t.p, at * 3); n.set(t.n, at * 3); uv.set(t.uv, at * 2);
      if (!single) g.addGroup(at, t.p.length / 3, materials.length);
      materials.push(m);
      at += t.p.length / 3;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return new THREE.Mesh(g, single ?? materials);
  }
}
// course units on the two axes a face lies along (as patternUV), from its point q and normal n
const faceUV = (q, n) => Math.abs(n.y) > 0.5 ? [q.x / TILE, -q.z / TILE] : Math.abs(n.x) > 0.5 ? [-q.z / TILE, q.y / TILE] : [q.x / TILE, q.y / TILE];

// floorMeshes draws the floor boxes that stay put: their tops in their look, their sides in lip, but a
// side that lies inside other floors (two floors laid edge to edge, a fan of facets)
function floorMeshes(floors, lip) {
  const items = floors.map(c => ({ c, m: boxMatrix(c), inside: inside(c), at: new THREE.Vector3(...c.c), r: Math.hypot(...c.h) }));
  const regions = new Map(), q = new THREE.Vector3();
  for (const it of items) {
    const { c, m } = it, near = items.filter(o => o !== it && o.at.distanceTo(it.at) < o.r + it.r + 0.05);
    const key = Math.floor(c.c[0] / REGION) + ' ' + Math.floor(c.c[2] / REGION);
    if (!regions.has(key)) regions.set(key, new Soup());
    const soup = regions.get(key), top = surface(c) ?? MAT.floor, e = m.elements;
    for (const axis of [0, 1, 2]) for (const s of [1, -1]) {
      const [a1, a2] = [0, 1, 2].filter(k => k !== axis), point = (u, w, out = 0, y) => {
        const p = [0, 0, 0];
        p[axis] = s * (c.h[axis] + out); p[a1] = u * c.h[a1]; p[a2] = w * c.h[a2];
        if (y !== undefined) p[1] = y;
        return new THREE.Vector3(...p).applyMatrix4(m);
      };
      if (axis !== 1) { // a side: left out where, just outside it, its upper half is inside other floors
        const flatAxis = a1 === 1 ? a2 : a1;
        const hidden = [-0.9, -0.5, 0, 0.5, 0.9].every(f => {
          const p = [0, 0, 0];
          p[axis] = s * (c.h[axis] + 0.02); p[flatAxis] = f * c.h[flatAxis]; p[1] = 0.5 * c.h[1];
          q.set(...p).applyMatrix4(m);
          return near.some(o => o.inside(q));
        });
        if (hidden) continue;
      }
      const n = new THREE.Vector3(e[axis * 4], e[axis * 4 + 1], e[axis * 4 + 2]).multiplyScalar(s);
      const ps = [point(-1, -1), point(1, -1), point(1, 1), point(-1, 1)];
      // sand or ice laid on grass (sand on ice): a hair over it, or the two flicker
      if (axis === 1 && s === 1 && top !== MAT.floor) for (const p of ps) p.y += c.material === 'sand' ? 0.006 : 0.003;
      soup.quad(axis === 1 && s === 1 ? top : lip, ps, [n, n, n, n], ps.map(p => faceUV(p, n)));
    }
  }
  return [...regions.values()].map(s => s.mesh());
}

// wallMeshes draws the plain walls that stay put (a box each): each end of a wall goes on with the wall
// whose end is closest to it, if they are the same size, near enough and turn by less than 100°, the
// two choosing each other. A run of walls so joined (or a ring of them) is one wall, with its outline
// and its crown (theme T).
function wallMeshes(walls, colliders, T) {
  const segs = walls.map(c => {
    // a turned wall runs along its x (tools/maps/lib.mjs: rail, path, plate), even a facet shorter than
    // thick; an unturned one (block) along its longer side
    const e = boxMatrix(c).elements, alongX = c.rot?.some(v => v !== 0) || c.h[0] >= c.h[2];
    const dir = alongX ? new THREE.Vector3(e[0], e[1], e[2]) : new THREE.Vector3(e[8], e[9], e[10]);
    return { c, mid: new THREE.Vector3(...c.c), dir, up: new THREE.Vector3(e[4], e[5], e[6]), L: alongX ? c.h[0] : c.h[2], W: alongX ? c.h[2] : c.h[0], H: c.h[1], best: [], link: [] };
  });
  const tip = (s, k) => s.mid.clone().addScaledVector(s.dir, k * s.L); // k: 1 one end, -1 the other
  const end = k => (k > 0 ? 1 : 0);
  for (const s of segs) for (const k of [-1, 1]) {
    let found = null, bestD = Infinity;
    for (const o of segs) {
      if (o === s || Math.abs(o.H - s.H) > 0.01 || Math.abs(o.W - s.W) > 0.01 || o.up.dot(s.up) < 0.9) continue;
      for (const kk of [-1, 1]) {
        const d = tip(s, k).distanceTo(tip(o, kk));
        if (d < 2 * s.W + 0.05 && d < bestD && s.dir.dot(o.dir) * -k * kk > -0.17) { bestD = d; found = [o, kk]; }
      }
    }
    s.best[end(k)] = found;
  }
  for (const s of segs) for (const k of [-1, 1]) {
    const b = s.best[end(k)];
    if (b && b[0].best[end(b[1])]?.[0] === s && b[0].best[end(b[1])][1] === k) s.link[end(k)] = b;
  }
  // the runs: from a free end, then the rings
  const chains = [], seen = new Set();
  const walk = (s, flip) => {
    const chain = [];
    for (let at = [s, flip]; at && !seen.has(at[0]);) {
      const [w, f] = at, d = w.dir.clone().multiplyScalar(f ? -1 : 1);
      seen.add(w);
      chain.push({ w, d, a: tip(w, f ? 1 : -1), b: tip(w, f ? -1 : 1), right: d.clone().cross(w.up).normalize() });
      const next = w.link[end(f ? -1 : 1)];
      at = next && [next[0], next[1] > 0]; // entered at its end +1: it is walked backwards
    }
    return chain;
  };
  for (const s of segs) if (!seen.has(s) && (!s.link[0] || !s.link[1])) chains.push({ chain: walk(s, !s.link[1] && !!s.link[0]), closed: false });
  for (const s of segs) if (!seen.has(s)) chains.push({ chain: walk(s, false), closed: true });

  const blockers = colliders.filter(o => o.kind !== FLOOR && !o.motion).map(o => ({ o, inside: inside(o) }));
  const meshes = [];
  for (const { chain, closed } of chains) {
    const n = chain.length, { W, H } = chain[0].w;
    const off = (el, [sx, ty]) => el.right.clone().multiplyScalar(sx).addScaledVector(el.w.up, ty);
    // the ring of a profile (points [across, up] from the middle line) where element k starts
    const joint = (A, B, q) => { // where the line of q along A meets the line of q along B
      const pA = A.b.clone().add(off(A, q)), pB = B.a.clone().add(off(B, q)), w0 = pA.clone().sub(pB);
      const a = A.d.dot(A.d), b = A.d.dot(B.d), c = B.d.dot(B.d), d = A.d.dot(w0), e = B.d.dot(w0), den = a * c - b * b;
      if (den > 1e-6) {
        const t = (b * e - c * d) / den, u = (a * e - b * d) / den;
        const p = pA.clone().addScaledVector(A.d, t).add(pB.clone().addScaledVector(B.d, u)).multiplyScalar(0.5);
        if (p.distanceTo(pA) < 1) return p;
      }
      return pA.add(pB).multiplyScalar(0.5);
    };
    const rings = (profile, ext = [0, 0]) => Array.from({ length: n + 1 }, (_, k) => {
      if (closed || (k > 0 && k < n)) return profile.map(q => joint(chain[(k - 1 + n) % n], chain[k % n], q));
      const el = k === 0 ? chain[0] : chain[n - 1];
      return profile.map(q => (k === 0 ? el.a : el.b).clone().add(off(el, q)).addScaledVector(el.d, k === 0 ? -ext[0] : ext[1]));
    });
    const arc = [0];
    for (const el of chain) arc.push(arc.at(-1) + el.a.distanceTo(el.b));
    const smoothAt = k => (closed || (k > 0 && k < n)) && chain[(k - 1 + n) % n].d.dot(chain[k % n].d) > SMOOTH;
    // sweep puts the faces of elements k0 to k1 of a profile's rings in soup: its edges (smooth: the
    // points of the profile it is shaded round), its ends where the run ends
    const sweep = (soup, R, profile, smooth, k0, k1, material) => {
      const P = profile.length, mid = profile.reduce((s, q) => [s[0] + q[0] / P, s[1] + q[1] / P], [0, 0]);
      const F = (k, e) => { // the normal of face (k, e), outwards
        k = (k + n) % n; e = (e + P) % P;
        const a = R[k][e], b = R[k][(e + 1) % P], c = R[k + 1][e];
        const f = c.clone().sub(a).cross(b.clone().sub(a)).normalize();
        const out = off(chain[k], [(profile[e][0] + profile[(e + 1) % P][0]) / 2 - mid[0], (profile[e][1] + profile[(e + 1) % P][1]) / 2 - mid[1]]);
        return f.dot(out) < 0 ? f.negate() : f;
      };
      for (let k = k0; k < k1; k++) for (let e = 0; e < P; e++) {
        const f = F(k, e), corners = [[k, e], [k, e + 1], [k + 1, e + 1], [k + 1, e]];
        const ns = corners.map(([r, p]) => {
          const sum = f.clone(), ks = [k], es = [e];
          if (smoothAt(r)) ks.push(r === k ? k - 1 : k + 1);
          if (smooth[p % P]) es.push(p === e ? e - 1 : e + 1);
          for (const kk of ks) for (const ee of es) if (kk !== k || ee !== e) if (closed || (kk >= 0 && kk < n)) sum.add(F(kk, ee));
          return sum.normalize();
        });
        const ps = corners.map(([r, p]) => R[r][p % P]);
        const uv = corners.map(([r, p], i) => [arc[r] / TILE, Math.abs(f.y) > 0.5 ? profile[p % P][0] / TILE : ps[i].y / TILE]);
        soup.quad(material(f), ps, ns, uv);
      }
      if (!closed) for (const [k, sign] of [[0, -1], [n, 1]]) {
        if ((k === 0 && k0 !== 0) || (k === n && k1 !== n)) continue;
        const nn = chain[k === 0 ? 0 : n - 1].d.clone().multiplyScalar(sign);
        for (let i = 1; i + 1 < P; i++) soup.tri(material(nn), [R[k][0], R[k][i], R[k][i + 1]], [nn, nn, nn], [[0, 0], [0, 0], [0, 0]]);
      }
    };
    // the outline stands out of a free end, not out of an end against another wall or a post
    const blocked = k => {
      const el = k === 0 ? chain[0] : chain[n - 1], p = (k === 0 ? el.a : el.b).clone().addScaledVector(el.d, k === 0 ? -0.02 : 0.02).addScaledVector(el.w.up, H * 0.5);
      return blockers.some(({ o, inside }) => !chain.some(x => x.w.c === o) && inside(p));
    };
    const wall = [[-W, -H], [W, -H], [W, H], [-W, H]];
    const ink = [[-W - HULL, -H - HULL], [W + HULL, -H - HULL], [W + HULL, H - SINK], [-W - HULL, H - SINK]];
    const R = rings(wall), Rink = rings(ink, closed ? [0, 0] : [blocked(0) ? 0 : HULL, blocked(n) ? 0 : HULL]);
    const rail = H <= 0.5 ? T.rail : null;
    let crown = null;
    if (rail?.rod !== undefined) {
      const rx = rail.r ? rail.r(2 * W) : W, arcAt = (r, h, i) => [r * Math.cos(Math.PI * i / 8), H + h * Math.sin(Math.PI * i / 8)];
      const profile = Array.from({ length: 9 }, (_, i) => arcAt(rx, rail.rod, i)), inkProfile = Array.from({ length: 9 }, (_, i) => arcAt(rx + HULL * 0.7, rail.rod + HULL * 0.7, i));
      const smooth = profile.map((_, i) => i > 0 && i < 8);
      crown = { R: rings(profile), Rink: rings(inkProfile), profile, inkProfile, smooth };
    } else if (rail?.slab !== undefined) {
      const o = W + 0.03, profile = [[-o, H], [o, H], [o, H + rail.slab], [-o, H + rail.slab]], d = HULL * 0.7;
      const inkProfile = [[-o - d, H - d], [o + d, H - d], [o + d, H + rail.slab + d], [-o - d, H + rail.slab + d]];
      crown = { R: rings(profile), Rink: rings(inkProfile), profile, inkProfile, smooth: [false, false, false, false] };
    }
    const plain = [false, false, false, false], side = T.wall[0], top = T.wall[2];
    {
      const k0 = 0, k1 = n, body = new Soup(), outline = new Soup();
      sweep(body, R, wall, plain, k0, k1, f => (f.y > 0.5 ? top : side));
      sweep(outline, Rink, ink, plain, k0, k1, () => HULL_MAT);
      const mesh = body.mesh(), inkMesh = outline.mesh(HULL_MAT);
      inkMesh.name = 'ink';
      mesh.add(inkMesh);
      if (crown) {
        const s = new Soup(), si = new Soup();
        sweep(s, crown.R, crown.profile, crown.smooth, k0, k1, () => rail.material);
        const cm = s.mesh(rail.material);
        if (!rail.glow) { sweep(si, crown.Rink, crown.inkProfile, crown.smooth, k0, k1, () => HULL_MAT); const ci = si.mesh(HULL_MAT); ci.name = 'ink'; cm.add(ci); }
        mesh.add(cm);
      } else if (rail?.piece) { // pieces every step along the run, from half a step
        const parts = [];
        for (let u = rail.step / 2 + Math.ceil((arc[k0] - rail.step / 2) / rail.step) * rail.step; u < arc[k1]; u += rail.step) {
          let k = k0;
          while (k + 1 < k1 && arc[k + 1] <= u) k++;
          const el = chain[k], at = el.a.clone().addScaledVector(el.d, u - arc[k]).addScaledVector(el.w.up, H);
          parts.push(rail.piece(2 * W).applyMatrix4(new THREE.Matrix4().makeBasis(el.d, el.w.up, el.right).setPosition(at)));
        }
        if (parts.length) {
          const cm = new THREE.Mesh(mergeGeometries(parts), rail.material);
          if (!rail.glow) cm.add(Object.assign(outlineAround(cm.geometry), { name: 'ink' }));
          mesh.add(cm);
        }
      }
      meshes.push(mesh);
    }
  }
  return meshes;
}

// outline is the ink around a wall or a post: a box (a cylinder) a little bigger, seen from inside.
// Where walls meet it must not show: it does not rise over the top (a wall that joins at the same
// height would show it as a line across its top), and a side that ends inside another wall or post
// (a corner, a T, two slopes) does not stand out of it.
const outlineGeometry = (c, colliders) => {
  const SINK = 0.004; // its top, under the top of the wall
  if (c.motion) { // what moves meets nothing for good, and turns: all round
    const g = c.shape === BOX ? new THREE.BoxGeometry(c.h[0] * 2 + HULL * 2, c.h[1] * 2 + HULL * 2, c.h[2] * 2 + HULL * 2) : new THREE.CylinderGeometry(c.r + HULL, c.r + HULL, c.hh * 2 + HULL * 2, 24);
    return g;
  }
  if (c.shape !== BOX) {
    const g = new THREE.CylinderGeometry(c.r + HULL, c.r + HULL, c.hh * 2 + HULL - SINK, 24);
    return g.translate(0, -(HULL + SINK) / 2, 0);
  }
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...c.c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...c.rot)), new THREE.Vector3(1, 1, 1));
  const others = colliders.filter(o => o !== c && o.kind !== FLOOR && !o.motion && !c.motion).map(o => {
    const inv = new THREE.Matrix4().compose(new THREE.Vector3(...o.c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1)).invert();
    return p => { const q = p.clone().applyMatrix4(inv); return o.shape === BOX ? Math.abs(q.x) < o.h[0] && Math.abs(q.y) < o.h[1] && Math.abs(q.z) < o.h[2] : Math.hypot(q.x, q.z) < o.r && Math.abs(q.y) < o.hh; };
  });
  // how far each side of the box goes out: -x, +x, -z, +z
  const out = [[0, -1], [0, 1], [2, -1], [2, 1]].map(([axis, s]) => {
    const p = new THREE.Vector3(0, 0, 0);
    p.setComponent(axis, s * (c.h[axis] + 0.02));
    p.y = c.h[1] * 0.5; // the upper half, where it shows
    return others.some(inside => inside(p.clone().applyMatrix4(m))) ? 0 : HULL;
  });
  const g = new THREE.BoxGeometry(c.h[0] * 2 + out[0] + out[1], c.h[1] * 2 + HULL - SINK, c.h[2] * 2 + out[2] + out[3]);
  return g.translate((out[1] - out[0]) / 2, -(HULL + SINK) / 2, (out[3] - out[2]) / 2);
};
const outline = (c, colliders) => new THREE.Mesh(outlineGeometry(c, colliders), HULL_MAT);
// outlineAround is the ink around a simple closed shape (a box, a cylinder): the shape pushed out
// along its smoothed normals, seen from inside
const outlineAround = geometry => {
  const g = mergeVertices(geometry.clone().deleteAttribute('uv').deleteAttribute('normal'), 1e-4);
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * HULL * 0.7, p.getY(i) + n.getY(i) * HULL * 0.7, p.getZ(i) + n.getZ(i) * HULL * 0.7);
  return new THREE.Mesh(g, HULL_MAT);
};

// skirt is the ground the course stands on: under each floor with no other floor beneath it (not a
// bridge, nothing that moves), its outline goes straight down into the sea: grass hanging in
// scallops from the edge, a band of earth, rock under a wavy line. Flush with the floor: a ball that
// falls off the edge falls along it. It starts from the top of the floor (where two slopes meet, so
// do their skirts) a floor's thickness down.
function skirt(colliders, bottom, faces = [MAT.side, MAT.earth, MAT.rock]) {
  const EARTH = 0.9, STEP = 0.45; // the depth of the earth under a floor; the length of a scallop
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const wave = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }; // the same at the same place
  const floors = colliders.filter(c => c.kind === FLOOR && c.shape === BOX && !c.motion).map(c => {
    m.compose(new THREE.Vector3(...c.c), q.setFromEuler(e.set(...(c.rot ?? [0, 0, 0]))), one);
    const corner = (sx, sy, sz) => new THREE.Vector3(sx * c.h[0], sy * c.h[1], sz * c.h[2]).applyMatrix4(m);
    const top = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => corner(sx, 1, sz));
    const lows = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => corner(sx, -1, sz).y);
    const xs = top.map(p => p.x), zs = top.map(p => p.z);
    return { edge: top.map(p => p.clone().setY(p.y - c.h[1] * 2)), low: Math.min(...lows), high: Math.max(...top.map(p => p.y)),
      minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  });
  const bands = [[], [], []]; // grass, earth, rock: triangles
  const tri = (list, ...ps) => { for (const p of ps) list.push(p.x, p.y, p.z); };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  // a floor lower than f under the point (x, z): the skirt of f stops there (a bridge, a ledge over a floor)
  const over = (f, x, z) => floors.some(o => o !== f && o.high < f.low - 0.01 && x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ);
  // a floor right against f's edge at (x, z), as high: two floors laid edge to edge, no skirt between them
  const joined = (f, x, z, y) => floors.some(o => o !== f && o.high >= y - 0.05 && o.low <= y && x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ);
  for (const f of floors) {
    const mid = f.edge.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / 4);
    for (let i = 0; i < 4; i++) {
      let a = f.edge[i], b = f.edge[(i + 1) % 4];
      const out = v((a.x + b.x) / 2 - mid.x, 0, (a.z + b.z) / 2 - mid.z), along = b.clone().sub(a);
      if (along.z * out.x - along.x * out.z < 0) [a, b] = [b, a]; // counter-clockwise seen from outside
      // the earth stands a little out of the floor's side, the grass further: flush, they would flicker
      const n = Math.max(1, Math.round(a.distanceTo(b) / STEP)), push = out.normalize().multiplyScalar(0.024), off = out.clone().multiplyScalar(0.5);
      for (let k = 0; k < n; k++) {
        let p = a.clone().lerp(b, k / n), r = a.clone().lerp(b, (k + 1) / n);
        if (over(f, (p.x + r.x) / 2 - out.x * 2, (p.z + r.z) / 2 - out.z * 2)) continue; // (out is 0.024 long: just inside the edge)
        if (joined(f, (p.x + r.x) / 2 + out.x * 2, (p.z + r.z) / 2 + out.z * 2, (p.y + r.y) / 2)) continue; // just outside it
        p = p.add(off); r = r.add(off);
        const dp = EARTH + (wave(p.x, p.z) - 0.5) * 0.35, dr = EARTH + (wave(r.x, r.z) - 0.5) * 0.35; // earth over rock, wavy
        const pe = v(p.x, p.y - dp, p.z), re = v(r.x, r.y - dr, r.z);
        tri(bands[1], p, r, re); tri(bands[1], p, re, pe);
        const pb = v(p.x, Math.min(bottom, pe.y), p.z), rb = v(r.x, Math.min(bottom, re.y), r.z);
        tri(bands[2], pe, re, rb); tri(bands[2], pe, rb, pb);
        // a scallop of grass hanging from the edge, just out of the earth
        const depth = 0.16 + wave(p.z, p.x) * 0.14, arc = [];
        for (let j = 0; j <= 4; j++) {
          const s = j / 4, c = p.clone().lerp(r, s).add(push);
          arc.push(c.setY(c.y - Math.sin(s * Math.PI) * depth));
        }
        const p0 = p.clone().add(push), r0 = r.clone().add(push);
        for (let j = 0; j < 4; j++) tri(bands[0], j < 2 ? p0 : r0, arc[j + 1], arc[j]);
        tri(bands[0], p0, r0, arc[2]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(bands.flat(), 3));
  let start = 0;
  bands.forEach((list, i) => { geometry.addGroup(start, list.length / 3, i); start += list.length / 3; });
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, faces);
}

// SHORE draws how far from a shore each point of a pool is, in course units (up to SHORE_FAR: further,
// the water is deep whatever drifts), a sample every SHORE_STEP, the first and last ones on its edges.
const SHORE_FAR = 1.5, SHORE_STEP = 0.05;
const SHORE = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: {
    box: { value: new THREE.Vector4(0, 0, 1, 1) }, round: { value: 0 }, area: { value: new THREE.Vector4(0, 0, 1, 1) }, cells: { value: new THREE.Vector2(2, 2) },
    others: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) },
  },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform float round; uniform vec4 box, area; uniform vec2 cells; uniform vec4 others[16];
vec2 w;
bool wet(vec2 p) { // another pool there: the water goes on, no shore
  for (int i = 0; i < 16; i++) if (p.x > others[i].x && p.y > others[i].y && p.x < others[i].z && p.y < others[i].w) return true;
  return false;
}
bool water(vec2 p) { return (p.x > box.x && p.y > box.y && p.x < box.z && p.y < box.w) || wet(p); }
float shore() { // how far from a shore, in course units
  if (round > 0.5) return box.z - length(w - box.xy);
  float d = 1e3;
  vec2 lo = box.xy, hi = box.zw;
  if (!wet(vec2(lo.x - 0.2, w.y))) d = min(d, w.x - lo.x);
  if (!wet(vec2(hi.x + 0.2, w.y))) d = min(d, hi.x - w.x);
  if (!wet(vec2(w.x, lo.y - 0.2))) d = min(d, w.y - lo.y);
  if (!wet(vec2(w.x, hi.y + 0.2))) d = min(d, hi.y - w.y);
  // where pools meet, the shores of the others count too: look around for dry ground
  for (int k = 0; k < 8; k++) {
    vec2 dir = vec2(cos(float(k) * 0.785398), sin(float(k) * 0.785398));
    float was = 0.0;
    for (int j = 1; j <= 6; j++) {
      float s = 0.06 * float(j * j) / 2.0 + 0.04; // 0.07 to 1.12, finer near
      if (!water(w + dir * s)) {
        for (int b = 0; b < 4; b++) { float m = (was + s) * 0.5; if (water(w + dir * m)) was = m; else s = m; } // the shore, closer
        d = min(d, s);
        break;
      }
      was = s;
    }
  }
  return d;
}
void main() {
  w = mix(area.xy, area.zw, (gl_FragCoord.xy - 0.5) / (cells - 1.0));
  gl_FragColor = vec4(clamp(shore() / ${SHORE_FAR.toFixed(1)}, 0.0, 1.0), 0.0, 0.0, 1.0);
}`,
}));
SHORE.frustumCulled = false;
const SHORE_VIEW = new THREE.Camera(); // (the quad is drawn as it is, over the whole texture)
// WATER is a hazard's pool, alive: shallow and light along its shores, deep in the middle, slow swells,
// a few crests running across, and foam lapping at every shore (not where it goes on into another
// pool). Noise in course units: never the same twice. Each pool has its own (waterOf), with the shared
// clock, and its distance to the shore drawn once into a texture (SHORE): searched for at every pixel,
// every frame, it cost more than all the rest of the picture.
const WATER = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 }, shore: { value: null }, area: { value: new THREE.Vector4(0, 0, 1, 1) }, cells: { value: new THREE.Vector2(2, 2) },
    deep: { value: new THREE.Color('#1b6db5') }, mid: { value: new THREE.Color('#3ba6de') }, light: { value: new THREE.Color('#d6f3ff') }, foam: { value: new THREE.Color('#ffffff') },
  },
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  vertexShader: 'varying vec2 w; void main() { vec4 p = modelMatrix * vec4(position, 1.0); w = p.xz; gl_Position = projectionMatrix * viewMatrix * p; }',
  fragmentShader: `uniform float time; uniform sampler2D shore; uniform vec4 area; uniform vec2 cells; uniform vec3 deep, mid, light, foam; varying vec2 w;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { return 0.55 * n(p) + 0.3 * n(p * 2.1 + 7.3) + 0.15 * n(p * 4.3 + 1.7); }
void main() {
  vec2 at = (w - area.xy) / (area.zw - area.xy) * (cells - 1.0) + 0.5; // the samples are on the edges of the area
  float d = texture2D(shore, at / cells).r * ${SHORE_FAR.toFixed(1)}, drift = fbm(w * 0.3 + vec2(time * 0.04, time * 0.03));
  vec3 c = mix(mid, deep, smoothstep(0.1, 1.2, d + (drift - 0.5) * 0.6)); // shallow along the shore only
  c *= 0.95 + 0.1 * smoothstep(0.45, 0.8, fbm(w * 0.45 + vec2(-time * 0.05, time * 0.04))); // slow swells
  float s = n(w * 5.0 + vec2(time * 0.6, time * 0.2)) * n(w * 4.3 - vec2(time * 0.3, -time * 0.5));
  c = mix(c, light, smoothstep(0.7, 0.78, s) * 0.85); // sparkles, here and there
  float wobble = fbm(w * 1.2 + vec2(time * 0.2, -time * 0.15));
  float lap = d - (0.06 + 0.22 * wobble);
  c = mix(c, foam, (1.0 - smoothstep(0.0, 0.035, lap)) * (0.55 + 0.45 * smoothstep(0.3, 0.6, wobble))); // foam lapping at the shore
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
});
// waterOf gives the water of the pool of hazard zone z (its outline, the pools around it), among zones,
// its shore drawn by renderer. Its texture goes with it (userData.shore).
function waterOf(z, zones, renderer) {
  const m = WATER.clone();
  m.uniforms.time = WATER.uniforms.time; // one clock for every pool
  const rect = o => o.shape === BOX ? [o.c[0] - o.h[0], o.c[2] - o.h[2], o.c[0] + o.h[0], o.c[2] + o.h[2]] : [o.c[0] - o.r, o.c[2] - o.r, o.c[0] + o.r, o.c[2] + o.r];
  const u = SHORE.material.uniforms;
  if (z.shape === BOX) { u.round.value = 0; u.box.value.set(...rect(z)); }
  else { u.round.value = 1; u.box.value.set(z.c[0], z.c[2], z.r, 0); }
  const [x0, z0, x1, z1] = rect(z);
  const near = zones.filter(o => o !== z && o.type === 'hazard' && o.shape === BOX).map(rect)
    .filter(([a, b, c, d]) => a < x1 + 0.5 && c > x0 - 0.5 && b < z1 + 0.5 && d > z0 - 0.5).slice(0, 16);
  u.others.value.forEach((v, i) => i < near.length ? v.set(...near[i]) : v.setScalar(1e4));
  const cells = new THREE.Vector2(...[x1 - x0, z1 - z0].map(s => Math.min(1024, Math.ceil(s / SHORE_STEP) + 1)));
  const target = new THREE.WebGLRenderTarget(cells.x, cells.y, { format: THREE.RedFormat, depthBuffer: false });
  u.area.value.set(x0, z0, x1, z1);
  u.cells.value.copy(cells);
  renderer.setRenderTarget(target);
  renderer.render(SHORE, SHORE_VIEW);
  renderer.setRenderTarget(null);
  m.uniforms.shore.value = target.texture;
  m.uniforms.area.value.set(x0, z0, x1, z1);
  m.uniforms.cells.value.copy(cells);
  m.userData.shore = target;
  return m;
}

// sky is a dome around everything: blue overhead, fading to a warm horizon.
function sky() {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PALETTE.sky) }, low: { value: new THREE.Color(PALETTE.horizon) }, stars: { value: 0 } },
    vertexShader: 'varying vec3 d; void main() { d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, low; uniform float stars; varying vec3 d;
void main() {
  vec3 c = mix(low, top, smoothstep(-0.02, 0.2, d.y));
  vec3 cell = floor(d * 160.0);
  float star = step(0.9965, fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453)) * smoothstep(0.08, 0.35, d.y); // a few, high in the sky
  gl_FragColor = vec4(mix(c, vec3(1.0, 0.97, 0.88), star * stars), 1.0);
  #include <colorspace_fragment>
}`,
  }));
  dome.renderOrder = -10;
  dome.onBeforeRender = (r, s, camera) => dome.position.copy(camera.position);
  return dome;
}

// cupFloor is the floor the cup is cut into: its outline with a round hole, given its thickness.
function cupFloor(c, cup) {
  const [x, y, z] = c.c, [hx, hy, hz] = c.h;
  const outline = new THREE.Shape([[x - hx, -z - hz], [x + hx, -z - hz], [x + hx, -z + hz], [x - hx, -z + hz]].map(p => new THREE.Vector2(...p)));
  outline.holes.push(new THREE.Path().absarc(cup.x, -cup.z, cup.r, 0, Math.PI * 2, true));
  return flat(new THREE.ExtrudeGeometry(outline, { depth: hy * 2, bevelEnabled: false, curveSegments: 48 })).translate(0, y - hy, 0);
}
