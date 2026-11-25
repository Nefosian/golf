import { hole, roundRect } from '../lib.mjs';

// Le Champ de Taupes (medium, par 3): a farm field where moles pop up in staggered rows, two hay bales
// in the way, a grain conveyor along the east side that carries a ball towards the green, and a strip
// of mud before the green that kills a ball too slow. Safe: the conveyor. Risky: straight through the
// moles, timed. A coin in the far west corner.
export default () => {
  const t = hole('Le Champ de Taupes', { theme: 'ferme', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 8]] });
  t.path([0, 0, -3], [0, -1], { width: 8 }).straight(4).done();
  t.floor(-2.5, -24, 2.5, -22.5, 0, 'sand'); // the mud, first: laid on the field, it wins
  t.plate(roundRect(-8, -25, 8, -7, 3), 0, { open: [[0, -7, 8], [0, -25, 7]] });
  [[-11, 0], [-15, 1.5], [-19, 0]].forEach(([z, off], row) => {
    for (const x of [-4.5, -1.5, 1.5, 4.5]) if (x + off < 5.2) t.mole(x + off, z, 0, { r: 0.5, period: 2.4, phase: ((x + 6) / 12 + row / 3) % 1 });
  });
  t.post(-6, -13, 0, 0.6, 0.6).post(6.4, -21.5, 0, 0.6, 0.6); // hay bales
  t.pad('wind', 5.6, -20, 7.6, -8, 0, { accel: [0, 0, -3] }); // the grain conveyor
  t.disc('strokes', -6.8, -23.5, 0.45, 0, { add: -1 }, { once: true });
  return t.green(roundRect(-7, -36, 7, -25, 2), 0, 2, -31, { open: [[0, -25, 7]] }).tee(0, 0, 1.5);
};
