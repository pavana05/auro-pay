import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Users, Check, Clock, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface BillSplit {
  id: string;
  title: string;
  total_amount: number;
  category: string;
  status: string;
  created_at: string;
}

const BillSplitPage = () => {
  const [splits, setSplits] = useState<BillSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchSplits = async () => {
    setLoading(true);
    const { data } = await supabase.from("bill_splits").select("*").order("created_at", { ascending: false });
    setSplits((data || []) as BillSplit[]);
    setLoading(false);
  };

  useEffect(() => { fetchSplits(); }, []);

  const createSplit = async () => {
    if (!title || !amount) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const { error } = await supabase.from("bill_splits").insert({
      title,
      total_amount: Math.round(parseFloat(amount) * 100),
      created_by: user.id,
    });

    if (error) {
      toast.error("Failed to create split");
    } else {
      toast.success("Bill split created!");
      haptic.success();
      setTitle(""); setAmount(""); setShowCreate(false);
      fetchSplits();
    }
    setCreating(false);
  };

  const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full opacity-[0.035] blur-[100px]" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-[35%] -left-20 w-[200px] h-[200px] rounded-full opacity-[0.02] blur-[70px]" style={{ background: "hsl(210 80% 55%)" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Header */}
        <div className="pt-4 pb-5" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { haptic.light(); navigate(-1); }}
                className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all border border-white/[0.04]"
                style={{ background: "hsl(220 15% 8%)" }}>
                <ArrowLeft className="w-[18px] h-[18px] text-white/60" />
              </button>
              <div>
                <h1 className="text-[19px] font-bold tracking-[-0.5px]">Bill Split</h1>
                <p className="text-[10px] text-white/30 font-medium">Split expenses with friends</p>
              </div>
            </div>
            <button onClick={() => { haptic.light(); setShowCreate(true); }}
              className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition-all relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                boxShadow: "0 4px 16px hsl(var(--primary) / 0.25)",
              }}>
              <Plus className="w-[18px] h-[18px]" style={{ color: "hsl(220 20% 6%)" }} />
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="rounded-[18px] p-4 mb-5 border border-white/[0.04] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
            animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both",
          }}>
          <div className="absolute top-0 left-4 right-4 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), transparent)" }} />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <Users className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--primary))" }}>How It Works</p>
          </div>
          <div className="space-y-2.5">
            {["Create a split with the total amount", "Add friends to split with", "Everyone pays their share via AuroPay"].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>{i + 1}</div>
                <p className="text-[11px] text-white/35">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} onClick={() => setShowCreate(false)}>
            <div className="w-full max-w-lg rounded-t-[28px] p-6 border-t border-white/[0.06]"
              style={{ background: "linear-gradient(180deg, hsl(220 15% 10%), hsl(220 18% 6%))", animation: "slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold">Create New Split</h2>
                <button onClick={() => setShowCreate(false)} className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Title</p>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Movie night, Dinner..."
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
                </div>
                <div>
                  <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase mb-1.5">Total Amount (₹)</p>
                  <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00"
                    inputMode="decimal"
                    className="w-full h-[48px] rounded-[14px] px-4 text-[13px] outline-none transition-all"
                    style={{ background: "hsl(220 15% 8%)", border: "1px solid hsl(220 15% 12%)", color: "white" }} />
                </div>
              </div>
              <button onClick={createSplit} disabled={creating || !title || !amount}
                className="w-full h-[52px] rounded-2xl font-semibold text-[14px] active:scale-[0.97] transition-all disabled:opacity-40 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                  color: "hsl(220 20% 6%)",
                  boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
                }}>
                {creating ? "Creating..." : "Create Split"}
              </button>
            </div>
          </div>
        )}

        {/* Splits List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-[80px] rounded-[18px] overflow-hidden relative">
                <div className="absolute inset-0" style={{ background: "hsl(220 15% 8%)" }} />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(110deg, transparent 30%, hsl(220 15% 12%) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-shimmer 1.8s ease-in-out infinite",
                }} />
              </div>
            ))}
          </div>
        ) : splits.length === 0 ? (
          <div className="text-center py-20" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mx-auto mb-4 border border-white/[0.04]"
              style={{ background: "linear-gradient(135deg, hsl(220 15% 9%), hsl(220 18% 6%))" }}>
              <Users className="w-8 h-8 text-white/8" />
            </div>
            <p className="text-[14px] font-semibold text-white/20 mb-1">No bill splits yet</p>
            <p className="text-[11px] text-white/10">Tap + to create your first split</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {splits.map((split, idx) => {
              const isSettled = split.status === "settled";
              const accent = isSettled ? "152 60% 45%" : "var(--primary)";
              return (
                <div key={split.id} className="rounded-[18px] p-4 border border-white/[0.04] relative overflow-hidden active:scale-[0.98] transition-all"
                  style={{
                    background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                    animation: `slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.08 + idx * 0.04}s both`,
                  }}>
                  <div className="absolute top-0 left-4 right-4 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(${accent} / 0.12), transparent)` }} />

                  <div className="flex items-center gap-3.5">
                    <div className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center shrink-0"
                      style={{
                        background: `linear-gradient(135deg, hsl(${accent} / 0.12), hsl(${accent} / 0.04))`,
                      }}>
                      <Users className="w-5 h-5" style={{ color: `hsl(${accent})` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{split.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1`}
                          style={{
                            background: isSettled ? "hsl(152 60% 45% / 0.1)" : "hsl(38 92% 50% / 0.1)",
                            color: isSettled ? "hsl(152 60% 50%)" : "hsl(38 92% 55%)",
                          }}>
                          {isSettled ? <Check className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          {split.status}
                        </span>
                        <span className="text-[9px] text-white/15">
                          {new Date(split.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <p className="text-[14px] font-bold tracking-[-0.3px]"
                      style={{
                        background: `linear-gradient(135deg, hsl(${accent}), hsl(${accent} / 0.7))`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}>
                      {fmt(split.total_amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      <style>{`
        @keyframes slide-up-spring {
          0% { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default BillSplitPage;
