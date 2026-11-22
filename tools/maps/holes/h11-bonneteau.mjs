import { hole } from '../lib.mjs';

// Bonneteau: three portals side by side in the tee room, each to its own corridor of the back
// room, all three meeting on the same green. Portal colours follow the order of the teleport
// zones: violet, rose, indigo.
export default () => {
  const t = hole('Bonneteau', { theme: 'bocage', par: 3 });
  const pz = -4.5, Q = Math.PI / 2; // the portals' row
  // tee room (z 2 to -6), the indigo portal in a band of sand.
  t.floor(-6, -2.5, 6, 2).floor(-6, -6, 2.2, -2.5).floor(2.2, -6, 5.8, -2.5, 0, 'sand').floor(5.8, -6, 6, -2.5);
  // back room (z -6 to -28): three corridors 4 wide (z -6 to -17), then the green.
  t.floor(-6, -10, -2, -6, 0, 'sand').floor(-2, -10, 6, -6).floor(-6, -28, 6, -10);
  t.fence(-6, -28, 6, 2).rail(0.45, [-6, 0, -6], [6, 0, -6]);
  t.rail(0.45, [-2, 0, -6], [-2, 0, -17]).rail(0.45, [2, 0, -6], [2, 0, -15]);
  // the three portals. Violet, in the middle behind two posts, comes out facing the green, 2 to the
  // left of the cup: wider than the posts let a tee shot turn, so it takes a slant entry to drop in.
  t.disc('teleport', 0, pz, 0.55, 0, { to: [-1.5, 0.18, -7.5] }).post(-0.8, -3.2).post(0.8, -3.2);
  // rose, on the left, wide open: out heading west into the bunker; a baffle on the west side after it.
  t.disc('teleport', -4, pz, 0.8, 0, { to: [-2.8, 0.18, -8], turn: Q });
  t.rail(0.45, [-6, 0, -13], [-4.6, 0, -13]);
  // indigo, on the right, in the sand: out heading east over a coin, then a mirror at 45° that
  // sends a ball coming up the corridor west onto the green: a bank.
  t.disc('teleport', 4, pz, 0.55, 0, { to: [2.8, 0.18, -8], turn: -Q });
  t.disc('strokes', 4.3, -8, 0.6, 0, { add: -1 }, { once: true });
  t.rail(0.45, [6, 0, -15], [2, 0, -19]);
  return t.tee(0, 0, 0.5).cup(0.5, 0, -22);
};
