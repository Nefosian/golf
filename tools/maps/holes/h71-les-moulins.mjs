import { hole, V } from '../lib.mjs';

// Les Moulins: the classic windmill, twice. Four sails turn in front of the door of each mill: a
// small one on the flat, then a big one at the top of a 10° ramp, where a refused ball is knocked
// back and the ramp rolls it down to the queue. Inside the big mill, a dog-legged tunnel leads out
// onto the green.
export default () => {
  const t = hole('Les Moulins', { theme: 'bocage', par: 4 });
  const X = 4, H = 0.45, D = 1; // half-width, wall height, half-width of the doors
  const r0 = -17, r1 = -26, top = +(9 * Math.tan(10 * Math.PI / 180)).toFixed(3); // the ramp: foot, top, height
  const f1 = -6, f2 = r1 - 1.2; // the facades of the two mills
  // a mill: a facade across the corridor (3.2 high, a door 2 wide), four sails 2.5 long in front
  // of it, turning in the vertical plane about a hub 2.6 above the floor: a sail pointing down
  // closes the door (its tip 0.1 above the floor).
  const mill = (zf, y, period, dir, phase) => {
    t.block(-X, zf - 0.15, -D, zf + 0.15, y - 0.15, y + 3.2).block(D, zf - 0.15, X, zf + 0.15, y - 0.15, y + 3.2);
    t.block(-D, zf - 0.15, D, zf + 0.15, y + 1.2, y + 3.2); // the lintel over the door
    const hub = V(0, y + 2.6, zf + 0.42);
    const motion = { period, move: [0, 0, 0], pivot: hub, axis: [0, 0, dir], ...(phase ? { phase } : {}) };
    t.raw({ shape: 0, kind: 1, c: hub, h: [0.25, 2.5, 0.075], motion });
    t.raw({ shape: 0, kind: 1, c: hub, rot: V(0, 0, Math.PI / 2), h: [0.25, 2.5, 0.075], motion });
  };
  // act 1: the tee's room and the small mill (a sail every 1.5 s)
  t.floor(-X, f1, X, 2);
  t.rail(H, [-X, 0, f1], [-X, 0, 2], [X, 0, 2], [X, 0, f1]);
  mill(f1, 0, 6, 1);
  // act 2: the yard, the ramp, a landing and the big mill (a sail every 1.25 s, turning the other way)
  t.floor(-X, r0, X, f1).slab([0, 0, r0], [0, top, r1], 2 * X).floor(-X, f2, X, r1, top);
  t.rail(H, [-X, 0, f1], [-X, 0, r0], [-X, top, r1], [-X, top, f2]).rail(H, [X, 0, f1], [X, 0, r0], [X, top, r1], [X, top, f2]);
  mill(f2, top, 5, -1, 0.3);
  // act 3: the tunnel, 2 wide, north then dog-legged north-east onto the green (8 x 6)
  const tz = f2 - 2.3, gz = tz - 2.5, gz1 = gz - 6; // the dog-leg's start, the green's south and north edges
  t.floor(-D, tz, D, f2, top).floor(-D, gz, X, tz, top).floor(-X, gz1, X, gz, top);
  t.rail(1.5, [-D, top, f2], [-D, top, tz], [-D + 2.5, top, gz]).rail(1.5, [D, top, f2], [D, top, tz + 0.5], [X, top, gz]);
  t.rail(H, [-D + 2.5, top, gz], [-X, top, gz], [-X, top, gz1], [X, top, gz1], [X, top, gz]);
  return t.tee(0, 0, 0).cup(-1.5, top, gz - 3.5);
};
