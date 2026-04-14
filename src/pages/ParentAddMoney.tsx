import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

const ParentAddMoney = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTeen = searchParams.get("teen");

  const [teens, setTeens] = useState<any[]>([]);
  const [selectedTeen, setSelectedTeen] = useState(preselectedTeen || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: links } = await supabase
        .from("parent_teen_links")
        .select("teen_id")
        .eq("parent_id", user.id)
        .eq("is_active", true);

      if (links && links.length > 0) {
        const teenIds = links.map(l => l.teen_id);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", teenIds);
        setTeens(profiles || []);
        if (!selectedTeen && profiles && profiles.length > 0) {
          setSelectedTeen(profiles[0].id);
        }
      }
      setFetchLoading(false);
    };
    fetch();
  }, []);

  const quickAmounts = [100, 200, 500, 1000, 2000];

  const handleAddMoney = async () => {
    if (!selectedTeen || !amount) { toast.error("Select a teen and enter amount"); return; }
    const amountPaise = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) { toast.error("Enter a valid amount"); return; }

    setLoading(true);
    try {
      // Get teen's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", selectedTeen)
        .single();

      if (!wallet) throw new Error("Teen wallet not found");

      // Update balance
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: (wallet.balance || 0) + amountPaise })
        .eq("id", wallet.id);
      if (walletErr) throw walletErr;

      // Create transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        wallet_id: wallet.id,
        type: "credit",
        amount: amountPaise,
        description: "Pocket money from parent",
        category: "other",
        status: "success",
        merchant_name: "Parent Transfer",
      });
      if (txErr) throw txErr;

      // Send notification to teen
      const teenProfile = teens.find(t => t.id === selectedTeen);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: parentProfile } = await supabase.from("profiles").select("full_name").eq("id", user?.id || "").single();

      await supabase.from("notifications").insert({
        user_id: selectedTeen,
        title: "Money Received! 🎉",
        body: `${parentProfile?.full_name || "Parent"} added ₹${(amountPaise / 100).toFixed(0)} to your wallet.`,
        type: "credit",
      });

      setSuccess(true);
      toast.success("Money added successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add money");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const teenName = teens.find(t => t.id === selectedTeen)?.full_name || "Teen";
    return (
      <div className="min-h-screen bg-background noise-overlay flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-[22px] font-semibold mb-2">Money Added!</h2>
        <p className="text-sm text-muted-foreground text-center mb-2">
          ₹{amount} has been added to {teenName}'s wallet
        </p>
        <p className="text-xs text-muted-foreground mb-8">They'll receive a notification shortly</p>
        <button
          onClick={() => navigate(-1)}
          className="w-full max-w-xs h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90"
        >
          Done
        </button>
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6">
        <div className="w-full h-12 bg-muted rounded animate-pulse mb-4" />
        <div className="w-full h-32 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-semibold">Add Money to Teen</h1>
      </div>

      {/* Teen Selector */}
      {teens.length > 1 && (
        <div className="mb-6">
          <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">SELECT TEEN</label>
          <div className="flex gap-2">
            {teens.map(teen => (
              <button
                key={teen.id}
                onClick={() => setSelectedTeen(teen.id)}
                className={`flex-1 p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                  selectedTeen === teen.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-border-active"
                }`}
              >
                {teen.full_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {teens.length === 1 && (
        <div className="p-4 rounded-lg bg-card border border-border card-glow mb-6">
          <p className="text-xs text-muted-foreground">Sending to</p>
          <p className="text-base font-semibold">{teens[0].full_name}</p>
        </div>
      )}

      {/* Amount Input */}
      <label className="text-xs font-medium tracking-wider text-muted-foreground mb-2 block">AMOUNT</label>
      <div className="flex items-center gap-1 bg-input border border-border rounded-[14px] px-4 h-[60px] mb-4">
        <span className="text-2xl font-bold text-muted-foreground">₹</span>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          className="bg-transparent flex-1 h-full outline-none text-2xl font-bold"
        />
      </div>

      {/* Quick Amounts */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {quickAmounts.map(amt => (
          <button
            key={amt}
            onClick={() => setAmount(String(amt))}
            className={`px-4 py-2 rounded-pill text-sm font-medium transition-all ${
              amount === String(amt)
                ? "gradient-primary text-primary-foreground"
                : "border border-border-active text-primary hover:bg-primary/5"
            }`}
          >
            ₹{amt}
          </button>
        ))}
      </div>

      <button
        onClick={handleAddMoney}
        disabled={loading || !amount || !selectedTeen}
        className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Processing..." : `Add ₹${amount || "0"}`}
      </button>
    </div>
  );
};

export default ParentAddMoney;
