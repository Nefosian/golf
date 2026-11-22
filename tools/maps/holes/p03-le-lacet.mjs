import { hole, roundRect } from '../lib.mjs';

// Le Lacet (easy, par 3): a long way down in three switchbacks (sloped straights, flat hairpins), the
// green at the bottom. Safe: follow the road. Risky: in the middle of a switchback the wall on the side
// of the next one down is open, and so is that one's: a ball with enough speed jumps the 1-wide gap and
// lands on the road below, 1.5 lower (too slow, it falls: +1). Balls that cut land in front of those on the road.
export default () => {
  const t = hole('Le Lacet', { theme: 'canyon', par: 3 });
  const w = 5, r = 3; // the road; its hairpins (the switchbacks 2r apart: a gap of 1 between them)
  t.plate(roundRect(0, -4, 7, 4, 1.5), 5.5, { open: [[0, 0, w]] });
  // 'left' keeps the wall on the left only: here the open side faces the switchback below
  t.path([0, 5.5, 0], [-1, 0], { width: w })
    .straight(3, { rise: -0.65 }).straight(4, { rise: -0.6, walls: 'left' }).straight(3, { rise: -0.65 })
    .turn(-180, r)
    .straight(3, { rise: -0.65, walls: 'right' }).straight(4, { rise: -0.6, walls: 'left' }).straight(3, { rise: -0.65 })
    .turn(-180, r)
    .straight(3, { rise: -0.65 }).straight(4, { rise: -0.6 }).straight(3, { rise: -0.65, walls: 'right' })
    .done();
  t.green(roundRect(-19, -17, -10, -7, 2), 1, -15.5, -12, { open: [[-10, -12, w]] });
  return t.tee(4, 5.5, 0);
};
