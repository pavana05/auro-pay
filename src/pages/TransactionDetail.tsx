import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2,
  XCircle, AlertCircle, Copy, Check, Share2, MapPin, Tag, Receipt,
  Sparkles, Download, FileText, Image,
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

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string; glow: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Successful", glow: "shadow-[0_0_20px_hsl(152_60%_45%/0.15)]" },
  pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", label: "Pending", glow: "shadow-[0_0_20px_hsl(38_92%_50%/0.15)]" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed", glow: "shadow-[0_0_20px_hsl(0_72%_51%/0.15)]" },
};

const TransactionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("transactions").select("*").eq("id", id).single();
      if (data) setTx(data as unknown as TransactionDetail);
      setLoading(false);
      setTimeout(() => setMounted(true), 50);
    };
    fetch();
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
    const status = tx.status || "pending";
    ctx.fillStyle = isCredit ? "#4ade80" : "#f0f0f0";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillText(`${isCredit ? "+" : "-"}${formatAmount(tx.amount)}`, w / 2, 200);
    ctx.fillStyle = status === "success" ? "#065f46" : status === "failed" ? "#7f1d1d" : "#78350f";
    const badgeW = 140, badgeH = 32, badgeX = (w - badgeW) / 2, badgeY = 225;
    ctx.beginPath(); ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16); ctx.fill();
    ctx.fillStyle = status === "success" ? "#4ade80" : status === "failed" ? "#f87171" : "#fbbf24";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(statusConfig[status]?.label || status, w / 2, badgeY + 22);
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
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
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

  const status = statusConfig[tx.status || "pending"];
  const StatusIcon = status.icon;
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
      {/* Ambient page glow only */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: isCredit ? "radial-gradient(circle, hsl(152 60% 45% / 0.06), transparent 70%)" : "radial-gradient(circle, hsl(42 78% 55% / 0.06), transparent 70%)" }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-2xl border-b border-border/30 px-4 py-3 flex items-center gap-3"
        style={{ background: "linear-gradient(180deg, hsl(220 20% 4% / 0.95), hsl(220 20% 4% / 0.8))" }}>
        <button onClick={() => { haptic.light(); navigate(-1); }}
          className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-white/[0.08]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">Transaction Details</h1>
        <button onClick={() => { haptic.light(); setShowDownload(true); }}
          className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-primary/15">
          <Download className="w-4 h-4 text-primary" />
        </button>
      </div>

      <div className="px-5 pt-6 pb-12 space-y-5 relative z-10">
        {/* Hero Amount Card — FamPay-inspired big card */}
        <div
          className={`relative overflow-hidden rounded-3xl border border-white/[0.06] p-7 text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}
          style={{
            background: isCredit
              ? "linear-gradient(160deg, hsl(152 50% 20% / 0.2) 0%, hsl(220 15% 6%) 40%, hsl(220 15% 8%) 100%)"
              : "linear-gradient(160deg, hsl(42 60% 25% / 0.15) 0%, hsl(220 15% 6%) 40%, hsl(220 15% 8%) 100%)",
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>
          {/* Sparkle particles */}
          <div className="absolute top-6 right-8 w-1.5 h-1.5 rounded-full bg-primary/40" style={{ animation: "glow-pulse 2s ease-in-out infinite" }} />
          <div className="absolute bottom-10 left-10 w-1 h-1 rounded-full bg-primary/30" style={{ animation: "glow-pulse 2.5s ease-in-out 0.5s infinite" }} />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-white/20" style={{ animation: "glow-pulse 3s ease-in-out 1s infinite" }} />

          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: isCredit ? "linear-gradient(90deg, transparent, hsl(152 60% 45% / 0.5), transparent)" : "linear-gradient(90deg, transparent, hsl(42 78% 55% / 0.5), transparent)" }} />

          <div className="relative z-10">
            {/* Category Icon with ring animation */}
            <div className={`relative w-20 h-20 mx-auto mb-5`}>
              <div className={`absolute inset-0 rounded-2xl ${isCredit ? "bg-emerald-400/10" : "bg-primary/10"} ${status.glow}`}
                style={{ animation: "glow-pulse 3s ease-in-out infinite" }} />
              <div className={`relative w-full h-full rounded-2xl flex items-center justify-center ${isCredit ? "bg-emerald-400/5" : "bg-primary/5"}`}
                style={{ animation: mounted ? "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both" : "none" }}>
                <span className="text-4xl">{categoryIcons[tx.category || "other"]}</span>
              </div>
            </div>

            {/* Amount with counter animation feel */}
            <p className={`text-4xl font-bold mb-2 tracking-tight ${isCredit ? "text-emerald-400" : "text-foreground"}`}
              style={{ animation: mounted ? "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both" : "none" }}>
              {isCredit ? "+" : "-"}{formatAmount(tx.amount)}
            </p>

            <p className="text-sm text-muted-foreground"
              style={{ animation: mounted ? "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both" : "none" }}>
              {tx.merchant_name || tx.description || "Transaction"}
            </p>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full ${status.bg} backdrop-blur-sm border border-white/[0.05]`}
              style={{ animation: mounted ? "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s both" : "none" }}>
              <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
              <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
            </div>
          </div>
        </div>

        {/* Details Grid — staggered entry */}
        <div className={`bg-card/50 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "0.3s" }}>
          {detailItems.map((item, i) => (
            <div key={i}
              className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-colors duration-200"
              style={{ animation: mounted ? `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + i * 0.06}s both` : "none" }}>
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-medium truncate mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Reference */}
        <div className={`bg-card/50 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "0.5s" }}>
          <p className="text-[10px] text-muted-foreground mb-2.5 uppercase tracking-widest font-medium">Transaction Reference</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-muted-foreground bg-white/[0.03] border border-white/[0.04] px-3 py-2.5 rounded-xl truncate">
              {tx.razorpay_payment_id || tx.id}
            </code>
            <button onClick={copyId}
              className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center active:scale-90 transition-all duration-200 hover:bg-primary/15 shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-primary" />}
            </button>
          </div>
          {tx.razorpay_order_id && (
            <p className="text-[10px] text-muted-foreground mt-2.5 font-mono opacity-60">Order: {tx.razorpay_order_id}</p>
          )}
        </div>

        {/* Actions — FamPay-style pill buttons */}
        <div className={`grid grid-cols-3 gap-3 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "0.6s" }}>
          {[
            { icon: AlertCircle, label: "Report", onClick: () => { haptic.light(); toast.info("Report submitted"); }, accent: false },
            { icon: Download, label: "Receipt", onClick: () => { haptic.light(); setShowDownload(true); }, accent: false },
            { icon: Share2, label: "Share", onClick: () => { haptic.light(); navigator.share?.({ text: `₹${(tx.amount/100).toFixed(2)} ${isCredit ? "received from" : "paid to"} ${tx.merchant_name || "someone"} via AuroPay` }).catch(() => {}); }, accent: true },
          ].map((action, i) => (
            <button key={action.label} onClick={action.onClick}
              className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-medium active:scale-[0.95] transition-all duration-200 ${
                action.accent
                  ? "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15"
                  : "bg-white/[0.03] border border-white/[0.06] text-foreground hover:bg-white/[0.05]"
              }`}
              style={{ animation: mounted ? `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.65 + i * 0.06}s both` : "none" }}>
              <action.icon className={`w-5 h-5 ${action.accent ? "text-primary" : "text-muted-foreground"}`} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Download Modal — slide-up sheet */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowDownload(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" style={{ animation: "fade-in 0.2s ease-out" }} />
          <div className="relative w-full max-w-lg rounded-t-3xl border-t border-white/[0.08] p-6"
            style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/[0.1] rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-1">Download Receipt</h2>
            <p className="text-[11px] text-muted-foreground mb-5">Choose your preferred format</p>
            <div className="space-y-3">
              {[
                { fn: downloadAsImage, icon: Image, title: "Download as Image", sub: "PNG format · Easy to share" },
                { fn: downloadAsPDF, icon: FileText, title: "Save as PDF", sub: "Print-ready format" },
              ].map((opt, i) => (
                <button key={opt.title} onClick={opt.fn}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] active:scale-[0.98] transition-all duration-200 hover:bg-white/[0.05] hover:border-primary/20"
                  style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.08}s both` }}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <opt.icon className="w-6 h-6 text-primary" />
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
    </div>
  );
};

export default TransactionDetailPage;
