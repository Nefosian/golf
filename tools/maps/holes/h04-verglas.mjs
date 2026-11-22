import { hole } from '../lib.mjs';

// Verglas: curling on two rinks. The ball barely slows on ice: it dies on a grass "house", or slides
// on until sand stops it. A sand drift topped by a fence separates the rinks, but for a 3-wide door
// against the east cushion. The final house backs onto that fence, between two sand islets: no ball
// through the door slides into it; it is played back from the far end like a curling stone, or
// chipped out of an islet.
export default () => {
  const t = hole('Verglas', { theme: 'banquise', par: 3 });
  // tiles: [x0, z0, x1, z1, material], no two overlapping
  const tiles = [
    [-5, -1.5, 5, 1.5], // apron
    // rink 1: sand on the west, the east wall is the cushion; the first house in the middle
    [-5, -13.5, -4.4, -1.5, 'sand'], [-4.4, -13.5, 5, -8.5, 'ice'], [-4.4, -5.5, 5, -1.5, 'ice'],
    [-4.4, -8.5, -1.5, -5.5, 'ice'], [1.5, -8.5, 5, -5.5, 'ice'], [-1.5, -8.5, 1.5, -5.5],
    // the drift and its door
    [-5, -15, 2, -13.5, 'sand'], [2, -15, 5, -13.5, 'ice'],
    // rink 2: sand all round, a deep bank at the back (a fast ball does not come back out of it);
    // the final house against the fence, between two sand islets
    [-5, -24, 5, -21.5, 'sand'], [-5, -21.5, -4.4, -15, 'sand'], [4.4, -21.5, 5, -15, 'sand'],
    [-4.4, -21.5, 4.4, -17, 'ice'], [-4.4, -17, -3, -15, 'ice'], [-3, -17, -1, -15, 'sand'], [-1, -17, 1, -15],
    [1, -17, 3, -15, 'sand'], [3, -17, 4.4, -15, 'ice'],
  ];
  for (const [x0, z0, x1, z1, m] of tiles) t.floor(x0, z0, x1, z1, 0, m);
  t.fence(-5, -24, 5, 1.5);
  t.rail(0.45, [-5, 0, -15], [2, 0, -15]); // the fence on the drift: what plows through the sand stops there
  t.disc('strokes', -2.4, -16, 0.4, 0, { add: -1 }, { once: true }); // the coin, in the west islet: a putt that stops in the sand
  return t.tee(0, 0, 0).cup(0, 0, -16.1);
};
