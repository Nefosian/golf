import { hole, roundRect } from '../lib.mjs';

// La Colline (medium, par 3): up a hill and down the other side. On the top a windmill bar turns, and
// the top has no wall on the east: a ball knocked off falls (+1). At the bottom, mud. Too soft, the ball
// rolls back down to you; too hard, it flies off the top or sticks in the mud. The coin lies on the edge
// of the top, by the void.
export default () => {
  const t = hole('La Colline', { theme: 'ferme', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 6]] });
  t.floor(-3, -28.5, 3, -27, 0, 'sand'); // the mud at the foot of the hill, first: it wins
  t.path([0, 0, -3], [0, -1], { width: 6 }).straight(2).straight(8, { rise: 2 }).straight(5, { walls: 'left' }).straight(8, { rise: -2 }).straight(4).done();
  t.spinner(0, -15.5, 2, 2.3, { period: 4.5 });
  t.disc('strokes', 2.4, -12.8, 0.45, 2, { add: -1 }, { once: true });
  return t.green(roundRect(-7, -40, 7, -30, 2), 0, 0, -35.5, { open: [[0, -30, 6]] }).tee(0, 0, 1);
};
