import { hole, V } from '../lib.mjs';

// Coup de Mistral: two jetties, two winds. The wind (stronger than rolling resistance) pins every
// ball to a rail broken by gaps; the islet between them is sheltered, has a checkpoint, and turns
// the course: the second jetty leaves from its other end.
export default () => {
  const t = hole('Coup de Mistral', { theme: 'quai', par: 4, maxStrokes: 10 });
  t.floor(-4, -2, 4, 2); // quay
  t.floor(-2, -12, 2, -2); // jetty 1
  t.floor(-8, -17, 2, -12); // islet
  t.floor(-8, -27, -4, -17); // jetty 2
  t.floor(-10, -34, -2, -27); // green island
  t.water(-7, -12, -2, -2).water(2, -12, 6, -2); // around jetty 1
  t.water(-12, -27, -8, -17).water(-4, -27, 0, -17); // around jetty 2
  const W = 0.45;
  t.rail(W, [-2, 0, -2], [-4, 0, -2], [-4, 0, 2], [4, 0, 2], [4, 0, -2], [2, 0, -2]); // quay
  t.rail(W, [2, 0, -2], [2, 0, -8.5]); // jetty 1: east rail, the gap at its end
  t.rail(W, [-2, 0, -12], [-8, 0, -12], [-8, 0, -17]).rail(W, [-4, 0, -17], [2, 0, -17], [2, 0, -12]); // islet
  t.rail(W, [-8, 0, -17], [-8, 0, -19.5]).rail(W, [-8, 0, -22], [-8, 0, -24]); // jetty 2: west rail, two gaps
  t.rail(W, [-8, 0, -27], [-10, 0, -27], [-10, 0, -34], [-2, 0, -34], [-2, 0, -27], [-4, 0, -27]); // green
  t.zone('wind', { shape: 0, c: V(0, 0.5, -7), h: V(2, 0.5, 5), params: { accel: [4, 0, 0] } }); // west wind on jetty 1
  t.zone('wind', { shape: 0, c: V(-6, 0.5, -22), h: V(2, 0.5, 5), params: { accel: [-5.5, 0, 0] } }); // east wind on jetty 2, stronger
  t.pad('checkpoint', -8, -15, 2, -14, 0, { at: [-3, 0, -14.5] }); // the islet, sheltered
  t.pad('checkpoint', -10, -28.5, -2, -27.5, 0, { at: [-6, 0, -28] }); // the green island
  t.disc('strokes', -7.55, -25.5, 0.35, 0, { add: -1 }, { once: true }); // the coin, on the lip of the last gap
  return t.tee(0, 0, 0).cup(-6, 0, -31.5);
};
