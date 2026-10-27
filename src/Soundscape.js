// Weather sounds that follow the Snoopy picture on screen.
// The app picks a picture from the weather code and temperature (WeatherIcon.js);
// sceneFor() uses exactly the same rule, so the sound always matches what Snoopy
// is doing: typing on his doghouse, flying as the Flying Ace, sleeping in the
// rain, dancing with Woodstock...
// Everything is synthesised with the Web Audio API: no audio files, nothing to
// license, and all tunes are original. startScene() returns a stop() function.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// note names -> MIDI numbers, e.g. "C5" = 72, "Bb3" = 58, "F#4" = 66
function n(name) {
  if (typeof name === "number") return name;
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + base + acc;
}

// Long-running sources of the current scene, so stop() can really stop them.
let live = [];

// ---- timing --------------------------------------------------------------

// Live: a short look-ahead loop schedules events on the audio clock.
// Offline (previews): everything is scheduled up front for the duration.
function makeScheduler(ctx, offlineDuration) {
  const timers = [];
  const jobs = [];
  if (!offlineDuration) {
    timers.push(
      setInterval(() => {
        const horizon = ctx.currentTime + 0.6;
        jobs.forEach((job) => {
          while (job.next < horizon) {
            job.fn(Math.max(job.next, ctx.currentTime + 0.02));
            job.next += job.gap();
          }
        });
      }, 120)
    );
  }
  return {
    every(minS, maxS, fn, first) {
      const gap = () => rand(minS, maxS);
      const start = first !== undefined ? first : gap();
      if (offlineDuration) {
        for (let t = start; t < offlineDuration; t += gap()) fn(t);
      } else {
        jobs.push({ fn, gap, next: ctx.currentTime + start });
      }
    },
    bars(barSeconds, fn, first) {
      let i = 0;
      this.every(barSeconds, barSeconds, (t) => fn(t, i++), first || 0.3);
    },
    clear() {
      timers.forEach(clearInterval);
      jobs.length = 0;
    },
  };
}

// ---- building blocks -----------------------------------------------------

function noiseBuffer(ctx) {
  const length = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function noise(ctx, buf) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start(0, rand(0, 2.5));
  live.push(src);
  return src;
}

function filter(ctx, type, freq, q) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  if (q !== undefined) f.Q.value = q;
  return f;
}

function gain(ctx, value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function lfo(ctx, freq, depth, param, type) {
  const o = ctx.createOscillator();
  o.type = type || "sine";
  o.frequency.value = freq;
  const g = gain(ctx, depth);
  o.connect(g).connect(param);
  o.start();
  live.push(o);
  return o;
}

// one decaying partial: the basis of bells, marimbas and music boxes
function partial(ctx, out, t, freq, level, decay, type, attack) {
  const o = ctx.createOscillator();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, t);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + (attack || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.05);
  return o;
}

// a short burst of filtered noise (clicks, crunches, splashes)
function burst(ctx, out, buf, t, opts) {
  const o = opts || {};
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.level || 0.1, t + (o.attack || 0.002));
  g.gain.exponentialRampToValueAtTime(0.0001, t + (o.decay || 0.05));
  let node = src;
  if (o.hp) node = node.connect(filter(ctx, "highpass", o.hp));
  if (o.lp) node = node.connect(filter(ctx, "lowpass", o.lp));
  if (o.bp) node = node.connect(filter(ctx, "bandpass", o.bp, o.q || 1.5));
  node.connect(g).connect(out);
  src.start(t, rand(0, 2.5));
  src.stop(t + (o.decay || 0.05) + 0.05);
}

// a tone with a pitch glide and a flat-ish envelope (whistles, trombones, horns)
function tone(ctx, out, t, opts) {
  const o = ctx.createOscillator();
  o.type = opts.type || "sine";
  o.frequency.setValueAtTime(opts.from, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + opts.len * (opts.glide || 0.7));
  if (opts.vibrato) {
    const v = ctx.createOscillator();
    v.frequency.value = opts.vibratoRate || 5.5;
    const vg = gain(ctx, opts.vibrato);
    v.connect(vg).connect(o.frequency);
    v.start(t);
    v.stop(t + opts.len);
  }
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.level, t + (opts.attack || 0.04));
  g.gain.setValueAtTime(opts.level, t + Math.max(0.05, opts.len - (opts.release || 0.1)));
  g.gain.linearRampToValueAtTime(0, t + opts.len);
  let node = o;
  if (opts.lp) {
    const f = filter(ctx, "lowpass", opts.lp, opts.q || 1);
    if (opts.wah) {
      f.frequency.setValueAtTime(opts.lp, t);
      f.frequency.linearRampToValueAtTime(opts.wah, t + 0.12);
      f.frequency.linearRampToValueAtTime(opts.lp * 1.4, t + opts.len);
    }
    node = node.connect(f);
  }
  node.connect(g).connect(out);
  o.start(t);
  o.stop(t + opts.len + 0.02);
}

// ---- instruments ---------------------------------------------------------

const INSTRUMENTS = {
  musicBox(ctx, out, t, f, v) {
    partial(ctx, out, t, f, 0.12 * v, 1.6);
    partial(ctx, out, t, f * 4, 0.035 * v, 0.35);
  },
  glock(ctx, out, t, f, v) {
    partial(ctx, out, t, f, 0.1 * v, 1.3);
    partial(ctx, out, t, f * 2.76, 0.035 * v, 0.5);
    partial(ctx, out, t, f * 5.4, 0.015 * v, 0.2);
  },
  xylo(ctx, out, t, f, v) {
    partial(ctx, out, t, f, 0.14 * v, 0.3);
    partial(ctx, out, t, f * 3, 0.05 * v, 0.08);
  },
  piano(ctx, out, t, f, v) {
    partial(ctx, out, t, f, 0.09 * v, 1.2, "triangle");
    partial(ctx, out, t, f * 2, 0.03 * v, 0.6);
    partial(ctx, out, t, f * 3, 0.012 * v, 0.3);
  },
  vibes(ctx, out, t, f, v) {
    const g = gain(ctx, 1);
    const trem = ctx.createOscillator();
    trem.frequency.value = 5.2;
    const depth = gain(ctx, 0.35);
    trem.connect(depth).connect(g.gain);
    trem.start(t);
    trem.stop(t + 3.2);
    g.connect(out);
    partial(ctx, g, t, f, 0.09 * v, 3.0);
    partial(ctx, g, t, f * 4, 0.012 * v, 0.6);
  },
  steelDrum(ctx, out, t, f, v) {
    const o = partial(ctx, out, t, f * 1.03, 0.11 * v, 0.9);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    partial(ctx, out, t, f * 2, 0.05 * v, 0.5);
    partial(ctx, out, t, f * 3.01, 0.025 * v, 0.3);
  },
  // plucked string (Karplus-Strong), cached per pitch
  pluck(ctx, out, t, f, v) {
    const key = Math.round(f);
    const cache = (ctx.__pluck = ctx.__pluck || {});
    if (!cache[key]) {
      const len = Math.floor(ctx.sampleRate * 1.4);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      const period = Math.round(ctx.sampleRate / f);
      for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
      for (let i = period; i < len; i++) d[i] = 0.5 * (d[i - period] + d[i - period + 1]) * 0.994;
      cache[key] = buf;
    }
    const src = ctx.createBufferSource();
    src.buffer = cache[key];
    const g = gain(ctx, 0.22 * v);
    src.connect(filter(ctx, "lowpass", 3200)).connect(g).connect(out);
    src.start(t);
  },
};

function play(ctx, out, instrument, t, note, v) {
  INSTRUMENTS[instrument](ctx, out, t, hz(n(note)), v || 1);
}

function bar(ctx, out, instrument, t, beat, notes) {
  notes.forEach(([b, note, v]) => play(ctx, out, instrument, t + b * beat, note, v));
}

// ---- sound effects -------------------------------------------------------

const FX = {
  rain(ctx, out, buf, level) {
    noise(ctx, buf)
      .connect(filter(ctx, "highpass", 600))
      .connect(filter(ctx, "lowpass", 2500 + 3500 * level))
      .connect(gain(ctx, 0.02 + 0.11 * level))
      .connect(out);
  },
  wind(ctx, out, buf, strength, opts) {
    const o = opts || {};
    const src = noise(ctx, buf);
    const bp = filter(ctx, "bandpass", o.freq || 420, 0.6);
    const g = gain(ctx, 0.015 + 0.08 * strength);
    src.connect(bp).connect(filter(ctx, "lowpass", o.lowpass || 1500)).connect(g).connect(out);
    lfo(ctx, rand(0.06, 0.12), 0.01 + 0.05 * strength, g.gain);
    lfo(ctx, rand(0.04, 0.09), 160, bp.frequency);
  },
  // Woodstock: tiny, quick, excited chirps
  woodstock(ctx, out, t, excited) {
    const count = excited ? Math.floor(rand(5, 9)) : Math.floor(rand(2, 4));
    for (let i = 0; i < count; i++) {
      const s = t + i * (excited ? rand(0.06, 0.09) : rand(0.1, 0.16));
      const base = rand(3400, 4600);
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(base, s);
      o.frequency.exponentialRampToValueAtTime(base * rand(1.3, 1.6), s + 0.035);
      o.frequency.exponentialRampToValueAtTime(base * 0.9, s + 0.06);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.04, s + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.07);
      o.connect(g).connect(out);
      o.start(s);
      o.stop(s + 0.08);
    }
  },
  bird(ctx, out, t) {
    const base = rand(2500, 3400);
    for (let i = 0; i < 2; i++) {
      tone(ctx, out, t + i * 0.18, { from: base, to: base * 1.5, len: 0.12, level: 0.025, glide: 0.5, attack: 0.01, release: 0.05 });
    }
  },
  cricket(ctx, out, t) {
    const f = rand(4400, 4800);
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.06;
      partial(ctx, out, s, f, 0.008, 0.04);
    }
  },
  // typewriter: a run of key clacks, sometimes ending in the bell and carriage return
  typing(ctx, out, buf, t, nervous) {
    const keys = Math.floor(rand(6, 14));
    let s = t;
    for (let i = 0; i < keys; i++) {
      burst(ctx, out, buf, s, { hp: 1800, level: rand(0.06, 0.1), decay: 0.035 });
      partial(ctx, out, s, rand(140, 190), 0.07, 0.04, "triangle");
      s += nervous ? rand(0.05, 0.09) : rand(0.08, 0.16);
    }
    if (Math.random() < (nervous ? 0.3 : 0.5)) {
      partial(ctx, out, s + 0.1, 2093, 0.05, 1.1);
      partial(ctx, out, s + 0.1, 4186, 0.015, 0.4);
      burst(ctx, out, buf, s + 0.35, { bp: 1200, q: 0.8, level: 0.06, attack: 0.05, decay: 0.35 });
    }
    return s;
  },
  // the Flying Ace's Sopwith Camel (the doghouse)
  propeller(ctx, out, buf, level) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 62;
    lfo(ctx, 0.3, 3, o.frequency);
    const lp = filter(ctx, "lowpass", 420, 2);
    const g = gain(ctx, 0.04 * level);
    lfo(ctx, 19, 0.03 * level, g.gain, "square"); // putt-putt
    o.connect(lp).connect(g).connect(out);
    o.start();
    live.push(o);
    noise(ctx, buf).connect(filter(ctx, "bandpass", 900, 0.8)).connect(gain(ctx, 0.02 * level)).connect(out);
    return g;
  },
  bugle(ctx, out, t) {
    [["G4", 0, 0.18], ["C5", 0.2, 0.18], ["E5", 0.4, 0.18], ["G5", 0.6, 0.5]].forEach(([note, at, len]) => {
      tone(ctx, out, t + at, { type: "square", from: hz(n(note)), len, level: 0.025, lp: 2200, attack: 0.02, release: 0.06 });
    });
  },
  thunder(ctx, out, buf, t, far) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = gain(ctx, 0);
    const peak = far ? rand(0.12, 0.2) : rand(0.35, 0.55);
    const length = rand(3, 5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rand(0.05, 0.3));
    for (let s = t + 0.5; s < t + length - 0.6; s += rand(0.3, 0.7)) {
      g.gain.linearRampToValueAtTime(peak * rand(0.3, 0.8), s);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter(ctx, "lowpass", far ? 140 : rand(180, 300))).connect(g).connect(out);
    src.start(t, rand(0, 1));
    src.stop(t + length + 0.1);
  },
  zap(ctx, out, buf, t) {
    for (let i = 0; i < 6; i++) {
      burst(ctx, out, buf, t + i * rand(0.02, 0.05), { hp: 2500, level: rand(0.05, 0.12), decay: 0.03 });
    }
  },
  sadTrombone(ctx, out, t) {
    ["Bb3", "A3", "Ab3", "G3"].forEach((note, i) => {
      const last = i === 3;
      tone(ctx, out, t + i * 0.42, {
        type: "sawtooth",
        from: hz(n(note)),
        len: last ? 1.3 : 0.38,
        level: 0.08,
        lp: 300,
        q: 7,
        wah: 1300,
        vibrato: last ? 4 : 0,
        vibratoRate: 6,
      });
    });
  },
  hmph(ctx, out, t) {
    tone(ctx, out, t, { type: "sawtooth", from: hz(n("D3")), len: 0.22, level: 0.08, lp: 280, q: 6, wah: 900 });
    tone(ctx, out, t + 0.26, { type: "sawtooth", from: hz(n("A2")), len: 0.45, level: 0.08, lp: 260, q: 6, wah: 700 });
  },
  splash(ctx, out, buf, t) {
    burst(ctx, out, buf, t, { lp: 1800, level: 0.12, attack: 0.01, decay: 0.4 });
    for (let i = 0; i < 4; i++) {
      tone(ctx, out, t + 0.1 + i * rand(0.05, 0.1), { from: rand(400, 700), to: rand(900, 1400), len: 0.06, level: 0.03, attack: 0.005, release: 0.03 });
    }
  },
  slurp(ctx, out, buf, t) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = filter(ctx, "bandpass", 900, 3);
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.linearRampToValueAtTime(1500, t + 0.5);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + 0.55);
    const am = gain(ctx, 1);
    const trem = ctx.createOscillator();
    trem.frequency.value = 32;
    const td = gain(ctx, 0.6);
    trem.connect(td).connect(am.gain);
    trem.start(t);
    trem.stop(t + 0.6);
    src.connect(bp).connect(am).connect(g).connect(out);
    src.start(t, rand(0, 2));
    src.stop(t + 0.6);
  },
  snore(ctx, out, buf, t) {
    // in through the nose...
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = filter(ctx, "bandpass", 260, 3);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 1.1);
    g.gain.linearRampToValueAtTime(0, t + 1.4);
    const am = gain(ctx, 1);
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 28;
    const fd = gain(ctx, 0.7);
    flutter.connect(fd).connect(am.gain);
    flutter.start(t);
    flutter.stop(t + 1.5);
    src.connect(bp).connect(am).connect(g).connect(out);
    src.start(t, rand(0, 1));
    src.stop(t + 1.5);
    // ...and out with a little whistle
    tone(ctx, out, t + 1.6, { from: 900, to: 520, len: 0.9, level: 0.02, glide: 1 });
  },
  roofDrop(ctx, out, t) {
    const o = partial(ctx, out, t, rand(170, 240), 0.05, 0.07, "triangle");
    o.frequency.exponentialRampToValueAtTime(110, t + 0.06);
  },
  crunch(ctx, out, buf, t) {
    for (let i = 0; i < 5; i++) {
      burst(ctx, out, buf, t + i * rand(0.01, 0.025), { bp: rand(1500, 3000), q: 1.2, level: rand(0.03, 0.07), decay: 0.04 });
    }
  },
  sleighBells(ctx, out, buf, t, beat) {
    [0, 0.5, 1, 1.5, 2, 2.25, 2.5, 3].forEach((b) => {
      burst(ctx, out, buf, t + b * beat, { bp: rand(6500, 8000), q: 4, level: 0.05, attack: 0.005, decay: 0.12 });
    });
  },
  whistleTune(ctx, out, t, notes) {
    let s = t;
    notes.forEach(([note, len]) => {
      tone(ctx, out, s, { from: hz(n(note)), len, level: 0.04, vibrato: hz(n(note)) * 0.012, attack: 0.03, release: 0.06 });
      s += len + 0.03;
    });
  },
  hum(ctx, out, t, notes) {
    let s = t;
    notes.forEach(([note, len]) => {
      tone(ctx, out, s, { type: "triangle", from: hz(n(note)), len, level: 0.035, lp: 900, vibrato: 2, attack: 0.12, release: 0.2 });
      s += len;
    });
  },
  foghorn(ctx, out, t) {
    tone(ctx, out, t, { type: "sawtooth", from: 72, len: 2.6, level: 0.05, lp: 260, attack: 0.3, release: 0.8 });
    tone(ctx, out, t, { type: "sawtooth", from: 108, len: 2.6, level: 0.025, lp: 260, attack: 0.3, release: 0.8 });
  },
  whew(ctx, out, buf, t) {
    tone(ctx, out, t, { from: 1500, to: 520, len: 0.9, level: 0.045, glide: 1, attack: 0.02 });
    burst(ctx, out, buf, t, { bp: 1100, q: 0.7, level: 0.05, attack: 0.1, decay: 0.8 });
  },
  chatter(ctx, out, buf, t) {
    const clicks = Math.floor(rand(10, 18));
    for (let i = 0; i < clicks; i++) {
      burst(ctx, out, buf, t + i * 0.055, { bp: 2600, q: 2, level: 0.07, decay: 0.02 });
    }
  },
  brrr(ctx, out, t) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(130, t);
    o.frequency.linearRampToValueAtTime(95, t + 0.9);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + 0.9);
    const am = gain(ctx, 1);
    const trem = ctx.createOscillator();
    trem.frequency.value = 24;
    const td = gain(ctx, 0.8);
    trem.connect(td).connect(am.gain);
    trem.start(t);
    trem.stop(t + 1);
    o.connect(filter(ctx, "lowpass", 700)).connect(am).connect(g).connect(out);
    o.start(t);
    o.stop(t + 1);
  },
  cicadas(ctx, out, buf) {
    const g = gain(ctx, 0.012);
    lfo(ctx, 38, 0.012, g.gain);
    noise(ctx, buf).connect(filter(ctx, "bandpass", 5200, 9)).connect(g).connect(out);
  },
};

// ---- the tunes (all original) -----------------------------------------------

const TUNES = {
  // happy dance under the stars: xylophone in F with a bouncy bass
  starDance: {
    bpm: 112,
    melody: [
      [[0, "C6"], [0.5, "A5"], [1, "F5"], [2, "G5"], [2.5, "A5"], [3, "C6"]],
      [[0, "D6"], [0.5, "C6"], [1, "A5"], [2, "G5"], [3, "F5"]],
      [[0, "A5"], [0.5, "Bb5"], [1, "C6"], [1.5, "D6"], [2, "C6"], [3, "A5"]],
      [[0, "G5"], [0.5, "E5"], [1, "C5"], [2, "E5"], [2.5, "G5"], [3, "F5"]],
    ],
    bass: [["F3", "C3"], ["Bb2", "F3"], ["F3", "C3"], ["C3", "C3"]],
  },
  // jazzy dance: walking bass and piano comping, swung
  jazzDance: {
    bpm: 138,
    walk: [
      ["F2", "A2", "C3", "D3"],
      ["Eb3", "D3", "C3", "A2"],
      ["Bb2", "D3", "F3", "D3"],
      ["C3", "E3", "G3", "E3"],
    ],
    chords: [
      ["A3", "C4", "Eb4", "F4"],
      ["A3", "C4", "Eb4", "F4"],
      ["Bb3", "D4", "F4", "Ab4"],
      ["Bb3", "C4", "E4", "G4"],
    ],
    riff: [[], [[0, "C5"], [0.66, "D5"], [1, "F5"], [2.66, "D5"]], [], [[0, "G5"], [0.66, "F5"], [1, "D5"], [2, "C5"]]],
  },
  // lullaby in F, three beats to the bar
  lullaby: {
    bpm: 62,
    melody: [
      [[0, "A5"], [2, "C6"]],
      [[0, "Bb5"], [1, "A5"], [2, "G5"]],
      [[0, "F5"], [2, "G5"]],
      [[0, "A5", 0.9]],
      [[0, "C6"], [2, "A5"]],
      [[0, "G5"], [1, "F5"], [2, "E5"]],
      [[0, "F5"], [1, "G5"], [2, "E5"]],
      [[0, "F5", 0.9]],
    ],
    bass: ["F4", "C4", "D4", "C4", "Bb3", "C4", "C4", "F4"],
  },
  // picnic guitar in G: G - Em - C - D
  picnic: {
    bpm: 88,
    chords: [
      ["G2", "D3", "G3", "B3"],
      ["E2", "B2", "E3", "G3"],
      ["C3", "G3", "C4", "E4"],
      ["D3", "A3", "D4", "F#4"],
    ],
  },
  // sneaking around at night: staccato pizzicato in D minor
  sneak: {
    bpm: 96,
    bars: [
      [[0, "D3"], [1, "F3"], [2, "A3"], [3, "G#3"]],
      [[0, "A3"], [1, "F3"], [2, "D3"], [3, "C#3"]],
    ],
  },
  // humming in the drizzle
  hum: [
    [["E4", 0.6], ["G4", 0.6], ["A4", 1.2]],
    [["G4", 0.6], ["E4", 0.6], ["D4", 1.2]],
    [["C4", 0.6], ["D4", 0.6], ["E4", 0.9], ["C4", 0.9]],
  ],
  // whistling while it pours (09d)
  whistle: [
    [["G5", 0.2], ["A5", 0.2], ["B5", 0.4], ["D6", 0.6]],
    [["B5", 0.2], ["A5", 0.2], ["G5", 0.6]],
    [["D6", 0.3], ["B5", 0.3], ["G5", 0.3], ["A5", 0.6]],
  ],
  // snowy glockenspiel in Eb
  snow: {
    bpm: 80,
    melody: [
      [[0, "Bb6"], [0.5, "G6"], [1, "Eb6"], [1.5, "Bb5"], [3, "G5"]],
      [[0, "Ab6"], [0.5, "F6"], [1, "D6"], [1.5, "Bb5"], [3, "F5"]],
      [[0, "G6"], [0.5, "Eb6"], [1, "C6"], [1.5, "G5"], [3, "Eb5"]],
      [[0, "F6"], [0.5, "D6"], [1, "Bb5"], [2, "C6"], [2.5, "D6"], [3, "Eb6"]],
    ],
  },
  // lazy steel drum for a too-hot day
  hot: {
    bpm: 84,
    melody: [
      [[0, "E5"], [1, "G5"], [2, "E5"], [3, "C5"]],
      [[0, "F5"], [1, "A5"], [2, "F5"], [3, "D5"]],
      [[0, "E5"], [1, "C5"], [2, "D5"], [3, "B4"]],
      [[0, "C5", 0.9]],
    ],
  },
};

// ---- picture -> scene -------------------------------------------------------

// Same rule as WeatherIcon.js: very hot or freezing pictures first, then the icon.
export function sceneFor(w) {
  if ((w.temp || 0) >= 37) return "too hot";
  if ((w.temp || 0) < 0) return "freezing";
  return SCENES[w.icon] ? w.icon : "01d";
}

// Name shown on the sound button's tooltip
export function sceneLabel(w) {
  const key = sceneFor(w);
  return SCENES[key].label;
}

const SCENES = {
  "01d": { label: "Snoopy typing on his doghouse" },
  "01n": { label: "Dancing under the stars with Woodstock" },
  "02d": { label: "Dancing with Linus and Lucy" },
  "02n": { label: "Woodstock and friends at night" },
  "03d": { label: "Picnic in the park" },
  "03n": { label: "Goodnight, Snoopy" },
  "04d": { label: "The Flying Ace takes off" },
  "04n": { label: "The Flying Ace sneaks through the night" },
  "09d": { label: "Singing in the rain with Woodstock" },
  "09n": { label: "Rained out, Charlie Brown" },
  "10d": { label: "Snoopy in the drizzle" },
  "10n": { label: "Sleeping in the rain" },
  "11d": { label: "A dark and stormy night" },
  "11n": { label: "Lightning over the doghouse" },
  "13d": { label: "Snow day" },
  "13n": { label: "Lucy is not amused by the snow" },
  "50d": { label: "Into the clouds" },
  "50n": { label: "Lost in the fog" },
  "too hot": { label: "It's too hot! Whew!" },
  freezing: { label: "It's freezing! Brrr" },
};

export function startScene(ctx, destination, w, offlineDuration) {
  live = [];
  const buf = noiseBuffer(ctx);
  const sched = makeScheduler(ctx, offlineDuration);
  const master = gain(ctx, 0);
  master.connect(destination);
  const out = gain(ctx, 1);
  out.connect(master);
  const t0 = ctx.currentTime;
  master.gain.setValueAtTime(0, t0);

  const windy = Math.min(1, (w.wind || 0) / 12);
  const scene = sceneFor(w);
  // quieter scenes get a boost so switching cities doesn't need a volume change
  const LEVEL = { "01d": 2.2, "02n": 3.2, "13n": 1.8, freezing: 2.1, "10d": 1.2 };
  master.gain.linearRampToValueAtTime(0.8 * (LEVEL[scene] || 1), t0 + 1.2);
  const every = (a, b, fn, first) => sched.every(a, b, fn, first);

  switch (scene) {
    // Snoopy typing on top of his doghouse, sunny sky
    case "01d":
      every(2.2, 4, (t) => FX.typing(ctx, out, buf, t), 0.4);
      every(5, 10, (t) => FX.bird(ctx, out, t), 3);
      FX.wind(ctx, out, buf, 0.08);
      break;

    // Snoopy and Woodstock dance and hug under the stars
    case "01n": {
      const tune = TUNES.starDance;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => {
        bar(ctx, out, "xylo", t, beat, tune.melody[i % 4]);
        const [b1, b2] = tune.bass[i % 4];
        play(ctx, out, "pluck", t, b1, 0.9);
        play(ctx, out, "pluck", t + 2 * beat, b2, 0.8);
      });
      every(3, 6, (t) => FX.woodstock(ctx, out, t), 1);
      every(1.5, 3, (t) => FX.cricket(ctx, out, t), 0.8);
      break;
    }

    // Linus, Snoopy and Lucy dancing
    case "02d": {
      const tune = TUNES.jazzDance;
      const beat = 60 / tune.bpm;
      const swing = (b) => (b % 1 > 0.4 ? Math.floor(b) + 0.66 : b);
      sched.bars(beat * 4, (t, i) => {
        tune.walk[i % 4].forEach((note, k) => play(ctx, out, "pluck", t + k * beat, note, 0.9));
        [1, 3].forEach((b) => tune.chords[i % 4].forEach((note) => play(ctx, out, "piano", t + swing(b + 0.5) * beat, note, 0.55)));
        bar(ctx, out, "piano", t, beat, tune.riff[i % 4]);
        // little hops: a soft shoe tap on beats 2 and 4
        [1, 3].forEach((b) => burst(ctx, out, buf, t + b * beat, { bp: 2000, q: 1, level: 0.04, decay: 0.05 }));
      });
      break;
    }

    // Snoopy with lots of Woodstocks on a hill at night
    case "02n":
      every(1.2, 2.6, (t) => FX.woodstock(ctx, out, t), 0.5);
      every(1.6, 3.2, (t) => FX.woodstock(ctx, out, t), 1.2);
      every(1, 2.2, (t) => FX.cricket(ctx, out, t), 0.3);
      every(5, 9, (t) => play(ctx, out, "glock", t, pick(["C7", "F7", "A6"]), 0.3), 3);
      break;

    // picnic on the grass with drinks
    case "03d": {
      const tune = TUNES.picnic;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => {
        const chord = tune.chords[i % 4];
        // fingerpicked: bass, then the upper strings
        [[0, 0], [1, 2], [1.5, 3], [2, 1], [3, 2], [3.5, 3]].forEach(([b, k]) => play(ctx, out, "pluck", t + b * beat, chord[k], 0.6));
      });
      every(4, 8, (t) => FX.bird(ctx, out, t), 2);
      every(9, 16, (t) => FX.slurp(ctx, out, buf, t), 6);
      FX.wind(ctx, out, buf, 0.1);
      break;
    }

    // Lucy and Snoopy by the doghouse under the moon
    case "03n": {
      const tune = TUNES.lullaby;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 3, (t, i) => {
        bar(ctx, out, "musicBox", t, beat, tune.melody[i % 8]);
        play(ctx, out, "musicBox", t, tune.bass[i % 8], 0.6);
      });
      every(1, 2.5, (t) => FX.cricket(ctx, out, t), 0.5);
      break;
    }

    // the Flying Ace in his Sopwith Camel, among the clouds
    case "04d":
      FX.propeller(ctx, out, buf, 1);
      FX.wind(ctx, out, buf, Math.max(0.5, windy));
      every(9, 15, (t) => FX.bugle(ctx, out, t), 1.5);
      break;

    // the Flying Ace sneaking around on a dark night
    case "04n": {
      const tune = TUNES.sneak;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => bar(ctx, out, "pluck", t, beat, tune.bars[i % 2].map(([b, note]) => [b, note, 0.8])));
      FX.wind(ctx, out, buf, Math.max(0.35, windy));
      every(9, 16, (t) => FX.thunder(ctx, out, buf, t, true), 3);
      break;
    }

    // Snoopy and Woodstock grinning in the rain
    case "09d":
      FX.rain(ctx, out, buf, 0.55);
      every(4, 7, (t) => FX.whistleTune(ctx, out, t, pick(TUNES.whistle)), 1);
      every(3, 6, (t) => FX.woodstock(ctx, out, t), 2.5);
      break;

    // Charlie Brown rained out on the pitcher's mound, Snoopy swimming past
    case "09n":
      FX.rain(ctx, out, buf, 0.95);
      every(3, 6, (t) => FX.splash(ctx, out, buf, t), 1);
      every(12, 20, (t) => FX.sadTrombone(ctx, out, t), 3);
      break;

    // Snoopy standing in the drizzle under the trees
    case "10d":
      FX.rain(ctx, out, buf, 0.25);
      every(0.3, 0.8, (t) => play(ctx, out, "glock", t, pick(["A5", "C6", "D6", "E6", "G6"]), 0.35), 0.2);
      every(6, 10, (t) => FX.hum(ctx, out, t, pick(TUNES.hum)), 1.5);
      break;

    // Snoopy asleep on the roof of his doghouse in the rain
    case "10n":
      FX.rain(ctx, out, buf, 0.45);
      every(0.08, 0.3, (t) => FX.roofDrop(ctx, out, t), 0.1);
      every(3.6, 4.4, (t) => FX.snore(ctx, out, buf, t), 0.8);
      break;

    // Snoopy typing through the storm, Woodstock panicking
    case "11d":
      FX.rain(ctx, out, buf, 0.8);
      FX.wind(ctx, out, buf, Math.max(0.4, windy));
      every(1.6, 3, (t) => FX.typing(ctx, out, buf, t, true), 0.5);
      every(8, 14, (t) => {
        FX.thunder(ctx, out, buf, t);
        FX.woodstock(ctx, out, t + 0.6, true);
      }, 2);
      break;

    // lightning over the doghouse at night
    case "11n":
      FX.rain(ctx, out, buf, 0.7);
      every(6, 12, (t) => {
        FX.zap(ctx, out, buf, t);
        FX.thunder(ctx, out, buf, t + rand(0.3, 1.2));
      }, 1);
      break;

    // Charlie Brown and Snoopy out in the snow
    case "13d": {
      const tune = TUNES.snow;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => {
        bar(ctx, out, "glock", t, beat, tune.melody[i % 4]);
        if (i % 2 === 0) FX.sleighBells(ctx, out, buf, t, beat);
      });
      every(0.5, 0.8, (t) => FX.crunch(ctx, out, buf, t), 1);
      FX.wind(ctx, out, buf, 0.12, { lowpass: 700, freq: 300 });
      break;
    }

    // Lucy, very unimpressed by the snow
    case "13n":
      FX.wind(ctx, out, buf, Math.max(0.3, windy), { lowpass: 700, freq: 300 });
      every(1.5, 3.5, (t) => play(ctx, out, "glock", t, pick(["C7", "D7", "G6", "A6"]), 0.3), 0.5);
      every(7, 12, (t) => FX.hmph(ctx, out, t), 2);
      break;

    // the Flying Ace disappears into the clouds
    case "50d": {
      const engine = FX.propeller(ctx, out, buf, 0.8);
      // the plane fades away into the clouds and comes back now and then
      lfo(ctx, 0.06, 0.02, engine.gain);
      [["C4", "E4", "G4", "B4"], ["A3", "C4", "E4", "G4"]].forEach((chord, i) => {
        sched.bars(9.6, (t) => chord.forEach((note, k) => play(ctx, out, "vibes", t + k * 0.15, note, 0.6)), 0.5 + i * 4.8);
      });
      break;
    }

    // Charlie Brown, surprised, lost in the fog
    case "50n":
      sched.bars(4.8, (t, i) => {
        [["C4", "E4", "F#4", "Bb4"], ["D4", "F#4", "Ab4", "C5"]][i % 2].forEach((note, k) => play(ctx, out, "vibes", t + k * 0.12, note, 0.8));
      });
      every(8, 13, (t) => FX.foghorn(ctx, out, t), 2);
      FX.wind(ctx, out, buf, 0.12, { lowpass: 600, freq: 250 });
      break;

    // "It's too hot!" - "Whew!"
    case "too hot": {
      const tune = TUNES.hot;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => bar(ctx, out, "steelDrum", t, beat, tune.melody[i % 4]));
      FX.cicadas(ctx, out, buf);
      every(7, 12, (t) => FX.whew(ctx, out, buf, t), 2);
      break;
    }

    // "It's freezing!" everyone shivering
    case "freezing":
      FX.wind(ctx, out, buf, Math.max(0.5, windy), { lowpass: 1800, freq: 600 });
      every(3, 6, (t) => FX.chatter(ctx, out, buf, t), 1);
      every(5, 9, (t) => FX.brrr(ctx, out, t), 2.5);
      break;

    default:
      FX.wind(ctx, out, buf, 0.4);
  }

  const nodes = live;
  return function stop() {
    sched.clear();
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => {
      nodes.forEach((node) => {
        try {
          node.stop();
        } catch (e) {
          // already stopped
        }
      });
      master.disconnect();
    }, 700);
  };
}
