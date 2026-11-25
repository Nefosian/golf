import { hole } from '../lib.mjs';

// La Mare aux Canards (medium, par 3): a pond fills the farmyard; a plank bridge without rails crosses
// it straight to the cup, a duck paddles along it (it pushes a ball into the water). Two lily-pad
// islands, the coin on one of them. Safe: round the pond on the grass. Risky: the bridge.
export default () => {
  const t = hole('La Mare aux Canards', { theme: 'ferme', par: 3 });
  const pads = [[-5, -16, -3, -12], [3, -15, 5, -11]], bridge = [-1, -20, 1, -7];
  t.floor(-9, -24, 9, -20).floor(-9, -7, 9, -3).floor(-9, -20, -6, -7).floor(6, -20, 9, -7);
  for (const r of [bridge, ...pads]) t.floor(...r);
  t.lake(-6, -20, 6, -7, [bridge, ...pads]);
  t.fence(-9, -24, 9, -3);
  t.slider(-0.45, -11.4, 0.45, -10.6, 0, 0.45, [0, -5], { period: 4 }); // the duck
  t.disc('strokes', -4, -14, 0.45, 0, { add: -1 }, { once: true });
  return t.cup(0, 0, -22).tee(0, 0, -5);
};
