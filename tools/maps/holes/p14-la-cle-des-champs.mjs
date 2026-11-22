import { hole, roundRect } from '../lib.mjs';

// La Clé des Champs (hard, par 3): a gate shuts the short way to the green; its key lies in an alcove
// beside the tee. Key way (par): one shot for the key, one through the gate, the putt. Without it: the
// long way round, a stroke more. The key is each ball's own; the alcove is narrow.
export default () => {
  const t = hole('La Clé des Champs', { theme: 'chateau', par: 3 });
  t.plate(roundRect(-6, -4, 6, 4, 1.5), 0, { open: [[0, -4, 4.5], [6, 0, 4.5], [-6, 0, 3]] });
  t.plate(roundRect(-11, -2, -6, 2, 0.5), 0, { open: [[-6, 0, 3]] }); // the alcove (its opening on its straight side)
  t.disc('key', -9.5, 0, 0.5, 0, { key: 1 });
  t.path([0, 0, -4], [0, -1], { width: 4.5 }).straight(20).done(); // the short way
  t.block(-2.25, -12.15, 2.25, -11.85, -0.15, 0.45, { key: 1 }); // its gate
  t.path([6, 0, 0], [1, 0], { width: 4.5 }).straight(2).turn(90, 3).straight(24).turn(90, 3).straight(2).done(); // the long way
  return t.green(roundRect(-6, -34, 6, -24, 2), 0, 0, -30, { open: [[0, -24, 4.5], [6, -30, 4.5]] }).tee(0, 0, 1.5);
};
