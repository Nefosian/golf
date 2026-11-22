import { hole } from '../lib.mjs';

// Le Gardien: an ice rink. On ice a ball stops only in sand (the snowbanks along the boards, the
// bench) or on grass (the tee, the crease, the net). A defender slides across the middle between two
// posts; a goalie sweeps the crease in front of the net. The cup hides in the corner of the net,
// behind a goalpost: no shot from the ice goes straight in, it is pushed in from the crease.
export default () => {
  const t = hole('Le Gardien', { theme: 'banquise', par: 3 });
  const X = 5, S = 0.6, N = -15.8; // half-width of the rink, snowbank width, north boards
  t.floor(-X, 0, X, 2.5); // the tee
  // the ice, cut around the bench, the crease and the snowbanks of the north boards
  t.floor(-X + S, -6, X - S, 0, 0, 'ice').floor(-X + S, -10, 3.2, -6, 0, 'ice').floor(-X + S, -13.4, X - S, -10, 0, 'ice');
  t.floor(-X + S, -14.6, -2, -13.4, 0, 'ice').floor(2, -14.6, X - S, -13.4, 0, 'ice');
  // sand: snowbanks along the boards, the bench (east, midway)
  t.floor(-X, N, -X + S, 0, 0, 'sand').floor(X - S, -6, X, 0, 0, 'sand').floor(X - S, N, X, -10, 0, 'sand');
  t.floor(3.2, -10, X, -6, 0, 'sand');                                         // the bench
  t.floor(-X + S, N, -2, -14.6, 0, 'sand').floor(2, N, X - S, -14.6, 0, 'sand'); // snowbanks by the net
  t.floor(-2, N, 2, -13.4);                                                    // the crease, grass
  t.rail(0.45, [-1.5, 0, N], [-X, 0, N], [-X, 0, 2.5], [X, 0, 2.5], [X, 0, N], [1.5, 0, N]);
  // the net: its mouth 3 wide, the cup in its far corner behind the east goalpost
  t.floor(-1.5, -18.8, 3.5, N);
  t.rail(0.45, [-1.5, 0, N], [-1.5, 0, -18.8], [3.5, 0, -18.8], [3.5, 0, N]);
  t.post(-1.5, N, 0, 0.2, 0.6).post(1.5, N, 0, 0.2, 0.6);
  // act 1: two fixed posts, and a defender gliding slowly across behind them
  t.post(-1.5, -5).post(1.5, -5);
  const skater = (x, z, move, period, phase = 0) => t.raw({ shape: 0, kind: 1, c: [x, 0.2, z], h: [1, 0.3, 0.25], motion: { period, move: [move, 0, 0], pivot: [0, 0, 0], axis: [0, 0, 0], phase } });
  skater(-3, -8.5, 4.5, 5);        // the defender, over most of the width, never on the bench
  skater(-2.5, -15.25, 5, 3, 0.25); // the goalie sweeps the crease in front of the mouth
  return t.tee(0, 0, 1.2).cup(2.3, 0, -17.6);
};
