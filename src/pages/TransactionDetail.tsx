import { useEffect, useState, useRef } from "react";
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

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Successful" },
  pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", label: "Pending" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
};

const TransactionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("transactions").select("*").eq("id", id).single();
      if (data) setTx(data as unknown as TransactionDetail);
      setLoading(false);
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
    canvas.width = w;
    canvas.height = h;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0f1115");
    bg.addColorStop(1, "#0a0c0f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Gold accent line
    const gold = ctx.createLinearGradient(100, 0, w - 100, 0);
    gold.addColorStop(0, "transparent");
    gold.addColorStop(0.5, "#c8952e");
    gold.addColorStop(1, "transparent");
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, 80); ctx.lineTo(w - 100, 80); ctx.stroke();

    // Title
    ctx.fillStyle = "#c8952e";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AUROPAY", w / 2, 55);
    ctx.fillStyle = "#888";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("Transaction Receipt", w / 2, 110);

    if (!tx) return canvas;
    const isCredit = tx.type === "credit";
    const date = tx.created_at ? new Date(tx.created_at) : new Date();
    const status = tx.status || "pending";

    // Amount
    ctx.fillStyle = isCredit ? "#4ade80" : "#f0f0f0";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillText(`${isCredit ? "+" : "-"}${formatAmount(tx.amount)}`, w / 2, 200);

    // Status badge
    ctx.fillStyle = status === "success" ? "#065f46" : status === "failed" ? "#7f1d1d" : "#78350f";
    const badgeW = 140, badgeH = 32;
    const badgeX = (w - badgeW) / 2, badgeY = 225;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16);
    ctx.fill();
    ctx.fillStyle = status === "success" ? "#4ade80" : status === "failed" ? "#f87171" : "#fbbf24";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(statusConfig[status]?.label || status, w / 2, badgeY + 22);

    // Divider
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 290); ctx.lineTo(w - 60, 290); ctx.stroke();

    // Details
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
      ctx.textAlign = "left";
      ctx.fillStyle = "#666";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(label, 80, y);
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "15px system-ui, sans-serif";
      const maxW = w - 180;
      const truncated = value.length > 40 ? value.slice(0, 37) + "..." : value;
      ctx.fillText(truncated, 80, y + 22);
      y += 60;
    });

    // Footer divider
    ctx.strokeStyle = "#222";
    ctx.beginPath(); ctx.moveTo(60, h - 120); ctx.lineTo(w - 60, h - 120); ctx.stroke();

    // Footer
    ctx.textAlign = "center";
    ctx.fillStyle = "#555";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("This is a computer-generated receipt. No signature required.", w / 2, h - 80);
    ctx.fillStyle = "#c8952e";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Powered by AuroPay", w / 2, h - 50);

    return canvas;
  };

  const downloadAsImage = async () => {
    haptic.medium();
    toast.loading("Generating receipt...");
    try {
      const canvas = await generateReceiptCanvas();
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `AuroPay_Receipt_${tx?.id?.slice(0, 8)}.png`;
      a.click();
      toast.dismiss();
      toast.success("Receipt downloaded!");
    } catch {
      toast.dismiss();
      toast.error("Failed to generate receipt");
    }
    setShowDownload(false);
  };

  const downloadAsPDF = async () => {
    haptic.medium();
    toast.loading("Generating PDF...");
    try {
      const canvas = await generateReceiptCanvas();
      const imgData = canvas.toDataURL("image/png");

      // Create a simple PDF using canvas data
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>AuroPay Receipt</title>
          <style>body{margin:0;display:flex;justify-content:center;background:#000;}img{max-width:100%;height:auto;}</style>
          </head><body><img src="${imgData}" /><script>setTimeout(()=>{window.print();},500);</script></body></html>
        `);
        printWindow.document.close();
      }
      toast.dismiss();
      toast.success("PDF ready to print/save!");
    } catch {
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
    setShowDownload(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { haptic.light(); navigate(-1); }}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">Transaction Details</h1>
        <button onClick={() => { haptic.light(); setShowDownload(true); }}
          className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center active:scale-90 transition-transform">
          <Download className="w-4 h-4 text-primary" />
        </button>
      </div>

      <div className="px-5 pt-6 pb-12 space-y-5 animate-fade-in">
        {/* Hero Amount Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border p-6 text-center"
          style={{
            background: isCredit
              ? "linear-gradient(145deg, hsl(152 60% 45% / 0.08), hsl(220 15% 8%))"
              : "linear-gradient(145deg, hsl(42 78% 55% / 0.08), hsl(220 15% 8%))",
          }}>
          <div className="absolute -top-12 right-1/4 w-32 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: isCredit ? "hsl(152 60% 45%)" : "hsl(42 78% 55%)" }} />

          <div className="relative z-10">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
              isCredit ? "bg-emerald-400/10" : "bg-primary/10"
            }`}>
              <span className="text-3xl">{categoryIcons[tx.category || "other"]}</span>
            </div>

            <p className={`text-3xl font-bold mb-1 ${isCredit ? "text-emerald-400" : "text-foreground"}`}>
              {isCredit ? "+" : "-"}{formatAmount(tx.amount)}
            </p>

            <p className="text-sm text-muted-foreground">{tx.merchant_name || tx.description || "Transaction"}</p>

            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full ${status.bg}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
              <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
          {[
            { icon: Clock, label: "Date & Time", value: date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + " at " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
            { icon: isCredit ? ArrowDownLeft : ArrowUpRight, label: "Type", value: isCredit ? "Money Received" : "Money Sent" },
            ...(tx.category ? [{ icon: Tag, label: "Category", value: `${categoryIcons[tx.category] || "💸"} ${tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}` }] : []),
            ...(tx.merchant_upi_id ? [{ icon: MapPin, label: "UPI ID", value: tx.merchant_upi_id }] : []),
            ...(tx.description ? [{ icon: Receipt, label: "Note", value: tx.description }] : []),
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Reference */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Transaction Reference</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg truncate">
              {tx.razorpay_payment_id || tx.id}
            </code>
            <button onClick={copyId}
              className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center active:scale-90 transition-transform shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-primary" />}
            </button>
          </div>
          {tx.razorpay_order_id && (
            <p className="text-[10px] text-muted-foreground mt-2">Order: {tx.razorpay_order_id}</p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => { haptic.light(); toast.info("Report submitted"); }}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-card border border-border text-xs font-medium active:scale-[0.98] transition-transform">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            Report
          </button>
          <button onClick={() => { haptic.light(); setShowDownload(true); }}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-card border border-border text-xs font-medium active:scale-[0.98] transition-transform">
            <Download className="w-4 h-4 text-primary" />
            Receipt
          </button>
          <button onClick={() => { haptic.light(); navigator.share?.({ text: `₹${(tx.amount/100).toFixed(2)} ${isCredit ? "received from" : "paid to"} ${tx.merchant_name || "someone"} via AuroPay` }).catch(() => {}); }}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary active:scale-[0.98] transition-transform">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Download Modal */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDownload(false)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border p-6 animate-slide-up" style={{ background: "linear-gradient(180deg, hsl(220 15% 12%), hsl(220 18% 7%))" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted/30 rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-1">Download Receipt</h2>
            <p className="text-[11px] text-muted-foreground mb-5">Choose your preferred format</p>

            <div className="space-y-3">
              <button onClick={downloadAsImage}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border active:scale-[0.98] transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Image className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Download as Image</p>
                  <p className="text-[11px] text-muted-foreground">PNG format · Easy to share</p>
                </div>
              </button>

              <button onClick={downloadAsPDF}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border active:scale-[0.98] transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Save as PDF</p>
                  <p className="text-[11px] text-muted-foreground">Print-ready format</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;
