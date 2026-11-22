import { hole, roundRect } from '../lib.mjs';

// Les Moulins (hard, par 4): a long road in three acts. Act 1: a turning bar, the road walled. Act 2:
// another bar, turning the other way, and no wall on the right: the free strip at the bar's end runs
// along the void. Act 3: a row of moles that rise and sink one after the other. You can see when to go;
// balls wait for the same opening and go in a salvo. Nothing moves near the tee or the cup.
export default () => {
  const t = hole('Les Moulins', { theme: 'bocage', par: 4, maxStrokes: 10 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 6]] });
  t.path([0, 0, -3], [0, -1], { width: 6 }).straight(11).straight(9, { walls: 'left' }).straight(12).done();
  t.spinner(0, -9, 0, 2.2, { period: 4 });
  t.spinner(0, -18.5, 0, 2.2, { period: 4, phase: 0.25, turn: -1 });
  for (let i = 0; i < 5; i++) t.mole(-2.4 + i * 1.2, -27, 0, { r: 0.5, period: 3, phase: i / 5 });
  return t.green(roundRect(-6, -43, 6, -35, 2), 0, 0, -39.5, { open: [[0, -35, 6]] }).tee(0, 0, 1);
};
