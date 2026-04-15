import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Flashlight, Zap, CheckCircle2, Sparkles } from "lucide-react";
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
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
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

    if (scanning) {
      setCameraReady(false);
      startCamera();
    }

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [scanning]);

  // Auto-torch: detect darkness from video feed
  useEffect(() => {
    if (!scanning || !cameraReady) return;

    const checkBrightness = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) return;

      canvas.width = 64;
      canvas.height = 48;
      ctx.drawImage(video, 0, 0, 64, 48);
      const imageData = ctx.getImageData(0, 0, 64, 48);
      const data = imageData.data;

      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 16) {
        totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      const avgBrightness = totalBrightness / (data.length / 16);

      // If average brightness is very low, turn on torch
      if (avgBrightness < 40 && !torchOn && !autoTorchApplied) {
        enableTorch(true);
        setAutoTorchApplied(true);
      } else if (avgBrightness > 80 && torchOn && autoTorchApplied) {
        enableTorch(false);
        setAutoTorchApplied(false);
      }
    };

    brightnessCheckRef.current = setInterval(checkBrightness, 2000);
    return () => {
      if (brightnessCheckRef.current) clearInterval(brightnessCheckRef.current);
    };
  }, [scanning, cameraReady, torchOn, autoTorchApplied]);

  const enableTorch = async (on: boolean) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: on }] });
      setTorchOn(on);
    } catch {
      // Torch not supported
    }
  };

  const toggleTorch = async () => {
    setAutoTorchApplied(false);
    enableTorch(!torchOn);
  };

  const parseUPIString = (upiStr: string): ParsedUPI | null => {
    try {
      const url = new URL(upiStr);
      return {
        pa: url.searchParams.get("pa") || undefined,
        pn: url.searchParams.get("pn") || undefined,
        am: url.searchParams.get("am") || undefined,
        tn: url.searchParams.get("tn") || undefined,
      };
    } catch {
      const params: ParsedUPI = {};
      const parts = upiStr.split("?")[1]?.split("&") || [];
      parts.forEach((p) => {
        const [k, v] = p.split("=");
        if (k === "pa") params.pa = decodeURIComponent(v);
        if (k === "pn") params.pn = decodeURIComponent(v);
        if (k === "am") params.am = decodeURIComponent(v);
      });
      return params.pa ? params : null;
    }
  };

  const handleManualUPI = (input: string) => {
    if (input.includes("upi://pay")) {
      const parsed = parseUPIString(input);
      if (parsed) {
        setParsedUPI(parsed);
        if (parsed.am) setAmount(parsed.am);
        setScanning(false);
      }
    } else if (input.includes("@")) {
      setParsedUPI({ pa: input, pn: input.split("@")[0] });
      setScanning(false);
    }
  };

  const processPayment = async () => {
    if (!parsedUPI?.pa || !amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-scan-payment", {
        body: {
          upi_id: parsedUPI.pa,
          payee_name: parsedUPI.pn,
          amount: parseFloat(amount),
          category,
          note: parsedUPI.tn,
        },
      });
      if (error) throw new Error(error.message || "Payment failed");
      if (data?.error) throw new Error(data.error);
      setSuccess(true);
      haptic.success();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const categories = [
    { value: "food", label: "🍔 Food" },
    { value: "transport", label: "🚗 Transport" },
    { value: "education", label: "📚 Education" },
    { value: "shopping", label: "🛍️ Shopping" },
    { value: "entertainment", label: "🎮 Fun" },
    { value: "other", label: "💸 Other" },
  ];

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-background noise-overlay flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent)" }} />
        </div>

        <div className="animate-scale-in text-center relative z-10">
          {/* Success ring animation */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-success/20 animate-pulse-ring" />
            <div className="absolute inset-0 rounded-full border border-success/10 animate-pulse-ring [animation-delay:0.5s]" />
            <div className="w-24 h-24 rounded-full bg-success/15 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="w-12 h-12 text-success" strokeWidth={1.5} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-success mb-2 animate-slide-up-delay-1">Payment Successful!</h2>
          <p className="text-3xl font-bold mb-1 animate-slide-up-delay-2">₹{amount}</p>
          <p className="text-sm text-muted-foreground animate-slide-up-delay-2">paid to</p>
          <p className="text-base font-semibold mt-1 mb-10 animate-slide-up-delay-3">{parsedUPI?.pn || parsedUPI?.pa}</p>

          <button onClick={() => navigate("/home")} className="w-full h-14 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm animate-slide-up-delay-4 active:scale-[0.97] transition-transform">
            Done
          </button>
        </div>
      </div>
    );
  }

  // Payment confirmation
  if (!scanning && parsedUPI) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6 animate-slide-up">
          <button onClick={() => { setScanning(true); setParsedUPI(null); }} className="w-10 h-10 rounded-full bg-input flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold">Confirm Payment</h1>
        </div>

        {/* Payee Card */}
        <div className="rounded-2xl p-6 mb-6 border border-border card-glow shimmer-border text-center animate-slide-up-delay-1" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 text-xl font-bold text-primary-foreground">
            {(parsedUPI.pn || "M")[0].toUpperCase()}
          </div>
          <p className="text-lg font-semibold mb-0.5">{parsedUPI.pn || "Merchant"}</p>
          <p className="text-xs text-muted-foreground font-mono">{parsedUPI.pa}</p>
        </div>

        {/* Amount Input */}
        <div className="animate-slide-up-delay-2">
          <label className="text-[10px] font-medium tracking-[0.15em] text-muted-foreground mb-2 block uppercase">Amount</label>
          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="input-auro w-full text-3xl font-bold text-center !h-[72px] pl-10"
              autoFocus={!parsedUPI.am}
            />
          </div>
        </div>

        {/* Category */}
        <div className="animate-slide-up-delay-3">
          <label className="text-[10px] font-medium tracking-[0.15em] text-muted-foreground mb-2 block uppercase">Category</label>
          <div className="grid grid-cols-3 gap-2 mb-8">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`py-3 rounded-xl text-xs font-medium transition-all duration-300 active:scale-95 ${
                  category === c.value
                    ? "gradient-primary text-primary-foreground shadow-[0_4px_20px_hsl(42_78%_55%/0.2)]"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/20"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={processPayment}
          disabled={processing || !amount}
          className="w-full h-14 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 animate-slide-up-delay-4 shimmer-border relative overflow-hidden flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Pay ₹{amount || "0"}
            </>
          )}
        </button>
        <button onClick={() => { setScanning(true); setParsedUPI(null); }} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <BottomNav />
      </div>
    );
  }

  // Scanner view
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Camera */}
      <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${cameraReady ? "opacity-100" : "opacity-0"}`} playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark overlay with cutout effect */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(220 20% 4% / 0.7) 0%, hsl(220 20% 4% / 0.3) 30%, hsl(220 20% 4% / 0.3) 70%, hsl(220 20% 4% / 0.85) 100%)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 animate-slide-up">
          <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full bg-background/40 backdrop-blur-xl flex items-center justify-center border border-border/20 active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/30 backdrop-blur-xl border border-border/20">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium tracking-wider uppercase">Scan & Pay</span>
          </div>
          <button
            onClick={toggleTorch}
            className={`w-11 h-11 rounded-full backdrop-blur-xl flex items-center justify-center border transition-all duration-300 active:scale-90 ${
              torchOn ? "bg-primary border-primary shadow-[0_0_20px_hsl(42_78%_55%/0.4)]" : "bg-background/40 border-border/20"
            }`}
          >
            <Flashlight className={`w-5 h-5 transition-colors ${torchOn ? "text-primary-foreground" : ""}`} />
          </button>
        </div>

        {/* Scanner frame */}
        <div className="flex items-center justify-center mt-16 animate-scale-in">
          <div className="w-[260px] h-[260px] relative">
            {/* Animated corner brackets */}
            {[
              "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
              "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute w-10 h-10 border-primary ${cls}`}
                style={{ animation: `corner-glow 2s ease-in-out infinite ${i * 0.5}s` }}
              />
            ))}

            {/* Scanning beam */}
            <div className="absolute left-3 right-3 h-[2px] rounded-full scan-beam" style={{ animation: "scan-beam 2.5s ease-in-out infinite" }}>
              <div className="w-full h-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.8), hsl(42 78% 65%), hsl(42 78% 55% / 0.8), transparent)" }} />
              <div className="absolute inset-x-0 top-0 h-8 -translate-y-full" style={{ background: "linear-gradient(to top, hsl(42 78% 55% / 0.06), transparent)" }} />
            </div>

            {/* Center pulse dot */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mt-8 animate-slide-up-delay-1">
          <p className="text-sm font-medium">Point at any UPI QR code</p>
          <p className="text-[10px] text-muted-foreground mt-1">Torch will auto-enable in dark environments</p>
        </div>

        {/* Bottom panel */}
        <div className="absolute bottom-0 left-0 right-0 animate-slide-up">
          <div className="mx-4 mb-4 p-4 rounded-2xl bg-background/70 backdrop-blur-2xl border border-border/30">
            <p className="text-[10px] text-muted-foreground mb-3 text-center tracking-wider uppercase">Or enter UPI ID manually</p>
            <div className="flex gap-2">
              <input
                placeholder="merchant@upi"
                className="input-auro flex-1 !bg-background/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualUPI((e.target as HTMLInputElement).value);
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>(".input-auro");
                  if (input?.value) handleManualUPI(input.value);
                }}
                className="w-[52px] h-[52px] rounded-2xl gradient-primary flex items-center justify-center active:scale-90 transition-transform"
              >
                <ArrowLeft className="w-5 h-5 text-primary-foreground rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-beam {
          0%, 100% { top: 8px; opacity: 0.4; }
          50% { top: calc(100% - 10px); opacity: 1; }
        }
        @keyframes corner-glow {
          0%, 100% { border-color: hsl(42 78% 55% / 0.5); }
          50% { border-color: hsl(42 78% 55% / 1); }
        }
      `}</style>
    </div>
  );
};

export default ScanPay;
