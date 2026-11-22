import { hole, roundRect } from '../lib.mjs';

// Les Portails (medium, par 3): the green is up on a second level. Safe: a ramp round the east side.
// Risky: a portal on the tee plate, small, whose exit (the same colour) is on a balcony beside the green:
// the ball comes out turned towards the green at the speed it went in. Balls out of the portal land
// among those coming up the ramp.
export default () => {
  const t = hole('Les Portails', { theme: 'nuit', par: 3 });
  const up = 2.5;
  t.plate(roundRect(-6, -3, 6, 3, 1.5), 0, { open: [[6, 0, 4.5]] });
  t.path([6, 0, 0], [1, 0], { width: 4.5 }).straight(2).turn(90, 3).straight(19, { rise: up }).turn(90, 3).straight(2).done();
  t.plate(roundRect(-11, -28, -6, -22, 1), up, { open: [[-6, -25, 3]] }); // the balcony
  t.disc('teleport', -3, -1, 0.6, 0, { to: [-9.5, up + 0.25, -25], turn: -Math.PI / 2 });
  return t.green(roundRect(-6, -31, 6, -19, 2), up, 0, -26, { open: [[6, -25, 4.5], [-6, -25, 3]] }).tee(1, 0, 1.5);
};
