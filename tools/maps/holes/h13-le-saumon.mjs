import { hole } from '../lib.mjs';

// Le Saumon: two fish ladders, conveyor belts running back towards the tee. A ball that fails to
// climb is carried back down: it loses ground, not strokes. The second ladder has two sand rocks
// to hold on to; beside it, a belt running the right way goes round by the east.
export default () => {
  const t = hole('Le Saumon', { theme: 'quai', par: 4 });
  const belt = (x0, z0, x1, z1, az) => t.pad('wind', x0, z0, x1, z1, 0, { accel: [0, 0, az] });
  // floors: tee pool, first ladder, middle pool, east belt, arrival lawn (the second ladder's are below).
  t.floor(-6, -2, 6, 2).floor(-1.5, -7, 2.5, -2).floor(-6, -11, 6, -7);
  t.floor(3, -20, 6, -11).floor(-6, -27, 6, -20);
  t.rail(0.45, [-1.5, 0, -2], [-6, 0, -2], [-6, 0, 2], [6, 0, 2], [6, 0, -2], [2.5, 0, -2], [2.5, 0, -7], [6, 0, -7],
    [6, 0, -27], [-6, 0, -27], [-6, 0, -7], [-1.5, 0, -7], [-1.5, 0, -2]);
  t.fence(-2, -20, 3, -11); // the block between the second ladder and the east belt
  t.rail(0.45, [3, 0, -11], [3, 0, -9.5]); // its spur: no straight line from the first ladder into the east belt
  t.rail(0.45, [2.5, 0, -27], [2.5, 0, -23]); // the chicane: the east belt drops the ball behind it
  // first ladder: 5 long against 4 u/s².
  belt(-1.5, -6.9, 2.5, -2.1, 4);
  // second ladder: 9 long against 6 u/s², around two sand rocks where a ball holds.
  const rocks = [[-5.4, -14.6, -4.2, -13.4], [-3.8, -17.8, -2.6, -16.6]];
  for (const [x0, z0, x1, z1] of rocks) t.floor(x0, z0, x1, z1, 0, 'sand');
  // the ladder's grass, tiled edge to edge around the rocks (no two floors overlap).
  t.floor(-6, -13.4, -2, -11).floor(-6, -14.6, -5.4, -13.4).floor(-4.2, -14.6, -2, -13.4).floor(-6, -16.6, -2, -14.6)
    .floor(-6, -17.8, -3.8, -16.6).floor(-2.6, -17.8, -2, -16.6).floor(-6, -20, -2, -17.8);
  belt(-6, -13.4, -2, -11.1, 6); belt(-4.2, -14.6, -2, -13.4, 6); belt(-6, -16.6, -2, -14.6, 6);
  belt(-6, -17.8, -3.8, -16.6, 6); belt(-2.6, -17.8, -2, -16.6, 6); belt(-6, -19.9, -2, -17.8, 6);
  // east belt: 9 long, with the ball, 4 u/s².
  belt(3, -19.9, 6, -11.1, -4);
  return t.tee(0.5, 0, 0).cup(0, 0, -25);
};
