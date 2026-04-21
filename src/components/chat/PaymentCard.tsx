import { useState } from "react";
import { IndianRupee, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";

interface PaymentCardProps {
  recipientId: string;
  recipientName: string;
  conversationId: string;
  onPaymentSent: (amount: number, note: string) => void;
  onClose: () => void;
}

const PaymentCard = ({ recipientId, recipientName, conversationId, onPaymentSent, onClose }: PaymentCardProps) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const quickAmounts = [50, 100, 200, 500];

  const handleSend = async () => {
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum <= 0) {
      toast.fail("Enter a valid amount");
      return;
    }
    if (amountNum > 100000) {
      toast.fail("Amount too high", { description: "Maximum per transaction is ₹1,00,000" });
      return;
    }

    setSending(true);
    haptic.medium();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await supabase.functions.invoke("p2p-transfer", {
        body: {
          recipient_id: recipientId,
          amount: amountNum * 100,
          description: note || `Payment to ${recipientName}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      haptic.heavy();
      onPaymentSent(amountNum * 100, note || `Payment to ${recipientName}`);
      toast.ok(`₹${amountNum} sent`, { description: `Paid to ${recipientName}` });
    } catch (err: any) {
      toast.fail("Payment failed", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#0d1017] border border-border/30 rounded-2xl p-4 animate-slide-up-spring">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Send to</p>
            <p className="text-sm font-semibold text-foreground">{recipientName}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close payment panel" className="text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative mb-3">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-foreground">₹</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          aria-label="Amount in rupees"
          max={100000}
          className="w-full bg-[#141820] border border-border/30 rounded-xl pl-10 pr-4 py-4 text-2xl font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      <div className="flex gap-2 mb-3">
        {quickAmounts.map((qa) => (
          <button key={qa} onClick={() => { setAmount(String(qa)); haptic.light(); }}
            className="flex-1 py-2 rounded-lg bg-[#141820] border border-border/30 text-sm font-medium text-foreground hover:border-blue-500/50 transition-colors">
            ₹{qa}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note..."
        className="w-full bg-[#141820] border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50 mb-3"
      />

      <button
        onClick={handleSend}
        disabled={sending || !amount}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {sending ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send ₹{amount || "0"}
          </>
        )}
      </button>
    </div>
  );
};

export default PaymentCard;
