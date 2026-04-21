import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Flashlight, FlashlightOff, Image as ImageIcon, CheckCircle2, Zap, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import jsQR from "jsqr";

interface ParsedUPI {
  pa?: string;
  pn?: string;
  am?: string;
  tn?: string;
}

const ScanPay = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRafRef = useRef<number>();

  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [autoTorch, setAutoTorch] = useState(true);
  const [parsedUPI, setParsedUPI] = useState<ParsedUPI | null>(null);
  const [amount, setAmount] = useState("");
  const [amountLocked, setAmountLocked] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [bracketsIn, setBracketsIn] = useState(false);
  const [detected, setDetected] = useState(false);
  const [whiteFlash, setWhiteFlash] = useState(false);
  const [analysingFile, setAnalysingFile] = useState(false);

  // --- Auto-torch (dark-environment detection) ---
  // Smoothed luminance (0–255) computed from the live frame's center crop.
  const lumaEmaRef = useRef<number | null>(null);
  // Timestamps used for hysteresis + cooldown so the torch doesn't flicker.
  const darkSinceRef = useRef<number | null>(null);
  const brightSinceRef = useRef<number | null>(null);
  const lastAutoToggleRef = useRef(0);
  // When the user manually toggles, pause auto-mode briefly.
  const userOverrideUntilRef = useRef(0);
  const torchOnRef = useRef(false);
  useEffect(() => { torchOnRef.current = torchOn; }, [torchOn]);

  // Tunables — chosen to feel calm, not jumpy.
  const DARK_THRESHOLD = 40;
  const BRIGHT_THRESHOLD = 90;
  const DARK_HOLD_MS = 1200;
  const BRIGHT_HOLD_MS = 1500;
  const AUTO_COOLDOWN_MS = 3000;
  const USER_OVERRIDE_MS = 8000;
  const EMA_ALPHA = 0.15;

  const navigate = useNavigate();

  // Parse UPI string
  const parseUPIString = (upiStr: string): ParsedUPI | null => {
    try {
      const cleaned = upiStr.trim();
      if (cleaned.startsWith("upi://")) {
        const qs = cleaned.split("?")[1] || "";
        const params: ParsedUPI = {};
        qs.split("&").forEach((p) => {
          const [k, v] = p.split("=");
          if (!k || !v) return;
          const dv = decodeURIComponent(v);
          if (k === "pa") params.pa = dv;
          if (k === "pn") params.pn = dv;
          if (k === "am") params.am = dv;
          if (k === "tn") params.tn = dv;
        });
        return params.pa ? params : null;
      }
      if (cleaned.includes("@") && !cleaned.includes(" ")) {
        return { pa: cleaned, pn: cleaned.split("@")[0] };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Camera lifecycle
  useEffect(() => {
    let cancelled = false;
    if (!scanning) return;
    setCameraReady(false);
    setBracketsIn(false);
    setDetected(false);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        // Detect torch capability once the track is live.
        try {
          const track = stream.getVideoTracks()[0] as any;
          const caps = track?.getCapabilities?.();
          setTorchSupported(!!caps?.torch);
        } catch { setTorchSupported(false); }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setTimeout(() => { setCameraReady(true); setTimeout(() => setBracketsIn(true), 80); }, 250);
        }
      } catch {
        toast.error("Camera access denied. Please allow camera permissions.");
      }
    })();

    return () => {
      cancelled = true;
      if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current);
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
      // Reset auto-torch state between camera sessions.
      lumaEmaRef.current = null;
      darkSinceRef.current = null;
      brightSinceRef.current = null;
    };
  }, [scanning]);

  // QR scanning loop — also samples luminance for auto-torch.
  useEffect(() => {
    if (!scanning || !cameraReady || detected) return;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);

            // --- Luminance sampling (center 50% crop, every 16th pixel) ---
            // Cheap: ~ (w*h)/16 samples per frame, all on already-grabbed bytes.
            if (document.visibilityState === "visible") {
              const data = img.data;
              const x0 = Math.floor(w * 0.25);
              const y0 = Math.floor(h * 0.25);
              const x1 = Math.floor(w * 0.75);
              const y1 = Math.floor(h * 0.75);
              const stride = 4 * 4; // sample every 4th pixel horizontally
              let sum = 0; let count = 0;
              for (let y = y0; y < y1; y += 4) {
                const rowStart = y * w * 4;
                for (let x = x0; x < x1; x += 4) {
                  const i = rowStart + x * 4;
                  // Rec. 601 luma — fast integer-friendly approximation.
                  sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                  count++;
                }
                // (stride var kept for readability; loop handles step)
                void stride;
              }
              if (count > 0) {
                const luma = sum / count;
                lumaEmaRef.current = lumaEmaRef.current == null
                  ? luma
                  : lumaEmaRef.current * (1 - EMA_ALPHA) + luma * EMA_ALPHA;
                evaluateAutoTorch(lumaEmaRef.current);
              }
            }

            const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
            if (code?.data) {
              const parsed = parseUPIString(code.data);
              if (parsed?.pa) {
                handleQRDetected(parsed);
                return;
              }
            }
          }
        }
      }
      scanRafRef.current = requestAnimationFrame(tick);
    };
    scanRafRef.current = requestAnimationFrame(tick);
    return () => { if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current); };
  }, [scanning, cameraReady, detected]);

  const handleQRDetected = (parsed: ParsedUPI) => {
    setDetected(true);
    haptic.success();
    setWhiteFlash(true);
    setTimeout(() => setWhiteFlash(false), 200);
    if (videoRef.current) videoRef.current.pause();
    // After focus animation, navigate to cinematic /pay flow
    setTimeout(() => {
      navigate("/pay", {
        state: {
          upi_id: parsed.pa,
          payee_name: parsed.pn,
          amount: parsed.am ? parseFloat(parsed.am) : undefined,
          amount_locked: !!parsed.am,
          note: parsed.tn,
        },
      });
    }, 600);
  };

  const enableTorch = async (on: boolean) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try { await (track as any).applyConstraints({ advanced: [{ torch: on }] }); setTorchOn(on); } catch {}
  };
  const toggleTorch = () => { haptic.light(); enableTorch(!torchOn); };

  // Gallery picker
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalysingFile(true);
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas error");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(data.data, img.width, img.height);
      URL.revokeObjectURL(url);
      if (!code?.data) { toast.error("No QR code found in image"); return; }
      const parsed = parseUPIString(code.data);
      if (!parsed?.pa) { toast.error("QR is not a valid UPI code"); return; }
      handleQRDetected(parsed);
    } catch {
      toast.error("Could not analyse image");
    } finally {
      setAnalysingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processPayment = async () => {
    if (!parsedUPI?.pa || !amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    haptic.medium();
    // Hand off to unified /pay flow — it handles PIN setup, entry, processing & success.
    navigate("/pay", {
      state: {
        upi_id: parsedUPI.pa,
        payee_name: parsedUPI.pn || parsedUPI.pa,
        amount: parseFloat(amount),
        amount_locked: !!parsedUPI.am,
        note: parsedUPI.tn || "",
        category: "other",
      },
    });
  };

  // ---------- SUCCESS ----------
  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-success" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-success mb-2">Payment Successful!</h2>
          <p className="text-3xl font-bold mb-1 font-mono">₹{amount}</p>
          <p className="text-sm text-muted-foreground">paid to</p>
          <p className="text-base font-semibold mt-1 mb-10">{parsedUPI?.pn || parsedUPI?.pa}</p>
          <button onClick={() => navigate("/home")} className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.97]">
            Done
          </button>
        </div>
      </div>
    );
  }

  // ---------- SCANNER + DETAILS SHEET ----------
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Camera */}
      <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraReady ? "opacity-100" : "opacity-0"}`} playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 90% 70% at center, transparent 35%, hsl(220 20% 3% / 0.6) 75%, hsl(220 20% 3% / 0.95) 100%)",
      }} />

      {/* White flash on detect */}
      {whiteFlash && <div className="absolute inset-0 bg-white pointer-events-none z-50" style={{ animation: "white-flash 200ms ease-out forwards" }} />}

      {/* Top floating bar */}
      <div className="absolute top-0 inset-x-0 z-30 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => { haptic.light(); navigate(-1); }}
            className="w-11 h-11 rounded-full bg-white/[0.08] backdrop-blur-2xl flex items-center justify-center border border-white/[0.12] active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 mx-2 h-11 rounded-full bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] flex items-center justify-center">
            <span className="text-[13px] font-semibold text-white tracking-wide">Scan QR Code</span>
          </div>
          <button onClick={toggleTorch}
            className={`w-11 h-11 rounded-full backdrop-blur-2xl flex items-center justify-center border transition-all duration-300 active:scale-90 ${
              torchOn ? "bg-primary border-primary/60 shadow-[0_0_20px_hsl(42_78%_55%/0.6)]" : "bg-white/[0.08] border-white/[0.12]"
            }`}>
            {torchOn
              ? <Flashlight className="w-5 h-5 text-primary-foreground" style={{ animation: "torch-on 0.4s ease-out" }} />
              : <FlashlightOff className="w-5 h-5 text-white" />}
          </button>
          <button onClick={() => { haptic.light(); fileInputRef.current?.click(); }}
            className="w-11 h-11 rounded-full bg-white/[0.08] backdrop-blur-2xl flex items-center justify-center border border-white/[0.12] active:scale-90 transition-transform">
            {analysingFile
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <ImageIcon className="w-5 h-5 text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
        </div>
      </div>

      {/* Scan frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="relative transition-all duration-500"
          style={{
            width: detected ? 200 : 280,
            height: detected ? 200 : 280,
            transform: detected ? "scale(0.9)" : "scale(1)",
          }}
        >
          {/* Four corner brackets — slide in from corners on load */}
          {[
            { pos: "top-0 left-0", borders: "border-t-[3px] border-l-[3px] rounded-tl-[20px]", from: "translate(-30px, -30px)" },
            { pos: "top-0 right-0", borders: "border-t-[3px] border-r-[3px] rounded-tr-[20px]", from: "translate(30px, -30px)" },
            { pos: "bottom-0 left-0", borders: "border-b-[3px] border-l-[3px] rounded-bl-[20px]", from: "translate(-30px, 30px)" },
            { pos: "bottom-0 right-0", borders: "border-b-[3px] border-r-[3px] rounded-br-[20px]", from: "translate(30px, 30px)" },
          ].map((c, i) => (
            <div
              key={i}
              className={`absolute w-12 h-12 ${c.pos} ${c.borders} transition-all duration-700`}
              style={{
                borderColor: detected ? "hsl(152 60% 45%)" : "hsl(42 78% 55%)",
                boxShadow: detected
                  ? "0 0 16px hsl(152 60% 45% / 0.7)"
                  : "0 0 12px hsl(42 78% 55% / 0.45)",
                opacity: bracketsIn ? 1 : 0,
                transform: bracketsIn ? "translate(0,0)" : c.from,
                transitionDelay: bracketsIn ? `${i * 70}ms` : "0ms",
                animation: bracketsIn && !detected ? "bracket-pulse 2s ease-in-out infinite" : undefined,
              }}
            />
          ))}

          {/* Scanning beam — premium zen utility */}
          {!detected && bracketsIn && (
            <div className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden rounded-[16px]">
              <div className="zen-scan-beam" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom frosted sheet */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-4 pb-5">
        <div className="rounded-[24px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] p-4" style={{ minHeight: 140 }}>
          <p className="text-center text-[13px] font-semibold text-white mb-3">Point at any merchant's UPI QR code</p>
          <div className="flex items-center justify-center gap-2 mb-2.5">
            {["PhonePe", "GPay", "Paytm", "BharatPe"].map((name) => (
              <div key={name} className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <span className="text-[9px] font-bold text-white/70 tracking-wide">{name}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-white/45 font-medium">✓ Works with all UPI apps</p>
        </div>
      </div>

      {/* Merchant Details Bottom Sheet */}
      {parsedUPI && !scanning && (
        <div className="absolute inset-0 z-40 flex items-end" onClick={() => { /* tap-outside not closing — explicit cancel */ }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full rounded-t-[28px] bg-background border-t border-white/[0.08] p-6 pb-8"
            style={{ animation: "sheet-up 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both", boxShadow: "0 -20px 60px rgba(0,0,0,0.6)" }}
          >
            {/* Grabber */}
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-5" />

            {/* Merchant identity */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-[0_8px_28px_hsl(42_78%_55%/0.35)] mb-3">
                {(parsedUPI.pn || parsedUPI.pa || "M")[0].toUpperCase()}
              </div>
              <h2 className="text-[22px] font-bold tracking-[-0.5px] text-foreground">{parsedUPI.pn || "Merchant"}</h2>
              <p className="text-[12px] text-muted-foreground font-mono mt-1">{parsedUPI.pa}</p>
            </div>

            {/* Amount */}
            <div className="mb-5">
              {amountLocked && (
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary">Fixed amount by merchant</span>
                </div>
              )}
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[28px] font-bold text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => !amountLocked && setAmount(e.target.value)}
                  readOnly={amountLocked}
                  placeholder="0"
                  autoFocus={!amountLocked}
                  className={`w-full h-[80px] rounded-2xl bg-white/[0.04] border text-[34px] font-bold text-center pl-12 outline-none transition-all font-mono ${
                    amountLocked ? "border-primary/30 text-primary" : "border-white/[0.08] focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.1)]"
                  }`}
                />
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={processPayment}
              disabled={processing || !amount || parseFloat(amount) <= 0}
              className="w-full h-14 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 transition-all"
              style={{
                background: "linear-gradient(135deg, hsl(152 60% 40%), hsl(152 60% 50%))",
                boxShadow: "0 8px 28px hsl(152 60% 45% / 0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Zap className="w-4 h-4" /> Pay ₹{amount || "0"}</>
              )}
            </button>

            <button
              onClick={() => { haptic.light(); setParsedUPI(null); setAmount(""); setAmountLocked(false); setScanning(true); }}
              className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan-sweep {
          0% { top: 0; }
          50% { top: calc(100% - 60px); }
          100% { top: 0; }
        }
        @keyframes bracket-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.6); }
        }
        @keyframes white-flash {
          0% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes torch-on {
          0% { transform: scale(0.7) rotate(-15deg); }
          60% { transform: scale(1.15) rotate(8deg); }
          100% { transform: scale(1) rotate(0); }
        }
      `}</style>
    </div>
  );
};

export default ScanPay;
