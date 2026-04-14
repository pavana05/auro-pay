import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Flashlight, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParsedUPI {
  pa?: string; // payee address (UPI ID)
  pn?: string; // payee name
  am?: string; // amount
  tn?: string; // transaction note
}

const ScanPay = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [parsedUPI, setParsedUPI] = useState<ParsedUPI | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
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
        }
      } catch {
        toast.error("Camera access denied. Please allow camera permissions.");
      }
    };

    if (scanning) {
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

  const toggleTorch = async () => {
    if (!streamRef) return;
    const track = streamRef.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      toast.error("Torch not supported on this device");
    }
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
      // Try manual parse
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
    // Support both UPI strings and plain UPI IDs
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      if (!wallet) throw new Error("Wallet not found");

      const amountPaise = Math.round(parseFloat(amount) * 100);

      if (wallet.is_frozen) throw new Error("Wallet is frozen. Contact parent.");
      if ((wallet.balance || 0) < amountPaise) throw new Error("Insufficient balance");
      if ((wallet.spent_today || 0) + amountPaise > (wallet.daily_limit || 50000)) throw new Error("Daily limit exceeded");

      // Create transaction
      const { error: txError } = await supabase.from("transactions").insert({
        wallet_id: wallet.id,
        type: "debit",
        amount: amountPaise,
        merchant_name: parsedUPI.pn || parsedUPI.pa,
        merchant_upi_id: parsedUPI.pa,
        category,
        status: "success",
        description: parsedUPI.tn || `Payment to ${parsedUPI.pn || parsedUPI.pa}`,
      });
      if (txError) throw txError;

      // Update wallet
      await supabase.from("wallets").update({
        balance: (wallet.balance || 0) - amountPaise,
        spent_today: (wallet.spent_today || 0) + amountPaise,
      }).eq("id", wallet.id);

      setSuccess(true);
      if (navigator.vibrate) navigator.vibrate(200);
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
    { value: "entertainment", label: "🎮 Entertainment" },
    { value: "other", label: "💸 Other" },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-background noise-overlay flex flex-col items-center justify-center px-6">
        <div className="animate-fade-in-up text-center">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-[22px] font-semibold text-success mb-2">Payment Successful!</h2>
          <p className="text-sm text-muted-foreground mb-1">₹{amount} paid to</p>
          <p className="text-base font-medium mb-8">{parsedUPI?.pn || parsedUPI?.pa}</p>
          <button onClick={() => navigate("/home")} className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm">
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!scanning && parsedUPI) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setScanning(true); setParsedUPI(null); }} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold">Confirm Payment</h1>
        </div>

        <div className="gradient-card rounded-lg p-5 mb-6 border border-border card-glow text-center">
          <p className="text-xs text-muted-foreground mb-1">PAYING TO</p>
          <p className="text-lg font-semibold mb-1">{parsedUPI.pn || "Merchant"}</p>
          <p className="text-xs text-muted-foreground">{parsedUPI.pa}</p>
        </div>

        <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">AMOUNT (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="input-auro w-full text-2xl font-bold text-center mb-4"
          autoFocus={!parsedUPI.am}
        />

        <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">CATEGORY</label>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                category === c.value
                  ? "gradient-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:border-border-active"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={processPayment}
          disabled={processing || !amount}
          className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {processing ? "Processing..." : `Pay ₹${amount || "0"}`}
        </button>
        <button onClick={() => { setScanning(true); setParsedUPI(null); }} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Camera View */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-background/40">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={toggleTorch} className={`w-10 h-10 rounded-full backdrop-blur flex items-center justify-center ${torchOn ? "bg-primary" : "bg-background/60"}`}>
            <Flashlight className="w-5 h-5" />
          </button>
        </div>

        {/* Scanning Frame */}
        <div className="flex items-center justify-center mt-20">
          <div className="w-64 h-64 relative">
            {/* Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
            {/* Scanning line */}
            <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary/60 animate-[scan_2s_ease-in-out_infinite]" style={{
              animation: "scan 2s ease-in-out infinite",
            }} />
          </div>
        </div>

        <p className="text-center text-sm text-foreground/80 mt-6">Point at any UPI QR code</p>

        {/* Manual Entry Fallback */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 text-center">Or enter UPI ID manually</p>
          <div className="flex gap-2">
            <input
              placeholder="merchant@upi"
              className="input-auro flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualUPI((e.target as HTMLInputElement).value);
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>(".input-auro");
                if (input?.value) handleManualUPI(input.value);
              }}
              className="w-[52px] h-[52px] rounded-[14px] gradient-primary flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-primary-foreground rotate-180" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
      `}</style>
    </div>
  );
};

export default ScanPay;
