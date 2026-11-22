import { hole } from '../lib.mjs';

// Aller-Retour: the blue key is at the far end of an alcove behind the tee, the blue door at the
// other end of the corridor, before the green: fetch it and come back the same way, against those
// still going. Beside the alcove, a pond: a plank crosses it to an islet with the vermilion key and
// on to the vermilion door of a private lane, whose pads carry the ball to a sand trap at the green.
export default () => {
  const t = hole('Aller-Retour', { theme: 'chateau', par: 4, maxStrokes: 10 });
  const W = 0.45, T = 0.15; // wall height, half a wall's thickness
  const xc = 2, xl0 = 2.3, xl1 = 4.5; // corridor x in [-xc, xc]; the lane, x in [xl0, xl1]
  const zA = 15, zB = 21, zP = 12, zD = -16, zS = -11, zG = -22.5; // alcove start/end, pond's south edge (vermilion door), blue door, lane's sand, green end
  const xp = (xl0 + xl1) / 2; // the plank's axis
  t.floor(-xc, zD, xc, zA); // corridor
  t.floor(-xc, zA, xl1, zB - 2).floor(-xc, zB - 2, xl1, zB, 0, 'sand'); // the alcove, sand at its far end (the blue key lies in it)
  // the pond, 2.2 x 3: a plank 0.8 wide across it, an islet of 1.2 in its middle
  const zi0 = zP + 0.9, zi1 = zP + 2.1;
  t.floor(xp - 0.4, zP, xp + 0.4, zi0).floor(xp - 0.6, zi0, xp + 0.6, zi1).floor(xp - 0.4, zi1, xp + 0.4, zA); // edge to edge
  t.water(xl0, zP, xp - 0.4, zi0).water(xl0, zi0, xp - 0.6, zi1).water(xl0, zi1, xp - 0.4, zA); // the water west of them
  t.water(xp + 0.4, zP, xl1, zi0).water(xp + 0.6, zi0, xl1, zi1).water(xp + 0.4, zi1, xl1, zA); // and east
  t.floor(xl0, zS, xl1, zP).floor(xl0, zD, xl1, zS, 0, 'sand'); // the lane, sand at its end
  t.floor(-xc, zG, xl1, zD); // green
  // walls: the outline, and the divider between the corridor and the pond and lane
  t.rail(W, [-xc - T, 0, zG - T], [-xc - T, 0, zB + T], [xl1 + T, 0, zB + T], [xl1 + T, 0, zG - T], [-xc - T, 0, zG - T]);
  t.rail(1.2, [xc + T, 0, zA], [xc + T, 0, zD]); // tall: a ball kicked up by the plank's edge must not hop into the lane
  // the doors: blue across the corridor, vermilion across the lane
  t.block(-xc, zD - T, xc, zD + T, -0.1, 1.2, { key: 1 });
  t.block(xl0, zP - T, xl1, zP + T, -0.1, 1.2, { key: 2 });
  // the keys
  t.disc('key', 0, zB - 1, 0.5, 0, { key: 1 }, { once: true });
  t.disc('key', xp, zP + 1.5, 0.45, 0, { key: 2 }, { once: true });
  // the pads of the lane: each sends the ball on south at 14
  t.pad('speedpad', xl0, zP - 1.5, xl1, zP - 0.5, 0, { dir: [0, 0, -1], speed: 14 });
  t.pad('speedpad', xl0, -3, xl1, -2, 0, { dir: [0, 0, -1], speed: 14 });
  return t.tee(0, 0, 0).cup(0.5, 0, -19.5);
};
