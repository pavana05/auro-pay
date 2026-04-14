import { useEffect, useState } from "react";
import { ArrowLeft, Zap, CreditCard, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const quickAmounts = [100, 200, 500, 1000];

const AddMoney = () => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState(0);
  const navigate = useNavigate();

  const methods = [
    { id: "upi", label: "UPI", icon: Zap, fee: "Free", feeColor: "text-success" },
    { id: "card", label: "Debit Card", icon: CreditCard, fee: "0.9% fee", feeColor: "text-muted-foreground" },
    { id: "netbanking", label: "Net Banking", icon: Building2, fee: "₹15 fee", feeColor: "text-muted-foreground" },
  ];

  const handleAddMoney = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      if (!wallet) throw new Error("Wallet not found");

      const amountPaise = Math.round(amt * 100);

      // In production, this would go through Razorpay
      // For now, directly credit the wallet (simulated)

      // Create credit transaction
      const { error: txError } = await supabase.from("transactions").insert({
        wallet_id: wallet.id,
        type: "credit",
        amount: amountPaise,
        merchant_name: `Add Money (${method.toUpperCase()})`,
        category: "other",
        status: "success",
        description: `Added ₹${amt} via ${method}`,
      });
      if (txError) throw txError;

      // Update balance
      const updated = (wallet.balance || 0) + amountPaise;
      await supabase.from("wallets").update({ balance: updated }).eq("id", wallet.id);

      setNewBalance(updated);
      setSuccess(true);
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (err: any) {
      toast.error(err.message || "Failed to add money");
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background noise-overlay flex flex-col items-center justify-center px-6">
        <div className="animate-fade-in-up text-center">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-[22px] font-semibold text-success mb-2">Money Added!</h2>
          <p className="text-sm text-muted-foreground mb-1">₹{amount} added to your wallet</p>
          <p className="text-base font-medium mb-2">New Balance</p>
          <p className="text-3xl font-bold mb-8">₹{(newBalance / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <button onClick={() => navigate("/home")} className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">Add Money</h1>
      </div>

      {/* Amount Input */}
      <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">AMOUNT</label>
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₹</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="input-auro w-full text-2xl font-bold pl-10"
          autoFocus
        />
      </div>

      {/* Quick Amounts */}
      <div className="flex gap-2 mb-8">
        {quickAmounts.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(String(a))}
            className={`flex-1 py-2.5 rounded-pill text-sm font-medium transition-all duration-200 ${
              amount === String(a)
                ? "gradient-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-border-active"
            }`}
          >
            ₹{a}
          </button>
        ))}
      </div>

      {/* Payment Methods */}
      <label className="text-xs font-medium tracking-wider text-muted-foreground mb-3 block">PAYMENT METHOD</label>
      <div className="space-y-2 mb-8">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
              method === m.id
                ? "border-primary bg-primary/5 shadow-[0_0_15px_hsl(263_84%_58%/0.15)]"
                : "border-border bg-card hover:border-border-active"
            } card-glow`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === m.id ? "gradient-primary" : "bg-muted"}`}>
              <m.icon className={`w-5 h-5 ${method === m.id ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{m.label}</p>
            </div>
            <span className={`text-xs font-medium ${m.feeColor}`}>{m.fee}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleAddMoney}
        disabled={processing || !amount || parseFloat(amount) <= 0}
        className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {processing ? "Processing..." : `Add ₹${amount || "0"}`}
      </button>

      <BottomNav />
    </div>
  );
};

export default AddMoney;
