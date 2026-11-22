import { hole } from '../lib.mjs';

// La Correspondance: four rooms without doors, linked by three portals in a row; a ball keeps its
// speed through them. Each exit faces the next portal: with the run-up, the train goes on; without,
// one waits on the platform, where the next arrival may push it on.
// grass covers the rectangle but for the given sand rectangles (inside it), tiled edge to edge
function grassAround(t, x0, z0, x1, z1, holes) {
  const xs = [...new Set([x0, x1, ...holes.flatMap(h => [h[0], h[2]])])].sort((a, b) => a - b);
  const zs = [...new Set([z0, z1, ...holes.flatMap(h => [h[1], h[3]])])].sort((a, b) => a - b);
  for (let j = 0; j + 1 < zs.length; j++) {
    let run = null;
    for (let i = 0; i < xs.length; i++) {
      const free = i + 1 < xs.length && !holes.some(h => xs[i] >= Math.min(h[0], h[2]) && xs[i + 1] <= Math.max(h[0], h[2]) && zs[j] >= Math.min(h[1], h[3]) && zs[j + 1] <= Math.max(h[1], h[3]));
      if (free) { run ??= xs[i]; continue; }
      if (run !== null) t.floor(run, zs[j], xs[i], zs[j + 1]);
      run = null;
    }
  }
}

export default () => {
  const t = hole('La Correspondance', { theme: 'ville', par: 4 });
  const W = 0.6, R = 0.6, Y = 0.18; // walls, portal radius, a ball's center on the floor
  const sand = [[-7.5, -7, -2.5, -8.5], [-7.5, -11.5, -2.5, -13], [0, -13.5, 10, -15]]; // two bins, the back of the cup's room
  grassAround(t, -10, 5, 0, -15, sand.slice(0, 2)); // the west rooms, around the bins
  grassAround(t, 0, 5, 10, -15, sand.slice(2)); // the east rooms: one grass floor holds the cup
  for (const [a, b, c, d] of sand) t.floor(a, b, c, d, 0, 'sand');
  t.fence(-10, 5, 10, -15, 0, W);
  t.rail(W, [0, 0, 5], [0, 0, -15]).rail(W, [-10, 0, -5], [10, 0, -5]); // four rooms of 10 × 10
  const portal = (x, z, to, turn) => t.disc('teleport', x, z, R, 0, { to: [...to], ...(turn ? { turn } : {}) });
  // act 1, violet: from the start room (south-west) to the south-east room, 6 straight to the next
  // portal. The tee is off its axis: a ball from the tee comes out askew and stops in the room.
  portal(-5, -2, [5, Y, 3.5]);
  // act 2, rose: on to the north-west room, turned to face east: 8 of platform between two sand
  // bins, its end a channel to the indigo portal (a ball enters it nearly straight)
  portal(5, -2.5, [-9, Y, -10], -Math.PI / 2);
  t.rail(0.45, [-5, 0, -9.3], [0, 0, -9.3]).rail(0.45, [-5, 0, -10.7], [0, 0, -10.7]);
  // act 3, indigo: into the cup's room (north-east), facing the cup but 32° off it, towards the sand
  // at the back: no ball comes out of it straight at the cup
  const ex = 1.5, ez = -6.5, cx = 6.5, cz = -11.5, aim = Math.atan2(ez - cz, cx - ex) + 32 * Math.PI / 180;
  portal(-1.2, -10, [ex, Y, ez], aim);
  return t.tee(-8, 0, 3.5).cup(cx, 0, cz);
};
