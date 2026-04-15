import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2,
  XCircle, AlertCircle, Copy, Check, Share2, MapPin, Tag, Receipt,
  Sparkles,
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
        <h1 className="text-base font-semibold">Transaction Details</h1>
      </div>

      <div className="px-5 pt-6 pb-12 space-y-5 animate-fade-in">
        {/* Hero Amount Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border p-6 text-center"
          style={{
            background: isCredit
              ? "linear-gradient(145deg, hsl(152 60% 45% / 0.08), hsl(220 15% 8%))"
              : "linear-gradient(145deg, hsl(42 78% 55% / 0.08), hsl(220 15% 8%))",
          }}>
          {/* Ambient orb */}
          <div className="absolute -top-12 right-1/4 w-32 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: isCredit ? "hsl(152 60% 45%)" : "hsl(42 78% 55%)" }} />

          <div className="relative z-10">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
              isCredit ? "bg-emerald-400/10" : "bg-primary/10"
            }`}>
              <span className="text-3xl">{categoryIcons[tx.category || "other"]}</span>
            </div>

            {/* Amount */}
            <p className={`text-3xl font-bold mb-1 ${isCredit ? "text-emerald-400" : "text-foreground"}`}>
              {isCredit ? "+" : "-"}{formatAmount(tx.amount)}
            </p>

            {/* Merchant */}
            <p className="text-sm text-muted-foreground">{tx.merchant_name || tx.description || "Transaction"}</p>

            {/* Status Badge */}
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
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { haptic.light(); toast.info("Report submitted"); }}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card border border-border text-sm font-medium active:scale-[0.98] transition-transform">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            Report Issue
          </button>
          <button onClick={() => { haptic.light(); navigator.share?.({ text: `₹${(tx.amount/100).toFixed(2)} ${isCredit ? "received from" : "paid to"} ${tx.merchant_name || "someone"} via AuroPay` }).catch(() => {}); }}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary active:scale-[0.98] transition-transform">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailPage;
