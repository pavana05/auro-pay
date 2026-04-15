import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ChevronLeft, Tag, Sparkles, Clock, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

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

const categoryColors: Record<string, string> = {
  general: "from-primary/20 to-primary/5",
  food: "from-orange-500/20 to-orange-500/5",
  shopping: "from-pink-500/20 to-pink-500/5",
  entertainment: "from-blue-500/20 to-blue-500/5",
  travel: "from-blue-500/20 to-blue-500/5",
  education: "from-emerald-500/20 to-emerald-500/5",
};

const getExpiryInfo = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return { text: "Expired", color: "text-destructive", bg: "bg-destructive/10", urgent: true };
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 24) return { text: `Expires in ${diffHours}h`, color: "text-destructive", bg: "bg-destructive/10", urgent: true };
  if (diffDays <= 2) return { text: `Expires in ${diffDays}d ${diffHours % 24}h`, color: "text-destructive", bg: "bg-destructive/10", urgent: true };
  if (diffDays <= 7) return { text: `Expires in ${diffDays} days`, color: "text-warning", bg: "bg-warning/10", urgent: false };
  return { text: `Expires in ${diffDays} days`, color: "text-muted-foreground", bg: "bg-muted/10", urgent: false };
};

const Rewards = () => {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

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

  const [searchQuery, setSearchQuery] = useState("");

  const filters = ["all", ...new Set(rewards.map(r => r.category || "general"))];
  const filtered = rewards
    .filter(r => activeFilter === "all" || (r.category || "general") === activeFilter)
    .filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase()) || (r.category || "").toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => { haptic.light(); navigate("/home"); }} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Rewards</h1>
            <p className="text-[10px] text-muted-foreground">{rewards.length} offers available</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search rewards..."
            className="w-full h-11 rounded-2xl bg-card border border-border pl-11 pr-4 text-sm focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.1)] transition-all duration-200 outline-none"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map(f => (
          <button key={f} onClick={() => { haptic.light(); setActiveFilter(f); }}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
              activeFilter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}>
            {f === "all" ? "✨ All" : `${categoryEmojis[f] || "🎁"} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading rewards...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">No rewards available</p>
          </div>
        ) : filtered.map((r, i) => {
          const expiry = getExpiryInfo(r.expires_at);
          return (
            <button key={r.id} onClick={() => { haptic.medium(); navigate(`/rewards/${r.id}`); }}
              className="w-full text-left animate-fade-in active:scale-[0.98] transition-all duration-200"
              style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${categoryColors[r.category || "general"]}`}>
                {/* Banner image */}
                {r.image_url && (
                  <img src={r.image_url} alt={r.title} className="w-full h-28 object-cover" />
                )}
                <div className="p-4">
                  {/* Sparkle decoration */}
                  <div className="absolute top-3 right-3 opacity-30">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  {/* Expiry countdown badge */}
                  {expiry && (
                    <div className={`absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg ${expiry.bg} backdrop-blur-sm`}>
                      <Clock className={`w-3 h-3 ${expiry.color}`} />
                      <span className={`text-[10px] font-semibold ${expiry.color}`}>{expiry.text}</span>
                      {expiry.urgent && <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-card/80 backdrop-blur flex items-center justify-center text-xl shrink-0">
                      {categoryEmojis[r.category || "general"]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{r.title}</h3>
                      {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg">
                          {r.discount_type === "percentage" ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Dashed coupon line */}
                  <div className="mt-3 pt-3 border-t border-dashed border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Tap to reveal code</span>
                    </div>
                    <span className="text-[10px] font-medium text-primary">View →</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
};

export default Rewards;
