/** Çok hafif WebAudio geri bildirim sesleri. Kullanıcı ayarlardan kapatabilir. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  correct() {
    blip(660, 0.09, 'sine', 0.08);
    blip(880, 0.12, 'sine', 0.07, 0.07);
  },
  wrong() {
    blip(180, 0.16, 'triangle', 0.09);
  },
  tick() {
    blip(520, 0.06, 'sine', 0.05);
  },
  go() {
    blip(784, 0.18, 'sine', 0.08);
  },
  finish() {
    blip(523, 0.12, 'sine', 0.08);
    blip(659, 0.12, 'sine', 0.08, 0.11);
    blip(784, 0.2, 'sine', 0.08, 0.22);
  },
};
