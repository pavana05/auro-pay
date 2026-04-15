import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Gift, Copy, Check, Sparkles, Tag, Clock, ShoppingBag } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Reward {
  id: string;
  title: string;
  description: string | null;
  coupon_code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  used_count: number | null;
  expires_at: string | null;
  image_url: string | null;
  category: string | null;
}

const RewardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reward, setReward] = useState<Reward | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("rewards").select("*").eq("id", id).single();
      if (data) setReward(data as unknown as Reward);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleReveal = () => {
    haptic.heavy();
    setRevealing(true);
    setTimeout(() => {
      setRevealed(true);
      setRevealing(false);
      haptic.medium();
    }, 1500);
  };

  const handleCopy = () => {
    if (!reward) return;
    navigator.clipboard.writeText(reward.coupon_code);
    setCopied(true);
    haptic.light();
    toast.success("Coupon code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!reward) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Reward not found</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { haptic.light(); navigate("/rewards"); }}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Reward Details</h1>
      </div>

      <div className="px-4 pt-6 pb-12 space-y-6 animate-fade-in">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6">
          {/* Ambient orbs */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-card/80 backdrop-blur mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg">
              🎁
            </div>
            <h2 className="text-xl font-bold mb-1">{reward.title}</h2>
            <div className="inline-flex items-center gap-1 bg-primary/10 text-primary font-bold text-lg px-4 py-1.5 rounded-full mt-2">
              {reward.discount_type === "percentage" ? `${reward.discount_value}% OFF` : `₹${reward.discount_value} OFF`}
            </div>
          </div>
        </div>

        {/* Coupon Reveal */}
        <div className="relative">
          {!revealed ? (
            <button onClick={handleReveal} disabled={revealing}
              className="w-full relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 p-6 transition-all duration-300 active:scale-[0.98]">
              {revealing ? (
                <div className="flex flex-col items-center gap-3">
                  {/* Premium reveal animation */}
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-ping" style={{ animationDelay: "0.2s" }} />
                    <div className="absolute inset-4 rounded-full border-2 border-primary animate-ping" style={{ animationDelay: "0.4s" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-primary animate-pulse">Unlocking your coupon...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Gift className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Tap to Reveal Coupon Code</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Your exclusive code is waiting</p>
                  </div>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -skew-x-12 animate-[shimmer_2s_infinite]" />
                </div>
              )}
            </button>
          ) : (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center animate-scale-in">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Your Coupon Code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold font-mono tracking-[0.2em] text-primary">{reward.coupon_code}</span>
                <button onClick={handleCopy}
                  className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center active:scale-90 transition-transform">
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-primary" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Tap the copy icon to copy code</p>
            </div>
          )}
        </div>

        {/* Description */}
        {reward.description && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-2">About this Reward</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{reward.description}</p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {reward.min_order_value ? (
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Min Order</span>
              </div>
              <p className="text-sm font-semibold">₹{reward.min_order_value}</p>
            </div>
          ) : null}
          {reward.expires_at ? (
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Expires</span>
              </div>
              <p className="text-sm font-semibold">{new Date(reward.expires_at).toLocaleDateString()}</p>
            </div>
          ) : null}
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Category</span>
            </div>
            <p className="text-sm font-semibold capitalize">{reward.category || "General"}</p>
          </div>
          {reward.max_uses ? (
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Remaining</span>
              </div>
              <p className="text-sm font-semibold">{reward.max_uses - (reward.used_count || 0)} left</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RewardDetail;
