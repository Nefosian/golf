import { hole, roundRect, entry } from '../lib.mjs';

// Le Grand Huit (show, par 4), the end of a game: an express way down, two slopes and two hairpins, a
// speed pad in between; then the last leg: a speed pad, a kicker, a jump over a 3-wide gap, and down
// into a bowl. Too slow or off line at the kicker: into the void. Everybody arrives in the same bowl.
export default () => {
  const t = hole('Le Grand Huit', { theme: 'ville', par: 4, maxStrokes: 10 });
  const [cx, cz] = [16, -26], r1 = 6, collar = 1;
  t.plate(roundRect(-4, -3, 4, 3, 1.5), 5, { open: [[0, -3, 5]] });
  t.path([0, 5, -3], [0, -1], { width: 5 })
    .straight(3).straight(10, { rise: -1.5 }).turn(-180, 4)
    .straight(3).straight(10, { rise: -1.5 }).turn(180, 4)
    .straight(3).straight(1.5, { rise: 0.3, ease: false }).done({ open: 'end' }); // the kicker
  t.pad('speedpad', 5.8, -15.5, 10.2, -14.3, 3.5, { dir: [0, 0, 1], speed: 12 });
  t.pad('speedpad', 13.6, -5.4, 18.4, -4.2, 2, { dir: [0, 0, -1], speed: 13 });
  t.path([16, 1.2, -10.5], [0, -1], { width: 5 }).straight(4, { rise: -0.7 }).reach(cx, cz, r1 + collar, { stop: r1 + 0.05 }).done({ open: 'start' });
  t.bowl(cx, cz, 0.5 - 1.2, 2, r1, 1.2, { collar, cup: true, open: [entry(cx, cz, r1 + collar, cx, -13, 5)] });
  return t.tee(0, 5, 1.5);
};
