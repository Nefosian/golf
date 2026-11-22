import { hole, roundRect } from '../lib.mjs';

// La Passerelle (pilot of the rounded pool): the tee on a plateau, the cup at the bottom of a bowl
// down below, seen from the tee. Safe line (par 3): a wide path that winds left and down, and
// enters the bowl from the side. Risky line (par 2): a narrow bridge without walls, straight down
// to the bowl over the void. Every ball ends in the bowl: that is where they knock each other. On
// the bridge a block slides across and back every 3 s (it pushes into the void); on the road a row
// of moles rises and sinks across the long slope: wait for them, or go through as they sink.
// The tee is left of the bridge's line: from the middle, a shot banked off the back wall went down the
// bridge more surely than one aimed at it (10 % holed in one, 0.5 % lost, measured with mapcheck).
export default () => {
  const t = hole('La Passerelle', { theme: 'bocage', par: 3 });
  const top = 2, rim = 1, bowl = [0, -24], r1 = 7, collar = 1; // heights; the bowl, its slopes and collar
  const out = r1 + 0.05; // where a path ends, on the collar
  // the plateau: 8 × 8, exits on the left (the path, 5 wide) and in front (the bridge, 2.4 wide)
  t.plate(roundRect(-4, -4, 4, 4, 1.5), top, { open: [[-4, 0, 5], [0, -4, 1.8]] });
  // safe: left, round to the south, down a long straight, round to the east into the bowl
  const safe = t.path([-4, top, 0], [-1, 0], { width: 5 })
    .straight(6).turn(-90, 5).straight(15, { rise: rim - top }).turn(-90, 4);
  // its walls run on until they meet the collar's wall, its floor a little further, onto the collar
  const { at } = safe.end, meet = Math.sqrt((r1 + collar) ** 2 - 2.5 ** 2);
  safe.straight(bowl[0] - meet - at[0]).straight(meet - out, { walls: 'none' }).done();
  for (let i = 0; i < 4; i++) t.mole(-16.5 + i, -12, 1.55, { r: 0.4, period: 2.5, phase: i / 4 }); // across the slope (1.55 high there)
  // risky: the bridge, straight down to the bowl
  t.path([0, top, -4], [0, -1], { width: 1.8, walls: 'none' })
    .straight(-4 - (bowl[1] + out) - 1, { rise: rim - top }).straight(1).done();
  t.slider(-2.6, -10.3, -1.8, -9.7, 1.5, 0.5, [3.6, 0], { period: 3 }); // the pusher, across the bridge's middle
  t.bowl(bowl[0], bowl[1], 0, 2, r1, rim, { collar, cup: true, open: [[bowl[0] - r1 - collar, bowl[1], 5], [bowl[0], bowl[1] + r1 + collar, 1.8]] });
  return t.tee(-2, top, 2);
};
