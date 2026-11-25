import { hole, roundRect } from '../lib.mjs';

// Le Lac Gelé (hard, par 3): up an ice ramp (too soft, the ball slides back to you) onto a frozen lake
// with two holes in the ice. Banks of snow along its sides and its far shore catch a ball that slides
// too far (on ice alone, a hard shot would slide half a minute). A sledge crosses the far side of the
// lake; snowmen stand on it. The coin beside a hole in the ice.
export default () => {
  const t = hole('Le Lac Gelé', { theme: 'noel', par: 3 });
  const y = 1.2, ice = [[-9, -26, -5, -11], [-5, -26, -2, -20], [-5, -16, -2, -11], [-2, -26, 2, -11], [2, -26, 5, -17], [2, -13, 5, -11], [5, -26, 9, -11]];
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 6]] });
  t.path([0, 0, -3], [0, -1], { width: 6, material: 'ice' }).straight(2).straight(6.2, { rise: y }).done();
  // the snow banks, first: laid on the ice, they win
  t.floor(-9, -26, -7.4, -11, y, 'sand').floor(7.4, -26, 9, -11, y, 'sand').floor(-7.4, -26, -2, -24.6, y, 'sand').floor(2, -26, 7.4, -24.6, y, 'sand');
  for (const r of ice) t.floor(...r, y, 'ice');
  t.lake(-9, -26, 9, -11, ice, y - 0.3);
  t.rail(0.45, [-3, y, -11], [-9, y, -11], [-9, y, -26], [-2, y, -26]).rail(0.45, [3, y, -11], [9, y, -11], [9, y, -26], [2, y, -26]);
  t.post(-5.8, -14, y, 0.5).post(5.8, -21, y, 0.5).post(0, -18.5, y, 0.5); // snowmen
  t.slider(-7.2, -24.2, -5.4, -23.4, y, 0.5, [11, 0], { period: 6 }); // the sledge
  t.disc('strokes', 3.5, -12, 0.45, y, { add: -1 }, { once: true });
  return t.green(roundRect(-6, -36, 6, -26, 2), y, 0, -32, { open: [[0, -26, 4]] }).tee(0, 0, 1.5);
};
