import { hole } from '../lib.mjs';

// Le Coffre-Fort: the key lies in a walled vault with no door. The violet portal, at the far end of
// the lawn, lets the ball in; the rose portal, in the vault's other corner, spits it out facing the
// green's gate: with the key, the ball goes through on its run-up.
export default () => {
  const t = hole('Le Coffre-Fort', { theme: 'chateau', par: 4, maxStrokes: 10 });
  const W = 0.6, Y = 0.18;
  t.floor(-7, 3, 7, -7).floor(7, -1, 13, -8); // the lawn (the vault in its north-west corner), the green
  t.rail(W, [7, 0, -4], [7, 0, 3], [-7, 0, 3], [-7, 0, -7], [7, 0, -7], [7, 0, -6]);
  t.rail(W, [7, 0, -1], [13, 0, -1], [13, 0, -8], [7, 0, -8], [7, 0, -7]).rail(W, [7, 0, -1], [7, 0, -4]);
  t.raw({ shape: 0, kind: 1, c: [7, 0.075, -5], h: [0.15, 0.375, 1], key: 1 }); // the gate, 2 wide
  t.rail(W, [-7, 0, -3], [-3, 0, -3], [-3, 0, -7]); // the vault: 4 × 4, no door
  // act 1: the violet portal turns a ball coming from the east to go north, into the vault
  t.disc('teleport', -5, 0.5, 0.6, 0, { to: [-5, Y, -3.7], turn: -Math.PI / 2 });
  // act 2: the key in one corner, the rose portal in the other
  t.disc('key', -6.2, -6.2, 0.5, 0, { key: 1 }, { once: true });
  // act 3: the rose portal keeps the heading: a ball rolled east along the vault's back wall comes out
  // facing the gate, 8 away
  t.disc('teleport', -3.8, -6.2, 0.5, 0, { to: [-1, Y, -5] });
  return t.tee(3, 0, 1).cup(10.5, 0, -2.5);
};
