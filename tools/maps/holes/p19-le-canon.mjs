import { hole, roundRect, entry } from '../lib.mjs';

// Le Canon (show, par 3): the tee on a high island; a cannon on a platform beside it fires every ball
// that rolls onto it at a bowl far below, the cup at its bottom. Safe: the long road down. Risky: the
// cannon, one shot. All the cannonballs fall into the same bowl. (v: from the pad to the bowl's
// centre in 1.7 s, gravity 18.)
export default () => {
  const t = hole('Le Canon', { theme: 'chateau', par: 3 });
  const [cx, cz] = [0, -26], r1 = 6, collar = 1;
  t.plate(roundRect(-5, -4, 5, 4, 1.5), 4, { open: [[5, 0, 3], [-5, 0, 4.5]] });
  t.path([5, 4, 0], [1, 0], { width: 3 }).straight(1).done();
  t.plate(roundRect(6, -2.5, 11, 2.5, 1), 4, { open: [[6, 0, 3]] }); // the cannon's platform
  t.disc('launcher', 8.5, 0, 0.7, 4, { v: [-5,12.947,-15.294] });
  t.path([-5, 4, 0], [-1, 0], { width: 4.5 }).straight(2).turn(-90, 3).straight(20, { rise: -2.8 }).turn(-90, 3)
    .reach(cx, cz, r1 + collar, { stop: r1 + 0.05 }).done();
  t.bowl(cx, cz, 0, 2, r1, 1.2, { collar, cup: true, open: [entry(cx, cz, r1 + collar, -10, cz, 4.5)] });
  return t.tee(0, 4, 2);
};
