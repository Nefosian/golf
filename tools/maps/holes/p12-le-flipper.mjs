import { hole, roundRect } from '../lib.mjs';

// Le Flipper (medium, par 3): a rounded arena, four bumper posts in a diamond in front of the cup (they
// kick back at a fixed speed: readable). Safe: round them, off the side cushions. Risky: through the
// diamond. Ricochets from ball to ball.
export default () => {
  const t = hole('Le Flipper', { theme: 'nuit', par: 3 });
  t.plate(roundRect(-4, -4, 4, 2, 1.5), 0, { open: [[0, -4, 5]] });
  for (const [x, z] of [[0, -11], [-1.9, -13.2], [1.9, -13.2], [0, -15.4]]) t.post(x, z, 0, 0.45, 0.45, 'bumper');
  return t.green(roundRect(-8, -23, 8, -4, 5), 0, 0, -19.5, { open: [[0, -4, 5]] }).tee(0, 0, 0);
};
