import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, Coins, Trophy, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import CountUp from "./CountUp";
import RippleButton from "./RippleButton";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface PointsRow {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

const tierFor = (pts: number) => {
  if (pts >= 5000) return { name: "Gold", color: "hsl(42 78% 55%)", next: null, min: 5000 };
  if (pts >= 1500) return { name: "Silver", color: "hsl(220 8% 75%)", next: 5000, min: 1500 };
  return { name: "Bronze", color: "hsl(28 60% 52%)", next: 1500, min: 0 };
};

interface Props { userId: string | null; }

export const ZenzoPointsWidget = ({ userId }: Props) => {
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<PointsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("zenzo_points")
        .select("id, points, type, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      const rows = (data || []) as PointsRow[];
      setHistory(rows);
      setTotal(rows.reduce((s, r) => s + (r.points || 0), 0));
    } catch (e) {
      console.warn("zenzo points load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const tier = tierFor(total);
  const progress = tier.next ? Math.min(((total - tier.min) / (tier.next - tier.min)) * 100, 100) : 100;

  const handleRedeem = () => {
    if (total < 100) { toast.error("Earn at least 100 points to redeem"); return; }
    haptic.success();
    toast.success("Redemption queued — rewards coming soon!");
  };

  if (loading) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.12 }}
          onClick={() => haptic.light()}
          className="zen-card-shimmer w-full rounded-[22px] p-4 mx-0 text-left relative"
          style={{
            background: "linear-gradient(180deg, #0e1014, #0a0c0f)",
            border: "2px solid rgba(255,255,255,0.04)",
            boxShadow: "0 18px 40px -22px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.025)",
          }}
        >
          <div className="flex items-center gap-3 relative z-10">
            <div
              className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center shrink-0"
              style={{
                background: `linear-gradient(135deg, ${tier.color}, ${tier.color.replace("55%", "38%")})`,
                boxShadow: `0 6px 20px ${tier.color.replace(")", " / 0.4)")}, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >
              <Sparkles className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[8px] font-bold tracking-[0.2em] uppercase font-sora" style={{ color: tier.color }}>
                  {tier.name} Tier
                </span>
              </div>
              <p className="zen-amount-hero text-[24px] leading-none" style={{ color: "hsl(var(--foreground))" }}>
                <CountUp value={total} /> <span className="text-[12px] text-muted-foreground/55 font-medium">pts</span>
              </p>
              {tier.next && (
                <div className="mt-2 h-[3px] rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${tier.color}, ${tier.color})`, boxShadow: `0 0 8px ${tier.color.replace(")", " / 0.5)")}` }}
                  />
                </div>
              )}
              <p className="text-[9px] text-muted-foreground/50 mt-1.5 font-sora">
                {tier.next ? `${tier.next - total} pts to ${tierFor(tier.next).name}` : "Top tier reached 🏆"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          </div>
        </motion.button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-[28px] border-t border-primary/20 bg-background max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-sora">
            <Sparkles className="w-5 h-5 text-primary" /> Zenzo Points
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 zen-balance-card rounded-[20px] p-5 text-center">
          <p className="text-[10px] tracking-[0.2em] uppercase font-bold font-sora" style={{ color: tier.color }}>
            {tier.name} Member
          </p>
          <p className="zen-amount-hero text-[44px] leading-none mt-2" style={{ color: tier.color }}>
            <CountUp value={total} />
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-sora">Total points earned</p>
        </div>

        <div className="mt-5">
          <RippleButton variant="primary" className="w-full" onClick={handleRedeem}>
            <Coins className="w-4 h-4" /> Redeem Points
          </RippleButton>
        </div>

        <div className="mt-6">
          <h4 className="text-[12px] font-bold mb-3 flex items-center gap-1.5 font-sora">
            <Trophy className="w-3.5 h-3.5 text-primary/70" /> Recent Activity
          </h4>
          {history.length === 0 ? (
            <div className="text-center py-10 rounded-[16px] bg-muted/10 border border-border/15">
              <p className="text-[12px] text-muted-foreground/50 font-sora">No points yet — start paying to earn!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((row) => (
                <div key={row.id} className="flex items-center justify-between p-3 rounded-[12px] bg-muted/15 border border-border/10">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold font-sora truncate">{row.description || row.type}</p>
                    <p className="text-[9px] text-muted-foreground/50 font-sora mt-0.5">
                      {new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className={`text-[13px] font-bold font-mono ${row.points >= 0 ? "text-success" : "text-destructive"}`}>
                    {row.points >= 0 ? "+" : ""}{row.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ZenzoPointsWidget;
