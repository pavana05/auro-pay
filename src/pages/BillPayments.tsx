import { useState } from "react";
import { ArrowLeft, Search, ChevronRight, Zap, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import electricityImg from "@/assets/bill-electricity.png";
import waterImg from "@/assets/bill-water.png";
import broadbandImg from "@/assets/bill-broadband.png";

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
  {
    key: "electricity",
    label: "Electricity",
    desc: "Pay your electricity bills instantly",
    image: electricityImg,
    gradient: "from-amber-500/20 to-yellow-600/10",
    borderColor: "border-amber-500/15",
  },
  {
    key: "water",
    label: "Water",
    desc: "Water supply & sewage bills",
    image: waterImg,
    gradient: "from-sky-500/20 to-cyan-500/10",
    borderColor: "border-sky-500/15",
  },
  {
    key: "broadband",
    label: "Broadband",
    desc: "Internet & fiber connections",
    image: broadbandImg,
    gradient: "from-violet-500/20 to-purple-500/10",
    borderColor: "border-violet-500/15",
  },
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
    const randomAmt = (Math.floor(Math.random() * 3000) + 200).toString();
    setAmount(randomAmt);
    setStep("confirm");
  };

  const handlePay = async () => {
    haptic.heavy();
    setPaying(true);
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
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => { haptic.light(); step === "category" ? navigate(-1) : step === "success" ? reset() : setStep(step === "confirm" ? "details" : step === "details" ? "provider" : "category"); }}
            className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-[18px] h-[18px] text-muted-foreground/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold tracking-[-0.4px]">Recharge & Bills</h1>
            <p className="text-[10px] text-muted-foreground/40">
              {step === "category" ? "Select a category" : step === "provider" ? catInfo?.label : step === "details" ? selectedProvider : step === "confirm" ? "Confirm payment" : "Payment complete"}
            </p>
          </div>
        </div>

        {/* Step: Category */}
        {step === "category" && (
          <div className="px-5 mt-2">
            <div className="space-y-4">
              {categories.map((cat, i) => (
                <button
                  key={cat.key}
                  onClick={() => handleSelectCategory(cat.key)}
                  className={`w-full relative rounded-[24px] bg-gradient-to-br ${cat.gradient} border ${cat.borderColor} overflow-hidden active:scale-[0.97] transition-all text-left group`}
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s both` }}
                >
                  <div className="flex items-center p-5">
                    <div className="flex-1 pr-4">
                      <p className="text-[17px] font-bold mb-1">{cat.label}</p>
                      <p className="text-[12px] text-muted-foreground/50 leading-relaxed">{cat.desc}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-primary text-[11px] font-semibold">
                        Pay now <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <img
                      src={cat.image}
                      alt={cat.label}
                      className="w-24 h-24 object-contain rounded-[16px] shrink-0 drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width={96}
                      height={96}
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Recent Bills */}
            <div className="mt-8">
              <h3 className="text-[12px] font-semibold text-muted-foreground/40 tracking-[0.1em] uppercase mb-3">Recent Bills</h3>
              <div className="rounded-[20px] bg-white/[0.015] border border-white/[0.03] p-8 text-center">
                <p className="text-[12px] text-muted-foreground/30">No recent bills</p>
                <p className="text-[10px] text-muted-foreground/20 mt-1">Your paid bills will appear here</p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Provider */}
        {step === "provider" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            {/* Category header with image */}
            <div className={`rounded-[20px] bg-gradient-to-br ${catInfo?.gradient} border ${catInfo?.borderColor} p-4 mb-4 flex items-center gap-3`}>
              <img src={catInfo?.image} alt="" className="w-14 h-14 object-contain rounded-[12px]" loading="lazy" width={56} height={56} />
              <div>
                <p className="text-[15px] font-bold">{catInfo?.label}</p>
                <p className="text-[11px] text-muted-foreground/40">Select your provider</p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
              <input
                value={searchProvider}
                onChange={e => setSearchProvider(e.target.value)}
                placeholder={`Search ${catInfo?.label || ""} providers...`}
                className="w-full h-[48px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] pl-11 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/20 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all outline-none"
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
                  <ChevronRight className="w-4 h-4 text-muted-foreground/20" />
                </button>
              ))}
              {filteredProviders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[12px] text-muted-foreground/30">No providers found</p>
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
                <img src={catInfo?.image} alt="" className="w-12 h-12 object-contain rounded-[14px]" loading="lazy" width={48} height={48} />
                <div>
                  <p className="text-[14px] font-bold">{selectedProvider}</p>
                  <p className="text-[11px] text-muted-foreground/30">{catInfo?.label}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-muted-foreground/40 font-semibold tracking-wide uppercase block mb-2">Consumer / Account Number</label>
                  <input
                    value={consumerNumber}
                    onChange={e => setConsumerNumber(e.target.value)}
                    placeholder="Enter your consumer number"
                    className="w-full h-[52px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] px-4 text-[14px] text-foreground placeholder:text-muted-foreground/20 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all outline-none"
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
                <img src={catInfo?.image} alt="" className="w-20 h-20 object-contain mx-auto mb-3 rounded-[18px]" loading="lazy" width={80} height={80} />
                <p className="text-[14px] font-bold">{selectedProvider}</p>
                <p className="text-[11px] text-muted-foreground/30 mt-0.5">Consumer: {consumerNumber}</p>
              </div>

              <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.03] p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-muted-foreground/40">Bill Amount</span>
                  <span className="text-[18px] font-bold">₹{amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-muted-foreground/40">Convenience Fee</span>
                  <span className="text-[12px] font-semibold text-emerald-400">FREE</span>
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
            <div className="w-[80px] h-[80px] rounded-full mx-auto mb-5 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15"
              style={{ animation: "glow-pulse 2s ease-in-out infinite" }}>
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-[22px] font-bold mb-2">Payment Successful!</h2>
            <p className="text-[13px] text-muted-foreground/40 mb-1">₹{amount} paid to {selectedProvider}</p>
            <p className="text-[11px] text-muted-foreground/30 mb-8">Consumer: {consumerNumber}</p>

            <div className="space-y-3">
              <button onClick={reset}
                className="w-full h-[48px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[13px] active:scale-[0.97] transition-all shadow-[0_8px_32px_hsl(42_78%_55%/0.3)]">
                Pay Another Bill
              </button>
              <button onClick={() => navigate("/home")}
                className="w-full h-[48px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] font-semibold text-[13px] text-muted-foreground/50 active:scale-[0.97] transition-all">
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
