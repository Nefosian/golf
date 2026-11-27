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
  // the props made here (craft, below) for the themes fete, ferme, galaxie and noel
  hay: 0xf2c94c, hay2: 0xd9a930, barn: 0xc6412f, pine: 0x1f7a4c, pine2: 0x175f3d, neon: 0x4df3ff, space: 0x3b2f7a, snow: 0xf4fbff, carrot: 0xff7a1f,
};
// toon shading: three flat tones (shade, middle, light); pale things get a softer ramp, or their
// shade turns to dirty grey
const ramp = (values, smooth = false) => {
  const t = new THREE.DataTexture(new Uint8Array(values), values.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
};
// (2026-11-25) blended rather than flat: the shapes read rounder, closer to real light, the ink
// outlines keep the sticker style
const tones = ramp([112, 140, 172, 205, 232, 250, 255], true), softTones = ramp([196, 212, 228, 242, 252, 255], true);
const PALE = new Set([PALETTE.cream, PALETTE.white, PALETTE.sand]);
// (2026-11-25) The realistic drawing: every surface is a physical material (it takes the light, the
// shadows and the sky's reflection as a real one would); the ink outlines are gone (their meshes stay,
// not drawn). toon keeps its name: it is the one place a plain material is made.
const toon = (color, more) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...more });
// how rough and how metallic a colour of the palette is, when it is not plain painted or natural matter
const FINISH = { gold: { roughness: 0.3, metalness: 1 }, steel: { roughness: 0.38, metalness: 0.85 }, sun: { roughness: 0.55 }, red: { roughness: 0.6 },
  cream: { roughness: 0.7 }, white: { roughness: 0.7 }, cloud: { roughness: 1 }, snow: { roughness: 0.95 }, neon: { roughness: 0.3, emissive: 0x2fb8c4, emissiveIntensity: 0.6 },
  mint: { roughness: 0.15, metalness: 0.1 }, water: { roughness: 0.1 } };
const INK_MAT = new THREE.MeshBasicMaterial({ color: PALETTE.ink, visible: false });
const HULL_MAT = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide, visible: false }); // an outline around a plain shape: not drawn any more
const HULL = 0.035; // how far an outline stands out of its shape
// grass: mowed in diagonal bands, crossed more faintly, in course units, whatever floor it is on
const grass = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.92, metalness: 0, normalMap: turf(), normalScale: new THREE.Vector2(0.55, 0.55) });
// Grass: mown in broad bands along the hole (tee to cup), with a soft unevenness, and lighter the
// higher it is on the hole: a slope reads as a change of shade, a hollow as a darker green (GRASS:
// set for each hole, see setHole).
const NO_CONTACT = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
NO_CONTACT.needsUpdate = true;
const GRASS = { along: { value: new THREE.Vector2(0, -1) }, low: { value: 0 }, high: { value: 1 },
  contact: { value: NO_CONTACT }, contactArea: { value: new THREE.Vector4(0, 0, 1, 1) } };
grass.onBeforeCompile = s => {
  Object.assign(s.uniforms, { mowAlong: GRASS.along, mowLow: GRASS.low, mowHigh: GRASS.high, contact: GRASS.contact, contactArea: GRASS.contactArea });
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMow;\nvarying vec3 vUp;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvMow = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUp = normalize(mat3(modelMatrix) * objectNormal);');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMow;
varying vec3 vUp;
uniform vec2 mowAlong; uniform float mowLow, mowHigh; uniform sampler2D contact; uniform vec4 contactArea;
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
diffuseColor.rgb *= clamp(1.0 + 1.1 * facing, 0.7, 1.12);
// a fine grain, like blades seen from afar
float grain = mowNoise(vMow.xz * 7.0) * 0.55 + mowNoise(vMow.xz * 21.0 + 3.7) * 0.45;
diffuseColor.rgb *= 0.95 + 0.1 * grain;
float lumen = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
diffuseColor.rgb = mix(vec3(lumen), diffuseColor.rgb, 0.8) * 0.88;
float dry = smoothstep(0.55, 0.85, mowNoise(vMow.xz * 0.09 + 13.0));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.03, 0.72), dry * 0.4);
// in the shade of the walls and posts close by (r: how much, g / r: the height of their foot), not of
// those on another level
vec4 near = texture2D(contact, (vMow.xz - contactArea.xy) / (contactArea.zw - contactArea.xy));
float level = 1.0 - smoothstep(0.35, 0.8, abs(vMow.y - near.g / max(near.r, 1e-3)));
diffuseColor.rgb *= 1.0 - 0.6 * smoothstep(0.0, 0.75, near.r) * level;`);
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
const PROP_MAT = Object.fromEntries(Object.entries(PALETTE).map(([k, c]) => [k, k === 'ink' ? INK_MAT : toon(c, FINISH[k])]));
const KIT = {}; // prop name -> its object, to clone
for (const o of (await new GLTFLoader().loadAsync(new URL('./models/kit.glb', import.meta.url).href)).scene.children) {
  o.traverse(m => {
    if (!m.isMesh) return;
    if (!PROP_MAT[m.material.name]) throw new Error(`kit.glb: ${o.name} has a colour PALETTE does not know: ${m.material.name}`);
    m.material = PROP_MAT[m.material.name];
  });
  o.traverse(m => { if (m.userData.ink) m.add(inkShell(m, m.userData.ink)); });
  o.traverse(m => { if (m.isMesh) m.userData.kit = true; });
  o.traverse(m => { if (m.isMesh && !m.geometry.attributes.uv) boxUV(m.geometry, 1.2); });
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
// ---------------------------------------------------------------------------- crafted props
// The props of the themes fete, ferme, galaxie and noel are made here from simple shapes, in the
// style of the kit: flat toon colours of PALETTE (so that a theme can recolour them), an ink outline
// round each piece. Each is modelled at the size the decor shows it, its origin on the ground.
const PI2 = Math.PI * 2; // (TAU comes later in the file)
const part = (geometry, key) => new THREE.Mesh(geometry, PROP_MAT[key]);
// inked: a piece with its outline (the same shell the kit's props get)
const inked = (geometry, key, t = 0.03) => { const m = part(geometry, key); m.add(inkShell(m, t)); return m; };
function craft(name, ...pieces) {
  const o = new THREE.Group();
  o.name = name;
  for (const p of pieces.flat()) o.add(p);
  o.traverse(m => { if (m.isMesh) m.userData.kit = true; });
  KIT[name] = o;
  return o;
}
const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i * PI2 / n, i));
{
  const C = (r0, r1, h, n = 16, a0 = 0, a = PI2) => new THREE.CylinderGeometry(r0, r1, h, n, 1, false, a0, a);
  const S = (r, w = 16, h = 10) => new THREE.SphereGeometry(r, w, h);
  const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  // ferme: a round bale of hay on its side, a sunflower, a red barn with its white door
  craft('hay', inked(C(0.42, 0.42, 0.7, 20).rotateZ(Math.PI / 2).translate(0, 0.42, 0), 'hay'),
    ...[-0.2, 0.2].map(x => part(C(0.425, 0.425, 0.05, 20).rotateZ(Math.PI / 2).translate(x, 0.42, 0), 'hay2')));
  craft('sunflower', inked(C(0.04, 0.05, 1.1, 6).translate(0, 0.55, 0), 'leaf', 0.02),
    inked(new THREE.SphereGeometry(0.16, 10, 6).scale(1.4, 0.4, 0.7).translate(0.15, 0.55, 0), 'leaf', 0.02),
    inked(C(0.3, 0.3, 0.06, 12).rotateX(Math.PI / 2 - 0.3).translate(0, 1.15, 0.03), 'sun', 0.025),
    part(C(0.14, 0.14, 0.08, 12).rotateX(Math.PI / 2 - 0.3).translate(0, 1.15, 0.06), 'earth2'));
  const roof = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-2.4, 0), new THREE.Vector2(2.4, 0), new THREE.Vector2(0, 1.7)]), { depth: 4.6, bevelEnabled: false }).translate(0, 2.6, -2.3);
  craft('barn', inked(B(4, 2.6, 4).translate(0, 1.3, 0), 'barn', 0.05), inked(roof, 'dark', 0.05),
    part(B(1.7, 1.9, 0.06).translate(0, 0.95, 2.02), 'cream'), part(B(1.3, 1.5, 0.08).translate(0, 0.85, 2.03), 'barn'),
    ...[0.6, -0.6].map(s => part(B(0.12, 2.1, 0.09).rotateZ(s).translate(0, 0.85, 2.05), 'cream')));
  // fete: a circus tent in red and cream wedges, a lollipop, a big wheel that turns (its ring:
  // wheel_spin, turned like the windmill's sails)
  const wedges = (make, n) => ring(n, (a, i) => part(make(a, PI2 / n), i % 2 ? 'cream' : 'red'));
  craft('tent', ...wedges((a, w) => C(2.4, 2.4, 2, 2, a, w).translate(0, 1, 0), 16), ...wedges((a, w) => new THREE.ConeGeometry(2.7, 2.2, 2, 1, false, a, w).translate(0, 3.1, 0), 16),
    inkShell(part(C(2.4, 2.4, 2, 32).translate(0, 1, 0), 'red'), 0.05), inkShell(part(new THREE.ConeGeometry(2.7, 2.2, 32).translate(0, 3.1, 0), 'red'), 0.05), // the outline of the whole
    inked(C(0.04, 0.04, 0.8, 6).translate(0, 4.5, 0), 'dark', 0.02), inked(new THREE.ConeGeometry(0.3, 0.35, 3).rotateZ(-Math.PI / 2).translate(0.2, 4.75, 0), 'sun', 0.02));
  craft('lollipop', inked(C(0.035, 0.035, 0.9, 6).translate(0, 0.45, 0), 'cream', 0.02), inked(C(0.3, 0.3, 0.1, 20).rotateX(Math.PI / 2).translate(0, 1.15, 0), 'tint', 0.025),
    part(new THREE.TorusGeometry(0.17, 0.04, 6, 20).translate(0, 1.15, 0.055), 'cream'));
  const wheel = craft('wheel_spin', inked(new THREE.TorusGeometry(4, 0.13, 8, 48), 'red', 0.05), inked(new THREE.TorusGeometry(1, 0.1, 8, 24), 'red', 0.04),
    ...ring(8, a => part(B(0.12, 8, 0.12).rotateZ(a), 'cream')),
    ...ring(8, (a, i) => inked(B(0.8, 0.7, 0.8).translate(Math.cos(a) * 4, Math.sin(a) * 4 - 0.5, 0), ['sun', 'pink', 'mint', 'violet'][i % 4], 0.04)));
  delete KIT.wheel_spin;
  wheel.position.y = 5;
  craft('wheel', ...[-1, 1].map(s => inked(B(0.25, 5.6, 0.25).rotateZ(s * 0.35).translate(s * 0.95, 2.6, -0.7), 'steel', 0.04)),
    ...[-1, 1].map(s => inked(B(0.25, 5.6, 0.25).rotateZ(s * 0.35).translate(s * 0.95, 2.6, 0.7), 'steel', 0.04)), wheel);
  // noel: a present with its ribbon, a candy cane, a snowman, a decorated fir with its star
  craft('gift', inked(B(0.7, 0.6, 0.7).translate(0, 0.3, 0), 'tint', 0.03), part(B(0.72, 0.62, 0.16).translate(0, 0.3, 0), 'cream'), part(B(0.16, 0.62, 0.72).translate(0, 0.3, 0), 'cream'),
    ...[-1, 1].map(s => inked(new THREE.TorusGeometry(0.1, 0.035, 6, 12).rotateY(s * 0.6).translate(s * 0.09, 0.66, 0), 'cream', 0.015)));
  craft('cane', ...Array.from({ length: 6 }, (_, i) => part(C(0.075, 0.075, 0.2, 10).translate(0, 0.1 + i * 0.2, 0), i % 2 ? 'cream' : 'red')),
    inkShell(part(C(0.08, 0.08, 1.2, 10).translate(0, 0.6, 0), 'red'), 0.025), inked(new THREE.TorusGeometry(0.22, 0.075, 8, 14, Math.PI).translate(-0.22, 1.2, 0), 'red', 0.025));
  craft('snowman', inked(S(0.5).translate(0, 0.45, 0), 'snow', 0.035), inked(S(0.36).translate(0, 1.18, 0), 'snow', 0.03), inked(S(0.26).translate(0, 1.7, 0), 'snow', 0.03),
    inked(new THREE.ConeGeometry(0.06, 0.3, 8).rotateX(Math.PI / 2).translate(0, 1.7, 0.36), 'carrot', 0.015),
    inked(C(0.2, 0.2, 0.28, 14).translate(0, 2.05, 0), 'dark', 0.02), inked(C(0.3, 0.3, 0.04, 16).translate(0, 1.92, 0), 'dark', 0.02),
    ...[-0.09, 0.09].map(x => part(S(0.035, 6, 4).translate(x, 1.78, 0.23), 'dark')), part(new THREE.TorusGeometry(0.33, 0.06, 6, 16).rotateX(Math.PI / 2).translate(0, 1.47, 0), 'red'));
  craft('xmas_tree', inked(C(0.12, 0.14, 0.5, 8).translate(0, 0.25, 0), 'wood', 0.02),
    ...[[0.95, 1, 0.9], [0.75, 0.9, 1.45], [0.52, 0.8, 1.95]].map(([r, h, y]) => inked(new THREE.ConeGeometry(r, h, 12).translate(0, y, 0), 'pine', 0.035)),
    inked(new THREE.OctahedronGeometry(0.18).translate(0, 2.45, 0), 'gold', 0.02),
    ...[[0.62, 0.75, 0], [0.45, 1.25, 2.1], [0.3, 1.8, 4.2], [0.7, 0.7, 3.3], [0.52, 1.3, 5.4], [0.65, 0.68, 1.3]].map(([r, y, a], i) => inked(S(0.08, 8, 6).translate(Math.cos(a) * r, y, Math.sin(a) * r), ['red', 'sun', 'pink', 'violet'][i % 4], 0.015)));
  // the power box: a glossy violet cube with gold edges and a question mark on each side
  {
    const c = document.createElement('canvas'), n = c.width = c.height = 128, g = c.getContext('2d');
    g.fillStyle = '#8b5cf6'; g.fillRect(0, 0, n, n);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 12; g.strokeRect(6, 6, n - 12, n - 12);
    g.fillStyle = '#fff7e6'; g.font = '900 84px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', n / 2, n / 2 + 4);
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    craft('powerbox', part(B(0.46, 0.46, 0.46), 'white').translateY(0).rotateY(0.6));
    KIT.powerbox.children[0].material = toon(0xffffff, { map, roughness: 0.3, emissive: 0x5b3fd6, emissiveIntensity: 0.35 });
  }
  // volcan: the cone far away, smoking, its crater aglow; a dead tree
  {
    const cone = new THREE.CylinderGeometry(1.6, 7, 6, 28, 4, true);
    craft('volcano', part(cone.translate(0, 3, 0), 'earth2'), part(new THREE.CylinderGeometry(1.55, 1.55, 0.1, 24).translate(0, 5.95, 0), 'white'),
      part(new THREE.CylinderGeometry(0.9, 1.4, 1.6, 12).translate(0, 7, 0), 'cloud'), part(S(1.3, 12, 8).translate(0.5, 8.4, 0.2), 'cloud'), part(S(1.7, 12, 8).translate(-0.3, 9.8, -0.2), 'cloud'));
    KIT.volcano.children[1].material = new THREE.MeshBasicMaterial({ color: 0xff8a2a }); // the glow of the crater
  }
  craft('dead_tree', inked(C(0.09, 0.16, 1.8, 8).translate(0, 0.9, 0), 'wood'), ...[[0.7, 1.2, 0.5, 0.6], [-0.8, 1.45, -0.3, 0.5], [0.5, 1.65, -0.6, 0.45], [-0.4, 1.0, 0.7, 0.4]].map(([a, y, b, l]) =>
    inked(C(0.03, 0.06, l, 6).translate(0, l / 2, 0).rotateZ(a).rotateY(b).translate(0, y, 0), 'wood', 0.015)));
  // pirate: a palm (a leaning ringed trunk, fronds drooping all round), a treasure chest, a wreck, a gull
  {
    const trunk = [];
    for (let i = 0; i < 7; i++) trunk.push(C(0.11 - i * 0.008, 0.13 - i * 0.008, 0.36, 10).translate(Math.sin(i / 7 * 1.2) * 0.35, 0.18 + i * 0.34, 0));
    const fronds = ring(8, (a, i) => {
      const f = new THREE.PlaneGeometry(1.3, 0.34, 6, 1), p = f.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k) + 0.65; p.setXYZ(k, x, -x * x * 0.45, p.getY(k) * (1 - x / 1.6)); }
      f.computeVertexNormals();
      return f.rotateY(a + (i % 2) * 0.2).translate(0.66, 2.45, 0);
    });
    const leaves = part(mergeGeometries(fronds), 'leaf'); leaves.material = PROP_MAT.leaf.clone(); leaves.material.side = THREE.DoubleSide; leaves.material.color.set(0x4f9a3a);
    craft('palm', part(mergeGeometries(trunk), 'wood'), leaves, part(S(0.13, 8, 6).translate(0.6, 2.35, 0.1), 'earth2'), part(S(0.12, 8, 6).translate(0.72, 2.32, -0.1), 'earth2'));
  }
  craft('chest', inked(B(0.8, 0.45, 0.52).translate(0, 0.225, 0), 'wood', 0.025), inked(new THREE.CylinderGeometry(0.26, 0.26, 0.8, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0.45, 0), 'wood', 0.025),
    ...[-0.3, 0.3].map(x => part(B(0.06, 0.5, 0.54).translate(x, 0.25, 0), 'gold')), part(B(0.12, 0.14, 0.04).translate(0, 0.45, 0.27), 'gold'));
  {
    const hull = new THREE.LatheGeometry([[0, 0], [0.9, 0.05], [1.3, 0.6], [1.45, 1.4]].map(([x, y]) => new THREE.Vector2(x, y)), 18).scale(1, 1, 3.2).rotateZ(0.18);
    const sail = new THREE.PlaneGeometry(1.8, 1.6, 4, 4), sp = sail.attributes.position;
    for (let k = 0; k < sp.count; k++) sp.setZ(k, Math.sin(sp.getX(k) * 2) * 0.12 + (k % 3 === 0 ? 0.08 : 0));
    const sails = part(sail.translate(0, 3.2, 0.2), 'cream'); sails.material = PROP_MAT.cream.clone(); sails.material.side = THREE.DoubleSide;
    craft('ship', part(hull, 'wood'), part(C(0.08, 0.1, 4.5, 8).translate(0, 2.4, 0.4).rotateZ(0.18), 'wood'), part(C(0.07, 0.09, 3.6, 8).translate(0, 2, -1.8).rotateZ(0.12), 'wood'), sails);
  }
  {
    const wing = new THREE.PlaneGeometry(0.9, 0.22).translate(0.45, 0, 0);
    const w2 = wing.clone().rotateZ(0.35), w3 = wing.clone().rotateY(Math.PI).rotateZ(-0.35);
    const wings = part(mergeGeometries([w2, w3]), 'white'); wings.material = PROP_MAT.white.clone(); wings.material.side = THREE.DoubleSide;
    craft('gull', wings, part(S(0.12, 8, 6).scale(1, 0.8, 2.2), 'white'));
  }
  // galaxie: a cluster of crystals, a ringed planet, a flying saucer
  craft('crystal', ...[[0, 0, 1, 0], [0.28, 0.1, 0.7, 0.4], [-0.25, -0.15, 0.6, -0.35]].map(([x, z, s, lean]) => inked(new THREE.OctahedronGeometry(0.28).scale(1, 2.4, 1).rotateZ(lean).translate(x, 0.55 * s, z).scale(s, s, s), 'tint', 0.025)));
  craft('planet', inked(S(1, 32, 20), 'tint', 0.03), inked(new THREE.TorusGeometry(1.65, 0.12, 6, 48).scale(1, 1, 0.35).rotateX(Math.PI / 2).rotateZ(0.35), 'cream', 0.025));
  // ferme: a duck, for the ponds (it swims like the sharks' fins: modelled heading +z)
  craft('duck', inked(S(0.26, 14, 10).scale(1, 0.75, 1.35).translate(0, 0.1, 0), 'cream', 0.025), inked(S(0.16, 12, 8).translate(0, 0.36, 0.26), 'cream', 0.02),
    inked(new THREE.ConeGeometry(0.07, 0.16, 8).rotateX(Math.PI / 2).translate(0, 0.34, 0.47), 'carrot', 0.012), inked(new THREE.ConeGeometry(0.1, 0.18, 6).rotateX(-Math.PI / 2 - 0.5).translate(0, 0.22, -0.36), 'cream', 0.015),
    ...[-0.09, 0.09].map(x => part(S(0.03, 6, 4).translate(x, 0.41, 0.38), 'dark')));
  craft('ufo', inked(S(1.2, 28, 12).scale(1, 0.26, 1), 'steel', 0.04), inked(new THREE.SphereGeometry(0.55, 20, 10, 0, PI2, 0, Math.PI / 2).translate(0, 0.2, 0), 'mint', 0.03),
    ...ring(8, a => part(S(0.09, 8, 6).translate(Math.cos(a) * 1.05, -0.02, Math.sin(a) * 1.05), 'sun')));
}

// the top of each prop over its origin, read from the models (what decor may reach depends on it)
const TOP = {}; // (filled at the end of the file, once the realistic decor is made: see "the decor, realistic")
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
const GRAV_MAT = new THREE.MeshBasicMaterial({ color: 0x9ff3ff }); // the stars of a low gravity zone
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
// grit: how much fine, per-pixel unevenness is laid over the tile once drawn (real matter is never flat);
// size: its pixels (512 for the natural materials of the walls, seen close up)
function tile(name, draw, { grit = 0.05, size = 256 } = {}) {
  if (!tiles.has(name)) {
    const canvas = document.createElement('canvas'), n = canvas.width = canvas.height = size, g = canvas.getContext('2d');
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // the same tile every time
    // spread draws a shape at x, y and wherever it crosses the edge of the tile, so that it repeats
    const spread = (x, y, r, shape) => { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) if (Math.abs(x + dx - n / 2) < n / 2 + r && Math.abs(y + dy - n / 2) < n / 2 + r) shape(x + dx, y + dy); };
    draw(g, n, rand, spread);
    if (grit > 0) { // fine noise, and a slow mottling, both tiling
      const img = g.getImageData(0, 0, n, n), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const p = i / 4, x = p % n, y = (p / n) | 0;
        const mottle = Math.sin(x / n * TAU * 3 + Math.sin(y / n * TAU * 2) * 1.3) * Math.sin(y / n * TAU * 3 + 0.7) * 0.5;
        const k = 1 + (rand() - 0.5) * 2 * grit + mottle * grit;
        d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
      }
      g.putImageData(img, 0, 0);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    tiles.set(name, t);
  }
  return tiles.get(name);
}
const fill = (g, n, color) => { g.fillStyle = color; g.fillRect(0, 0, n, n); };
// shade lightens (k > 0) or darkens a colour: '#rrggbb' in, '#rrggbb' out
const shade = (color, k) => { const c = new THREE.Color(color); c.lerp(new THREE.Color(k > 0 ? 0xffffff : 0x000000), Math.abs(k)); return '#' + c.getHexString(); };
const blob = (g, x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
// GRAIN is the matter of a plain surface (a wall's top, a post): pale, uneven, multiplied by its colour
const GRAIN = () => tile('grain', (g, n) => fill(g, n, '#f2f2f2'), { grit: 0.09 });
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
  // obsidian (volcan, the ice of a volcano: it slides the same): black glass, long cold shines
  obsidian: () => tile('obsidian', (g, n) => {
    fill(g, n, '#15121a');
    g.lineCap = 'round';
    for (const [x0, w, a] of [[0.15, 60, 0.14], [0.55, 26, 0.1], [0.8, 10, 0.2]]) {
      g.strokeStyle = `rgba(150,140,200,${a})`; g.lineWidth = w;
      for (const dx of [-n, 0, n]) { g.beginPath(); g.moveTo(n * x0 + dx - n * 0.3, n); g.lineTo(n * x0 + dx + n * 0.3, 0); g.stroke(); }
    }
  }),
  // mud (ferme): brown, darker puddles, a few pale clods
  mud: () => tile('mud', (g, n, rand, spread) => {
    fill(g, n, '#9a6a3f');
    for (let i = 0; i < 9; i++) { const r = 10 + rand() * 12; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, '#7a4f2c')); }
    for (let i = 0; i < 6; i++) { const r = 4 + rand() * 4; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, '#c08a58')); }
  }),
  // powder snow (noel): white, soft lilac-grey dimples (ice is blue and streaked)
  snow: () => tile('snow', (g, n, rand, spread) => {
    fill(g, n, '#ffffff');
    for (let i = 0; i < 12; i++) { const r = 7 + rand() * 8; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, '#dfe3f3')); }
    for (let i = 0; i < 8; i++) { const r = 3 + rand() * 3; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, '#c4cbe6')); }
  }),
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
  // jelly (a trampoline): glossy lilac, round shines like bubbles in it
  jelly: () => tile('jelly', (g, n, rand, spread) => {
    fill(g, n, '#c08cff');
    for (let i = 0; i < 7; i++) { const r = 16 + rand() * 14; spread(rand() * n, rand() * n, r, (x, y) => { blob(g, x, y, r, '#a56cf2'); blob(g, x - r * 0.3, y - r * 0.3, r * 0.35, '#f1e3ff'); }); }
  }),
  // a black hole: an accretion swirl (orange, pink) round a dark heart, drawn whole over the zone; it turns
  vortex: () => tile('vortex', (g, n) => {
    const c = n / 2, grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, '#05030f'); grad.addColorStop(0.25, '#1d0b3d'); grad.addColorStop(0.7, '#5b1f8a'); grad.addColorStop(1, '#ff7ac8');
    fill(g, n, '#ff7ac8'); g.fillStyle = grad; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
    g.lineCap = 'round';
    for (const [color, w, k0] of [['#ffb347', 14, 0], ['#ff5d8f', 10, 0.5]]) for (let k = 0; k < 3; k++) {
      g.strokeStyle = color; g.lineWidth = w; g.beginPath();
      for (let s = 0; s <= 40; s++) { const r = c * (0.12 + 0.85 * s / 40), a = (k + k0) * TAU / 3 + s / 40 * 4.2; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
      g.stroke();
    }
    blob(g, c, c, n * 0.07, '#000000');
  }),
  // low gravity: deep indigo, little stars, faint rings
  antigrav: () => tile('antigrav', (g, n, rand, spread) => {
    fill(g, n, '#2a2366');
    g.strokeStyle = 'rgba(120,240,255,0.35)'; g.lineWidth = 6;
    for (const y of [0.25, 0.75]) { g.beginPath(); g.moveTo(0, n * y); g.lineTo(n, n * y); g.stroke(); }
    for (let i = 0; i < 14; i++) { const r = 2 + rand() * 4, c = rand() < 0.5 ? '#9ff3ff' : '#ffffff'; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, c)); }
  }),
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
const SURFACE = { ice: LOOK.ice, sand: LOOK.sand, bumper: LOOK.bumper, jelly: LOOK.jelly };
// a post: cream, a red band round it, its top cream (the groups of THREE.CylinderGeometry: side, top, bottom)
const POST_FACES = [toon(0xffffff, { map: LOOK.post() }), MAT.wall, MAT.wall];
// the first two are the ones maps use, blue and vermilion: no other element is drawn in them, and both
// stand out on grass. From the third on, a key shares its colour with something else.
const KEY_COLOR = ['#3fa7ff', '#ff6b3f', '#8ac926', '#9b5de5', '#2ec4b6', '#f15bb5', '#adb5bd', '#ffc300'];
const surfaces = new Map();
let sandLook = 'sand', iceLook = 'ice'; // how the hole drawn shows sand and ice: its theme's (setHole)
function surface(c) {
  const name = c.key ? `key ${c.key}` : c.motion ? `moving ${c.material ?? ''}` : c.material === 'sand' ? sandLook : c.material === 'ice' ? iceLook : c.material;
  if (!name || name === 'grass' || name === 'wall' || name === 'post') return null;
  if (!surfaces.has(name)) {
    surfaces.set(name, c.key
      ? toon(0xffffff, { map: LOOK.gate(c.key), transparent: true, opacity: 0.85 }) // a gate, in the colour of its key
      : c.motion && !SURFACE[c.material]
        ? toon(0xffffff, { map: LOOK.tape() }) // what moves stands out
        : toon(0xffffff, { map: (c.material === 'sand' ? LOOK[sandLook] : c.material === 'ice' ? LOOK[iceLook] : SURFACE[c.material])?.() ?? LOOK.tape(), roughness: c.material === 'ice' ? 0.12 : 0.82 })); // ice shines
  }
  return surfaces.get(name);
}

// ---------------------------------------------------------------------------- themes
// The look a hole is dressed in (its "theme", docs/themes.md): the sky, the sea under it, the ground
// it stands on, the grass, its plain walls and posts (their sides, their tops and what crowns them),
// and the decor around it. What plays keeps its colours everywhere; nothing here changes the game.
const lum = c => { const k = new THREE.Color(c); return 0.2126 * k.r + 0.7152 * k.g + 0.0722 * k.b; };
const themeToon = (color, more) => toon(color, more);
// the sides of the walls: tiles of 1 unit, seamless both ways (their UVs are in course units)
const SIDE = {
  ribs: (base, rib) => tile('ribs ' + base, (g, n) => { fill(g, n, base); g.fillStyle = rib; for (let i = 0; i < 4; i++) g.fillRect(i * n / 4 + n / 8 - 5, 0, 10, n); }),
  // logs laid flat: each round (light along its middle, dark at its edges), bark streaks along it
  logs: (base, joint, light) => tile('logs ' + base, (g, n, rand) => {
    fill(g, n, joint);
    for (let i = 0; i < 4; i++) {
      const y = i * n / 4, h = n / 4 - 6, grad = g.createLinearGradient(0, y + 3, 0, y + 3 + h);
      grad.addColorStop(0, joint); grad.addColorStop(0.35, light); grad.addColorStop(0.6, base); grad.addColorStop(1, joint);
      g.fillStyle = grad; g.fillRect(0, y + 3, n, h);
      g.strokeStyle = shade(joint, -0.2); g.lineWidth = 1.5;
      for (let s = 0; s < 14; s++) { const yy = y + 6 + rand() * (h - 6), x0 = rand() * n; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + 20 + rand() * 60, yy + (rand() - 0.5) * 3); g.stroke(); }
    }
  }, { grit: 0.1, size: 512 }),
  // boards on end: each with its own shade, the grain running along it in waves and knots, dark gaps, nail heads
  planks: (base, joint, nail) => tile('planks ' + base, (g, n, rand) => {
    fill(g, n, joint);
    for (let i = 0; i < 4; i++) {
      const x = i * n / 4, w = n / 4 - 5;
      g.fillStyle = shade(base, (rand() - 0.5) * 0.18); g.fillRect(x + 5, 0, w, n);
      g.strokeStyle = shade(base, -0.22); g.lineWidth = 1.2;
      for (let s = 0; s < 9; s++) {
        const x0 = x + 8 + rand() * (w - 6), a = 2 + rand() * 4, f = 2 + rand() * 3, ph = rand() * TAU;
        g.beginPath();
        for (let y = 0; y <= n; y += 8) g.lineTo(x0 + Math.sin(y / n * TAU * f / 2 + ph) * a, y); // whole waves: it tiles
        g.stroke();
      }
      const ky = rand() * n; g.fillStyle = shade(base, -0.3); g.beginPath(); g.ellipse(x + 5 + w * (0.3 + rand() * 0.4), ky, 4, 9, 0, 0, TAU); g.fill();
      for (const y of [0.22, 0.72]) { blob(g, x + n / 8 + 3, y * n, 6, shade(nail, -0.3)); blob(g, x + n / 8 + 2, y * n - 1, 4, nail); }
    }
  }, { grit: 0.08, size: 512 }),
  strata: (base, light, dark) => tile('strata ' + base, (g, n) => {
    fill(g, n, base);
    for (const [y0, w, c] of [[0.12, 26, light], [0.46, 14, dark], [0.68, 34, light], [0.9, 10, dark]]) {
      g.fillStyle = c; g.beginPath(); g.moveTo(0, n * y0);
      for (let k = 0; k <= 32; k++) g.lineTo(k * n / 32, n * y0 + Math.sin(k / 32 * TAU * 2) * 5);
      for (let k = 32; k >= 0; k--) g.lineTo(k * n / 32, n * y0 + w + Math.sin(k / 32 * TAU * 2 + 1) * 4);
      g.fill();
    }
  }),
  // dressed stone, 0.5 x 0.25 in a running bond: each block its own shade, lit on top, shaded below, chipped
  stone: (joint, base, light, dark) => tile('stone ' + base, (g, n, rand) => {
    fill(g, n, shade(joint, -0.15));
    for (let row = 0; row < 4; row++) for (let k = -1; k < 2; k++) {
      const x = k * n / 2 + (row % 2) * n / 4 + 6, y = row * n / 4 + 6, w = n / 2 - 12, h = n / 4 - 12, c = [base, base, light, dark][Math.floor(rand() * 4)];
      const grad = g.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, shade(c, 0.12)); grad.addColorStop(0.5, c); grad.addColorStop(1, shade(c, -0.18));
      g.fillStyle = grad; g.beginPath(); g.roundRect(x, y, w, h, 7); g.fill();
      for (let s = 0; s < 5; s++) blob(g, x + rand() * w, y + rand() * h, 2 + rand() * 4, shade(c, -0.12 - rand() * 0.1));
    }
  }, { grit: 0.12, size: 512 }),
  // a clipped hedge: hundreds of small leaves of every green, deep shadow between them
  leaves: (base, mid, light) => tile('leaves ' + base, (g, n, rand, spread) => {
    fill(g, n, shade(base, -0.35));
    const greens = [shade(base, -0.15), base, mid, mid, light, shade(light, 0.12)];
    for (let i = 0; i < 2400; i++) {
      const r = 5 + rand() * 7, a = rand() * TAU, c = greens[Math.floor(rand() * greens.length)];
      spread(rand() * n, rand() * n, r * 1.6, (x, y) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r * 1.5, r * 0.7, a, 0, TAU); g.fill(); });
    }
  }, { grit: 0.14, size: 512 }),
  // bricks, 0.25 x 0.125: each one its own red, darker at its edges, the mortar set back
  brick: (joint, base, a, b) => tile('brick ' + base, (g, n, rand) => {
    fill(g, n, shade(joint, -0.12));
    for (let row = 0; row < 8; row++) for (let k = -1; k < 5; k++) {
      const x = k * n / 4 + (row % 2) * n / 8 + 4, y = row * n / 8 + 4, w = n / 4 - 8, h = n / 8 - 8, c = shade([base, base, a, b][Math.floor(rand() * 4)], (rand() - 0.5) * 0.15);
      const grad = g.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, shade(c, 0.08)); grad.addColorStop(1, shade(c, -0.15));
      g.fillStyle = grad; g.fillRect(x, y, w, h);
      for (let s = 0; s < 6; s++) blob(g, x + rand() * w, y + rand() * h, 1.5 + rand() * 2.5, shade(c, -0.2));
    }
  }, { grit: 0.12, size: 512 }),
  post: (base, band) => tile('post ' + base + band, (g, n) => { fill(g, n, base); g.fillStyle = band; g.fillRect(0, n * 0.3, n, n * 0.4); }),
  // a fairground booth: broad upright stripes, in turn
  stripes: (...colors) => tile('stripes ' + colors.join(), (g, n) => { colors.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * n / colors.length, 0, n / colors.length, n); }); }),
  // a candy cane: slanted red stripes on cream
  cane: (base, stripe) => tile('cane ' + base + stripe, (g, n) => {
    fill(g, n, base); g.fillStyle = stripe;
    for (let i = -2; i < 3; i++) { g.beginPath(); g.moveTo(i * n / 2, n); g.lineTo(i * n / 2 + n / 5, n); g.lineTo(i * n / 2 + n / 5 + n, 0); g.lineTo(i * n / 2 + n, 0); g.fill(); }
  }),
  // a spaceship's hull: dark panels, their seams, a line of light along the middle
  panels: (base, seam, light) => tile('panels ' + base, (g, n) => {
    fill(g, n, base); g.fillStyle = seam;
    for (let i = 0; i < 2; i++) g.fillRect(i * n / 2, 0, 5, n);
    g.fillRect(0, n * 0.2, n, 4); g.fillRect(0, n * 0.8, n, 4);
    g.fillStyle = light; g.fillRect(0, n * 0.47, n, 14);
    for (const x of [0.25, 0.75]) blob(g, n * x, n * 0.32, 6, seam);
  }),
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
  volcan: { rail: { rod: 0.04, r: () => 0.05 }, post: r => dome(r * 0.6, 0.06), glow: true }, // a vein of lava along the top of the basalt
  pirate: { rail: { slab: 0.06 }, post: r => dome(r, 0.08) },
  fete: { rail: { piece: () => dome(0.085, 0.085), step: 0.45 }, post: r => new THREE.ConeGeometry(r + 0.03, 0.1, 24).translate(0, 0.05, 0), glow: true }, // a row of bulbs, a bulb roof on a post
  ferme: { rail: { slab: 0.06 }, post: r => dome(r, 0.08) },
  galaxie: { rail: { rod: 0.05, r: () => 0.06 }, post: r => dome(r * 0.7, 0.08), glow: true }, // a line of neon
  noel: { rail: { rod: 0.1, r: w => Math.min(0.12, w / 2 + 0.03) }, post: r => dome(r + 0.02, 0.1) }, // snow on top
};
const THEMES = {
  bocage: { crownIsSide: true, sky: '#5cc4e8', horizon: '#fff2d6', below: '#8fd0e8', grass: '#7ddb6b', lip: '#49b65c', skirt: ['#49b65c', '#b07a4f', '#8a5a3c'], top: '#175f3d', side: () => SIDE.leaves('#124f33', '#175f3d', '#1f7a4c'), crownColor: '#175f3d', clouds: 1, mill: true, fence: true,
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
  // The festive ones (2026-11-25). Same rules: what plays keeps its colours. Besides the kit, they
  // have props of their own (craft), a landmark far away instead of the windmill, things that fly
  // instead of the balloons (flyer), something falling through the air (fall), a nebula in the sky.
  // volcan (2026-11-26): the slopes of a volcano: basalt walls cracked with lava, ash grass, lava
  // where the water would be and as a sea under the course, embers rising, the cone smoking far away
  volcan: { swimmer: 'none', ice: 'obsidian', sky: '#2e2024', horizon: '#c4562c', below: '#ff5a1a', sea: true, grass: '#7f9a52', lip: '#4b5a34', skirt: ['#4b5a34', '#3a302c', '#221a18'], top: '#3a3230', side: () => SIDE.stone('#1c1716', '#3b3331', '#4a403c', '#2e2826'), crownColor: '#ff7a2a', clouds: 0.6, landmark: ['volcano'],
    lava: { deep: '#8a1606', mid: '#ff4a12', light: '#ffd166', foam: '#fff1a6' }, recolor: { leaf: '#5d6b3c', earth: '#3a302c', earth2: '#221a18', stone: '#3b3331', wood: '#2a1f1a', cloud: '#6a5650' }, balloons: [],
    tints: ['#ff7a2a', '#ffb347', '#ff4a12', '#ffd166'], fall: { kind: 'embers', n: 220 },
    near: [[['rock_a', 'rock_b'], 1], ['dead_tree', 0.5], ['rock_c', 0.6]], trees: [['dead_tree', 1], ['dead_tree', 1.2], ['rock_c', 2]], under: [['rock_b', 1], ['rock_a', 0.8]] },
  // pirate (2026-11-26): a treasure island: sand and palms, weathered planks, a turquoise sea, a wreck
  // offshore, gulls, the power boxes are treasure chests
  pirate: { box: 'chest', flyer: 'gull', sky: '#47bff0', horizon: '#fff2cf', below: '#16a7c4', sea: true, grass: '#86d25a', lip: '#55a23a', skirt: ['#f0d398', '#d4aa66', '#a07c48'], top: '#c9955f', side: () => SIDE.planks('#a87445', '#5e3d22', '#2e2418'), post: () => SIDE.post('#7a5232', '#e9d2a3'), postTop: '#c9955f', crownColor: '#c9955f', clouds: 0.7, fence: true, landmark: ['ship'],
    recolor: { leaf: '#efd59b', earth: '#d4aa66', earth2: '#a07c48', cloud: '#ffffff' }, balloons: [0, 0, 0],
    near: [['palm', 0.55], [['rock_a', 'rock_b'], 1], ['chest', 0.8], ['palm', 0.45]], trees: [['palm', 1], ['palm', 1.15], ['palm', 0.9]], under: [['rock_c', 0.8], ['rock_b', 1], ['chest', 1]] },
  // fete: a fairground at dusk: booth stripes, a row of bulbs on every wall, a circus tent and a big
  // wheel, lollipops and presents on the islets, confetti
  fete: { sky: '#ff9ec7', horizon: '#ffe6a8', below: '#ffc2dc', grass: '#72d86a', lip: '#43b25a', skirt: ['#43b25a', '#ffd23f', '#ff8a1f'], top: '#fff7e6', side: () => SIDE.stripes('#c81d3a', '#fff7e6'), post: () => SIDE.post('#3fa7ff', '#fff7e6'), crownColor: '#ffe27a', clouds: 1, fence: true,
    recolor: { earth: '#ffd23f', earth2: '#ff8a1f', cloud: '#fff0f6', leaf: '#5fcf86' }, balloons: ['#e63946', '#ffd23f', '#3fa7ff', '#ff5d8f', '#8ac926'], landmark: ['wheel', 'tent'],
    tints: ['#e63946', '#3fa7ff', '#ffd23f', '#ff5d8f', '#9b5de5', '#2ec4b6'], fall: { kind: 'confetti', n: 260 },
    near: [['lollipop', 1], ['gift', 1], ['flower', 1], ['lollipop', 0.8], ['bush', 0.9]], trees: [['tree_blossom', 1], ['tree_ball', 1], ['lollipop', 2.2]], under: [['gift', 1], ['gift', 0.8], ['flower', 1], ['lollipop', 1]] },
  // ferme: a farm in the sun: red barn planks with a white rail, hay bales, sunflowers, the barn and
  // the windmill far away
  ferme: { swimmer: 'duck', sand: 'mud', sky: '#6cc8f0', horizon: '#fff4cf', below: '#bfe6a8', grass: '#86de5e', lip: '#58b544', skirt: ['#58b544', '#a8743f', '#7d5230'], top: '#fff7e6', side: () => SIDE.planks('#c6412f', '#8f2d20', '#fff7e6'), post: () => SIDE.post('#8f5a34', '#fff7e6'), postTop: '#fff7e6', crownColor: '#fff7e6', clouds: 1, mill: true, fence: true, landmark: ['barn'],
    recolor: { cloud: '#ffffff' }, balloons: ['#ffd23f'],
    near: [['hay', 1], ['sunflower', 1], ['sunflower', 1.1], ['bush', 1], ['flower', 1]], trees: [['tree_ball', 1], ['tree_ball', 1.15], ['hay', 1.6]], under: [['hay', 1], ['sunflower', 1], ['bush', 1], ['flower', 1]] },
  // galaxie: deep space: a nebula and stars, hull panels lit by a line of neon, crystals on rocks
  // floating in the void, ringed planets and flying saucers, asteroids where a ball is lost
  galaxie: { sky: '#0b0826', horizon: '#3a1d6e', below: '#0b0826', stars: true, nebula: true, grass: '#5ad6a6', lip: '#2f9f86', skirt: ['#2f9f86', '#4b3a8f', '#2a2160'], top: '#3a3f66', side: () => SIDE.panels('#2c3157', '#1d2140', '#4df3ff'), post: () => SIDE.post('#2c3157', '#4df3ff'), crownColor: '#4df3ff', clouds: 0.55, cloudNames: ['rock_a', 'rock_b', 'rock_c'],
    recolor: { leaf: '#b48cff', leaf2: '#8b5cf6', earth: '#4b3a8f', earth2: '#2a2160', stone: '#6d5fb0', cloud: '#6d5fb0' }, planets: ['#ff8a5c', '#5cc8ff', '#c08cff'], flyer: 'ufo', balloons: [0, 0],
    tints: ['#4df3ff', '#ff5dd2', '#b48cff', '#7dffb0'],
    near: [['crystal', 1], ['crystal', 0.8], [['rock_a', 'rock_b'], 1], ['mushroom', 1]], trees: [['crystal', 2.2], ['crystal', 1.8], ['rock_c', 2], ['rock_a', 2]], under: [['crystal', 1], ['rock_b', 1]] },
  // noel: a snowy Christmas: candy-cane walls under a crest of snow, firs with baubles, presents,
  // snowmen, a big fir far away, snow falling
  noel: { sand: 'snow', sky: '#9fc6e8', horizon: '#f4f8ff', below: '#eaf4ff', grass: '#7fd696', lip: '#ffffff', skirt: ['#ffffff', '#c9e2f5', '#8fb4d6'], top: '#ffffff', side: () => SIDE.cane('#fff7e6', '#e63946'), post: () => SIDE.cane('#fff7e6', '#2f9e63'), crownColor: '#ffffff', clouds: 1, fence: true, landmark: ['xmas_tree'],
    recolor: { leaf: '#ffffff', leaf2: '#e8f4ff', earth: '#c9e2f5', earth2: '#8fb4d6', cloud: '#ffffff' }, balloons: ['#e63946'],
    tints: ['#e63946', '#2f9e63', '#3fa7ff', '#ffd23f', '#9b5de5'], fall: { kind: 'snow', n: 320 },
    near: [['gift', 1], ['cane', 1], ['snowman', 0.6], ['gift', 0.8]], trees: [['xmas_tree', 1.2], ['xmas_tree', 1], ['snowman', 1]], under: [['gift', 1], ['gift', 0.9], ['cane', 1]] },
};
const PROP_KEY = new Map(Object.entries(PROP_MAT).map(([k, m]) => [m, k]));
const dressed = new Map();
// dress gives the materials and the rules of a theme (bocage when none), made once.
function dress(name) {
  name = THEMES[name] ? name : 'bocage';
  if (dressed.has(name)) return dressed.get(name);
  const t = THEMES[name], col = c => new THREE.Color(c);
  const side = t.side ? themeToon(0xffffff, { map: t.side(), bumpMap: t.side(), bumpScale: 2.5, roughness: 0.88 }) : themeToon(t.top, { map: GRAIN(), bumpMap: GRAIN(), bumpScale: 1 }), top = themeToon(t.top, { map: GRAIN(), bumpMap: GRAIN(), bumpScale: 1 });
  const recolor = { ...(t.recolor?.leaf ? { turf: t.recolor.leaf } : {}), ...t.recolor }; // the islets' turf goes with the leaves
  const swaps = new Map(Object.entries(recolor).map(([k, c]) => { const m = PROP_MAT[k].clone(); m.color.set(c); return [PROP_MAT[k], m]; }));
  let below;
  if (t.sea) { // the sea under the course: a live sea, swells and glints (SEA)
    below = SEA.clone();
    below.uniforms.time = WATER.uniforms.time; // the clock of every water
    below.uniforms.deep.value = col(t.below).multiplyScalar(0.55);
    below.uniforms.mid.value = col(t.below);
    below.uniforms.light.value = col(t.below).lerp(new THREE.Color(0xffffff), 0.75);
  } else below = new THREE.MeshBasicMaterial({ color: t.below });
  const how = CROWN[name], crownMat = how?.glow ? new THREE.MeshBasicMaterial({ color: t.crownColor }) : t.crownIsSide ? side : themeToon(t.crownColor ?? t.top, { map: GRAIN(), bumpMap: GRAIN(), bumpScale: 1 }); // a hedge is leaves on top too
  const postCrownMat = t.postCrown ? themeToon(t.postCrown) : crownMat;
  const T = {
    name, sky: col(t.sky), horizon: col(t.horizon), below, sea: !!t.sea, stars: !!t.stars, grass: col(t.grass), lip: themeToon(t.lip),
    skirt: t.skirt.map((c, i) => themeToon(c, i ? { map: i === 1 ? MATTER.earth() : MATTER.rock(), bumpMap: i === 1 ? MATTER.earth() : MATTER.rock(), bumpScale: 3, roughness: 0.95 } : {})), clouds: t.clouds, floes: !!t.floes, mill: !!t.mill, fence: !!t.fence, balloons: t.balloons,
    near: t.near, trees: t.trees, under: t.under,
    swimmer: t.swimmer, sand: t.sand ?? 'sand', ice: t.ice ?? 'ice', lava: t.lava, box: t.box, landmark: t.landmark ?? [], flyer: t.flyer ?? 'balloon', planets: t.planets ?? [], cloudNames: t.cloudNames ?? ['cloud_a', 'cloud_b', 'cloud_c'], tints: t.tints, fall: t.fall, nebula: !!t.nebula,
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
  gravity: p => t('gravity', num(p.g)), vortex: () => t('vortex'), powerup: () => t('powerup'),
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
  gravity: () => ({ map: LOOK.antigrav(), run: -0.15 }), // starry indigo, and stars rising slowly through it (zoneProps)
  vortex: () => ({ map: LOOK.vortex(), whole: true }), // an accretion swirl, turning the way it turns the ball (zone)
  powerup: () => ({ map: LOOK.burst('#9b5de5'), whole: true }), // a violet burst under the power box that floats over it
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

// turf is the normal map of mown grass, a tile of a unit: thousands of short blades, leaning every
// way, their relief blurred a little (made once, for every grass floor)
function turf() {
  const n = 256, h = new Float32Array(n * n);
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let b = 0; b < 5200; b++) {
    const x0 = rand() * n, y0 = rand() * n, a = rand() * Math.PI * 2, len = 3 + rand() * 7, lift = 0.4 + rand() * 0.6;
    for (let s = 0; s <= len; s++) {
      const x = Math.floor(x0 + Math.cos(a) * s + n) % n, y = Math.floor(y0 + Math.sin(a) * s + n) % n;
      h[y * n + x] = Math.max(h[y * n + x], lift * (1 - s / len * 0.5));
    }
  }
  const at = (x, y) => h[((y + n) % n) * n + ((x + n) % n)], data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 1.4, dy = (at(x, y + 1) - at(x, y - 1)) * 1.4, l = Math.hypot(dx, dy, 1);
    data.set([(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255, 255], (y * n + x) * 4);
  }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// DIMPLES is the normal map of a golf ball: rows of round dimples, staggered (a tile, repeated round it)
const DIMPLES = (() => {
  const n = 64, data = new Uint8Array(n * n * 4), r = 0.42;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let nx = 0, ny = 0;
    for (const [cx, cy] of [[0.25, 0.25], [0.75, 0.75], [-0.25, 0.75], [1.25, 0.25], [0.25, 1.25], [0.75, -0.25]]) {
      const dx = (x + 0.5) / n * 2 - cx * 2, dy = (y + 0.5) / n * 2 - cy * 2, d = Math.hypot(dx, dy);
      if (d < r) { const k = Math.sin(d / r * Math.PI) * 1.6; nx = -dx / d * k * 0.5; ny = -dy / d * k * 0.5; }
    }
    const l = Math.hypot(nx, ny, 1), i = (y * n + x) * 4;
    data.set([(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255, 255], i);
  }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 5);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
})();

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
    this.renderer.toneMapping = THREE.NeutralToneMapping; // highlights roll off, the hues stay true
    this.renderer.toneMappingExposure = 0.95;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this.target = new THREE.Vector3(); // what the camera looks at (look)
    const sun = this.sun = new THREE.DirectionalLight(0xfff2dc, 2.3); // (2026-11-25) a warm sun, a cool sky, the grass's green bounce
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
    this.scene.add(new THREE.HemisphereLight(0xeef6ff, 0x8fae7f, 0.55), sun, sun.target, this.below, this.dome);
    sun.intensity = 2.8;
    this.scene.fog = new THREE.Fog(PALETTE.horizon, 45, 260); // the distance hazes over, as in the open air
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
    sandLook = T.sand; iceLook = T.ice;
    this.dome.material.uniforms.top.value.copy(T.sky);
    this.dome.material.uniforms.low.value.copy(T.horizon);
    this.dome.material.uniforms.stars.value = T.stars ? 1 : 0;
    this.dome.material.uniforms.nebula.value = T.nebula ? 1 : 0;
    // the sky, blurred, lights and is reflected by everything (made once a theme)
    if (this.envOf !== T.name) {
      const sky = new THREE.Scene(), dome = new THREE.Mesh(this.dome.geometry, this.dome.material);
      sky.add(dome);
      this.scene.environment?.dispose();
      this.scene.environment = this.pmrem.fromScene(sky, 0.04, 0.1, 1000).texture;
      this.scene.environmentIntensity = T.stars ? 0.3 : 0.5;
      this.envOf = T.name;
    }
    this.scene.fog?.color.copy(T.horizon); // (the previews draw without fog)
    this.below.material = T.below;
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
    this.contact?.target.dispose();
    this.contact = bakeContact(hole, this.renderer);
    GRASS.contact.value = this.contact?.target.texture ?? NO_CONTACT;
    if (this.contact) GRASS.contactArea.value.set(...this.contact.area);
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
    const white = new Map([[PROP_MAT.red, PROP_MAT.cream]]);
    for (const [fx, fy, fz] of hole.flags ?? []) { // the other holes of its world: a white flag where each cup is
      const other = recolor(prop('flag'), white);
      other.position.set(fx, fy, fz);
      other.scale.setScalar(0.8);
      g.add(other);
    }

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
    let seed = [...(hole.world || hole.name)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) ^ hole.colliders.length;
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
    const puffs = []; // [x, y, z, size]: the clouds, drawn soft
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
    const FLOWERS = [PALETTE.pink, PALETTE.sun, PALETTE.cream, PALETTE.violet, PALETTE.orange], TINTED = new Set(['gift', 'lollipop', 'crystal']);
    // on an islet at (x, y, z) of radius r: things scattered on its top, within reach
    const dress = (x, y, z, r, things) => {
      for (const [name, s] of things) {
        const a = rand() * TAU, at = rand() ** 0.5 * r * 0.6;
        put(name, x + Math.cos(a) * at, y, z + Math.sin(a) * at, s, undefined, name === 'flower' ? pick(FLOWERS) : T.tints && TINTED.has(name) ? pick(T.tints) : undefined);
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
    for (const name of T.landmark) { // a barn, a big wheel, a circus tent, a great fir: on an islet of its own
      const [lx, lz] = far(40, 65), o = prop(name), ly = T.sea ? hole.killY + 0.25 : floor - 2;
      if (!T.sea) put('islet_l', lx, ly, lz, 1.3); // over a sea, it stands in it (a wreck, a volcano in its lava)
      if (name === 'volcano') o.scale.setScalar(3.2);
      o.position.set(lx, ly, lz);
      o.rotation.y = Math.atan2(cx - lx, cz - lz); // its front (+z) towards the course
      if (name === 'xmas_tree') o.scale.setScalar(4);
      d.add(o);
      const spin = o.getObjectByName('wheel_spin');
      if (spin) this.sails.push(spin);
    }
    for (const color of T.planets) { // high in the sky, far beyond everything
      const a = rand() * TAU, dist = reach + 110 + rand() * 60, planet = prop('planet', color);
      planet.position.set(cx + Math.cos(a) * dist, floor + 30 + rand() * 40, cz + Math.sin(a) * dist);
      planet.scale.setScalar(9 + rand() * 8);
      planet.rotation.set(rand() * 0.6, rand() * TAU, rand() * 0.6);
      d.add(planet);
    }
    for (const color of T.balloons ?? [PALETTE.red, pick([PALETTE.violet, PALETTE.sun, PALETTE.leaf])]) {
      const [bx, bz] = far(45, 70), balloon = prop(T.flyer, color);
      balloon.position.set(bx, floor + 5 + rand() * 6 + (T.flyer === 'ufo' ? 6 : 0), bz);
      d.add(balloon);
      this.drifting.push({ o: balloon, y: balloon.position.y });
    }
    // the sea of clouds, on the plane where a ball is lost, the clouds lower where they are near
    if (T.clouds) for (let gx = -100; gx <= 100; gx += 20) for (let gz = -100; gz <= 100; gz += 20) {
      const x = cx + gx + (rand() - 0.5) * 16, z = cz + gz + (rand() - 0.5) * 16, s = 1.2 + rand() ** 2 * 3.3, name = pick(T.cloudNames);
      if (rand() > T.clouds) continue; // fewer clouds in some skies
      const gap = gapAt(x, z) - 2.2 * s;
      const y = Math.min(hole.killY - 0.1 * s, ceiling(Math.max(gap, 0)) - TOP[name] * s);
      if (!T.floes && name.startsWith('cloud')) { puffs.push([x, y + TOP[name] * s * 0.45, z, s]); continue; } // soft, drawn as puffs (below)
      const m = put(name, x, y, z, s);
      if (T.floes) m.scale(new THREE.Vector3(1, 0.3, 1)); // flattened: ice floes on the sea
    }
    if (puffs.length) d.add(cloudPuffs(puffs, T.recolor(PROP_MAT.cloud).color, this.scene.fog));
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
    // snow or confetti falling round the course (not in the lighter graphics: see move)
    this.falling = null;
    if (T.fall) {
      const snow = T.fall.kind !== 'confetti', n = T.fall.n, top = floor + 12, height = 16, wide = reach + 10; // snow and embers are motes
      const shape = snow ? new THREE.IcosahedronGeometry(0.055, 0) : new THREE.PlaneGeometry(0.12, 0.07);
      const mesh = new THREE.InstancedMesh(shape, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), n);
      mesh.frustumCulled = false;
      const items = Array.from({ length: n }, () => {
        const a = rand() * TAU, r = Math.sqrt(rand()) * wide;
        return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, y0: rand() * height, phase: rand() * TAU };
      });
      if (T.fall.kind !== 'snow') items.forEach((_, k) => mesh.setColorAt(k, new THREE.Color(pick(T.tints))));
      d.add(mesh);
      this.falling = { mesh, items, top, height, speed: T.fall.kind === 'embers' ? -0.9 : snow ? 0.7 : 1.1, spin: snow ? 0.5 : 3 }; // embers rise
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
      const water = z.type === 'hazard', field = z.type === 'gravity'; // alive (waterOf), its foam for a rim; a field: faint, no rim
      const map = water ? null : look.map.clone(); // its own, to run at its own pace
      const top = new THREE.Mesh(water ? shape(0) : decal(shape(0), look, TILE * (look.scale ?? 1)),
        water ? waterOf(z, this.hole.zones, this.renderer, this.theme.lava) : toon(0xffffff, { map, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...(field ? { transparent: true, opacity: 0.32, depthWrite: false } : {}) }));
      top.userData.own = true;
      top.position.y = floor + 0.012; // the zones of the maps start on the ground
      if (look.run && !water) this.scrolling.push({ texture: map, speed: look.run });
      if (z.type === 'vortex') this.turning.push({ o: top, speed: Math.sign(p.swirl) * 1.4 });
      if (!water && !field) {
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
    else if (z.type === 'powerup') float(prop(this.theme.box ?? 'powerbox'), 0.72); // a mystery box (a chest...), turning
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
    } else if (z.type === 'gravity') {
      // stars rising slowly through the zone, as high as it is (up to 4): the air is light there
      const w = z.shape === BOX ? z.h[0] : z.r, d = z.shape === BOX ? z.h[2] : z.r, n = Math.round(Math.min(60, Math.max(10, w * d * 6)));
      const motes = new THREE.InstancedMesh(MOTE, GRAV_MAT, n);
      motes.frustumCulled = false;
      motes.position.copy(group.position);
      motes.quaternion.copy(group.quaternion);
      let seed = n * 131 + Math.round(z.c[0] * 7 + z.c[2] * 13);
      const rand = () => (seed = (Math.abs(seed) * 16807 + 1) % 2147483647) / 2147483647;
      const places = Array.from({ length: n }, () => {
        if (z.shape === BOX) return [(rand() * 2 - 1) * w * 0.9, rand(), (rand() * 2 - 1) * d * 0.9];
        const a = rand() * TAU, r = Math.sqrt(rand()) * z.r * 0.9;
        return [Math.cos(a) * r, rand(), Math.sin(a) * r];
      });
      this.effects.add(motes);
      this.floating.push({ motes, at: places, floor, height: Math.min(4, -floor * 2), speed: 0.35 });
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
    if (this.theme.swimmer === 'none') return; // (lava)
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
      const fin = prop(this.theme.swimmer ?? 'fin');
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
    if (this.falling) { // snow, confetti: falling round the course, swaying
      const { mesh, items, top, height, speed, spin } = this.falling, e = new THREE.Euler(), m = new THREE.Matrix4(), at = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      mesh.visible = !this.lite;
      if (!this.lite) {
        items.forEach(({ x, z, y0, phase }, k) => {
          at.set(x + Math.sin(t * 0.8 + phase) * 0.35, top - (((y0 + t * speed) % height) + height) % height, z + Math.cos(t * 0.6 + phase) * 0.35);
          q.setFromEuler(e.set(t * spin + phase, t * spin * 0.7 + phase * 2, 0));
          mesh.setMatrixAt(k, m.compose(at, q, one));
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
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
        this.balls.set(b.id, mesh = new THREE.Mesh(this.ballShape, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12, normalMap: DIMPLES, normalScale: new THREE.Vector2(0.8, 0.8), transparent: true })));
        mesh.castShadow = true;
        mesh.add(new THREE.Mesh(this.ballHull, new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide, transparent: true, visible: false }))); // (its outline: not drawn any more)
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
        const depth = 0.04 + wave(p.z, p.x) * 0.05, arc = []; // (2026-11-25) a short overhang of turf, no longer scallops
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
  boxUV(geometry, 1.6); // (its normals too) so that the earth and the rock show their matter
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
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
});
// SEA is the open sea under a course of the quai: broad swells of deep and lighter blue drifting, small
// ripples catching the sun, fading into the fog with distance
const SEA = new THREE.ShaderMaterial({
  fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, deep: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, light: { value: new THREE.Color() } }]),
  vertexShader: `#include <common>
#include <fog_pars_vertex>
varying vec2 w;
void main() { vec4 p = modelMatrix * vec4(position, 1.0); w = p.xz; vec4 mvPosition = viewMatrix * p; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
  fragmentShader: `#include <common>
#include <fog_pars_fragment>
uniform float time; uniform vec3 deep, mid, light; varying vec2 w;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  float swell = n(w * 0.06 + vec2(time * 0.02, time * 0.015)) * 0.6 + n(w * 0.17 - vec2(time * 0.03, -time * 0.02)) * 0.4;
  vec3 c = mix(deep, mid, smoothstep(0.25, 0.85, swell));
  float ripple = n(w * 3.1 + vec2(time * 0.6, time * 0.35)) * n(w * 2.6 - vec2(time * 0.35, -time * 0.5));
  c = mix(c, light, smoothstep(0.66, 0.76, ripple) * 0.35);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`,
});
// waterOf gives the water of the pool of hazard zone z (its outline, the pools around it), among zones,
// its shore drawn by renderer. Its texture goes with it (userData.shore).
function waterOf(z, zones, renderer, colors) {
  const m = WATER.clone();
  m.uniforms.time = WATER.uniforms.time; // one clock for every pool
  if (colors) for (const k of ['deep', 'mid', 'light', 'foam']) m.uniforms[k].value = new THREE.Color(colors[k]); // lava, say
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

// bakeContact draws, once per hole, the shade the walls and posts that stay put cast on the grass at
// their foot: their footprint seen from above, blurred (r: how much), with the height of their foot
// weighted the same way (g / r: that height), so that a wall shades its own level only, not a floor
// under a bridge. The grass reads it (GRASS.contact): nothing to pay per frame but one texture read.
const CONTACT_PX = 6; // pixels per unit of the course
function bakeContact(hole, renderer) {
  const standing = hole.colliders.filter(c => c.kind !== FLOOR && !c.motion && !c.key), floors = hole.colliders.filter(c => c.kind === FLOOR);
  if (!standing.length || !floors.length) return null;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const c of floors) {
    const r = c.shape === BOX ? Math.hypot(c.h[0], c.h[2]) : c.r;
    x0 = Math.min(x0, c.c[0] - r); x1 = Math.max(x1, c.c[0] + r); z0 = Math.min(z0, c.c[2] - r); z1 = Math.max(z1, c.c[2] + r);
  }
  const area = [x0 - 1, z0 - 1, x1 + 1, z1 + 1], w = Math.min(1024, Math.ceil((area[2] - area[0]) * CONTACT_PX)), h = Math.min(1024, Math.ceil((area[3] - area[1]) * CONTACT_PX));
  const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const a = new THREE.WebGLRenderTarget(w, h, opts), b = new THREE.WebGLRenderTarget(w, h, opts);
  const scene = new THREE.Scene(), made = [];
  const vertexShader = 'uniform vec4 area; void main() { vec4 p = modelMatrix * vec4(position, 1.0); gl_Position = vec4((p.x - area.x) / (area.z - area.x) * 2.0 - 1.0, (p.z - area.y) / (area.w - area.y) * 2.0 - 1.0, 0.0, 1.0); }';
  for (const c of standing) {
    const geometry = c.shape === BOX ? new THREE.BoxGeometry(c.h[0] * 2, c.h[1] * 2, c.h[2] * 2) : new THREE.CylinderGeometry(c.r, c.r, c.hh * 2, 16);
    const foot = c.c[1] - (c.shape === BOX ? c.h[1] : c.hh) + 0.15; // walls and posts are sunk 0.15 into their floor
    const material = new THREE.ShaderMaterial({ uniforms: { area: { value: new THREE.Vector4(...area) }, foot: { value: foot } }, depthTest: false, depthWrite: false, vertexShader,
      fragmentShader: 'uniform float foot; void main() { gl_FragColor = vec4(1.0, foot, 0.0, 1.0); }' });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...c.c);
    mesh.rotation.set(...(c.rot ?? [0, 0, 0]));
    mesh.frustumCulled = false; // (the shader places it, not the camera)
    scene.add(mesh);
    made.push(geometry, material);
  }
  const old = renderer.getClearColor(new THREE.Color()), oldAlpha = renderer.getClearAlpha(), camera = new THREE.Camera();
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(a);
  renderer.clear();
  renderer.render(scene, camera);
  // blurred both ways, a Gaussian of 9 taps 2.6 pixels apart: the shade reaches about a unit out
  const blur = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, step: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 uv0; void main() { uv0 = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D src; uniform vec2 step; varying vec2 uv0;
void main() {
  float w[5] = float[5](0.227, 0.194, 0.122, 0.054, 0.016);
  vec4 s = texture2D(src, uv0) * w[0];
  for (int i = 1; i < 5; i++) s += (texture2D(src, uv0 + step * float(i)) + texture2D(src, uv0 - step * float(i))) * w[i];
  gl_FragColor = s;
}` });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur), flatScene = new THREE.Scene().add(quad);
  quad.frustumCulled = false;
  for (const [from, to, step] of [[a, b, [2.6 / w, 0]], [b, a, [0, 2.6 / h]]]) {
    blur.uniforms.src.value = from.texture;
    blur.uniforms.step.value.set(...step);
    renderer.setRenderTarget(to);
    renderer.clear();
    renderer.render(flatScene, camera);
  }
  renderer.setRenderTarget(null);
  renderer.setClearColor(old, oldAlpha);
  for (const o of [...made, quad.geometry, blur, b]) o.dispose();
  return { target: a, area };
}

// sky is a dome around everything: blue overhead, fading to a warm horizon.
function sky() {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PALETTE.sky) }, low: { value: new THREE.Color(PALETTE.horizon) }, stars: { value: 0 }, nebula: { value: 0 }, sun: { value: new THREE.Vector3(-0.5, 0.85, 0.4).normalize() } },
    vertexShader: 'varying vec3 d; void main() { d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, low, sun; uniform float stars, nebula; varying vec3 d;
float hh(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hh(i), hh(i + vec3(1, 0, 0)), f.x), mix(hh(i + vec3(0, 1, 0)), hh(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hh(i + vec3(0, 0, 1)), hh(i + vec3(1, 0, 1)), f.x), mix(hh(i + vec3(0, 1, 1)), hh(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
void main() {
  vec3 c = mix(low, top, smoothstep(-0.02, 0.2, d.y));
  float toSun = max(dot(normalize(d), sun), 0.0); // the sun, its glow, a haze along the horizon
  c += (1.0 - stars) * (vec3(1.0, 0.92, 0.75) * (smoothstep(0.9993, 0.9997, toSun) * 0.9 + pow(toSun, 10.0) * 0.18) + low * 0.08 * (1.0 - smoothstep(0.0, 0.25, abs(d.y))));
  if (nebula > 0.0) { // clouds of violet and teal gas across the sky
    float a = vn(d * 3.0) * 0.6 + vn(d * 7.0 + 3.1) * 0.4, b = vn(d * 4.0 + 5.0) * 0.7 + vn(d * 9.0) * 0.3;
    c += (vec3(0.5, 0.12, 0.55) * smoothstep(0.5, 0.85, a) + vec3(0.08, 0.4, 0.55) * smoothstep(0.58, 0.9, b)) * smoothstep(-0.05, 0.3, d.y);
  }
  vec3 cell = floor(d * 160.0);
  float star = step(0.9965 - 0.004 * nebula, fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453)) * smoothstep(0.08, 0.35, d.y); // a few, high in the sky
  gl_FragColor = vec4(mix(c, vec3(1.0, 0.97, 0.88), star * stars), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  }));
  dome.renderOrder = -10;
  dome.onBeforeRender = (r, s, camera) => dome.position.copy(camera.position);
  return dome;
}

// ---------------------------------------------------------------------------- the decor, realistic
// (2026-11-25) The trees, bushes and rocks are made here instead of taken from the kit: crowns of
// lumpy clumps of leaves, a tapered trunk in bark, boulders with uneven faces. The natural colours
// of the palette get their matter (a texture in greys that their colour tints): leaves, bark, rock,
// earth. Each model is a few meshes (one per material): the decor draws them instanced.
// boxUV gives a geometry texture coordinates from its shape (a box projection, k units a tile)
function boxUV(geometry, k) {
  const p = geometry.attributes.position, uv = new Float32Array(p.count * 2);
  geometry.computeVertexNormals();
  const nr = geometry.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(nr.getX(i)), ay = Math.abs(nr.getY(i)), az = Math.abs(nr.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
    uv[i * 2] = u / k; uv[i * 2 + 1] = v / k;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = v => v * v * (3 - 2 * v), u = f(x - xi), v = f(y - yi), w = f(z - zi);
  const L = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
// lumpy pushes every point of a closed shape in or out along its normal by an uneven amount: a clump of
// leaves, a boulder. The seams of the shape are welded first, or it would crack open.
function lumpy(geometry, amount, freq, seed) {
  let g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = (noise3(x * freq + seed, y * freq, z * freq) * 0.65 + noise3(x * freq * 2.7, y * freq * 2.7 + seed, z * freq * 2.7) * 0.35 - 0.5) * 2 * amount;
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  g.computeVertexNormals();
  return g;
}
// matter: tiles in greys, that the colour of the material tints
const MATTER = {
  leaves: () => tile('matter leaves', (g, n, rand, spread) => {
    fill(g, n, '#3c3c3c');
    const greys = ['#6a6a6a', '#8a8a8a', '#a8a8a8', '#c4c4c4', '#dcdcdc', '#f0f0f0'];
    for (let i = 0; i < 1500; i++) { const r = 4 + rand() * 6, a = rand() * TAU, c = greys[Math.floor(rand() * greys.length)]; spread(rand() * n, rand() * n, r * 1.6, (x, y) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r * 1.5, r * 0.65, a, 0, TAU); g.fill(); }); }
  }, { grit: 0.12 }),
  bark: () => tile('matter bark', (g, n, rand) => {
    fill(g, n, '#b8b8b8');
    for (let i = 0; i < 70; i++) { const x = rand() * n, w = 2 + rand() * 5; g.fillStyle = rand() < 0.5 ? '#7a7a7a' : '#e4e4e4'; g.beginPath(); for (let y = -10; y <= n + 10; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 3, y); for (let y = n + 10; y >= -10; y -= 16) g.lineTo(x + w + Math.sin(y * 0.05 + i) * 3, y); g.fill(); }
  }, { grit: 0.15 }),
  rock: () => tile('matter rock', (g, n, rand, spread) => {
    fill(g, n, '#c8c8c8');
    for (let i = 0; i < 320; i++) { const r = 2 + rand() * 9, c = ['#9c9c9c', '#b4b4b4', '#d4d4d4', '#e4e4e4'][Math.floor(rand() * 4)]; spread(rand() * n, rand() * n, r, (x, y) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r * 1.8, r, 0, 0, TAU); g.fill(); }); } // grains and flakes, laid flat as in a bed of rock
    g.strokeStyle = '#808080'; g.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { let x = rand() * n, y = rand() * n; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rand() - 0.5) * 50; y += (rand() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
  }, { grit: 0.2 }),
  earth: () => tile('matter earth', (g, n, rand, spread) => {
    fill(g, n, '#c4c4c4');
    for (let i = 0; i < 160; i++) { const r = 2 + rand() * 7, c = ['#9a9a9a', '#b0b0b0', '#dadada', '#ececec'][Math.floor(rand() * 4)]; spread(rand() * n, rand() * n, r, (x, y) => blob(g, x, y, r, c)); }
  }, { grit: 0.18 }),
};
// the natural colours of the palette take their matter, in relief
for (const [keys, matter, rough] of [[['leaf', 'leaf2', 'pink'], 'leaves', 0.85], [['wood', 'earth', 'earth2'], 'bark', 0.9], [['stone'], 'rock', 0.92]]) {
  for (const k of keys) Object.assign(PROP_MAT[k], { map: MATTER[matter](), bumpMap: MATTER[matter](), bumpScale: 3, roughness: rough });
}
Object.assign(PROP_MAT.earth, { map: MATTER.earth(), bumpMap: MATTER.earth() }); Object.assign(PROP_MAT.earth2, { map: MATTER.rock(), bumpMap: MATTER.rock() });
for (const k of ['leaf', 'leaf2', 'pink', 'wood', 'earth', 'earth2', 'stone']) PROP_MAT[k].needsUpdate = true;
MAT.earth.map = MAT.earth.bumpMap = MATTER.earth(); MAT.rock.map = MAT.rock.bumpMap = MATTER.rock(); // the ground under a course
MAT.earth.needsUpdate = MAT.rock.needsUpdate = true;
{
  const merged = (list, key) => { const m = new THREE.Mesh(mergeGeometries(list.map(g => boxUV(g, 0.9))), PROP_MAT[key]); m.userData.kit = true; return m; };
  const clumps = (spec, seed) => spec.map(([x, y, z, r, sy = 1], i) => lumpy(new THREE.IcosahedronGeometry(r, 3), r * 0.3, 2.2 / r, seed + i * 7).scale(1, sy, 1).translate(x, y, z));
  const trunk = (r0, r1, h, bend = 0) => {
    const g = new THREE.CylinderGeometry(r1, r0, h, 12, 6).translate(0, h / 2, 0), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setX(i, p.getX(i) + Math.sin(y * 2.2) * bend); }
    return g;
  };
  const model = (name, ...meshes) => { const o = new THREE.Group(); o.name = name; o.add(...meshes); KIT[name] = o; };
  // a broadleaf tree, about 2.7 high: a trunk forking into a crown of clumps
  model('tree_ball', merged([trunk(0.2, 0.1, 1.7, 0.06), trunk(0.08, 0.04, 0.7).rotateZ(0.7).translate(0.05, 1.1, 0), trunk(0.07, 0.04, 0.6).rotateZ(-0.6).translate(-0.05, 1.2, 0.05)], 'wood'),
    merged(clumps([[0, 1.95, 0, 0.7], [0.5, 1.6, 0.15, 0.5], [-0.45, 1.65, -0.2, 0.52], [0.1, 2.35, -0.15, 0.48], [-0.15, 1.7, 0.45, 0.45], [0.3, 1.85, -0.45, 0.42]], 3), 'leaf'));
  // a fir, about 2.9 high: drooping tiers of needles, ragged at the edges
  model('tree_pine', merged([trunk(0.15, 0.06, 2.2)], 'wood'),
    merged([[0.95, 0.5, 0.8], [0.8, 0.95, 0.75], [0.62, 1.4, 0.7], [0.45, 1.85, 0.65], [0.26, 2.25, 0.65]].map(([r, y, h], i) => lumpy(new THREE.ConeGeometry(r, h, 18, 3), r * 0.18, 4 / r, 40 + i * 3).translate(0, y + h / 2, 0)), 'leaf2'));
  // a blossom tree, about 2.6 high: a crooked trunk, pink clumps, a few paler
  model('tree_blossom', merged([trunk(0.16, 0.08, 1.6, 0.14), trunk(0.06, 0.03, 0.7).rotateZ(-0.8).translate(0.1, 1.2, 0)], 'wood'),
    merged(clumps([[0, 1.85, 0, 0.62], [0.48, 2.05, 0.1, 0.44], [-0.45, 2.0, -0.15, 0.42], [0.1, 2.35, -0.3, 0.36], [-0.1, 1.7, 0.4, 0.38]], 9), 'pink'));
  // a bush, about 0.6 high
  model('bush', merged(clumps([[0, 0.3, 0, 0.36, 0.85], [0.36, 0.22, 0.1, 0.27, 0.85], [-0.33, 0.2, -0.08, 0.26, 0.85], [0.05, 0.2, -0.3, 0.24, 0.85]], 17), 'leaf'));
  // boulders: uneven faces, a flat bottom sunk in the ground
  for (const [name, size, seed] of [['rock_a', 0.45, 1], ['rock_b', 0.3, 2], ['rock_c', 0.7, 3]]) {
    const g = lumpy(new THREE.IcosahedronGeometry(size, 2), size * 0.28, 1.6 / size, seed * 13).scale(1.25, 0.8, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, Math.max(p.getY(i), -size * 0.2) + size * 0.2);
    g.computeVertexNormals();
    model(name, merged([g], 'stone'));
  }
}
// the islets' tops are turf, not leaves: a material of their own, recoloured with the leaves by a theme
PALETTE.turf = 0x5fa046;
PROP_MAT.turf = toon(PALETTE.turf, { map: tile('matter turf', (g, n, rand) => {
  fill(g, n, '#d4d4d4');
  for (let i = 0; i < 2600; i++) { const x = rand() * n, y = rand() * n, a = -Math.PI / 2 + (rand() - 0.5) * 0.8, l = 3 + rand() * 6; g.strokeStyle = ['#8a8a8a', '#a4a4a4', '#d0d0d0', '#eaeaea'][Math.floor(rand() * 4)]; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
}, { grit: 0.1 }), normalMap: turf(), roughness: 0.92 });
for (const name of ['islet_s', 'islet_m', 'islet_l']) KIT[name]?.traverse(m => { if (m.isMesh && m.material === PROP_MAT.leaf) m.material = PROP_MAT.turf; });
// clouds: cumulus, heaped lumps with a flat underside, about 4 long
{
  const cloudMat = toon(PALETTE.cloud, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.18 });
  PROP_MAT.cloud.copy(cloudMat); // (the theme's recolouring of the clouds keeps working)
  for (const [name, seed] of [['cloud_a', 1], ['cloud_b', 2], ['cloud_c', 3]]) {
    let s = seed * 97;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647, parts = [];
    for (let i = 0; i < 7; i++) {
      const rad = (0.5 + r() * 0.5) * (i === 0 ? 1.1 : 0.85);
      parts.push(lumpy(new THREE.IcosahedronGeometry(rad, 2), rad * 0.22, 2 / rad, seed * 31 + i).scale(1, 0.8, 1).translate((r() - 0.5) * 2.8, r() * 0.35, (r() - 0.5) * 1.2));
    }
    const g = mergeGeometries(parts), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, Math.max(p.getY(i), -0.05));
    g.computeVertexNormals();
    const o = new THREE.Group(), m = new THREE.Mesh(g, PROP_MAT.cloud);
    m.userData.kit = true;
    o.name = name; o.add(m); KIT[name] = o;
  }
}
Object.assign(TOP, Object.fromEntries(Object.entries(KIT).map(([k, o]) => [k, new THREE.Box3().setFromObject(o).max.y])));

// cloudPuffs draws the clouds of the sea of clouds, each a soft billow facing the camera, all in one draw:
// a quad per cloud, turned to the camera in the vertex shader, its texture a heap of soft round puffs
// lit from above. [x, y, z, size] each; color: the theme's; fog: the scene's, which they fade into.
const PUFF = (() => {
  const c = document.createElement('canvas'), n = c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  let s = 5;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const t = r(), x = 70 + r() * (n - 140), y = 150 - Math.sin(t * Math.PI) * 60 * r() - 10 + (x > 140 && x < n - 140 ? -20 : 10), rad = 28 + r() * 48;
    const grad = g.createRadialGradient(x, y - rad * 0.3, rad * 0.1, x, y, rad);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)'); grad.addColorStop(0.55, 'rgba(244,246,250,0.75)'); grad.addColorStop(1, 'rgba(215,222,234,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function cloudPuffs(list, color, fog) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: !!fog,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: PUFF }, tint: { value: new THREE.Color(color) } }]),
    vertexShader: `#include <common>
#include <fog_pars_vertex>
varying vec2 vUv; varying float vShade, vNear;
void main() {
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vNear = smoothstep(8.0, 22.0, -mvPosition.z); // close to the camera, a cloud fades away: it never veils the course
  float s = length(instanceMatrix[0].xyz);
  float flip = mod(float(gl_InstanceID), 2.0) * 2.0 - 1.0;
  mvPosition.xy += position.xy * s * vec2(5.2, 2.6);
  vUv = vec2(flip > 0.0 ? uv.x : 1.0 - uv.x, uv.y); vShade = 0.9 + 0.1 * uv.y;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `#include <common>
#include <fog_pars_fragment>
uniform sampler2D map; uniform vec3 tint; varying vec2 vUv; varying float vShade, vNear;
void main() {
  vec4 t = texture2D(map, vUv);
  if (t.a * vNear < 0.01) discard;
  gl_FragColor = vec4(t.rgb * tint * vShade, t.a * vNear);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`,
  });
  const quad = new THREE.PlaneGeometry(1, 1), mesh = new THREE.InstancedMesh(quad, material, list.length), m = new THREE.Matrix4();
  list.forEach(([x, y, z, s], i) => mesh.setMatrixAt(i, m.makeScale(s, s, s).setPosition(x, y, z)));
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}

// cupFloor is the floor the cup is cut into: its outline with a round hole, given its thickness.
function cupFloor(c, cup) {
  const [x, y, z] = c.c, [hx, hy, hz] = c.h;
  const outline = new THREE.Shape([[x - hx, -z - hz], [x + hx, -z - hz], [x + hx, -z + hz], [x - hx, -z + hz]].map(p => new THREE.Vector2(...p)));
  outline.holes.push(new THREE.Path().absarc(cup.x, -cup.z, cup.r, 0, Math.PI * 2, true));
  return flat(new THREE.ExtrudeGeometry(outline, { depth: hy * 2, bevelEnabled: false, curveSegments: 48 })).translate(0, y - hy, 0);
}
