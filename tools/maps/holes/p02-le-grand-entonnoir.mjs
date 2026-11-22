import { hole, roundRect } from '../lib.mjs';

// Le Grand Entonnoir (easy, par 2): the tee on the rim of a very big bowl, the cup at its bottom. Shoot
// straight in (the ball circles down) or roll in gently. The coin lies on the collar across the bowl:
// a ball shot hard enough climbs the far slope to it, then comes back down. Every ball ends at the
// bottom: the bumper-car hole, short, to breathe between two hard ones.
export default () => {
  const t = hole('Le Grand Entonnoir', { theme: 'bocage', par: 2 });
  const top = 1.5, [cx, cz] = [0, -14], r1 = 9, collar = 1.5;
  t.plate(roundRect(-4.5, -3, 4.5, 3, 1.5), top, { open: [[0, -3, 6]] });
  t.path([0, top, -3], [0, -1], { width: 6 }).reach(cx, cz, r1 + collar, { stop: r1 + 0.05 }).done();
  t.bowl(cx, cz, 0, 2.5, r1, top, { collar, cup: true, open: [[cx, cz + r1 + collar, 6]] });
  t.disc('strokes', cx, cz - r1 - collar / 2, 0.5, top, { add: -1 }, { once: true });
  return t.tee(0, top, 1.5);
};
