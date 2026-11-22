// Sounds, made on the spot: no audio file. Every sound takes a volume k, and the bounces the
// speed s of the hit, in units per second.
let ctx, master, hiss, volume = 1;

// setVolume sets the loudness of every sound, from 0 (none) to 1.
export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = 0.7 * volume;
}

// unlock starts the sound: a browser only allows it from a gesture of the user.
export function unlock() {
  if (ctx) return void ctx.resume();
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.7 * volume;
  master.connect(ctx.destination);
  hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  hiss.getChannelData(0).forEach((_, i, data) => { data[i] = Math.random() * 2 - 1; });
}

function fade(vol, t, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  g.connect(master);
  return g;
}

function tone({ freq, type = 'sine', dur = 0.15, vol = 0.3, slideTo, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  o.connect(fade(vol, t, dur));
  o.start(t);
  o.stop(t + dur);
}

function noise({ freq, dur = 0.1, vol = 0.2, type = 'bandpass', sweepTo, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
  s.buffer = hiss;
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  s.connect(f).connect(fade(vol, t, dur));
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const sfx = {
  putt(power, k) {
    tone({ freq: 1250, type: 'triangle', dur: 0.07, vol: (0.18 + 0.3 * power) * k });
    tone({ freq: 420, dur: 0.1, vol: 0.15 * k });
    noise({ freq: 3500, dur: 0.05, vol: (0.1 + 0.25 * power) * k });
  },
  floor(s, k) { tone({ freq: 110, dur: 0.09, vol: clamp(s * 0.05, 0.02, 0.3) * k }); },
  wall(s, k) {
    const v = clamp(s * 0.06, 0.03, 0.45) * k;
    tone({ freq: 210 + Math.random() * 50, type: 'triangle', dur: 0.1, vol: v });
    noise({ freq: 1400, dur: 0.04, vol: v * 0.6 });
  },
  post(s, k) { tone({ freq: 520 + Math.random() * 60, type: 'triangle', dur: 0.12, vol: clamp(s * 0.06, 0.03, 0.4) * k }); },
  rim(s, k) { tone({ freq: 900, type: 'triangle', dur: 0.05, vol: clamp(s * 0.05, 0.02, 0.25) * k }); },
  ball(s, k) {
    const v = clamp(s * 0.1, 0.05, 0.45) * k;
    tone({ freq: 2100, dur: 0.05, vol: v });
    tone({ freq: 3100, dur: 0.03, vol: v * 0.5 });
  },
  holed(_, k) {
    tone({ freq: 150, dur: 0.18, vol: 0.4 * k });
    noise({ freq: 700, dur: 0.12, vol: 0.2 * k, delay: 0.03 });
    [523, 659, 784, 1047].forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.35, vol: 0.14 * k, delay: 0.25 + i * 0.09 }));
  },
  out(_, k) {
    noise({ freq: 2500, dur: 0.6, vol: 0.35 * k, type: 'lowpass', sweepTo: 250 });
    tone({ freq: 300, dur: 0.25, vol: 0.12 * k, slideTo: 90 });
  },
  maxed(_, k) { tone({ freq: 330, type: 'triangle', dur: 0.25, vol: 0.12 * k, slideTo: 200 }); },
};
