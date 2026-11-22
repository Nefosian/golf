import { hole, roundRect } from '../lib.mjs';

// Le Col du Vent (hard, par 4): two bare crests, no walls, each swept by a side wind, the other way
// (the fans show where it comes from); a ledge with a checkpoint between them. Aim into the wind; a
// ball that stops on a crest is blown off (+1). Safe: the long walled road round the west, in a
// headwind that slows the balls down (not enough to move a ball at rest). Blown balls end on the same
// side of the green.
export default () => {
  const t = hole('Le Col du Vent', { theme: 'chateau', par: 4, maxStrokes: 10 });
  t.plate(roundRect(-5, -4, 5, 4, 1.5), 0, { open: [[0, -4, 2.4], [-5, 0, 4.5]] });
  t.path([0, 0, -4], [0, -1], { width: 2.4, walls: 'none' }).straight(8).done(); // crest 1
  t.zone('wind', { shape: 0, c: [0, 1.2, -8], h: [1.2, 1.2, 3.8], params: { accel: [3.5, 0, 0] } });
  t.plate(roundRect(-4, -18, 4, -12, 1.5), 0, { open: [[0, -12, 2.4], [0, -18, 2.4]] }); // the ledge
  t.pad('checkpoint', -2, -15.5, 2, -14.5, 0, { at: [0, 0.5, -15] });
  t.path([0, 0, -18], [0, -1], { width: 2.4, walls: 'none' }).straight(8).done(); // crest 2
  t.zone('wind', { shape: 0, c: [0, 1.2, -22], h: [1.2, 1.2, 3.8], params: { accel: [-3.5, 0, 0] } });
  t.path([-5, 0, 0], [-1, 0], { width: 4.5 }).straight(3).turn(-90, 3).straight(28).turn(-90, 3).straight(3).done(); // the road
  t.zone('wind', { shape: 0, c: [-11, 1, -17], h: [2.25, 1, 13], params: { accel: [0, 0, 2] } }); // its headwind
  return t.green(roundRect(-5, -38, 5, -26, 2), 0, 0, -32.5, { open: [[0, -26, 2.4], [-5, -34, 4.5]] }).tee(0, 0, 1.5);
};
