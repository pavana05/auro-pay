import { useState, useEffect } from "react";
import { ArrowLeft, Search, ChevronRight, Zap, CheckCircle2, Smartphone, Star, RotateCcw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import rechargeImg from "@/assets/bill-recharge.png";
import paybillImg from "@/assets/bill-paybill.png";
import dthImg from "@/assets/bill-dth.png";
import metroImg from "@/assets/bill-metro.png";
import electricityImg from "@/assets/bill-electricity.png";
import waterImg from "@/assets/bill-water.png";
import broadbandImg from "@/assets/bill-broadband.png";
import mobileImg from "@/assets/bill-mobile.png";
import gasImg from "@/assets/bill-gas.png";
import insuranceImg from "@/assets/bill-insurance.png";
import educationImg from "@/assets/bill-education.png";
import creditcardImg from "@/assets/bill-creditcard.png";
import taxImg from "@/assets/bill-tax.png";

const providers: Record<string, { name: string; icon: string }[]> = {
  mobile: [
    { name: "Jio Prepaid", icon: "📱" },
    { name: "Airtel Prepaid", icon: "📡" },
    { name: "Vi Prepaid", icon: "📶" },
    { name: "BSNL Prepaid", icon: "🔗" },
    { name: "Jio Postpaid", icon: "📱" },
    { name: "Airtel Postpaid", icon: "📡" },
    { name: "Vi Postpaid", icon: "📶" },
    { name: "BSNL Postpaid", icon: "🔗" },
  ],
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
  gas: [
    { name: "Indane Gas", icon: "🔥" },
    { name: "HP Gas", icon: "⛽" },
    { name: "Bharat Gas", icon: "🔥" },
    { name: "Gujarat Gas", icon: "🏭" },
    { name: "Mahanagar Gas", icon: "🔥" },
    { name: "Adani Gas", icon: "⛽" },
  ],
  insurance: [
    { name: "LIC Premium", icon: "🛡️" },
    { name: "Star Health", icon: "⭐" },
    { name: "HDFC Ergo", icon: "🏦" },
    { name: "ICICI Lombard", icon: "🏛️" },
    { name: "Bajaj Allianz", icon: "📋" },
    { name: "Max Life", icon: "💚" },
  ],
  education: [
    { name: "School Fees", icon: "🏫" },
    { name: "College Tuition", icon: "🎓" },
    { name: "Coaching Center", icon: "📚" },
    { name: "University Fees", icon: "🏛️" },
    { name: "Exam Fees", icon: "📝" },
  ],
  creditcard: [
    { name: "HDFC Credit Card", icon: "💳" },
    { name: "SBI Credit Card", icon: "💳" },
    { name: "ICICI Credit Card", icon: "💳" },
    { name: "Axis Credit Card", icon: "💳" },
    { name: "Kotak Credit Card", icon: "💳" },
    { name: "Amex Card", icon: "💳" },
  ],
  tax: [
    { name: "Municipal Tax", icon: "🏛️" },
    { name: "Property Tax", icon: "🏠" },
    { name: "Water Tax", icon: "💧" },
    { name: "Income Tax", icon: "📊" },
  ],
};

const quickCategories = [
  { key: "mobile", label: "Recharge", image: rechargeImg },
  { key: "electricity", label: "Pay Bill", image: paybillImg },
  { key: "broadband", label: "DTH", image: dthImg },
  { key: "water", label: "Metro", image: metroImg },
  { key: "gas", label: "Gas", image: gasImg },
  { key: "insurance", label: "Insurance", image: insuranceImg },
  { key: "education", label: "Education", image: educationImg },
  { key: "creditcard", label: "Card Bill", image: creditcardImg },
];

const categories = [
  {
    key: "mobile", label: "Mobile Recharge", desc: "Prepaid & Postpaid plans",
    image: mobileImg, gradient: "from-primary/20 to-amber-600/10", borderColor: "border-primary/15",
  },
  {
    key: "electricity", label: "Electricity", desc: "Pay your electricity bills instantly",
    image: electricityImg, gradient: "from-amber-500/20 to-yellow-600/10", borderColor: "border-amber-500/15",
  },
  {
    key: "water", label: "Water", desc: "Water supply & sewage bills",
    image: waterImg, gradient: "from-sky-500/20 to-cyan-500/10", borderColor: "border-sky-500/15",
  },
  {
    key: "broadband", label: "Broadband", desc: "Internet & fiber connections",
    image: broadbandImg, gradient: "from-emerald-500/20 to-teal-500/10", borderColor: "border-emerald-500/15",
  },
  {
    key: "gas", label: "Gas Cylinder", desc: "LPG & piped gas payments",
    image: gasImg, gradient: "from-orange-500/20 to-red-500/10", borderColor: "border-orange-500/15",
  },
  {
    key: "insurance", label: "Insurance", desc: "Life, health & vehicle premiums",
    image: insuranceImg, gradient: "from-emerald-500/20 to-green-600/10", borderColor: "border-emerald-500/15",
  },
  {
    key: "education", label: "Education Fees", desc: "School, college & coaching fees",
    image: educationImg, gradient: "from-blue-500/20 to-indigo-500/10", borderColor: "border-blue-500/15",
  },
  {
    key: "creditcard", label: "Credit Card", desc: "Pay credit card bills instantly",
    image: creditcardImg, gradient: "from-primary/20 to-yellow-500/10", borderColor: "border-primary/15",
  },
  {
    key: "tax", label: "Municipal Tax", desc: "Property, water & municipal taxes",
    image: taxImg, gradient: "from-fuchsia-500/20 to-pink-500/10", borderColor: "border-fuchsia-500/15",
  },
];

const mobilePlans = [
  { data: "1.5 GB/day", validity: "28 days", price: 199, tag: "Popular" },
  { data: "2 GB/day", validity: "28 days", price: 299, tag: "Best Value" },
  { data: "2.5 GB/day", validity: "56 days", price: 499, tag: "" },
  { data: "3 GB/day", validity: "84 days", price: 799, tag: "Save 20%" },
  { data: "Unlimited", validity: "365 days", price: 2999, tag: "Annual" },
];

type Step = "category" | "provider" | "mobile-type" | "plans" | "details" | "confirm" | "success";

interface FavoriteBill {
  category: string;
  provider: string;
  lastAmount: string;
  lastPaidDate: string;
}

const BillPayments = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [mobileType, setMobileType] = useState<"prepaid" | "postpaid">("prepaid");
  const [mobileNumber, setMobileNumber] = useState("");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [searchProvider, setSearchProvider] = useState("");
  const [paying, setPaying] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteBill[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("bill_favorites");
    if (saved) {
      try { setFavorites(JSON.parse(saved)); } catch {}
    } else {
      // Seed with demo favorites for first-time users
      const demo: FavoriteBill[] = [
        { category: "electricity", provider: "Tata Power", lastAmount: "1,240", lastPaidDate: "2 days ago" },
        { category: "mobile", provider: "Jio Prepaid", lastAmount: "299", lastPaidDate: "5 days ago" },
        { category: "broadband", provider: "Jio Fiber", lastAmount: "999", lastPaidDate: "12 days ago" },
      ];
      setFavorites(demo);
      localStorage.setItem("bill_favorites", JSON.stringify(demo));
    }
  }, []);

  const currentProviders = selectedCategory ? providers[selectedCategory] || [] : [];
  const filteredProviders = selectedCategory === "mobile"
    ? currentProviders.filter(p => p.name.toLowerCase().includes(mobileType) && p.name.toLowerCase().includes(searchProvider.toLowerCase()))
    : currentProviders.filter(p => p.name.toLowerCase().includes(searchProvider.toLowerCase()));

  const handleSelectCategory = (key: string) => {
    haptic.light();
    setSelectedCategory(key);
    if (key === "mobile") {
      setStep("mobile-type");
    } else {
      setStep("provider");
    }
  };

  const handleSelectMobileType = (type: "prepaid" | "postpaid") => {
    haptic.light();
    setMobileType(type);
    setStep("provider");
  };

  const handleSelectProvider = (name: string) => {
    haptic.light();
    setSelectedProvider(name);
    if (selectedCategory === "mobile" && mobileType === "prepaid") {
      setStep("plans");
    } else {
      setStep("details");
    }
  };

  const handleSelectPlan = (price: number) => {
    haptic.medium();
    setAmount(price.toString());
    setStep("confirm");
  };

  const handleFetchBill = () => {
    const num = selectedCategory === "mobile" ? mobileNumber : consumerNumber;
    if (!num.trim() || num.length < 6) {
      toast.error(selectedCategory === "mobile" ? "Enter a valid mobile number" : "Enter a valid consumer number");
      return;
    }
    haptic.medium();
    if (selectedCategory === "mobile" && mobileType === "postpaid") {
      const randomAmt = (Math.floor(Math.random() * 800) + 200).toString();
      setAmount(randomAmt);
    } else if (selectedCategory !== "mobile") {
      const randomAmt = (Math.floor(Math.random() * 3000) + 200).toString();
      setAmount(randomAmt);
    }
    setStep("confirm");
  };

  const handlePay = async () => {
    haptic.heavy();
    setPaying(true);
    await new Promise(r => setTimeout(r, 2000));
    setPaying(false);
    setStep("success");
    toast.success("Payment successful!");
  };

  const reset = () => {
    setStep("category");
    setSelectedCategory(null);
    setSelectedProvider(null);
    setConsumerNumber("");
    setMobileNumber("");
    setAmount("");
    setSearchProvider("");
    setMobileType("prepaid");
  };

  const goBack = () => {
    if (step === "success") reset();
    else if (step === "confirm") setStep(selectedCategory === "mobile" && mobileType === "prepaid" ? "plans" : "details");
    else if (step === "plans") setStep("provider");
    else if (step === "details") setStep("provider");
    else if (step === "provider") setStep(selectedCategory === "mobile" ? "mobile-type" : "category");
    else if (step === "mobile-type") setStep("category");
    else navigate(-1);
  };

  const catInfo = categories.find(c => c.key === selectedCategory);
  const displayNumber = selectedCategory === "mobile" ? mobileNumber : consumerNumber;

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]" style={{ background: "hsl(42 78% 55%)" }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={goBack}
            className="w-[42px] h-[42px] rounded-[14px] bg-white/[0.03] border border-white/[0.04] flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-[18px] h-[18px] text-muted-foreground/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold tracking-[-0.4px]">Recharge & Bills</h1>
            <p className="text-[10px] text-muted-foreground/40">
              {step === "category" ? "Select a category" : step === "mobile-type" ? "Choose plan type" : step === "provider" ? catInfo?.label : step === "plans" ? "Select a plan" : step === "details" ? selectedProvider : step === "confirm" ? "Confirm payment" : "Payment complete"}
            </p>
          </div>
        </div>

        {/* Step: Category */}
        {step === "category" && (
          <div className="px-5 mt-2">
            {/* Quick Category Grid - matching reference */}
            <div className="rounded-[20px] p-5 border border-white/[0.04] mb-6" style={{ background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))" }}>
              <h3 className="text-[14px] font-bold mb-4">Recharge & Bill Payments</h3>
              <div className="grid grid-cols-4 gap-3">
                {quickCategories.map((cat, i) => (
                  <button
                    key={cat.key}
                    onClick={() => handleSelectCategory(cat.key)}
                    className="flex flex-col items-center gap-2.5 active:scale-90 transition-all"
                    style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s both` }}
                  >
                    <div className="w-[60px] h-[60px] rounded-[16px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                      <img
                        src={cat.image}
                        alt={cat.label}
                        className="w-10 h-10 object-contain"
                        loading="lazy"
                        width={40}
                        height={40}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground/60">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Category Cards */}
            <h3 className="text-[12px] font-semibold text-muted-foreground/40 tracking-[0.1em] uppercase mb-3">All Services</h3>
            <div className="space-y-3">
              {categories.map((cat, i) => (
                <button
                  key={cat.key}
                  onClick={() => handleSelectCategory(cat.key)}
                  className={`w-full relative rounded-[20px] bg-gradient-to-br ${cat.gradient} border ${cat.borderColor} overflow-hidden active:scale-[0.97] transition-all text-left group`}
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + i * 0.08}s both` }}
                >
                  <div className="flex items-center p-4">
                    <div className="flex-1 pr-4">
                      <p className="text-[15px] font-bold mb-0.5">{cat.label}</p>
                      <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{cat.desc}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-primary text-[10px] font-semibold">
                        {cat.key === "mobile" ? "Recharge now" : "Pay now"} <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                    <img
                      src={cat.image}
                      alt={cat.label}
                      className="w-16 h-16 object-contain rounded-[14px] shrink-0 drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width={64}
                      height={64}
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

        {/* Step: Mobile Type */}
        {step === "mobile-type" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className={`rounded-[20px] bg-gradient-to-br ${catInfo?.gradient} border ${catInfo?.borderColor} p-4 mb-5 flex items-center gap-3`}>
              <img src={catInfo?.image} alt="" className="w-14 h-14 object-contain rounded-[12px]" loading="lazy" width={56} height={56} />
              <div>
                <p className="text-[15px] font-bold">Mobile Recharge</p>
                <p className="text-[11px] text-muted-foreground/40">Choose your plan type</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                { type: "prepaid" as const, emoji: "📱", title: "Prepaid", desc: "Recharge with data packs", color: "from-emerald-500/15 to-teal-500/5", border: "border-emerald-500/15" },
                { type: "postpaid" as const, emoji: "📋", title: "Postpaid", desc: "Pay monthly bill", color: "from-sky-500/15 to-blue-500/5", border: "border-sky-500/15" },
              ]).map((opt, i) => (
                <button
                  key={opt.type}
                  onClick={() => handleSelectMobileType(opt.type)}
                  className={`rounded-[20px] bg-gradient-to-br ${opt.color} border ${opt.border} p-5 text-left active:scale-[0.97] transition-all`}
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s both` }}
                >
                  <span className="text-3xl mb-3 block">{opt.emoji}</span>
                  <p className="text-[15px] font-bold mb-1">{opt.title}</p>
                  <p className="text-[11px] text-muted-foreground/40">{opt.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-primary text-[11px] font-semibold">
                    Select <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>

            {/* Mobile Number Input */}
            <div className="mt-5">
              <label className="text-[11px] text-muted-foreground/40 font-semibold tracking-wide uppercase block mb-2">Mobile Number</label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                <input
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full h-[52px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] pl-11 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/20 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all outline-none"
                  inputMode="numeric"
                />
              </div>
              {mobileNumber.length === 10 && (
                <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid number</p>
              )}
            </div>
          </div>
        )}

        {/* Step: Provider */}
        {step === "provider" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className={`rounded-[20px] bg-gradient-to-br ${catInfo?.gradient} border ${catInfo?.borderColor} p-4 mb-4 flex items-center gap-3`}>
              <img src={catInfo?.image} alt="" className="w-14 h-14 object-contain rounded-[12px]" loading="lazy" width={56} height={56} />
              <div>
                <p className="text-[15px] font-bold">{catInfo?.label}</p>
                <p className="text-[11px] text-muted-foreground/40">
                  {selectedCategory === "mobile" ? `${mobileType === "prepaid" ? "Prepaid" : "Postpaid"} • Select operator` : "Select your provider"}
                </p>
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

        {/* Step: Plans (Prepaid only) */}
        {step === "plans" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className={`rounded-[20px] bg-gradient-to-br ${catInfo?.gradient} border ${catInfo?.borderColor} p-4 mb-4 flex items-center gap-3`}>
              <img src={catInfo?.image} alt="" className="w-12 h-12 object-contain rounded-[12px]" loading="lazy" width={48} height={48} />
              <div>
                <p className="text-[14px] font-bold">{selectedProvider}</p>
                <p className="text-[11px] text-muted-foreground/30">Prepaid Plans{mobileNumber ? ` • ${mobileNumber}` : ""}</p>
              </div>
            </div>

            <h3 className="text-[12px] font-semibold text-muted-foreground/40 tracking-[0.1em] uppercase mb-3">Popular Plans</h3>
            <div className="space-y-2.5">
              {mobilePlans.map((plan, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectPlan(plan.price)}
                  className="w-full rounded-[20px] bg-white/[0.02] border border-white/[0.03] p-4 flex items-center gap-4 active:scale-[0.97] transition-all text-left relative overflow-hidden"
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s both` }}
                >
                  {plan.tag && (
                    <span className="absolute top-2 right-2 text-[8px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                      {plan.tag}
                    </span>
                  )}
                  <div className="w-[48px] h-[48px] rounded-[14px] bg-primary/[0.06] border border-primary/[0.08] flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">₹</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold">₹{plan.price}</p>
                    <p className="text-[11px] text-muted-foreground/40 mt-0.5">{plan.data} • {plan.validity}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/20 shrink-0" />
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-muted-foreground/40 tracking-wide uppercase mb-2">Custom Amount</p>
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="₹ Enter amount"
                  className="flex-1 h-[48px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] px-4 text-[14px] text-foreground placeholder:text-muted-foreground/20 focus:border-primary/30 transition-all outline-none"
                  inputMode="numeric"
                />
                <button
                  onClick={() => { if (amount) { haptic.medium(); setStep("confirm"); } }}
                  disabled={!amount}
                  className="px-5 h-[48px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[13px] active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  Recharge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Details (non-mobile or postpaid) */}
        {step === "details" && (
          <div className="px-5 mt-4" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.03] p-6">
              <div className="flex items-center gap-3 mb-6">
                <img src={catInfo?.image} alt="" className="w-12 h-12 object-contain rounded-[14px]" loading="lazy" width={48} height={48} />
                <div>
                  <p className="text-[14px] font-bold">{selectedProvider}</p>
                  <p className="text-[11px] text-muted-foreground/30">{catInfo?.label}{selectedCategory === "mobile" ? " • Postpaid" : ""}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-muted-foreground/40 font-semibold tracking-wide uppercase block mb-2">
                    {selectedCategory === "mobile" ? "Mobile Number" : "Consumer / Account Number"}
                  </label>
                  <input
                    value={selectedCategory === "mobile" ? mobileNumber : consumerNumber}
                    onChange={e => selectedCategory === "mobile" ? setMobileNumber(e.target.value) : setConsumerNumber(e.target.value)}
                    placeholder={selectedCategory === "mobile" ? "Enter 10-digit number" : "Enter your consumer number"}
                    className="w-full h-[52px] rounded-[16px] bg-white/[0.03] border border-white/[0.04] px-4 text-[14px] text-foreground placeholder:text-muted-foreground/20 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all outline-none"
                  />
                </div>

                <button onClick={handleFetchBill} disabled={!(selectedCategory === "mobile" ? mobileNumber.trim() : consumerNumber.trim())}
                  className="w-full h-[52px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[14px] active:scale-[0.97] transition-all shadow-[0_8px_32px_hsl(42_78%_55%/0.3)] disabled:opacity-40 disabled:cursor-not-allowed">
                  {selectedCategory === "mobile" ? "Fetch Bill" : "Fetch Bill"}
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
                <p className="text-[11px] text-muted-foreground/30 mt-0.5">
                  {selectedCategory === "mobile" ? `Mobile: ${mobileNumber}` : `Consumer: ${consumerNumber}`}
                </p>
              </div>

              <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.03] p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-muted-foreground/40">
                    {selectedCategory === "mobile" && mobileType === "prepaid" ? "Recharge Amount" : "Bill Amount"}
                  </span>
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
            <h2 className="text-[22px] font-bold mb-2">
              {selectedCategory === "mobile" && mobileType === "prepaid" ? "Recharge Successful!" : "Payment Successful!"}
            </h2>
            <p className="text-[13px] text-muted-foreground/40 mb-1">₹{amount} paid to {selectedProvider}</p>
            <p className="text-[11px] text-muted-foreground/30 mb-8">
              {selectedCategory === "mobile" ? `Mobile: ${mobileNumber}` : `Consumer: ${consumerNumber}`}
            </p>

            <div className="space-y-3">
              <button onClick={reset}
                className="w-full h-[48px] rounded-[16px] gradient-primary text-primary-foreground font-bold text-[13px] active:scale-[0.97] transition-all shadow-[0_8px_32px_hsl(42_78%_55%/0.3)]">
                {selectedCategory === "mobile" ? "Recharge Again" : "Pay Another Bill"}
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
