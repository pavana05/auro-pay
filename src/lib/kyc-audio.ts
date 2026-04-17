/**
 * Cinematic Web Audio drone + packet pings for the KYC tunnel stage.
 * No asset files — everything synthesized in-browser.
 *
 * Usage:
 *   const audio = createTunnelAudio();
 *   audio.start();          // begin drone + scheduled pings
 *   audio.setMuted(true);   // toggle without stopping
 *   audio.stop();           // tear down
 */

const STORAGE_KEY = "auropay.kyc.tunnelMuted";

export const getTunnelMuted = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
};

export const setTunnelMutedPref = (muted: boolean) => {
  try { localStorage.setItem(STORAGE_KEY, muted ? "1" : "0"); } catch { /* ignore */ }
};

export interface TunnelAudio {
  start: () => void;
  stop: () => void;
  setMuted: (muted: boolean) => void;
}

export const createTunnelAudio = (): TunnelAudio => {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let drone: OscillatorNode | null = null;
  let droneGain: GainNode | null = null;
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  let pingInterval: number | null = null;
  let muted = getTunnelMuted();

  const targetMasterGain = () => (muted ? 0 : 0.18);

  const playPing = () => {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.25);
  };

  return {
    start() {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;
        ctx = new Ctx();
        master = ctx.createGain();
        master.gain.value = targetMasterGain();
        master.connect(ctx.destination);

        // Sub drone — sine at 80Hz with a slight 110Hz harmonic via LFO modulation
        drone = ctx.createOscillator();
        droneGain = ctx.createGain();
        drone.type = "sine";
        drone.frequency.value = 80;
        droneGain.gain.value = 0.0;
        drone.connect(droneGain).connect(master);
        drone.start();
        // Soft fade-in
        droneGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.6);

        // LFO to gently breathe the drone amplitude
        lfo = ctx.createOscillator();
        lfoGain = ctx.createGain();
        lfo.frequency.value = 0.35; // very slow
        lfoGain.gain.value = 0.18;
        lfo.connect(lfoGain).connect(droneGain.gain);
        lfo.start();

        // Schedule pings every ~420ms (synced w/ packet animation)
        pingInterval = window.setInterval(playPing, 420);
        // First ping immediately for snappier feel
        setTimeout(playPing, 80);
      } catch {
        /* audio not available — silently no-op */
      }
    },
    stop() {
      if (pingInterval !== null) { clearInterval(pingInterval); pingInterval = null; }
      try {
        if (ctx && droneGain) droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
        setTimeout(() => {
          try { drone?.stop(); } catch {}
          try { lfo?.stop(); } catch {}
          try { ctx?.close(); } catch {}
          ctx = null; master = null; drone = null; droneGain = null; lfo = null; lfoGain = null;
        }, 280);
      } catch { /* ignore */ }
    },
    setMuted(next: boolean) {
      muted = next;
      setTunnelMutedPref(next);
      if (ctx && master) {
        master.gain.linearRampToValueAtTime(targetMasterGain(), ctx.currentTime + 0.15);
      }
    },
  };
};
