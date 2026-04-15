import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Flashlight, Zap, CheckCircle2, Sparkles, ScanLine, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface ParsedUPI {
  pa?: string;
  pn?: string;
  am?: string;
  tn?: string;
}

const ScanPay = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [autoTorchApplied, setAutoTorchApplied] = useState(false);
  const [parsedUPI, setParsedUPI] = useState<ParsedUPI | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const brightnessCheckRef = useRef<ReturnType<typeof setInterval>>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setTimeout(() => setCameraReady(true), 300);
        }
      } catch {
        toast.error("Camera access denied. Please allow camera permissions.");
      }
    };
    if (scanning) { setCameraReady(false); startCamera(); }
    return () => {
      cancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      if (videoRef.current) { videoRef.current.srcObject = null; }
    };
  }, [scanning]);

  useEffect(() => {
    if (!scanning || !cameraReady) return;
    const checkBrightness = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) return;
      canvas.width = 64; canvas.height = 48;
      ctx.drawImage(video, 0, 0, 64, 48);
      const imageData = ctx.getImageData(0, 0, 64, 48);
      const data = imageData.data;
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 16) { totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3; }
      const avgBrightness = totalBrightness / (data.length / 16);
      if (avgBrightness < 40 && !torchOn && !autoTorchApplied) { enableTorch(true); setAutoTorchApplied(true); }
      else if (avgBrightness > 80 && torchOn && autoTorchApplied) { enableTorch(false); setAutoTorchApplied(false); }
    };
    brightnessCheckRef.current = setInterval(checkBrightness, 2000);
    return () => { if (brightnessCheckRef.current) clearInterval(brightnessCheckRef.current); };
  }, [scanning, cameraReady, torchOn, autoTorchApplied]);

  const enableTorch = async (on: boolean) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try { await (track as any).applyConstraints({ advanced: [{ torch: on }] }); setTorchOn(on); } catch {}
  };

  const toggleTorch = async () => { setAutoTorchApplied(false); haptic.light(); enableTorch(!torchOn); };

  const parseUPIString = (upiStr: string): ParsedUPI | null => {
    try {
      const url = new URL(upiStr);
      return { pa: url.searchParams.get("pa") || undefined, pn: url.searchParams.get("pn") || undefined, am: url.searchParams.get("am") || undefined, tn: url.searchParams.get("tn") || undefined };
    } catch {
      const params: ParsedUPI = {};
      const parts = upiStr.split("?")[1]?.split("&") || [];
      parts.forEach((p) => { const [k, v] = p.split("="); if (k === "pa") params.pa = decodeURIComponent(v); if (k === "pn") params.pn = decodeURIComponent(v); if (k === "am") params.am = decodeURIComponent(v); });
      return params.pa ? params : null;
    }
  };

  const handleManualUPI = (input: string) => {
    if (input.includes("upi://pay")) {
      const parsed = parseUPIString(input);
      if (parsed) { setParsedUPI(parsed); if (parsed.am) setAmount(parsed.am); setScanning(false); }
    } else if (input.includes("@")) { setParsedUPI({ pa: input, pn: input.split("@")[0] }); setScanning(false); }
  };

  const processPayment = async () => {
    if (!parsedUPI?.pa || !amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-scan-payment", {
        body: { upi_id: parsedUPI.pa, payee_name: parsedUPI.pn, amount: parseFloat(amount), category, note: parsedUPI.tn },
      });
      if (error) throw new Error(error.message || "Payment failed");
      if (data?.error) throw new Error(data.error);
      setSuccess(true); haptic.success();
    } catch (err: any) { toast.error(err.message || "Payment failed"); }
    finally { setProcessing(false); }
  };

  const categories = [
    { value: "food", label: "🍔 Food" }, { value: "transport", label: "🚗 Transport" },
    { value: "education", label: "📚 Education" }, { value: "shopping", label: "🛍️ Shopping" },
    { value: "entertainment", label: "🎮 Fun" }, { value: "other", label: "💸 Other" },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-background noise-overlay flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent)" }} />
          <div className="absolute bottom-1/3 left-1/4 w-60 h-60 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, hsl(210 80% 55%), transparent)" }} />
        </div>
        <div className="text-center relative z-10" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-[-8px] rounded-full border border-success/10" style={{ animation: "scanner-ring 2s ease-in-out infinite" }} />
            <div className="absolute inset-[-16px] rounded-full border border-success/5" style={{ animation: "scanner-ring 2s ease-in-out 0.5s infinite" }} />
            <div className="w-24 h-24 rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-success" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-success mb-2">Payment Successful!</h2>
          <p className="text-3xl font-bold mb-1">₹{amount}</p>
          <p className="text-sm text-muted-foreground">paid to</p>
          <p className="text-base font-semibold mt-1 mb-10">{parsedUPI?.pn || parsedUPI?.pa}</p>
          <button onClick={() => navigate("/home")} className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-transform">Done</button>
        </div>
      </div>
    );
  }

  if (!scanning && parsedUPI) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <button onClick={() => { setScanning(true); setParsedUPI(null); }} className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold">Confirm Payment</h1>
        </div>

        <div className="rounded-2xl p-6 mb-6 border border-white/[0.06] text-center shimmer-border" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both" }}>
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary-foreground shadow-[0_4px_20px_hsl(42_78%_55%/0.3)]">
            {(parsedUPI.pn || "M")[0].toUpperCase()}
          </div>
          <p className="text-lg font-semibold mb-0.5">{parsedUPI.pn || "Merchant"}</p>
          <p className="text-xs text-muted-foreground font-mono">{parsedUPI.pa}</p>
        </div>

        <div style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.16s both" }}>
          <label className="text-[10px] font-medium tracking-[0.15em] text-muted-foreground mb-2 block uppercase">Amount</label>
          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              className="input-auro w-full text-3xl font-bold text-center !h-[72px] pl-10" autoFocus={!parsedUPI.am} />
          </div>
        </div>

        <div style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.24s both" }}>
          <label className="text-[10px] font-medium tracking-[0.15em] text-muted-foreground mb-2 block uppercase">Category</label>
          <div className="grid grid-cols-3 gap-2 mb-8">
            {categories.map((c) => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className={`py-3 rounded-xl text-xs font-medium transition-all duration-300 active:scale-95 ${
                  category === c.value
                    ? "gradient-primary text-primary-foreground shadow-[0_4px_20px_hsl(42_78%_55%/0.2)]"
                    : "bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:border-primary/20"
                }`}>{c.label}</button>
            ))}
          </div>
        </div>

        <button onClick={processPayment} disabled={processing || !amount}
          className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 shimmer-border relative overflow-hidden flex items-center justify-center gap-2"
          style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.32s both" }}>
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Processing...
            </div>
          ) : (<><Zap className="w-4 h-4" /> Pay ₹{amount || "0"}</>)}
        </button>
        <button onClick={() => { setScanning(true); setParsedUPI(null); }} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <BottomNav />
      </div>
    );
  }

  // Premium Scanner view
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${cameraReady ? "opacity-100" : "opacity-0"}`} playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Cinematic overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(220 20% 4% / 0.75) 0%, hsl(220 20% 4% / 0.2) 25%, hsl(220 20% 4% / 0.2) 65%, hsl(220 20% 4% / 0.9) 100%)" }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <button onClick={() => { haptic.light(); navigate("/home"); }}
            className="w-11 h-11 rounded-full bg-white/[0.06] backdrop-blur-2xl flex items-center justify-center border border-white/[0.1] active:scale-90 transition-all hover:bg-white/[0.1]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1]">
            <div className="relative">
              <ScanLine className="w-3.5 h-3.5 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: "glow-pulse 1.5s ease-in-out infinite" }} />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase">Scan & Pay</span>
          </div>
          <button onClick={toggleTorch}
            className={`w-11 h-11 rounded-full backdrop-blur-2xl flex items-center justify-center border transition-all duration-300 active:scale-90 ${
              torchOn ? "bg-primary border-primary/60 shadow-[0_0_24px_hsl(42_78%_55%/0.5)]" : "bg-white/[0.06] border-white/[0.1]"
            }`}>
            <Flashlight className={`w-5 h-5 transition-colors ${torchOn ? "text-primary-foreground" : ""}`} />
          </button>
        </div>

        {/* Scanner frame - premium design */}
        <div className="flex items-center justify-center mt-12" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both" }}>
          <div className="w-[270px] h-[270px] relative">
            {/* Outer glow ring */}
            <div className="absolute inset-[-20px] rounded-3xl border border-primary/[0.08]" style={{ animation: "scanner-ring 3s ease-in-out infinite" }} />
            <div className="absolute inset-[-10px] rounded-2xl border border-primary/[0.04]" style={{ animation: "scanner-ring 3s ease-in-out 1s infinite" }} />

            {/* Grid overlay for depth */}
            <div className="absolute inset-3 rounded-xl pointer-events-none" style={{
              backgroundImage: `linear-gradient(hsl(42 78% 55% / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(42 78% 55% / 0.03) 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
              animation: "scanner-grid-pulse 4s ease-in-out infinite",
            }} />

            {/* Animated corner brackets with glow */}
            {[
              "top-0 left-0 border-t-[2.5px] border-l-[2.5px] rounded-tl-2xl",
              "top-0 right-0 border-t-[2.5px] border-r-[2.5px] rounded-tr-2xl",
              "bottom-0 left-0 border-b-[2.5px] border-l-[2.5px] rounded-bl-2xl",
              "bottom-0 right-0 border-b-[2.5px] border-r-[2.5px] rounded-br-2xl",
            ].map((cls, i) => (
              <div key={i} className={`absolute w-12 h-12 ${cls}`}
                style={{ animation: `scanner-corner-pulse 2.5s ease-in-out infinite ${i * 0.4}s`, borderColor: "hsl(42 78% 55% / 0.6)" }} />
            ))}

            {/* Primary scanning beam with gradient trail */}
            <div className="absolute left-4 right-4 h-[2px] rounded-full" style={{ animation: "scanner-sweep 2.8s ease-in-out infinite" }}>
              <div className="w-full h-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.6), hsl(42 78% 65%), hsl(42 78% 55% / 0.6), transparent)" }} />
              <div className="absolute inset-x-0 top-0 h-16 -translate-y-full" style={{ background: "linear-gradient(to top, hsl(42 78% 55% / 0.08), transparent)" }} />
              <div className="absolute inset-x-0 bottom-0 h-6 translate-y-full" style={{ background: "linear-gradient(to bottom, hsl(42 78% 55% / 0.04), transparent)" }} />
              {/* Sparkles at beam endpoints */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/60" style={{ animation: "sparkle-twinkle 1.5s ease-in-out infinite", boxShadow: "0 0 6px hsl(42 78% 55% / 0.5)" }} />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/60" style={{ animation: "sparkle-twinkle 1.5s ease-in-out 0.5s infinite", boxShadow: "0 0 6px hsl(42 78% 55% / 0.5)" }} />
            </div>

            {/* Secondary thinner beam */}
            <div className="absolute left-6 right-6 h-[1px] rounded-full" style={{ animation: "scanner-sweep 2.8s ease-in-out 0.4s infinite", opacity: 0.4 }}>
              <div className="w-full h-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.3), transparent)" }} />
            </div>

            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-primary/20 border border-primary/30" style={{ animation: "glow-pulse 2s ease-in-out infinite" }} />
                <div className="absolute inset-[-4px] rounded-full border border-primary/10" style={{ animation: "scanner-ring 2s ease-in-out infinite" }} />
              </div>
            </div>

            {/* Primary orbiting dot */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50" style={{ animation: "scanner-dot-orbit 8s linear infinite", boxShadow: "0 0 8px hsl(42 78% 55% / 0.4)" }} />
            </div>

            {/* Secondary orbiting dot (opposite direction) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1 h-1 rounded-full bg-primary/30" style={{ animation: "scanner-dot-orbit-reverse 12s linear infinite", boxShadow: "0 0 6px hsl(42 78% 55% / 0.3)" }} />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mt-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Radio className="w-3.5 h-3.5 text-primary" style={{ animation: "glow-pulse 1.5s ease-in-out infinite" }} />
            <p className="text-sm font-medium">Point at any UPI QR code</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Auto-torch activates in dark environments</p>
        </div>

        {/* Bottom panel - premium glassmorphism */}
        <div className="absolute bottom-0 left-0 right-0" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" }}>
          <div className="mx-4 mb-4 p-5 rounded-3xl bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_-8px_40px_hsl(220_20%_4%/0.5)]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase font-medium">Or enter UPI ID manually</p>
            </div>
            <div className="flex gap-2">
              <input placeholder="merchant@upi"
                className="flex-1 h-[50px] rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.1)] outline-none transition-all"
                onKeyDown={(e) => { if (e.key === "Enter") handleManualUPI((e.target as HTMLInputElement).value); }}
              />
              <button onClick={() => { const input = document.querySelector<HTMLInputElement>("input[placeholder='merchant@upi']"); if (input?.value) handleManualUPI(input.value); }}
                className="w-[50px] h-[50px] rounded-2xl gradient-primary flex items-center justify-center active:scale-90 transition-transform shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]">
                <ArrowLeft className="w-5 h-5 text-primary-foreground rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanPay;
