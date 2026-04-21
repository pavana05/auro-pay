import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { SkeletonRow, EmptyState } from "@/components/feedback";

interface ParentLink {
  id: string;
  parent_id: string;
  is_active: boolean;
  pocket_money_amount: number | null;
  pocket_money_frequency: string | null;
  pocket_money_day: number | null;
  created_at: string | null;
  parent_name?: string;
}

const LinkedParents = () => {
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const back = useSafeBack();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("parent_teen_links").select("*").eq("teen_id", user.id);
      if (data && data.length > 0) {
        // Fetch parent names
        const parentIds = data.map(l => l.parent_id);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", parentIds);
        const nameMap: Record<string, string> = {};
        profiles?.forEach(p => { nameMap[p.id] = p.full_name || "Parent"; });
        setLinks(data.map(l => ({ ...l, parent_name: nameMap[l.parent_id] || "Parent" })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <PageHeader title="Linked Parents" fallback="/profile" sticky={false} />

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <SkeletonRow key={i} className="h-24" />)}</div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-primary/70" />}
          title="No linked parents yet"
          description="Ask your parent to link their account with yours to start receiving pocket money."
        />
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="rounded-xl bg-card border border-border card-glow p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {link.parent_name?.[0]?.toUpperCase() || "P"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{link.parent_name}</p>
                  <span className={`text-xs ${link.is_active ? "text-success" : "text-muted-foreground"}`}>
                    {link.is_active ? "● Active" : "○ Inactive"}
                  </span>
                </div>
              </div>
              {link.pocket_money_amount && link.pocket_money_amount > 0 && (
                <div className="flex gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                  <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    <span>{fmt(link.pocket_money_amount)} / {link.pocket_money_frequency || "month"}</span>
                  </div>
                  {link.pocket_money_day && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Day {link.pocket_money_day}</span>
                    </div>
                  )}
                </div>
              )}
              {link.created_at && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Linked on {new Date(link.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default LinkedParents;
