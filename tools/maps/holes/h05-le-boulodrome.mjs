import { hole } from '../lib.mjs';

// Le Boulodrome: pétanque. A ramp lobs the ball onto a sand court, where it lands without a bounce
// and slides 2 or 3 more units like a pointed boule. The jack (the cup) is on the upper court,
// 0.4 higher behind a sand bank, sheltered by a low board: a lob lands around it, never in it.
// A water gutter waits behind.
export default () => {
  const t = hole('Le Boulodrome', { theme: 'canyon', par: 3, maxStrokes: 10 });
  const H = 0.4; // the upper court is H higher
  const R = +(3 * Math.tan(15 * Math.PI / 180)).toFixed(4); // the lip of the ramp
  const w = 3; // half-width of the ramp
  const zr = -2, zl = -5, zb = -9, zt = -10.5, zg = -15.5; // ramp foot, lip, bank foot, bank top, gutter
  // (the lower court is 4 deep: from anywhere on it a full shot still climbs the bank)
  t.floor(-3, zr, 3, 2.5); // the lawn
  t.slab([0, 0, zr], [0, R, zl], 2 * w); // the ramp, 15°
  t.block(-w, zl, w, zl + 0.2, -0.5, R - 0.06); // fills under the lip
  t.floor(-4, zb, 4, zl, 0, 'sand'); // the lower court
  t.slab([0, 0, zb], [0, H, zt], 8, 'sand'); // the bank: sand holds a ball on it
  t.floor(-4, zg, 4, zt, H, 'sand'); // the upper court
  t.water(-4, zg - 1.5, 4, zg, 0.2); // the gutter
  t.rail(0.45, [-1.2, H, zt - 1.2], [1.2, H, zt - 1.2]); // the board in front of the jack
  t.rail(0.45, [3, 0, zr], [3, 0, 2.5], [-3, 0, 2.5], [-3, 0, zr]); // the lawn
  t.rail(0.45, [w, 0, zr], [w, R, zl]).rail(0.45, [-w, 0, zr], [-w, R, zl]); // the ramp's sides
  t.rail(0.45, [w, 0, zl], [4, 0, zl], [4, 0, zb], [4, H, zt], [4, H, zg], [4, 0.2, zg - 1.5]); // east
  t.rail(0.45, [-w, 0, zl], [-4, 0, zl], [-4, 0, zb], [-4, H, zt], [-4, H, zg], [-4, 0.2, zg - 1.5]); // west
  t.rail(0.45, [-4, 0.2, zg - 1.5], [4, 0.2, zg - 1.5]); // behind the gutter
  return t.tee(0, 0, 1.5).cup(0, H, zt - 2.5);
};
