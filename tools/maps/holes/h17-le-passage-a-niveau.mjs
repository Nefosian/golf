import { hole } from '../lib.mjs';

// Le Passage à Niveau: three level crossings across a fairway. On each track (a strip of sand
// ballast) a striped convoy slides back and forth, so the gap swaps sides: a slow track with a wide
// gap, a fast one, then a double track whose two convoys run opposite ways, a coin between them.
export default () => {
  const t = hole('Le Passage à Niveau', { theme: 'ville', par: 4 });
  const X = 4, IN = X - 0.15, C = 0.15; // half-width, inner face of the side walls, convoy clearance at the walls
  const R = 1.2; // track depth
  // [z of the near edge of the track, convoy length, period, phase]
  const tracks = [[-3, 3.4, 6, 0], [-8.2, 4.4, 3.6, 0.3], [-13.4, 4.4, 4.4, 0], [-16.2, 4.4, 4.4, 0.5]];
  const zEnd = -26;
  // the fairway: grass between the tracks, sand on them
  let z = 3;
  for (const [z0] of tracks) {
    t.floor(-X, z0, X, z, 0).floor(-X, z0 - R, X, z0, 0, 'sand');
    z = z0 - R;
  }
  t.floor(-X, zEnd, X, z, 0);
  t.fence(-X, 3, X, zEnd);
  // a convoy fills the track's depth but 0.1 on each side, and runs from one wall to the other but
  // C: whatever lies on the track is pushed to its end and squeezed out onto the grass.
  for (const [z0, L, period, phase] of tracks) {
    const m = 2 * IN - 2 * C - L;
    t.block(-IN + C, z0 - R + 0.1, -IN + C + L, z0 - 0.1, -0.05, 0.6, { motion: { period, move: [m, 0, 0], pivot: [0, 0, 0], axis: [0, 0, 0], ...(phase ? { phase } : {}) } });
  }
  t.disc('strokes', 0, -15.4, 0.5, 0, { add: -1 }, { once: true }); // the coin between the two rails
  return t.tee(0, 0, 0).cup(0, 0, -22.5);
};
