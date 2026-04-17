import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2,
  XCircle, AlertCircle, Copy, Check, Share2, MapPin, Tag, Receipt,
  Download, FileText, Image, Shield, RotateCw, Users, Gift,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface TransactionDetail {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  merchant_upi_id: string | null;
  category: string | null;
  status: string | null;
  description: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  created_at: string | null;
  wallet_id: string;
}

const categoryIcons: Record<string, string> = {
  food: "🍔", transport: "🚗", education: "📚", shopping: "🛍️",
  entertainment: "🎮", other: "💸", transfer: "💰", recharge: "📱",
};

// Status-based theme system
const statusThemes = {
  success: {
    icon: CheckCircle2,
    label: "Successful",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    hue: 152,
    sat: 60,
    light: 45,
    accent: "emerald",
    cardGradient: "linear-gradient(160deg, hsl(152 50% 18% / 0.25) 0%, hsl(152 30% 10% / 0.15) 30%, hsl(220 15% 6%) 60%, hsl(220 15% 7%) 100%)",
    glowColor: "hsl(152 60% 45% / 0.08)",
    shimmerColor: "hsl(152 60% 45% / 0.5)",
    particleHue: "152",
    borderGlow: "0 0 30px hsl(152 60% 45% / 0.12), inset 0 1px 0 hsl(152 60% 45% / 0.1)",
    amountColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
    iconGlow: "shadow-[0_0_25px_hsl(152_60%_45%/0.2)]",
    badgeBorder: "border-emerald-400/20",
    detailIconBg: "bg-emerald-400/[0.06]",
    actionAccentBg: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/15",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    hue: 38,
    sat: 92,
    light: 50,
    accent: "amber",
    cardGradient: "linear-gradient(160deg, hsl(38 60% 22% / 0.2) 0%, hsl(38 40% 12% / 0.12) 30%, hsl(220 15% 6%) 60%, hsl(220 15% 7%) 100%)",
    glowColor: "hsl(38 92% 50% / 0.08)",
    shimmerColor: "hsl(38 92% 50% / 0.5)",
    particleHue: "38",
    borderGlow: "0 0 30px hsl(38 92% 50% / 0.12), inset 0 1px 0 hsl(38 92% 50% / 0.1)",
    amountColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    iconGlow: "shadow-[0_0_25px_hsl(38_92%_50%/0.2)]",
    badgeBorder: "border-amber-400/20",
    detailIconBg: "bg-amber-400/[0.06]",
    actionAccentBg: "bg-amber-400/10 border-amber-400/20 text-amber-400 hover:bg-amber-400/15",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-400/10",
    hue: 0,
    sat: 72,
    light: 51,
    accent: "red",
    cardGradient: "linear-gradient(160deg, hsl(0 50% 20% / 0.2) 0%, hsl(0 30% 12% / 0.12) 30%, hsl(220 15% 6%) 60%, hsl(220 15% 7%) 100%)",
    glowColor: "hsl(0 72% 51% / 0.08)",
    shimmerColor: "hsl(0 72% 51% / 0.5)",
    particleHue: "0",
    borderGlow: "0 0 30px hsl(0 72% 51% / 0.12), inset 0 1px 0 hsl(0 72% 51% / 0.1)",
    amountColor: "text-red-400",
    iconBg: "bg-red-400/10",
    iconGlow: "shadow-[0_0_25px_hsl(0_72%_51%/0.2)]",
    badgeBorder: "border-red-400/20",
    detailIconBg: "bg-red-400/[0.06]",
    actionAccentBg: "bg-red-400/10 border-red-400/20 text-red-400 hover:bg-red-400/15",
  },
};

const TransactionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [amountTapped, setAmountTapped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [scratchCard, setScratchCard] = useState<{ id: string; is_scratched: boolean; reward_value: number | null } | null>(null);

  // Memoize random values so they don't regenerate on re-render
  const particles = useMemo(() => ({
    stars: Array.from({ length: 18 }, () => ({
      w: 1 + Math.random() * 2, left: Math.random() * 100, topOff: Math.random() * 20,
      lightness: 55 + Math.random() * 20, shadowSize: 3 + Math.random() * 4,
      shadowAlpha: 0.3 + Math.random() * 0.4, dur: 4 + Math.random() * 6,
      delay: Math.random() * 5, opacity: 0.3 + Math.random() * 0.5,
    })),
    comets: Array.from({ length: 3 }, (_, i) => ({
      w: 60 + Math.random() * 80, left: 10 + Math.random() * 60,
      dur: 5 + i * 2.5, delay: i * 3,
    })),
    floaters: Array.from({ length: 12 }, (_, i) => ({
      w: 2 + Math.random() * 3, left: Math.random() * 100, top: Math.random() * 100,
      variant: i % 3, shadowSize: 6 + Math.random() * 8,
      dur1: 6 + Math.random() * 8, dur2: 3 + Math.random() * 3,
      delay1: Math.random() * 4, delay2: Math.random() * 2,
    })),
    sparkles: Array.from({ length: 25 }, () => ({
      left: Math.random() * 100, top: Math.random() * 100,
      dur: 2 + Math.random() * 3, delay: Math.random() * 3,
    })),
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("transactions").select("*").eq("id", id).single();
      if (data) setTx(data as unknown as TransactionDetail);
      // Fetch scratch card if any
      if (id) {
        const { data: sc } = await supabase
          .from("scratch_cards")
          .select("id,is_scratched,reward_value")
          .eq("transaction_id", id)
          .maybeSingle();
        if (sc) setScratchCard(sc as any);
      }
      setLoading(false);
      setTimeout(() => setMounted(true), 50);
    };
    fetchData();
  }, [id]);

  const copyId = () => {
    if (!tx) return;
    navigator.clipboard.writeText(tx.razorpay_payment_id || tx.id);
    setCopied(true);
    haptic.light();
    toast.success("Transaction ID copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const generateReceiptCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const w = 800, h = 1100;
    canvas.width = w; canvas.height = h;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0f1115"); bg.addColorStop(1, "#0a0c0f");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const gold = ctx.createLinearGradient(100, 0, w - 100, 0);
    gold.addColorStop(0, "transparent"); gold.addColorStop(0.5, "#c8952e"); gold.addColorStop(1, "transparent");
    ctx.strokeStyle = gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, 80); ctx.lineTo(w - 100, 80); ctx.stroke();
    ctx.fillStyle = "#c8952e"; ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillText("AUROPAY", w / 2, 55);
    ctx.fillStyle = "#888"; ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("Transaction Receipt", w / 2, 110);
    if (!tx) return canvas;
    const isCredit = tx.type === "credit";
    const date = tx.created_at ? new Date(tx.created_at) : new Date();
    const sts = tx.status || "pending";
    ctx.fillStyle = isCredit ? "#4ade80" : "#f0f0f0";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillText(`${isCredit ? "+" : ""}${formatAmount(tx.amount)}`, w / 2, 200);
    ctx.fillStyle = sts === "success" ? "#065f46" : sts === "failed" ? "#7f1d1d" : "#78350f";
    const badgeW = 140, badgeH = 32, badgeX = (w - badgeW) / 2, badgeY = 225;
    ctx.beginPath(); ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16); ctx.fill();
    ctx.fillStyle = sts === "success" ? "#4ade80" : sts === "failed" ? "#f87171" : "#fbbf24";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(statusThemes[sts as keyof typeof statusThemes]?.label || sts, w / 2, badgeY + 22);
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 290); ctx.lineTo(w - 60, 290); ctx.stroke();
    const details = [
      ["Date & Time", date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + " at " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })],
      ["Type", isCredit ? "Money Received" : "Money Sent"],
      ["Merchant", tx.merchant_name || "—"],
      ["Category", (tx.category || "other").charAt(0).toUpperCase() + (tx.category || "other").slice(1)],
      ...(tx.merchant_upi_id ? [["UPI ID", tx.merchant_upi_id]] : []),
      ...(tx.description ? [["Note", tx.description]] : []),
      ["Reference ID", tx.razorpay_payment_id || tx.id],
      ...(tx.razorpay_order_id ? [["Order ID", tx.razorpay_order_id]] : []),
    ];
    let y = 330;
    details.forEach(([label, value]) => {
      ctx.textAlign = "left"; ctx.fillStyle = "#666"; ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(label, 80, y);
      ctx.fillStyle = "#e0e0e0"; ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(value.length > 40 ? value.slice(0, 37) + "..." : value, 80, y + 22);
      y += 60;
    });
    ctx.strokeStyle = "#222";
    ctx.beginPath(); ctx.moveTo(60, h - 120); ctx.lineTo(w - 60, h - 120); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#555"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("This is a computer-generated receipt. No signature required.", w / 2, h - 80);
    ctx.fillStyle = "#c8952e"; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Powered by AuroPay", w / 2, h - 50);
    return canvas;
  };

  const downloadAsImage = async () => {
    haptic.medium(); toast.loading("Generating receipt...");
    try {
      const canvas = await generateReceiptCanvas();
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a"); a.href = url;
      a.download = `AuroPay_Receipt_${tx?.id?.slice(0, 8)}.png`; a.click();
      toast.dismiss(); toast.success("Receipt downloaded!");
    } catch { toast.dismiss(); toast.error("Failed to generate receipt"); }
    setShowDownload(false);
  };

  const downloadAsPDF = async () => {
    haptic.medium(); toast.loading("Generating PDF...");
    try {
      const canvas = await generateReceiptCanvas();
      const imgData = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`<html><head><title>AuroPay Receipt</title><style>body{margin:0;display:flex;justify-content:center;background:#000;}img{max-width:100%;height:auto;}</style></head><body><img src="${imgData}" /><script>setTimeout(()=>{window.print();},500);</script></body></html>`);
        printWindow.document.close();
      }
      toast.dismiss(); toast.success("PDF ready to print/save!");
    } catch { toast.dismiss(); toast.error("Failed to generate PDF"); }
    setShowDownload(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          <div className="absolute inset-2 w-10 h-10 rounded-full border border-primary/10 border-t-primary/30 animate-spin" style={{ animationDuration: "2s" }} />
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Transaction not found</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm font-medium">Go back</button>
      </div>
    );
  }

  const txStatus = tx.status || "pending";
  const theme = statusThemes[txStatus as keyof typeof statusThemes] || statusThemes.pending;
  const StatusIcon = theme.icon;
  const isCredit = tx.type === "credit";
  const date = tx.created_at ? new Date(tx.created_at) : new Date();

  const detailItems = [
    { icon: Clock, label: "Date & Time", value: date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + " at " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
    { icon: isCredit ? ArrowDownLeft : ArrowUpRight, label: "Type", value: isCredit ? "Money Received" : "Money Sent" },
    ...(tx.category ? [{ icon: Tag, label: "Category", value: `${categoryIcons[tx.category] || "💸"} ${tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}` }] : []),
    ...(tx.merchant_upi_id ? [{ icon: MapPin, label: "UPI ID", value: tx.merchant_upi_id }] : []),
    ...(tx.description ? [{ icon: Receipt, label: "Note", value: tx.description }] : []),
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Status-themed ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.glowColor}, transparent 70%)` }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.glowColor}, transparent 70%)`, opacity: 0.4 }} />
      </div>

      {/* Header with themed accent */}
      <div className="sticky top-0 z-20 backdrop-blur-2xl border-b border-border/30 px-4 py-3 flex items-center gap-3"
        style={{ background: "linear-gradient(180deg, hsl(220 20% 4% / 0.95), hsl(220 20% 4% / 0.8))" }}>
        {/* Themed top line */}
        <div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent, ${theme.shimmerColor}, transparent)`, opacity: 0.6 }} />
        <button onClick={() => { haptic.light(); navigate(-1); }}
          className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white/[0.08]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">Transaction Details</h1>
        <div className={`w-2 h-2 rounded-full ${theme.bg} mr-1`}
          style={{ boxShadow: `0 0 8px ${theme.shimmerColor}`, animation: "glow-pulse 2s ease-in-out infinite" }} />
        <button onClick={() => { haptic.light(); setShowDownload(true); }}
          className={`w-9 h-9 rounded-full ${theme.detailIconBg} border border-white/[0.08] flex items-center justify-center active:scale-90 transition-all duration-200`}>
          <Download className={`w-4 h-4 ${theme.color}`} />
        </button>
      </div>

      <div className="px-5 pt-6 pb-12 space-y-5 relative z-10">
        {/* Hero Amount Card — status-themed */}
        <div
          className={`relative overflow-hidden rounded-3xl border border-white/[0.06] p-8 text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}
          style={{
            background: theme.cardGradient,
            boxShadow: theme.borderGlow,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>

          {/* Falling Stars — themed */}
          {particles.stars.map((s, i) => (
            <div key={`star-${i}`} className="absolute rounded-full"
              style={{
                width: `${s.w}px`, height: `${s.w}px`,
                left: `${s.left}%`, top: `-${s.topOff}%`,
                background: `hsl(${theme.hue} ${theme.sat}% ${s.lightness}%)`,
                boxShadow: `0 0 ${s.shadowSize}px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / ${s.shadowAlpha})`,
                animation: `star-fall ${s.dur}s linear ${s.delay}s infinite`,
                opacity: s.opacity,
              }}
            />
          ))}

          {/* Comets — diagonal top-left to bottom-right */}
          {particles.comets.map((c, i) => (
            <div key={`comet-${i}`} className="absolute"
              style={{
                left: '-10%',
                top: `-5%`,
                height: '2px',
                transform: 'rotate(35deg)',
                transformOrigin: '0 0',
                animation: `comet-diagonal ${2.2 + i * 0.8}s linear ${c.delay}s infinite`,
              }}>
              {/* Comet head */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full"
                style={{
                  background: `hsl(${theme.hue} ${theme.sat}% ${theme.light + 25}%)`,
                  color: `hsl(${theme.hue} ${theme.sat}% ${theme.light + 15}%)`,
                  animation: `comet-head-glow 0.8s ease-in-out infinite`,
                }} />
              {/* Comet tail */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.1) 20%, hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.4) 60%, hsl(${theme.hue} ${theme.sat}% ${theme.light + 20}% / 0.9) 100%)`,
                  filter: `blur(0.3px) drop-shadow(0 0 4px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.4))`,
                }} />
            </div>
          ))}

          {/* Floating Light Particles — themed */}
          {particles.floaters.map((f, i) => (
            <div key={`particle-${i}`} className="absolute rounded-full"
              style={{
                width: `${f.w}px`, height: `${f.w}px`,
                left: `${f.left}%`, top: `${f.top}%`,
                background: f.variant === 2
                  ? `hsl(${(theme.hue + 160) % 360} 60% 65%)`
                  : `hsl(${theme.hue} ${theme.sat - f.variant * 18}% ${55 + f.variant * 10}%)`,
                boxShadow: `0 0 ${f.shadowSize}px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.4)`,
                animation: `particle-float ${f.dur1}s ease-in-out ${f.delay1}s infinite, glow-pulse ${f.dur2}s ease-in-out ${f.delay2}s infinite, parallax-drift ${f.dur1 + 4}s ease-in-out ${f.delay1}s infinite`,
              }}
            />
          ))}

          {/* Sparkle Dots — themed */}
          {particles.sparkles.map((sp, i) => (
            <div key={`sparkle-${i}`} className="absolute rounded-full"
              style={{
                width: '1px', height: '1px',
                left: `${sp.left}%`, top: `${sp.top}%`,
                background: `hsl(${theme.hue} ${theme.sat}% 70%)`,
                boxShadow: `0 0 3px hsl(${theme.hue} ${theme.sat}% 65% / 0.5)`,
                animation: `sparkle-twinkle ${sp.dur}s ease-in-out ${sp.delay}s infinite`,
              }}
            />
          ))}

          {/* Pulsing corner accents */}
          <div className="absolute top-4 right-5 w-1.5 h-1.5 rounded-full"
            style={{ background: `hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.4)`, animation: "glow-pulse 2s ease-in-out infinite" }} />
          <div className="absolute bottom-8 left-8 w-1 h-1 rounded-full"
            style={{ background: `hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.3)`, animation: "glow-pulse 2.5s ease-in-out 0.5s infinite" }} />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-white/20"
            style={{ animation: "glow-pulse 3s ease-in-out 1s infinite" }} />

          {/* Top shimmer line — themed */}
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.shimmerColor}, transparent)` }} />
          {/* Bottom subtle shimmer */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.shimmerColor}, transparent)`, opacity: 0.3 }} />

          <div className="relative z-10">
            {/* Category Icon with status-themed ring */}
            <div className="relative w-22 h-22 mx-auto mb-6" style={{ width: 88, height: 88 }}>
              {/* Outer pulsing ring */}
              <div className={`absolute -inset-2 rounded-2xl ${theme.iconBg}`}
                style={{ animation: "glow-pulse 3s ease-in-out infinite", boxShadow: `0 0 30px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.15)` }} />
              {/* Static gradient border */}
               <div className="absolute -inset-[1px] rounded-2xl"
                style={{
                  background: `conic-gradient(from 135deg, transparent 20%, hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.25) 40%, hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.35) 50%, hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.25) 60%, transparent 80%)`,
                }} />
              <div className={`relative w-full h-full rounded-2xl flex items-center justify-center ${theme.iconBg} backdrop-blur-sm`}
                style={{ animation: mounted ? "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both" : "none" }}>
                <span className="text-4xl">{categoryIcons[tx.category || "other"]}</span>
              </div>
            </div>

            {/* Amount — tappable with gold pulse */}
            <p className={`text-[42px] font-bold mb-2 tracking-tight ${theme.amountColor} cursor-pointer select-none transition-transform duration-300`}
              onClick={() => { haptic.light(); setAmountTapped(true); setTimeout(() => setAmountTapped(false), 600); }}
              style={{
                animation: mounted
                  ? amountTapped
                    ? "amount-pulse 0.6s cubic-bezier(0.22, 1, 0.36, 1) both"
                    : "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both"
                  : "none",
                textShadow: amountTapped
                  ? `0 0 60px hsl(42 78% 55% / 0.5), 0 0 120px hsl(42 78% 55% / 0.2)`
                  : `0 0 40px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.2)`,
              }}>
              {isCredit ? "+" : ""}{formatAmount(tx.amount)}
            </p>

            <p className="text-sm text-muted-foreground/80"
              style={{ animation: mounted ? "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both" : "none" }}>
              {tx.merchant_name || tx.description || "Transaction"}
            </p>

            {/* Status badge — haptic pulse entrance */}
            <div className={`inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full ${theme.bg} backdrop-blur-sm border ${theme.badgeBorder}`}
              style={{
                animation: mounted ? "badge-haptic 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both" : "none",
                boxShadow: `0 0 20px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.1)`,
              }}>
              <StatusIcon className={`w-4 h-4 ${theme.color}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.color}`}>{theme.label}</span>
            </div>
          </div>
        </div>

        {/* Details Grid — glass card with themed accents */}
        <div className={`relative overflow-hidden backdrop-blur-xl border border-white/[0.06] rounded-2xl transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{
            transitionDelay: "0.3s",
            background: "linear-gradient(180deg, hsl(220 15% 8% / 0.8), hsl(220 15% 6% / 0.9))",
          }}>
          {/* Top themed line */}
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.shimmerColor}, transparent)`, opacity: 0.4 }} />

          {detailItems.map((item, i) => (
            <div key={i}
              className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-all duration-300 group"
              style={{ animation: mounted ? `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + i * 0.06}s both` : "none" }}>
              <div className={`w-10 h-10 rounded-xl ${theme.detailIconBg} flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105`}
                style={{ boxShadow: `0 0 12px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.06)` }}>
                <item.icon className={`w-4 h-4 ${theme.color} opacity-70`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">{item.label}</p>
                <p className="text-sm font-medium truncate mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Reference — themed card with shimmer sweep */}
        <div className={`relative overflow-hidden backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{
            transitionDelay: "0.5s",
            background: "linear-gradient(180deg, hsl(220 15% 8% / 0.8), hsl(220 15% 6% / 0.9))",
          }}>
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.shimmerColor}, transparent)`, opacity: 0.3 }} />
          {/* Shimmer sweep overlay */}
          {mounted && (
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(105deg, transparent 40%, hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.06) 45%, hsl(${theme.hue} ${theme.sat}% ${theme.light + 15}% / 0.1) 50%, hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.06) 55%, transparent 60%)`,
                backgroundSize: '250% 100%',
                animation: 'ref-shimmer-sweep 1.5s ease-in-out 0.8s both',
              }} />
          )}

          <div className="flex items-center gap-2 mb-3">
            <Shield className={`w-3.5 h-3.5 ${theme.color} opacity-60`} />
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">Transaction Reference</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-muted-foreground bg-white/[0.03] border border-white/[0.04] px-3 py-3 rounded-xl truncate">
              {tx.razorpay_payment_id || tx.id}
            </code>
            <button onClick={copyId}
              className={`w-11 h-11 rounded-xl ${theme.detailIconBg} border border-white/[0.06] flex items-center justify-center active:scale-90 transition-all duration-200 shrink-0`}>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className={`w-4 h-4 ${theme.color} opacity-70`} />}
            </button>
          </div>
          {tx.razorpay_order_id && (
            <p className="text-[10px] text-muted-foreground/40 mt-3 font-mono">Order: {tx.razorpay_order_id}</p>
          )}
        </div>

        {/* Status Timeline */}
        <div className={`relative overflow-hidden backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "0.55s", background: "linear-gradient(180deg, hsl(220 15% 8% / 0.8), hsl(220 15% 6% / 0.9))" }}>
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.shimmerColor}, transparent)`, opacity: 0.3 }} />
          <div className="flex items-center gap-2 mb-4">
            <Clock className={`w-3.5 h-3.5 ${theme.color} opacity-60`} />
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">Timeline</p>
          </div>
          <div className="relative pl-1">
            {[
              { label: "Initiated", time: date, done: true },
              { label: "Processing", time: date, done: txStatus !== "pending" || true },
              { label: txStatus === "failed" ? "Failed" : txStatus === "success" ? "Completed" : "Pending confirmation", time: txStatus === "pending" ? null : date, done: txStatus === "success", failed: txStatus === "failed" },
            ].map((step, i, arr) => (
              <div key={i} className="flex gap-3 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 ${step.failed ? "bg-red-400 border-red-400" : step.done ? `bg-current ${theme.color} border-current` : "bg-transparent border-white/20"} relative z-10`}
                    style={step.done && !step.failed ? { boxShadow: `0 0 10px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.5)` } : {}} />
                  {i < arr.length - 1 && (
                    <div className="w-[2px] flex-1 min-h-[28px] my-1"
                      style={{ background: step.done ? `hsl(${theme.hue} ${theme.sat}% ${theme.light}% / 0.3)` : "hsl(0 0% 100% / 0.06)" }} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className={`text-[13px] font-medium ${step.failed ? "text-red-400" : step.done ? "text-foreground" : "text-muted-foreground/50"}`}>{step.label}</p>
                  {step.time && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{step.time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scratch card reveal banner */}
        {scratchCard && !scratchCard.is_scratched && (
          <button
            onClick={() => { haptic.medium(); navigate("/scratch-cards"); }}
            className={`relative overflow-hidden w-full rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all duration-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{
              transitionDelay: "0.58s",
              background: "linear-gradient(135deg, hsl(42 78% 55% / 0.18), hsl(42 78% 35% / 0.08))",
              border: "1px solid hsl(42 78% 55% / 0.25)",
              boxShadow: "0 0 30px hsl(42 78% 55% / 0.15)",
            }}>
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl shrink-0">🎁</div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-primary">Scratch card unlocked!</p>
              <p className="text-[11px] text-muted-foreground">Tap to reveal your reward</p>
            </div>
            <div className="text-primary text-xs font-semibold">Open →</div>
          </button>
        )}

        {/* Primary actions — Pay again / Split bill / Dispute */}
        <div className={`grid grid-cols-3 gap-3 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "0.6s" }}>
          {[
            {
              icon: RotateCw, label: "Pay again", accent: true,
              onClick: () => {
                haptic.medium();
                const params = new URLSearchParams({
                  amount: String(tx.amount / 100),
                  ...(tx.merchant_name ? { name: tx.merchant_name } : {}),
                  ...(tx.merchant_upi_id ? { upi: tx.merchant_upi_id } : {}),
                });
                navigate(`/quick-pay?${params.toString()}`);
              },
            },
            {
              icon: Users, label: "Split bill", accent: false,
              onClick: () => {
                haptic.light();
                const params = new URLSearchParams({
                  amount: String(tx.amount / 100),
                  ...(tx.merchant_name ? { title: tx.merchant_name } : {}),
                  ...(tx.category ? { category: tx.category } : {}),
                });
                navigate(`/bill-split?${params.toString()}`);
              },
            },
            {
              icon: AlertCircle, label: "Dispute", accent: false,
              onClick: () => { haptic.light(); setShowReport(true); setReportSubmitted(false); setReportReason(""); },
            },
          ].map((action, i) => (
            <button key={action.label} onClick={action.onClick}
              className={`flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl text-xs font-semibold active:scale-[0.95] transition-all duration-200 ${
                action.accent
                  ? theme.actionAccentBg
                  : "bg-white/[0.03] border border-white/[0.06] text-foreground hover:bg-white/[0.05]"
              }`}
              style={{ animation: mounted ? `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.65 + i * 0.06}s both` : "none" }}>
              <action.icon className={`w-5 h-5 ${action.accent ? theme.color : "text-muted-foreground"}`} />
              {action.label}
            </button>
          ))}
        </div>

        {/* Secondary actions — Receipt + Share */}
        <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "0.7s" }}>
          {[
            { icon: Download, label: "Download receipt", onClick: () => { haptic.light(); setShowDownload(true); } },
            { icon: Share2, label: "Share", onClick: () => { haptic.light(); navigator.share?.({ text: `₹${(tx.amount/100).toFixed(2)} ${isCredit ? "received from" : "paid to"} ${tx.merchant_name || "someone"} via AuroPay` }).catch(() => {}); } },
          ].map((action) => (
            <button key={action.label} onClick={action.onClick}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-medium bg-white/[0.02] border border-white/[0.05] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground active:scale-[0.97] transition-all duration-200">
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Download Modal */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowDownload(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" style={{ animation: "fade-in 0.2s ease-out" }} />
          <div className="relative w-full max-w-lg rounded-t-3xl border-t border-white/[0.08] p-6"
            style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            onClick={e => e.stopPropagation()}>
            {/* Themed top accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: `linear-gradient(90deg, transparent, ${theme.shimmerColor}, transparent)` }} />
            <div className="w-10 h-1 bg-white/[0.1] rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-1">Download Receipt</h2>
            <p className="text-[11px] text-muted-foreground mb-5">Choose your preferred format</p>
            <div className="space-y-3">
              {[
                { fn: downloadAsImage, icon: Image, title: "Download as Image", sub: "PNG format · Easy to share" },
                { fn: downloadAsPDF, icon: FileText, title: "Save as PDF", sub: "Print-ready format" },
              ].map((opt, i) => (
                <button key={opt.title} onClick={opt.fn}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] active:scale-[0.98] transition-all duration-200 hover:bg-white/[0.05] hover:border-white/[0.1]"
                  style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.08}s both` }}>
                  <div className={`w-12 h-12 rounded-xl ${theme.detailIconBg} flex items-center justify-center`}>
                    <opt.icon className={`w-6 h-6 ${theme.color}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{opt.title}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowReport(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" style={{ animation: "fade-in 0.2s ease-out" }} />
          <div className="relative w-full max-w-lg rounded-t-3xl border-t border-white/[0.08] p-6"
            style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, hsl(0 72% 51% / 0.5), transparent)" }} />
            <div className="w-10 h-1 bg-white/[0.1] rounded-full mx-auto mb-5" />

            {reportSubmitted ? (
              <div className="text-center py-6" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-[16px] font-bold mb-1">Report Submitted</h2>
                <p className="text-[12px] text-muted-foreground mb-5">We'll review your report and get back to you within 24-48 hours.</p>
                <button onClick={() => setShowReport(false)}
                  className="px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm font-semibold active:scale-95 transition-all">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold">Report Transaction</h2>
                    <p className="text-[11px] text-muted-foreground">Tell us what went wrong</p>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  {[
                    { key: "unauthorized", label: "Unauthorized transaction", icon: "🚫" },
                    { key: "wrong_amount", label: "Wrong amount charged", icon: "💰" },
                    { key: "not_received", label: "Payment not received", icon: "📭" },
                    { key: "duplicate", label: "Duplicate transaction", icon: "📋" },
                    { key: "fraud", label: "Suspected fraud", icon: "⚠️" },
                    { key: "other", label: "Other issue", icon: "💬" },
                  ].map((reason, i) => (
                    <button key={reason.key} onClick={() => setReportReason(reason.key)}
                      className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                        reportReason === reason.key
                          ? "bg-red-400/[0.08] border border-red-400/20"
                          : "bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]"
                      }`}
                      style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.05 + i * 0.04}s both` }}>
                      <span className="text-[18px]">{reason.icon}</span>
                      <span className={`text-[13px] font-medium ${reportReason === reason.key ? "text-red-400" : "text-foreground/70"}`}>{reason.label}</span>
                      {reportReason === reason.key && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-red-400/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-red-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Description field for "Other issue" */}
                {reportReason === "other" && (
                  <div className="mb-5" style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Please describe your issue..."
                      maxLength={500}
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-red-400/30 focus:ring-1 focus:ring-red-400/20 transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-right">{reportDescription.length}/500</p>
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (!reportReason) { toast.error("Please select a reason"); return; }
                    haptic.medium();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user || !tx) { toast.error("Not signed in"); return; }
                    const reasonLabels: Record<string, string> = {
                      unauthorized: "Unauthorized transaction", wrong_amount: "Wrong amount charged",
                      not_received: "Payment not received", duplicate: "Duplicate transaction",
                      fraud: "Suspected fraud", other: "Other issue",
                    };
                    const subject = `Dispute: ${reasonLabels[reportReason]} (${formatAmount(tx.amount)})`;
                    const description = `Transaction ID: ${tx.id}\nReference: ${tx.razorpay_payment_id || tx.id}\nReason: ${reasonLabels[reportReason]}\nAmount: ${formatAmount(tx.amount)}\nMerchant: ${tx.merchant_name || "—"}\n\n${reportDescription || "(no additional details)"}`;
                    const { error } = await supabase.from("support_tickets").insert({
                      user_id: user.id, subject, description,
                      category: "dispute", priority: reportReason === "fraud" || reportReason === "unauthorized" ? "high" : "medium",
                    });
                    if (error) { toast.error("Failed to submit dispute"); return; }
                    setReportSubmitted(true);
                  }}
                  disabled={!reportReason}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                    reportReason
                      ? "bg-red-400/15 border border-red-400/25 text-red-400 hover:bg-red-400/20"
                      : "bg-white/[0.03] border border-white/[0.05] text-muted-foreground cursor-not-allowed"
                  }`}>
                  Submit Dispute
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;
