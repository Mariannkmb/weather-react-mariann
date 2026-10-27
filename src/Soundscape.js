// Weather soundscapes generated in the browser with the Web Audio API.
// Each kind of weather has its own little tune and instrument, cartoon style,
// with rain or wind only as a soft background. No audio files: everything is
// synthesised, so nothing needs licensing and the app stays light.
// All melodies are original. Each scene returns a stop() function.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// note names -> MIDI numbers, e.g. "C5" = 72, "Bb3" = 58, "F#4" = 66
function n(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + base + acc;
}

// Long-running sources of the current scene (looping noise, LFOs, drones),
// so stop() can really stop them instead of leaving them running muted.
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
    // fn(time) every [minS, maxS] seconds, first after `first` seconds
    every(minS, maxS, fn, first) {
      const gap = () => rand(minS, maxS);
      let start = first !== undefined ? first : gap();
      if (offlineDuration) {
        for (let t = start; t < offlineDuration; t += gap()) fn(t);
      } else {
        jobs.push({ fn, gap, next: ctx.currentTime + start });
      }
    },
    // fn(barStartTime, barIndex) once per bar, back to back
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

function lfo(ctx, freq, depth, param) {
  const o = ctx.createOscillator();
  o.frequency.value = freq;
  const g = gain(ctx, depth);
  o.connect(g).connect(param);
  o.start();
  live.push(o);
  return o;
}

// one decaying partial: the basis of every bell, marimba and music box
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

// ---- instruments ---------------------------------------------------------

const INSTRUMENTS = {
  musicBox(ctx, out, t, f, v) {
    partial(ctx, out, t, f, 0.12 * v, 1.6);
    partial(ctx, out, t, f * 4, 0.035 * v, 0.35);
    partial(ctx, out, t, f * 6.0, 0.012 * v, 0.15);
  },
  glock(ctx, out, t, f, v) {
    partial(ctx, out, t, f, 0.1 * v, 1.3);
    partial(ctx, out, t, f * 2.76, 0.035 * v, 0.5);
    partial(ctx, out, t, f * 5.4, 0.015 * v, 0.2);
  },
  marimba(ctx, out, t, f, v) {
    partial(ctx, out, t, f, 0.16 * v, 0.55);
    partial(ctx, out, t, f * 3.93, 0.04 * v, 0.09);
    partial(ctx, out, t, f * 9.2, 0.012 * v, 0.03);
  },
  kalimba(ctx, out, t, f, v) {
    const o = partial(ctx, out, t, f * 1.02, 0.14 * v, 1.0);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    partial(ctx, out, t, f * 5.9, 0.03 * v, 0.12);
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
      for (let i = period; i < len; i++) {
        d[i] = 0.5 * (d[i - period] + d[i - period + 1]) * 0.994;
      }
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
  INSTRUMENTS[instrument](ctx, out, t, hz(typeof note === "string" ? n(note) : note), v || 1);
}

// Plays a bar: notes are [beat, note] or [beat, note, velocity].
function bar(ctx, out, instrument, t, beat, notes) {
  notes.forEach(([b, note, v]) => play(ctx, out, instrument, t + b * beat, note, v));
}

// ---- background layers -----------------------------------------------------

function rainBed(ctx, out, buf, level) {
  const hiss = noise(ctx, buf);
  hiss
    .connect(filter(ctx, "highpass", 600))
    .connect(filter(ctx, "lowpass", 2500 + 3500 * level))
    .connect(gain(ctx, 0.02 + 0.1 * level))
    .connect(out);
}

function windBed(ctx, out, buf, strength, opts) {
  const o = opts || {};
  const src = noise(ctx, buf);
  const bp = filter(ctx, "bandpass", o.freq || 420, 0.6);
  const g = gain(ctx, 0.015 + 0.08 * strength);
  src.connect(bp).connect(filter(ctx, "lowpass", o.lowpass || 1500)).connect(g).connect(out);
  lfo(ctx, rand(0.06, 0.12), 0.01 + 0.05 * strength, g.gain);
  lfo(ctx, rand(0.04, 0.09), 160, bp.frequency);
}

function tweet(ctx, out, t) {
  const base = rand(3000, 4200);
  const count = pick([2, 2, 3]);
  for (let i = 0; i < count; i++) {
    const s = t + i * 0.13;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(base, s);
    o.frequency.exponentialRampToValueAtTime(base * 1.45, s + 0.045);
    o.frequency.exponentialRampToValueAtTime(base * 1.15, s + 0.08);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.035, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + 0.1);
  }
}

function cricket(ctx, out, t) {
  const f = rand(4400, 4800);
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.06;
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.008, s + 0.01);
    g.gain.linearRampToValueAtTime(0, s + 0.04);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + 0.05);
  }
}

function thunder(ctx, out, buf, t) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = gain(ctx, 0);
  const peak = rand(0.35, 0.6);
  const length = rand(3, 5);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + rand(0.05, 0.25));
  for (let s = t + 0.5; s < t + length - 0.6; s += rand(0.3, 0.7)) {
    g.gain.linearRampToValueAtTime(peak * rand(0.3, 0.8), s);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(filter(ctx, "lowpass", rand(150, 280))).connect(g).connect(out);
  src.start(t, rand(0, 1));
  src.stop(t + length + 0.1);
}

// the cartoon "wah-wah-waaah" of a muted trombone
function sadTrombone(ctx, out, t) {
  const notes = [n("Bb3"), n("A3"), n("Ab3"), n("G3")];
  notes.forEach((m, i) => {
    const s = t + i * 0.42;
    const len = i === 3 ? 1.3 : 0.38;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(hz(m), s);
    if (i === 3) {
      const vib = ctx.createOscillator();
      vib.frequency.value = 6;
      const vg = gain(ctx, 4);
      vib.connect(vg).connect(o.frequency);
      vib.start(s + 0.2);
      vib.stop(s + len);
    }
    const lp = filter(ctx, "lowpass", 300, 7);
    lp.frequency.setValueAtTime(300, s);
    lp.frequency.linearRampToValueAtTime(1300, s + 0.12);
    lp.frequency.linearRampToValueAtTime(450, s + len);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.09, s + 0.04);
    g.gain.setValueAtTime(0.09, s + len - 0.08);
    g.gain.linearRampToValueAtTime(0, s + len);
    o.connect(lp).connect(g).connect(out);
    o.start(s);
    o.stop(s + len + 0.02);
  });
}

function sleighBells(ctx, out, buf, t, beat) {
  [0, 0.5, 1, 1.5, 2, 2.25, 2.5, 3].forEach((b) => {
    const s = t + b * beat;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.05, s + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.12);
    src.connect(filter(ctx, "bandpass", rand(6500, 8000), 4)).connect(g).connect(out);
    src.start(s, rand(0, 2));
    src.stop(s + 0.15);
  });
}

function whistle(ctx, out, t) {
  const scale = ["D5", "E5", "F#5", "A5", "B5", "D6"].map(n);
  let s = t;
  const count = pick([3, 4, 5]);
  for (let i = 0; i < count; i++) {
    const from = hz(pick(scale));
    const to = hz(pick(scale));
    const len = rand(0.35, 0.7);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(from, s);
    o.frequency.exponentialRampToValueAtTime(to, s + len * 0.6);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vg = gain(ctx, to * 0.012);
    vib.connect(vg).connect(o.frequency);
    vib.start(s);
    vib.stop(s + len);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.05, s + 0.05);
    g.gain.setValueAtTime(0.05, s + len - 0.08);
    g.gain.linearRampToValueAtTime(0, s + len);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + len + 0.02);
    s += len + rand(0.02, 0.15);
  }
}

function cicadas(ctx, out, buf) {
  const src = noise(ctx, buf);
  const g = gain(ctx, 0.012);
  lfo(ctx, 38, 0.012, g.gain);
  src.connect(filter(ctx, "bandpass", 5200, 9)).connect(g).connect(out);
}

// ---- the tunes -------------------------------------------------------------

const TUNES = {
  // bright music box in C, with a plucked bass: C - Am - F - G
  clearDay: {
    bpm: 104,
    melody: [
      [[0, "E5"], [0.5, "G5"], [1, "A5"], [1.5, "G5"], [2, "E5"], [3, "D5"], [3.5, "C5"]],
      [[0, "C6"], [0.5, "A5"], [1, "G5"], [2, "E5"], [2.5, "G5"], [3, "A5"]],
      [[0, "D5"], [0.5, "E5"], [1, "G5"], [1.5, "E5"], [2, "D5"], [2.5, "C5"], [3, "D5"]],
      [[0, "G5"], [1, "E5"], [1.5, "D5"], [2, "C5"], [3, "G4"]],
    ],
    bass: ["C3", "A2", "F2", "G2"],
  },
  // a lullaby in F, three beats to the bar
  night: {
    bpm: 66,
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
  // island ukulele in G: G - C - D - G
  fewClouds: {
    bpm: 96,
    chords: [
      ["G3", "B3", "D4", "G4"],
      ["C4", "E4", "G4", "C5"],
      ["D4", "F#4", "A4", "D5"],
      ["G3", "B3", "D4", "G4"],
    ],
    strum: [0, 1.5, 2, 3],
    melody: [
      [[0.5, "B5"], [1, "D6"], [2.5, "B5"]],
      [],
      [[0.5, "A5"], [1, "F#5"], [2, "D5"]],
      [],
    ],
  },
  // calm kalimba arpeggios: Dm9 - Gm7 - Bbmaj7 - A7sus
  clouds: {
    bpm: 72,
    arps: [
      ["D4", "F4", "A4", "E5"],
      ["G3", "Bb3", "D4", "F4"],
      ["Bb3", "D4", "F4", "A4"],
      ["A3", "D4", "E4", "G4"],
    ],
  },
  // marimba arpeggios: Am - F - C - G
  rain: {
    arps: [
      ["A3", "C4", "E4", "A4", "E4", "C4", "A3", "E4"],
      ["F3", "A3", "C4", "F4", "C4", "A3", "F3", "C4"],
      ["C4", "E4", "G4", "C5", "G4", "E4", "C4", "G4"],
      ["G3", "B3", "D4", "G4", "D4", "B3", "G3", "D4"],
    ],
  },
  // twinkling glockenspiel in Eb
  snow: {
    bpm: 80,
    melody: [
      [[0, "Bb6"], [0.5, "G6"], [1, "Eb6"], [1.5, "Bb5"], [3, "G5"]],
      [[0, "Ab6"], [0.5, "F6"], [1, "D6"], [1.5, "Bb5"], [3, "F5"]],
      [[0, "G6"], [0.5, "Eb6"], [1, "C6"], [1.5, "G5"], [3, "Eb5"]],
      [[0, "F6"], [0.5, "D6"], [1, "Bb5"], [2, "C6"], [2.5, "D6"], [3, "Eb6"]],
    ],
  },
  // mysterious vibraphone, whole-tone chords
  fog: {
    bpm: 50,
    chords: [
      ["C4", "E4", "F#4", "Bb4"],
      ["D4", "F#4", "Ab4", "C5"],
    ],
  },
  // lazy calypso on a steel drum in C
  hot: {
    bpm: 110,
    melody: [
      [[0, "E5"], [0.75, "G5"], [1.5, "E5"], [2, "C5"], [2.75, "D5"], [3.5, "E5"]],
      [[0, "F5"], [0.75, "A5"], [1.5, "F5"], [2, "D5"], [2.75, "E5"], [3.5, "F5"]],
      [[0, "G5"], [0.75, "E5"], [1.5, "C5"], [2, "E5"], [2.75, "G5"], [3.5, "A5"]],
      [[0, "G5"], [1, "F5"], [1.5, "E5"], [2, "D5"], [3, "C5"]],
    ],
    bass: ["C3", "F2", "C3", "G2"],
  },
};

// ---- weather -> scene ------------------------------------------------------

export function sceneFor(w) {
  const id = w.id || 800;
  const night = (w.icon || "").endsWith("n");
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 400) return "drizzle";
  if (id === 500 || id === 511) return "light rain";
  if (id === 501 || id === 520 || id === 521) return "rain";
  if (id >= 502 && id < 600) return "heavy rain";
  if (id >= 600 && id < 700) return "snow";
  if (id === 771 || id === 781) return "wind";
  if (id >= 700 && id < 800) return "fog";
  if (!night && (w.temp || 0) >= 32) return "hot";
  if (id === 800) return night ? "clear night" : "clear day";
  if (id <= 802) return night ? "few clouds night" : "few clouds";
  return "clouds";
}

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
  master.gain.linearRampToValueAtTime(0.8, t0 + 1.2);

  const windy = Math.min(1, (w.wind || 0) / 12); // m/s, 12 m/s = very windy
  const scene = sceneFor(w);

  // small helpers for this scene
  const melodyLoop = (tune, instrument, beats) => {
    const beat = 60 / tune.bpm;
    sched.bars(beat * beats, (t, i) => {
      bar(ctx, out, instrument, t, beat, tune.melody[i % tune.melody.length]);
      if (tune.bass) play(ctx, out, "pluck", t, tune.bass[i % tune.bass.length], 0.8);
    });
  };
  const randomNotes = (instrument, notes, minS, maxS, v) => {
    sched.every(minS, maxS, (t) => play(ctx, out, instrument, t, pick(notes), v), 0.3);
  };

  switch (scene) {
    case "clear day":
      melodyLoop(TUNES.clearDay, "musicBox", 4);
      sched.every(3, 7, (t) => tweet(ctx, out, t), 1.5);
      break;

    case "hot":
      melodyLoop(TUNES.hot, "steelDrum", 4);
      cicadas(ctx, out, buf);
      break;

    case "clear night":
    case "few clouds night": {
      const tune = TUNES.night;
      const beat = 60 / (scene === "clear night" ? tune.bpm : tune.bpm - 8);
      sched.bars(beat * 3, (t, i) => {
        bar(ctx, out, "musicBox", t, beat, tune.melody[i % tune.melody.length]);
        play(ctx, out, "musicBox", t, tune.bass[i % tune.bass.length], 0.6);
      });
      sched.every(scene === "clear night" ? 0.8 : 1.8, 2.5, (t) => cricket(ctx, out, t), 0.5);
      sched.every(4, 9, (t) => play(ctx, out, "glock", t, pick(["C7", "F7", "A6"]), 0.35), 3);
      if (scene === "few clouds night") windBed(ctx, out, buf, 0.15);
      break;
    }

    case "few clouds": {
      const tune = TUNES.fewClouds;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => {
        const chord = tune.chords[i % tune.chords.length];
        tune.strum.forEach((b, k) => {
          const notes = k % 2 ? chord.slice().reverse() : chord;
          notes.forEach((note, j) => play(ctx, out, "pluck", t + b * beat + j * 0.018, note, 0.55));
        });
        bar(ctx, out, "kalimba", t, beat, tune.melody[i % tune.melody.length]);
      });
      sched.every(6, 12, (t) => tweet(ctx, out, t), 4);
      windBed(ctx, out, buf, Math.max(0.1, windy * 0.5));
      break;
    }

    case "clouds": {
      const tune = TUNES.clouds;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => {
        const arp = tune.arps[i % tune.arps.length];
        arp.forEach((note, k) => play(ctx, out, "kalimba", t + k * beat, note, 0.9));
      });
      windBed(ctx, out, buf, Math.max(0.2, windy * 0.7));
      break;
    }

    case "drizzle":
      randomNotes("glock", ["A5", "C6", "D6", "E6", "G6", "A6"], 0.35, 0.9, 0.6);
      rainBed(ctx, out, buf, 0.15);
      break;

    case "light rain":
      randomNotes("marimba", ["A4", "C5", "D5", "E5", "G5", "A5", "C6"], 0.2, 0.55, 0.7);
      rainBed(ctx, out, buf, 0.35);
      break;

    case "rain":
    case "heavy rain": {
      const heavy = scene === "heavy rain";
      const beat = 60 / (heavy ? 120 : 92);
      sched.bars(beat * 4, (t, i) => {
        const arp = TUNES.rain.arps[i % 4];
        arp.forEach((note, k) => {
          const m = heavy ? n(note) - 12 : n(note);
          play(ctx, out, "marimba", t + k * beat * 0.5, m, k === 0 ? 1 : 0.7);
        });
      });
      rainBed(ctx, out, buf, heavy ? 0.9 : 0.55);
      if (heavy) windBed(ctx, out, buf, Math.max(0.3, windy));
      break;
    }

    case "storm":
      rainBed(ctx, out, buf, 0.9);
      windBed(ctx, out, buf, Math.max(0.4, windy));
      sched.every(8, 16, (t) => thunder(ctx, out, buf, t), 1.5);
      sched.every(14, 24, (t) => sadTrombone(ctx, out, t), 5);
      // nervous low marimba heartbeat
      sched.bars(60 / 70, (t) => {
        play(ctx, out, "marimba", t, "D3", 0.8);
        play(ctx, out, "marimba", t + 0.22, "D3", 0.5);
      });
      break;

    case "snow": {
      const tune = TUNES.snow;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => {
        bar(ctx, out, "glock", t, beat, tune.melody[i % tune.melody.length]);
        if (i % 2 === 0) sleighBells(ctx, out, buf, t, beat);
      });
      windBed(ctx, out, buf, 0.15, { lowpass: 700, freq: 300 });
      break;
    }

    case "fog": {
      const tune = TUNES.fog;
      const beat = 60 / tune.bpm;
      sched.bars(beat * 4, (t, i) => {
        tune.chords[i % 2].forEach((note, k) => play(ctx, out, "vibes", t + k * 0.12, note, 0.8));
      });
      windBed(ctx, out, buf, 0.12, { lowpass: 600, freq: 250 });
      break;
    }

    case "wind":
    default:
      windBed(ctx, out, buf, Math.max(0.6, windy));
      sched.every(4, 8, (t) => whistle(ctx, out, t), 1);
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
