import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ChevronLeft, Tag, Sparkles, Clock, Search, Star, Crown, Copy, Check } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { SkeletonRow, EmptyState } from "@/components/feedback";

interface Reward {
  id: string;
  title: string;
  description: string | null;
  coupon_code: string;
  discount_type: string;
  discount_value: number;
  category: string | null;
  expires_at: string | null;
  image_url: string | null;
}

const categoryEmojis: Record<string, string> = {
  general: "🎁", food: "🍔", shopping: "🛍️", entertainment: "🎬", travel: "✈️", education: "📚",
};

const getExpiryInfo = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return { text: "Expired", urgent: true, warn: true };
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 24) return { text: `${diffHours}h left`, urgent: true, warn: true };
  if (diffDays <= 2) return { text: `${diffDays}d left`, urgent: true, warn: true };
  if (diffDays <= 7) return { text: `${diffDays}d left`, urgent: false, warn: true };
  return { text: `${diffDays}d left`, urgent: false, warn: false };
};

const Rewards = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("rewards").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (data) setRewards(data as unknown as Reward[]);
      setLoading(false);
    };
    fetch();
    const channel = supabase.channel("user-rewards")
      .on("postgres_changes", { event: "*", schema: "public", table: "rewards" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    haptic.success();
    setCopiedId(id);
    toast.ok("Coupon code copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filters = ["all", ...new Set(rewards.map(r => r.category || "general"))];
  const filtered = rewards
    .filter(r => activeFilter === "all" || (r.category || "general") === activeFilter)
    .filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalRewards = rewards.length;
  const expiringCount = rewards.filter(r => { const e = getExpiryInfo(r.expires_at); return e?.warn; }).length;

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.07] blur-[100px]" style={{ animation: "admin-float 8s ease-in-out infinite" }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-500/[0.05] blur-[100px]" style={{ animation: "admin-float 10s ease-in-out infinite reverse" }} />
        <div className="absolute top-[40%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-primary/[0.04] blur-[80px]" style={{ animation: "admin-float 12s ease-in-out infinite 2s" }} />
      </div>

      {/* Floating Sparkle Particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/40"
            style={{ left: `${10 + i * 12}%`, top: `${5 + (i % 3) * 30}%`, animation: `star-fall ${4 + i * 0.7}s linear infinite ${i * 0.5}s` }} />
        ))}
      </div>

      {/* Premium Header */}
      <div className="sticky top-0 z-30 bg-background/60 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => { haptic.light(); back(); }} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05] active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5 text-foreground/80" />
          </button>
          <div className="flex items-center gap-2" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
            <Gift className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
              Rewards
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
              {totalRewards}
            </span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5 relative z-10">
        {/* Premium Stats Banner */}
        <div style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both" }}>
          <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" style={{ animation: "admin-shimmer 3s ease-in-out infinite" }} />
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" style={{ animation: "admin-glow-pulse 2s ease-in-out infinite" }} />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
                  <Crown className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Available Offers</p>
                <p className="text-3xl font-black">{totalRewards}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Expiring Soon</p>
                <div className="flex items-center gap-1 justify-end">
                  <p className="text-2xl font-black text-warning">{expiringCount}</p>
                  {expiringCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search rewards..."
            className="w-full h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] pl-11 pr-4 text-sm backdrop-blur-sm focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all duration-300 outline-none placeholder:text-muted-foreground/30" />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.25s both" }}>
          {filters.map(f => (
            <button key={f} onClick={() => { haptic.light(); setActiveFilter(f); }}
              className={`px-4 py-2.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                activeFilter === f
                  ? "bg-primary/15 text-primary border border-primary/25 shadow-[0_0_15px_hsl(42_78%_55%/0.1)]"
                  : "bg-white/[0.02] border border-white/[0.06] text-muted-foreground hover:bg-white/[0.04]"
              }`}>
              {f === "all" ? "✨ All" : `${categoryEmojis[f] || "🎁"} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Rewards List */}
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1,2,3].map(i => <SkeletonRow key={i} className="h-36" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Gift className="w-6 h-6 text-primary/70" />}
            title="No rewards available"
            description="Check back soon — new offers drop every week."
          />
        ) : (
          <div className="space-y-3 pt-1">
            {filtered.map((r, i) => {
              const expiry = getExpiryInfo(r.expires_at);
              const isExpanded = expandedId === r.id;
              return (
                <div key={r.id}
                  style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.06}s both` }}>
                  <div className={`relative rounded-2xl bg-white/[0.02] border overflow-hidden backdrop-blur-sm group transition-all duration-500 ${
                    isExpanded ? "border-primary/20 shadow-[0_0_30px_hsl(42_78%_55%/0.08)]" : "border-white/[0.06] hover:border-white/[0.1]"
                  }`}>
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

                    {/* Banner image */}
                    {r.image_url && (
                      <div className="relative h-28 overflow-hidden">
                        <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                      </div>
                    )}

                    <button onClick={() => { haptic.light(); setExpandedId(isExpanded ? null : r.id); }}
                      className="w-full text-left p-4 relative z-10 active:scale-[0.99] transition-transform">
                      {/* Expiry badge */}
                      {expiry && (
                        <div className={`absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full border backdrop-blur-sm ${
                          expiry.urgent ? "bg-destructive/10 border-destructive/20" : expiry.warn ? "bg-warning/10 border-warning/20" : "bg-white/[0.03] border-white/[0.06]"
                        }`}>
                          <Clock className={`w-2.5 h-2.5 ${expiry.urgent ? "text-destructive" : expiry.warn ? "text-warning" : "text-muted-foreground"}`} />
                          <span className={`text-[9px] font-semibold ${expiry.urgent ? "text-destructive" : expiry.warn ? "text-warning" : "text-muted-foreground"}`}>{expiry.text}</span>
                          {expiry.urgent && <span className="w-1 h-1 rounded-full bg-destructive animate-pulse" />}
                        </div>
                      )}

                      <div className="flex items-start gap-3.5">
                        {/* Category icon */}
                        <div className="relative shrink-0">
                          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="relative w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                            {categoryEmojis[r.category || "general"]}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pr-16">
                          <h3 className="font-bold text-[14px] leading-tight">{r.title}</h3>
                          {r.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{r.description}</p>}
                          <div className="flex items-center gap-2 mt-2.5">
                            <span className="text-[12px] font-black px-3 py-1 rounded-lg border" style={{
                              background: "linear-gradient(135deg, hsl(42 78% 55% / 0.12), hsl(42 78% 55% / 0.04))",
                              borderColor: "hsl(42 78% 55% / 0.2)",
                              color: "hsl(42 78% 60%)",
                            }}>
                              {r.discount_type === "percentage" ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 capitalize">{r.category || "general"}</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded coupon reveal */}
                    <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="px-4 pb-4">
                        {/* Dashed separator */}
                        <div className="relative py-2">
                          <div className="border-t border-dashed border-white/[0.08]" />
                          <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border border-white/[0.06]" />
                          <div className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border border-white/[0.06]" />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-dashed border-primary/25">
                            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-mono text-[14px] font-black tracking-wider text-primary flex-1">{r.coupon_code}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); copyCode(r.coupon_code, r.id); }}
                            className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center active:scale-90 transition-all hover:shadow-[0_0_20px_hsl(42_78%_55%/0.15)]">
                            {copiedId === r.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-primary" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom tap hint */}
                    {!isExpanded && (
                      <div className="px-4 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground/40 font-medium">Tap to reveal code</span>
                        </div>
                        <Sparkles className="w-3 h-3 text-primary/20" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rewards;
