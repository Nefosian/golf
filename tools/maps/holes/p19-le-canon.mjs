import { hole, roundRect, entry } from '../lib.mjs';

// Le Canon (show, par 3): the tee on a high island. Two cannons in relay: the first, on a platform
// beside the tee, lobs every ball that rolls onto it onto a sand island further down (the sand stops
// it dead); from there, the second lobs it into a bowl far below, the cup at its bottom. Safe: the
// long road down. The arcs cross those of the others; all the cannonballs end in the same bowl.
export default () => {
  const t = hole('Le Canon', { theme: 'chateau', par: 3 });
  const [cx, cz] = [0, -26], r1 = 6, collar = 1;
  t.plate(roundRect(-5, -4, 5, 4, 1.5), 4, { open: [[5, 0, 3], [-5, 0, 4.5]] });
  t.path([5, 4, 0], [1, 0], { width: 3 }).straight(1).done();
  t.plate(roundRect(6, -2.5, 11, 2.5, 1), 4, { open: [[6, 0, 3]] }); // the first cannon's platform
  t.cannon(8.5, 0, 4, [12, 2, -11.5], { T: 1.3, r: 0.7 });
  t.plate(roundRect(9, -15, 15, -9, 1.5), 2, { material: 'sand' }); // the sand island
  t.cannon(10.4, -10, 2, [cx, 0, cz], { T: 1.3, r: 0.6 }); // behind where the balls land: they slide away from it
  t.path([-5, 4, 0], [-1, 0], { width: 4.5 }).straight(2).turn(-90, 3).straight(20, { rise: -2.8 }).turn(-90, 3)
    .reach(cx, cz, r1 + collar, { stop: r1 + 0.05 }).done();
  t.bowl(cx, cz, 0, 2, r1, 1.2, { collar, cup: true, open: [entry(cx, cz, r1 + collar, -10, cz, 4.5)] });
  return t.tee(0, 4, 2);
};
