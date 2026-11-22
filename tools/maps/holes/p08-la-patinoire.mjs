import { hole, roundRect } from '../lib.mjs';

// La Patinoire (medium, par 3): an ice rink, sand along its long sides that kills the speed; the cup on
// a small grass green beyond it. Safe: along a sand side. Risky: straight across the ice, at exactly the
// right power. No ice ever runs into water. On ice a knock sends a ball far, sometimes to the right place.
export default () => {
  const t = hole('La Patinoire', { theme: 'banquise', par: 3 });
  t.plate(roundRect(-5, -6, 5, 1, 1.5), 0, { open: [[0, -6, 6]] });
  t.floor(-6, -19, -4.6, -9, 0, 'sand').floor(4.6, -19, 6, -9, 0, 'sand'); // first: laid on the ice, they win
  t.plate(roundRect(-6, -22, 6, -6, 3), 0, { material: 'ice', open: [[0, -6, 6], [0, -22, 2.5]] });
  return t.green(roundRect(-4, -29, 4, -22, 2), 0, 0, -26, { open: [[0, -22, 2.5]] }).tee(0, 0, -1);
};
