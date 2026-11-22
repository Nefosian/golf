import { hole, roundRect, entry } from '../lib.mjs';

// Le Grand Huit (show, par 3), the end of a game: an express way down, three slopes and two hairpins,
// a speed pad in between, into a bowl. Safe: stop on the flats of the hairpins. Risky: all in one go.
// Everybody arrives in the same bowl.
export default () => {
  const t = hole('Le Grand Huit', { theme: 'ville', par: 3 });
  const [cx, cz] = [16, -26], r1 = 6, collar = 1;
  t.plate(roundRect(-4, -3, 4, 3, 1.5), 5, { open: [[0, -3, 5]] });
  t.path([0, 5, -3], [0, -1], { width: 5 })
    .straight(3).straight(10, { rise: -1.5 }).turn(-180, 4)
    .straight(3).straight(10, { rise: -1.5 }).turn(180, 4)
    .straight(10, { rise: -1.5 }).reach(cx, cz, r1 + collar, { stop: r1 + 0.05 }).done();
  t.pad('speedpad', 5.8, -15.5, 10.2, -14.3, 3.5, { dir: [0, 0, 1], speed: 12 });
  t.bowl(cx, cz, 0.5 - 1.2, 2, r1, 1.2, { collar, cup: true, open: [entry(cx, cz, r1 + collar, cx, -13, 5)] });
  return t.tee(0, 5, 1.5);
};
