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

  const formatCompact = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background noise-overlay pb-28">
      <div className="px-5 pt-6 pb-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate(-1); }} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold">Bill Split</h1>
            <p className="text-[10px] text-muted-foreground">Split expenses with friends</p>
          </div>
          <button onClick={() => { haptic.light(); setShowCreate(true); }} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center active:scale-90 transition-all shadow-[0_4px_12px_hsl(42_78%_55%/0.3)]">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-5 mb-5 animate-slide-up-delay-1">
        <div className="rounded-2xl p-4 border border-primary/20" style={{ background: "linear-gradient(145deg, hsl(42 78% 55% / 0.04), hsl(220 15% 8%))" }}>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-[12px] font-semibold text-primary">How Bill Split Works</p>
          </div>
          <div className="space-y-2">
            {["Create a split with the total amount", "Add friends to split with", "Everyone pays their share via AuroPay"].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">{i + 1}</div>
                <p className="text-[11px] text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border p-6 animate-slide-up" style={{ background: "linear-gradient(180deg, hsl(220 15% 12%), hsl(220 18% 7%))" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted/30 rounded-full mx-auto mb-5" />
            <h2 className="text-[16px] font-bold mb-4">Create New Split</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Movie night, Dinner..." className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary/40 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Total Amount (₹)</label>
                <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" type="text" inputMode="decimal" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary/40 outline-none transition-all" />
              </div>
              <button onClick={createSplit} disabled={creating || !title || !amount}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_16px_hsl(42_78%_55%/0.3)]">
                {creating ? "Creating..." : "Create Split"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Splits List */}
      <div className="px-5">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : splits.length === 0 ? (
          <div className="text-center py-16 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No bill splits yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Tap + to create your first split</p>
          </div>
        ) : (
          <div className="space-y-3">
            {splits.map((split) => (
              <div key={split.id} className="rounded-2xl p-4 border border-border transition-all active:scale-[0.98]" style={{ background: "linear-gradient(145deg, hsl(220 15% 10%), hsl(220 18% 7%))" }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{split.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        split.status === "settled" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>
                        {split.status === "settled" ? <Check className="w-2.5 h-2.5 inline mr-0.5" /> : <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                        {split.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(split.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                  <p className="text-[14px] font-bold">{formatCompact(split.total_amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BillSplitPage;
