import { hole, roundRect } from '../lib.mjs';

// L'Atelier du Père Noël (hard, par 3): a conveyor belt carries the ball into the workshop, presents
// sliding across it. In the workshop, the way to the green is shut by the sleigh-shed door: its key lies
// in a corner. Key way: the key, the door, the putt. Or the chimney, a cannon in the other corner that
// lobs the ball over the wall onto the green, far from the cup. The coin by the cannon.
export default () => {
  const t = hole("L'Atelier du Père Noël", { theme: 'noel', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 5]] });
  t.path([0, 0, -3], [0, -1], { width: 5 }).straight(12).done();
  t.pad('wind', -2.5, -14, 2.5, -4, 0, { accel: [0, 0, -3] }); // the conveyor belt
  t.slider(-2.4, -7.4, -1.6, -6.6, 0, 0.5, [4, 0], { period: 3 }).slider(1.6, -11.4, 2.4, -10.6, 0, 0.5, [-4, 0], { period: 3, phase: 0.5 }); // presents
  t.plate(roundRect(-8, -24, 8, -15, 2), 0, { open: [[0, -15, 5], [0, -24, 4]] }); // the workshop
  t.block(-2, -24.15, 2, -23.85, -0.15, 0.45, { key: 1 }); // the sleigh-shed door
  t.disc('key', -6.3, -21.8, 0.5, 0, { key: 1 });
  t.cannon(5.6, -19, 0, [4.5, 0, -33], { T: 1.2 }); // the chimney
  t.disc('strokes', 6.2, -16.6, 0.45, 0, { add: -1 }, { once: true });
  return t.green(roundRect(-7, -36, 7, -24, 2), 0, -2, -31, { open: [[0, -24, 4]] }).tee(0, 0, 1.5);
};
