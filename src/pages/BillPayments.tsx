import { useState } from "react";
import { ArrowLeft, Lightbulb, Droplets, Wifi, ChevronRight, Search, Zap, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const providers: Record<string, { name: string; icon: string }[]> = {
  electricity: [
    { name: "Tata Power", icon: "⚡" },
    { name: "Adani Electricity", icon: "🔌" },
    { name: "BSES Rajdhani", icon: "💡" },
    { name: "BSES Yamuna", icon: "🔋" },
    { name: "MSEDCL", icon: "⚡" },
    { name: "TNEB", icon: "💡" },
  ],
  water: [
    { name: "Delhi Jal Board", icon: "💧" },
    { name: "BWSSB Bangalore", icon: "🚿" },
    { name: "MCGM Mumbai", icon: "💧" },
    { name: "Chennai Metro Water", icon: "🚰" },
  ],
  broadband: [
    { name: "Jio Fiber", icon: "📡" },
    { name: "Airtel Xstream", icon: "📶" },
    { name: "ACT Fibernet", icon: "🌐" },
    { name: "BSNL Bharat Fiber", icon: "📡" },
    { name: "Tata Play Fiber", icon: "🔗" },
  ],
};

const categories = [
  { key: "electricity", label: "Electricity", emoji: "⚡", color: "hsl(48 90% 55%)" },
  { key: "water", label: "Water", emoji: "💧", color: "hsl(200 80% 55%)" },
  { key: "broadband", label: "Broadband", emoji: "📡", color: "hsl(160 60% 50%)" },
];

type Step = "category" | "provider" | "details" | "confirm" | "success";

const BillPayments = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [consumerNumber, setConsumerNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [searchProvider, setSearchProvider] = useState("");
  const [paying, setPaying] = useState(false);

  const currentProviders = selectedCategory ? providers[selectedCategory] || [] : [];
  const filteredProviders = currentProviders.filter(p =>
    p.name.toLowerCase().includes(searchProvider.toLowerCase())
  );

  const handleSelectCategory = (key: string) => {
    haptic.light();
    setSelectedCategory(key);
    setStep("provider");
  };

  const handleSelectProvider = (name: string) => {
    haptic.light();
    setSelectedProvider(name);
    setStep("details");
  };

  const handleFetchBill = () => {
    if (!consumerNumber.trim() || consumerNumber.length < 6) {
      toast.error("Enter a valid consumer number");
      return;
    }
    haptic.medium();
    // Simulate bill fetch
    const randomAmt = (Math.floor(Math.random() * 3000) + 200).toString();
    setAmount(randomAmt);
    setStep("confirm");
  };

  const handlePay = async () => {
    haptic.heavy();
    setPaying(true);
    // Simulate payment
    await new Promise(r => setTimeout(r, 2000));
    setPaying(false);
    setStep("success");
    toast.success("Bill paid successfully!");
  };

  const reset = () => {
    setStep("category");
    setSelectedCategory(null);
    setSelectedProvider(null);
    setConsumerNumber("");
    setAmount("");
    setSearchProvider("");
  };

  const catInfo = categories.find(c => c.key === selectedCategory);

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]" style={{ background: catInfo?.color || "hsl(42 78% 55%)" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => { haptic.light(); step === "category" ? navigate(-1) : step === "success" ? reset() : setStep(step === "confirm" ? "details" : step === "details" ? "provider" : "category"); }}
            className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-[18px] h-[18px] text-muted-foreground/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold tracking-[-0.4px]">Bill Payments</h1>
            <p className="text-[10px] text-white/25">{step === "category" ? "Select a category" : step === "provider" ? catInfo?.label : step === "details" ? selectedProvider : step === "confirm" ? "Confirm payment" : "Payment complete"}</p>
          </div>
        </div>

        {/* Step: Category */}
        {step === "category" && (
          <div className="px-5 mt-4">
            <div className="space-y-3">
              {categories.map((cat) => (
                <button key={cat.key} onClick={() => handleSelectCategory(cat.key)}
                  className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-white/[0.02] border border-white/[0.03] active:scale-[0.97] transition-all text-left group"
                  style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                  <div className="w-[56px] h-[56px] rounded-[18px] flex items-center justify-center" style={{ background: `${cat.color}10` }}>
                    <span className="text-[28px]">{cat.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold">{cat.label}</p>
                    <p className="text-[11px] text-white/25 mt-0.5">Pay your {cat.label.toLowerCase()} bills instantly</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white/20 transition-colors" />
                </button>
              ))}
            </div>

            {/* Recent Bills */}
            <div className="mt-8">
              <h3 className="text-[12px] font-semibold text-white/25 tracking-[0.1em] uppercase mb-3">Recent Bills</h3>
              <div className="rounded-[20px] bg-white/[0.015] border border-white/[0.03] p-8 text-center">
                <p className="text-[12px] text-white/20">No recent bills</p>
                <p className="text-[10px] text-white/10 mt-1">Your paid bills will appear here</p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Provider */}
        {step === "provider" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                value={searchProvider}
                onChange={e => setSearchProvider(e.target.value)}
                placeholder={`Search ${catInfo?.label || ""} providers...`}
                className="w-full h-[48px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] pl-11 pr-4 text-[13px] text-foreground placeholder:text-white/20 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              {filteredProviders.map((prov, i) => (
                <button key={prov.name} onClick={() => handleSelectProvider(prov.name)}
                  className="w-full flex items-center gap-3.5 p-4 rounded-[20px] bg-white/[0.02] border border-white/[0.03] active:scale-[0.97] transition-all text-left"
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s both` }}>
                  <div className="w-[44px] h-[44px] rounded-[14px] bg-white/[0.03] flex items-center justify-center text-[22px]">
                    {prov.icon}
                  </div>
                  <p className="text-[13px] font-semibold flex-1">{prov.name}</p>
                  <ChevronRight className="w-4 h-4 text-white/10" />
                </button>
              ))}
              {filteredProviders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[12px] text-white/20">No providers found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.03] p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-[48px] h-[48px] rounded-[16px] flex items-center justify-center" style={{ background: `${catInfo?.color || "hsl(42 78% 55%)"}10` }}>
                  <span className="text-[24px]">{catInfo?.emoji}</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold">{selectedProvider}</p>
                  <p className="text-[11px] text-white/25">{catInfo?.label}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-white/30 font-semibold tracking-wide uppercase block mb-2">Consumer / Account Number</label>
                  <input
                    value={consumerNumber}
                    onChange={e => setConsumerNumber(e.target.value)}
                    placeholder="Enter your consumer number"
                    className="w-full h-[52px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] px-4 text-[14px] text-foreground placeholder:text-white/15 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all outline-none"
                  />
                </div>

                <button onClick={handleFetchBill} disabled={!consumerNumber.trim()}
                  className="w-full h-[52px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[14px] active:scale-[0.97] transition-all shadow-[0_8px_32px_hsl(42_78%_55%/0.3)] disabled:opacity-40 disabled:cursor-not-allowed">
                  Fetch Bill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.03] p-6">
              <div className="text-center mb-6">
                <div className="w-[64px] h-[64px] rounded-[22px] mx-auto mb-3 flex items-center justify-center" style={{ background: `${catInfo?.color || "hsl(42 78% 55%)"}10` }}>
                  <span className="text-[32px]">{catInfo?.emoji}</span>
                </div>
                <p className="text-[14px] font-bold">{selectedProvider}</p>
                <p className="text-[11px] text-white/25 mt-0.5">Consumer: {consumerNumber}</p>
              </div>

              <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.03] p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-white/30">Bill Amount</span>
                  <span className="text-[18px] font-bold">₹{amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-white/30">Convenience Fee</span>
                  <span className="text-[12px] font-semibold text-[hsl(152_60%_45%)]">FREE</span>
                </div>
                <div className="h-[1px] bg-white/[0.04]" />
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold">Total</span>
                  <span className="text-[20px] font-bold gradient-text">₹{amount}</span>
                </div>
              </div>

              <button onClick={handlePay} disabled={paying}
                className="w-full h-[52px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[14px] active:scale-[0.97] transition-all shadow-[0_8px_32px_hsl(42_78%_55%/0.3)] disabled:opacity-60 flex items-center justify-center gap-2">
                {paying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Pay ₹{amount}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="px-5 mt-8 text-center" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-[80px] h-[80px] rounded-full mx-auto mb-5 flex items-center justify-center bg-[hsl(152_60%_45%/0.1)] border border-[hsl(152_60%_45%/0.15)]"
              style={{ animation: "glow-pulse 2s ease-in-out infinite" }}>
              <CheckCircle2 className="w-10 h-10 text-[hsl(152_60%_45%)]" />
            </div>
            <h2 className="text-[22px] font-bold mb-2">Payment Successful!</h2>
            <p className="text-[13px] text-white/30 mb-1">₹{amount} paid to {selectedProvider}</p>
            <p className="text-[11px] text-white/20 mb-8">Consumer: {consumerNumber}</p>

            <div className="space-y-3">
              <button onClick={reset}
                className="w-full h-[48px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[13px] active:scale-[0.97] transition-all shadow-[0_8px_32px_hsl(42_78%_55%/0.3)]">
                Pay Another Bill
              </button>
              <button onClick={() => navigate("/home")}
                className="w-full h-[48px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] font-semibold text-[13px] text-white/50 active:scale-[0.97] transition-all">
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BillPayments;
