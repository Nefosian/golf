import { hole, roundRect } from '../lib.mjs';

// La Station Orbitale (hard, par 3): a runway, a booster and a kicker launch the ball across 10 units of
// void, through a field of low gravity: it floats over, if fast enough, onto the green. Safe: the
// wormhole on the tee deck sends the ball to a docking bay; from there a corridor with a booster leads
// to the green. The coin in the bay.
export default () => {
  const t = hole('La Station Orbitale', { theme: 'galaxie', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 5]] });
  t.path([0, 0, -3], [0, -1], { width: 5 }).straight(5).straight(2, { rise: 0.5, ease: false }).done({ open: 'end' }); // the kicker
  t.pad('speedpad', -2.5, -6, 2.5, -4.8, 0, { dir: [0, 0, -1], speed: 10 });
  t.lowgrav(-4, -20.5, 4, -9.5, 0, 6, 4); // over the void
  t.plate(roundRect(-15, -27, -9, -21, 1), 0, { open: [[-9, -24, 3]] }); // the docking bay
  t.path([-9.2, 0, -24], [1, 0], { width: 3 }).straight(3.4).done();
  t.pad('speedpad', -8.5, -25.5, -7.3, -22.5, 0, { dir: [1, 0, 0], speed: 8 });
  t.disc('teleport', -3.3, 0.2, 0.6, 0, { to: [-12, 0.25, -24] });
  t.disc('strokes', -13.6, -22.2, 0.45, 0, { add: -1 }, { once: true });
  return t.green(roundRect(-6, -32, 6, -20, 2), 0, 0, -27, { open: [[0, -20, 8], [-6, -24, 3]] }).tee(1, 0, 1.5);
};
