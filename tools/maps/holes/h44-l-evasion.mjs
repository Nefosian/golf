import { hole } from '../lib.mjs';

// L'Évasion: everyone starts locked in a 6 x 6 cell; the cup is just past its front wall, the
// door behind. Fetch the key (in a corner, behind a post), go out the back and round the cell; or
// take the jump pad in the front corner, over the wall and the moat.
export default () => {
  const t = hole("L'Évasion", { theme: 'chateau', par: 4, maxStrokes: 10 });
  const H = 0.45, C = 3, X = 7, Zb = 7, Zm = -4.5, Zg = -9.5; // wall height, cell half size, yard half width, back, moat's far edge, green's end
  // the yard (4 wide round the cell), the moat in front of the cell, the green (14 x 5)
  t.floor(-X, -C, X, Zb).floor(-X, Zm, -C, -C).floor(C, Zm, X, -C).floor(-X, Zg, X, Zm);
  t.water(-C, Zm, C, -C);
  t.rail(H, [-X + 1.5, 0, Zb], [X - 1.5, 0, Zb], [X, 0, Zb - 1.5], [X, 0, Zg], [-X, 0, Zg], [-X, 0, Zb - 1.5], [-X + 1.5, 0, Zb]); // the outer wall, cut corners at the back
  // act 1: the cell; its door (blue) in the back wall
  t.rail(H, [-1, 0, C], [-C, 0, C], [-C, 0, -C], [C, 0, -C], [C, 0, C], [1, 0, C]);
  t.block(-1.15, C - 0.15, 1.15, C + 0.15, -0.15, H, { key: 1 });
  t.disc('key', -2.2, 2.2, 0.4, 0, { key: 1 });
  t.post(-1.3, 1.4, 0, 0.35); // hides the key from the tee
  // the jump pad at the end of a short lane in the front left corner: a ball must come down it
  // straight (from the key's corner) and fast enough to clear the wall and the moat
  t.rail(H, [-1.7, 0, -C], [-1.7, 0, -0.8]);
  t.pad('jumppad', -2.75, -2.85, -1.95, -2.05, 0, { speed: 6 });
  // a stub wall on the green between the jump's landing and the cup
  t.rail(H, [1.5, 0, Zm], [1.5, 0, -7.8]);
  return t.tee(0.8, 0, 0.5).cup(4.5, 0, -6.5);
};
