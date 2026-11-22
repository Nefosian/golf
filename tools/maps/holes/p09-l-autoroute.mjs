import { hole, roundRect } from '../lib.mjs';

// L'Autoroute (medium, par 3): a road down, a hairpin, and back up to the green. The left lane is the
// express: speed pads one after the other take a ball round in one shot, if the hairpin lets it (too
// fast, it bangs the outer wall and comes back). Safe: the right lane, no pads, two shots. At the end
// of the express lane, a cannon: hit it at speed and it lobs the ball onto the green. Moles pop up on
// the way back. Balls meet coming out of the hairpin.
export default () => {
  const t = hole("L'Autoroute", { theme: 'ville', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 5]] });
  t.path([0, 0, -3], [0, -1], { width: 5 }).straight(16).turn(-180, 6).straight(16).done();
  for (const z of [-6, -10, -14]) t.pad('speedpad', -2.5, z - 1.2, -0.2, z, 0, { dir: [0, 0, -1], speed: 14 });
  for (const z of [-16, -12]) t.pad('speedpad', 12.2, z, 14.5, z + 1.2, 0, { dir: [0, 0, 1], speed: 14 });
  t.cannon(-1.3, -18.6, 0, [12, 0, 1], { T: 1.4 });
  for (const [x, z] of [[10, -11], [12.2, -8], [14, -11]]) t.mole(x, z, 0, { r: 0.45, period: 2.2, phase: (x - 10) / 6 });
  return t.green(roundRect(7, -3, 17, 5, 2), 0, 12, 2, { open: [[12, -3, 5]] }).tee(0, 0, 1);
};
