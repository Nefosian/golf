import { hole, V } from '../lib.mjs';

// La Porte Tambour: two revolving doors, four wings each, turning in round (16-sided) cages open
// at the front and the back. A ball in a quarter is carried round by the wing behind it and let out at
// the first opening it meets: ahead, or back where it came from.
export default () => {
  const t = hole('La Porte Tambour', { theme: 'ville', par: 4 });
  const X = 4.2, H = 0.45; // half width of the rooms, wall height
  // The cage is a 16-sided polygon hugging the circle the wings sweep (3.2): its inner faces are
  // 3.4 to 3.47 from the hub, so a ball against them is always within reach of a wing tip, and
  // no ball fits between a tip and the wall. Its front and back are open over 45° (2.4 u).
  const Rv = 3.55 / Math.cos(Math.PI / 16); // the vertices of the wall centerline
  const at = (deg, zc) => [Rv * Math.cos(deg * Math.PI / 180), 0, zc - Rv * Math.sin(deg * Math.PI / 180)];
  t.floor(-X, -30, X, 2.5);
  t.fence(-X, -30, X, 2.5);
  // door at zc: the cage (the walls beside its openings close the room), a hub post and two
  // crossed wings turning with the given period (dir 1: counterclockwise seen from above)
  const door = (zc, period, dir) => {
    for (const s of [1, -1]) {
      const arc = [];
      for (let d = 67.5; d >= -67.5; d -= 22.5) arc.push(at(d, zc));
      const side = arc.map(([x, y, z]) => [s * x, y, z]);
      t.rail(H, [s * X, 0, side[0][2]], ...side, [s * X, 0, side[side.length - 1][2]]);
    }
    t.post(0, zc, 0, 1, 0.6); // the drum: no ball rests where the wings push slowly
    const motion = { period, move: [0, 0, 0], pivot: V(0, 0.3, zc), axis: [0, dir, 0] };
    t.raw({ shape: 0, kind: 1, c: V(0, 0.3, zc), h: V(3.2, 0.25, 0.12), motion });
    t.raw({ shape: 0, kind: 1, c: V(0, 0.3, zc), rot: V(0, Math.PI / 2, 0), h: V(3.2, 0.25, 0.12), motion });
  };
  door(-7, 10, 1); // act 1: the slow door
  // act 2: the hall, between the doors
  door(-19, 6, -1); // act 3: the fast door, turning the other way
  return t.tee(0, 0, 0).cup(0, 0, -26.5);
};
