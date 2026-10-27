// Weather soundscapes generated in the browser with the Web Audio API.
// No audio files: every sound is built from noise and simple tones, so nothing
// needs licensing and the app stays light. Each scene returns a stop() function.

function noiseBuffer(ctx) {
  const length = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

const rand = (a, b) => a + Math.random() * (b - a);

// Long-running sources (looping noise, LFOs, drones) of the current scene,
// so stop() can actually stop them instead of leaving them running muted.
let live = [];

// Runs fn(time) at random intervals. Live: a timer loop. Offline (previews):
// everything is scheduled up front for the given duration.
function makeScheduler(ctx, offlineDuration) {
  const timers = [];
  return {
    every(minS, maxS, fn, firstAfter) {
      if (offlineDuration) {
        let t = firstAfter !== undefined ? firstAfter : rand(minS, maxS);
        while (t < offlineDuration) {
          fn(t);
          t += rand(minS, maxS);
        }
        return;
      }
      const loop = (delay) => {
        const id = setTimeout(() => {
          fn(ctx.currentTime + 0.05);
          loop(rand(minS, maxS));
        }, delay * 1000);
        timers.push(id);
      };
      loop(firstAfter !== undefined ? firstAfter : rand(minS, maxS));
    },
    clear() {
      timers.forEach(clearTimeout);
    },
  };
}

function noise(ctx, buf) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopStart = 0;
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

// ---- layers -------------------------------------------------------------

function rain(ctx, out, buf, sched, level) {
  const hiss = noise(ctx, buf);
  const hp = filter(ctx, "highpass", 500);
  const lp = filter(ctx, "lowpass", 2500 + 4000 * level);
  hiss.connect(hp).connect(lp).connect(gain(ctx, 0.05 + 0.22 * level)).connect(out);

  const body = noise(ctx, buf);
  body.connect(filter(ctx, "lowpass", 700)).connect(gain(ctx, 0.03 + 0.12 * level)).connect(out);

  // individual drops on leaves and roofs
  const gap = 0.25 - 0.2 * level;
  sched.every(gap * 0.3, gap, (t) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(rand(1800, 4200), t);
    o.frequency.exponentialRampToValueAtTime(rand(600, 1200), t + 0.04);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.006, 0.02) * (0.5 + level), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.06);
  });
}

function thunder(ctx, out, buf, sched) {
  sched.every(9, 22, (t) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = filter(ctx, "lowpass", rand(140, 320));
    const g = gain(ctx, 0);
    const peak = rand(0.5, 0.9);
    const length = rand(3, 6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rand(0.05, 0.3));
    // a few rolling swells
    let tt = t + 0.4;
    while (tt < t + length - 0.5) {
      g.gain.linearRampToValueAtTime(peak * rand(0.3, 0.8), tt);
      tt += rand(0.3, 0.8);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(lp).connect(g).connect(out);
    src.start(t, rand(0, 1));
    src.stop(t + length + 0.1);

    // the crack, sometimes
    if (Math.random() < 0.6) {
      const crack = ctx.createBufferSource();
      crack.buffer = buf;
      const cg = gain(ctx, 0);
      cg.gain.setValueAtTime(0.25, t);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      crack.connect(filter(ctx, "highpass", 900)).connect(cg).connect(out);
      crack.start(t, rand(0, 2));
      crack.stop(t + 0.4);
    }
  }, 2.5);
}

function wind(ctx, out, buf, strength, opts) {
  const o = opts || {};
  const src = noise(ctx, buf);
  const bp = filter(ctx, "bandpass", o.freq || 420, 0.6);
  const g = gain(ctx, 0.03 + 0.13 * strength);
  src.connect(bp).connect(filter(ctx, "lowpass", o.lowpass || 1600)).connect(g).connect(out);
  lfo(ctx, rand(0.05, 0.12), 0.02 + 0.08 * strength, g.gain); // gusts
  lfo(ctx, rand(0.04, 0.09), 180, bp.frequency); // whistle moving
}

function birds(ctx, out, sched, minS, maxS) {
  sched.every(minS, maxS, (t) => {
    const base = rand(2400, 3800);
    const notes = Math.floor(rand(2, 5));
    for (let i = 0; i < notes; i++) {
      const s = t + i * rand(0.09, 0.16);
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(base, s);
      o.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.6), s + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * rand(0.8, 1.0), s + 0.1);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.025, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.11);
      o.connect(g).connect(out);
      o.start(s);
      o.stop(s + 0.12);
    }
  }, 0.8);
}

function crickets(ctx, out, sched, minS, maxS) {
  sched.every(minS, maxS, (t) => {
    const freq = rand(4300, 4900);
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.055;
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.012, s + 0.008);
      g.gain.linearRampToValueAtTime(0, s + 0.04);
      o.connect(g).connect(out);
      o.start(s);
      o.stop(s + 0.05);
    }
  }, 0.3);
}

function chimes(ctx, out, sched) {
  sched.every(3.5, 8, (t) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = [1046, 1174, 1318, 1568, 1760][Math.floor(rand(0, 5))];
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 2.6);
  }, 1.5);
}

function fogPad(ctx, out) {
  [110, 164.8, 220].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = gain(ctx, 0.012 - i * 0.003);
    lfo(ctx, rand(0.05, 0.15), 0.006, g.gain);
    o.connect(g).connect(out);
    o.start();
    live.push(o);
  });
}

function cicadas(ctx, out, buf) {
  const src = noise(ctx, buf);
  const g = gain(ctx, 0.02);
  lfo(ctx, 38, 0.02, g.gain);
  src.connect(filter(ctx, "bandpass", 5200, 9)).connect(g).connect(out);
}

// ---- weather -> scene ---------------------------------------------------

// Short label for each scene, shown on the button's tooltip.
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
  const t0 = ctx.currentTime;
  master.gain.setValueAtTime(0, t0);

  const windy = Math.min(1, (w.wind || 0) / 12); // m/s, 12 m/s = very windy
  const scene = sceneFor(w);

  // Quiet scenes get a boost so switching cities doesn't need a volume change.
  // Rain and storms stay a little louder, as they are in real life.
  const LEVEL = {
    storm: 0.6,
    "heavy rain": 0.6,
    rain: 0.75,
    "light rain": 0.95,
    drizzle: 1.1,
    snow: 2.4,
    fog: 1.9,
    wind: 0.8,
    "clear day": 2.8,
    "clear night": 3,
    "few clouds": 2.4,
    "few clouds night": 2.6,
    clouds: 1.8,
  };
  master.gain.linearRampToValueAtTime(0.7 * (LEVEL[scene] || 1), t0 + 1.5);

  switch (scene) {
    case "storm":
      rain(ctx, master, buf, sched, 0.9);
      wind(ctx, master, buf, Math.max(0.5, windy));
      thunder(ctx, master, buf, sched);
      break;
    case "drizzle":
      rain(ctx, master, buf, sched, 0.2);
      break;
    case "light rain":
      rain(ctx, master, buf, sched, 0.35);
      break;
    case "rain":
      rain(ctx, master, buf, sched, 0.6);
      wind(ctx, master, buf, windy * 0.6);
      break;
    case "heavy rain":
      rain(ctx, master, buf, sched, 0.95);
      wind(ctx, master, buf, Math.max(0.3, windy));
      break;
    case "snow":
      wind(ctx, master, buf, Math.max(0.25, windy), { lowpass: 700, freq: 300 });
      chimes(ctx, master, sched);
      break;
    case "wind":
      wind(ctx, master, buf, 1);
      break;
    case "fog":
      fogPad(ctx, master);
      wind(ctx, master, buf, 0.2, { lowpass: 600, freq: 250 });
      break;
    case "clear night":
      crickets(ctx, master, sched, 0.6, 1.6);
      wind(ctx, master, buf, Math.max(0.08, windy * 0.5));
      break;
    case "clear day":
      birds(ctx, master, sched, 1.5, 4.5);
      wind(ctx, master, buf, Math.max(0.12, windy * 0.6));
      break;
    case "few clouds night":
      crickets(ctx, master, sched, 1.2, 3.5);
      wind(ctx, master, buf, Math.max(0.2, windy * 0.7));
      break;
    case "few clouds":
      birds(ctx, master, sched, 4, 9);
      wind(ctx, master, buf, Math.max(0.25, windy * 0.7));
      break;
    default:
      wind(ctx, master, buf, Math.max(0.35, windy));
  }

  if ((w.temp || 0) >= 32 && scene.indexOf("rain") === -1 && scene !== "storm") {
    cicadas(ctx, master, buf);
  }

  const nodes = live;
  return function stop() {
    sched.clear();
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => {
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch (e) {
          // already stopped
        }
      });
      master.disconnect();
    }, 700);
  };
}
