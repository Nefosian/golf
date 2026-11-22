import { hole, roundRect } from '../lib.mjs';

// L'Autoroute (medium, par 3): a road down, a hairpin, and back up to the green. The left lane is the
// express: speed pads one after the other take a ball round in one shot, if the hairpin lets it (too
// fast, it bangs the outer wall and comes back). Safe: the right lane, no pads, two shots. Balls meet
// coming out of the hairpin.
export default () => {
  const t = hole("L'Autoroute", { theme: 'ville', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 6]] });
  t.path([0, 0, -3], [0, -1], { width: 6 }).straight(16).turn(-180, 6).straight(16).done();
  for (const z of [-6, -10, -14]) t.pad('speedpad', -3, z - 1.2, -0.2, z, 0, { dir: [0, 0, -1], speed: 14 });
  for (const z of [-16, -12]) t.pad('speedpad', 12.2, z, 15, z + 1.2, 0, { dir: [0, 0, 1], speed: 14 });
  return t.green(roundRect(7, -3, 17, 5, 2), 0, 12, 2, { open: [[12, -3, 6]] }).tee(0, 0, 1);
};
