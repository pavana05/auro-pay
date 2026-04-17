// Lightweight sound effects via WebAudio (no asset files needed).
// Tones are short, non-musical UI feedback that pair with haptics.

const STORAGE_KEY = "sounds_enabled";

let enabled = true;
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) enabled = stored === "true";
}

export const setSoundsEnabled = (value: boolean) => {
  enabled = value;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(value));
  }
};

export const getSoundsEnabled = () => enabled;

let ctx: AudioContext | null = null;
const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

const beep = (freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.08) => {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durMs / 1000);
};

export const sound = {
  tap: () => beep(880, 35, "triangle", 0.05),
  success: () => {
    beep(660, 90, "sine", 0.08);
    setTimeout(() => beep(990, 130, "sine", 0.08), 80);
  },
  error: () => {
    beep(220, 120, "square", 0.07);
    setTimeout(() => beep(180, 160, "square", 0.07), 110);
  },
};
