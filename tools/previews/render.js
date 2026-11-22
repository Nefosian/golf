// Draws the holes the tool asks for (render.html?todo=0,3,7) and sends each picture back to it: the
// whole course, without perspective, turned so that it fills the picture with the cup to the right
// of the tee and not below it, every preview reading from left to right, its flag on the right.
import * as THREE from '/vendor/three.module.min.js';
import { View } from '/scene.js';

const W = 400, H = 280; // pixels of a preview
const PITCH = 0.95;     // radians above the ground the camera looks from
const MARGIN = 1.08;    // around the course
const camera = new THREE.OrthographicCamera(); // no perspective: the far end is as big as the near one
const view = new View(document.createElement('canvas'), [W, H]);
view.scene.fog = null; // the camera stands far away (no perspective): the fog would hide everything

try {
  for (const i of new URLSearchParams(location.search).get('todo').split(',').map(Number)) {
    const hole = await (await fetch(`/holes/${i}`)).json();
    view.setHole(hole);
    view.course.traverse(o => { if (o.isSprite) o.visible = false; }); // no signs: too small to read
    view.move(0);
    frame(hole);
    view.renderer.render(view.scene, camera);
    const picture = await new Promise((ok, fail) => view.renderer.domElement.toBlob(b => b ? ok(b) : fail(new Error('no picture')), 'image/webp', 0.8));
    await fetch(`/out/${i}`, { method: 'POST', body: picture });
  }
  await fetch('/done', { method: 'POST' });
} catch (e) {
  await fetch('/fail', { method: 'POST', body: String(e?.stack ?? e) });
}

function frame(hole) {
  const pts = [];
  view.course.updateMatrixWorld(true);
  view.course.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    for (let k = 0; k < 8; k++) pts.push(new THREE.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z));
  });
  const run = new THREE.Vector3(hole.cup.x - hole.tee[0], 0, hole.cup.z - hole.tee[2]);
  const turns = Array.from({ length: 72 }, (_, k) => { // every 5 degrees
    const yaw = k * Math.PI / 36, back = new THREE.Vector3(Math.sin(yaw) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(yaw) * Math.cos(PITCH));
    const right = new THREE.Vector3(0, 1, 0).cross(back).normalize();
    return { back, right, up: back.clone().cross(right) };
  });
  const ok = turns.filter(t => run.dot(t.right) > 0.01 && run.dot(t.up) > -0.01); // none: the cup is over the tee
  let best = null;
  for (const t of ok.length ? ok : turns) {
    const range = axis => { const v = pts.map(p => p.dot(axis)); return [Math.min(...v), Math.max(...v)]; };
    const [lx, hx] = range(t.right), [ly, hy] = range(t.up), [lz, hz] = range(t.back);
    const half = Math.max((hx - lx) / 2 / (W / H), (hy - ly) / 2) * MARGIN; // half the height of the picture, in metres
    if (!best || half < best.half - 1e-6) {
      best = { ...t, half, mid: t.right.clone().multiplyScalar((lx + hx) / 2).addScaledVector(t.up, (ly + hy) / 2).addScaledVector(t.back, (lz + hz) / 2) };
    }
  }
  Object.assign(camera, { left: -best.half * W / H, right: best.half * W / H, top: best.half, bottom: -best.half, near: 0.1, far: 2000 });
  camera.updateProjectionMatrix();
  camera.up.copy(best.up);
  camera.position.copy(best.mid).addScaledVector(best.back, 500);
  camera.lookAt(best.mid);
}
