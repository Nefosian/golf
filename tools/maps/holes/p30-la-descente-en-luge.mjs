import { hole, roundRect } from '../lib.mjs';

// La Descente en Luge (medium, par 3): from 6 up, a bobsleigh run of ice: down, a hairpin, down again, a
// hairpin, and into the green through a strip of powder snow that stops the fast ones. On ice the ball
// keeps all its speed: down the slopes it bangs the hairpins' walls. Candy canes stand on the green.
// The coin in the first hairpin.
export default () => {
  const t = hole('La Descente en Luge', { theme: 'noel', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 6, { open: [[0, -3, 5]] });
  t.path([0, 6, -3], [0, -1], { width: 5, material: 'ice' }).straight(2).straight(10, { rise: -2 }).turn(-180, 4)
    .straight(10, { rise: -2 }).turn(180, 4).straight(3).done();
  t.disc('strokes', 4, -19.4, 0.45, 4, { add: -1 }, { once: true });
  t.floor(13.6, -11, 18.4, -9, 2, 'sand'); // the powder snow, first: it wins
  t.post(13.5, -15, 2, 0.3).post(18.5, -16, 2, 0.3); // candy canes
  return t.green(roundRect(11, -23, 21, -8, 2), 2, 16, -19, { open: [[16, -8, 5]] }).tee(0, 6, 1.5);
};
