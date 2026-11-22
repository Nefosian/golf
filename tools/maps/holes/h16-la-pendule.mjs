import { hole } from '../lib.mjs';

// La Pendule: two dials to cross, their hands sweeping whatever lies there; the cup beyond them.
// The alarm clock: one slow hand, wide edges out of its reach. The clock: a long hand one way, a
// short one the other way, 0.8 of safe edge. Two low walls frame the landing between them and the
// green: no straight line goes from the tee through both, so each dial is a shot of its own.
export default () => {
  const t = hole('La Pendule', { theme: 'bocage', par: 4 });
  const X = 6.15, zEnd = -33.5; // the side walls' inner faces at 6: the clock's edges are 0.8
  t.floor(-X, zEnd, X, 2.5).fence(-X, 2.5, X, zEnd);
  // a hand: a bar from the hub out to length L, turning about the hub (axis y: one way, -y: the other)
  const hand = (cz, L, period, dir, phase) => t.block(0, cz - 0.12, L, cz + 0.12, 0.05, 0.55, {
    motion: { period, move: [0, 0, 0], pivot: [0, 0.3, cz], axis: [0, dir, 0], ...(phase ? { phase } : {}) } });
  const zr = -6.5, zh = -20.5; // the alarm clock (radius 3) and the clock (radius 5.2)
  t.post(0, zr, 0, 0.5).post(0, zh, 0, 0.5); // the hubs
  hand(zr, 3, 12, 1, 0);
  hand(zh, 5.2, 9, 1, 0.25);
  hand(zh, 3.4, 24, -1, 0.6);
  // after the alarm clock: open at both edges and around its hub's line; before the green: open at
  // both edges only.
  const za = -10.5, zb = -26.4;
  t.rail(0.45, [-3.5, 0, za], [-1.2, 0, za]).rail(0.45, [1.2, 0, za], [3.5, 0, za]);
  t.rail(0.45, [-3, 0, zb - 2], [-3, 0, zb], [3, 0, zb], [3, 0, zb - 2]); // the green is entered straight, at its edges
  t.disc('strokes', -3.6, zh, 0.5, 0, { add: -1 }, { once: true }); // 9 o'clock on the clock, where both hands pass
  return t.tee(0, 0, 0).cup(0, 0, -30.8);
};
