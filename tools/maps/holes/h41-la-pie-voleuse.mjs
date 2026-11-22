import { hole } from '../lib.mjs';

// La Pie Voleuse: a plain fairway with a bend, but three coins shine, each at the center of a
// repulsor. To steal one, go straight at its center fast enough; askew, the ball is spat out,
// often into a sand gutter. Each repulsor is stronger than the last.
export default () => {
  const t = hole('La Pie Voleuse', { theme: 'bocage', par: 4 });
  const G = 1.5, R = 2; // gutter width, repulsor radius
  // an L: up the west arm, then east along the north arm; sand gutters on the outer edges
  t.floor(-5 + G, 3, 3, -18).floor(-5 + G, -18, 19 - G, -26 + G);
  t.floor(-5, 3, -5 + G, -26 + G, 0, 'sand').floor(-5, -26 + G, 19, -26, 0, 'sand').floor(19 - G, -18, 19, -26 + G, 0, 'sand');
  t.rail(0.45, [-5, 0, 3], [3, 0, 3], [3, 0, -18], [19, 0, -18], [19, 0, -26], [-5, 0, -26], [-5, 0, 3]);
  const pie = (x, z, push) => {
    t.disc('magnet', x, z, R, 0, { at: [x, 0, z], accel: -push });
    t.disc('strokes', x, z, 0.5, 0, { add: -1 }, { once: true });
  };
  pie(-0.5, -7, 6); // act 1: on the way, or nearly
  pie(-2, -21.5, 9); // act 2: aside, in the bend
  pie(12, -22.5, 12); // act 3: against the green
  return t.tee(0, 0, 1).cup(15.5, 0, -21);
};
