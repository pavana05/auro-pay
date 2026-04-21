import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Plus, CheckCircle2, Clock, XCircle, Camera, Trophy, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/feedback";

interface Chore {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  due_date: string | null;
  is_recurring: boolean;
  recurrence: string;
  parent_id: string;
  teen_id: string;
  created_at: string;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "To Do" },
  in_progress: { icon: Sparkles, color: "text-blue-400", bg: "bg-blue-400/10", label: "In Progress" },
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Done" },
  approved: { icon: Trophy, color: "text-primary", bg: "bg-primary/10", label: "Approved ✨" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
};

const Chores = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"teen" | "parent">("teen");
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [newChore, setNewChore] = useState({ title: "", description: "", reward_amount: 50, due_date: "", is_recurring: false, recurrence: "weekly" });
  const [teens, setTeens] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedTeen, setSelectedTeen] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role === "parent" ? "parent" : "teen";
    setUserRole(role);

    if (role === "parent") {
      const { data: links } = await supabase.from("parent_teen_links").select("teen_id").eq("parent_id", user.id).eq("is_active", true);
      if (links?.length) {
        const teenIds = links.map(l => l.teen_id);
        const { data: teenProfiles } = await supabase.from("profiles").select("id, full_name").in("id", teenIds);
        setTeens((teenProfiles as any) || []);
        if (teenIds.length) setSelectedTeen(teenIds[0]);
      }
      const { data } = await supabase.from("chores").select("*").eq("parent_id", user.id).order("created_at", { ascending: false });
      setChores((data as any) || []);
    } else {
      const { data } = await supabase.from("chores").select("*").eq("teen_id", user.id).order("created_at", { ascending: false });
      setChores((data as any) || []);
    }
    setLoading(false);
  };

  const handleAddChore = async () => {
    if (!newChore.title || !selectedTeen) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    haptic.medium();

    const { error } = await supabase.from("chores").insert({
      parent_id: user.id,
      teen_id: selectedTeen,
      title: newChore.title,
      description: newChore.description || null,
      reward_amount: newChore.reward_amount * 100,
      due_date: newChore.due_date || null,
      is_recurring: newChore.is_recurring,
      recurrence: newChore.recurrence,
    });

    if (!error) {
      toast.ok("Chore assigned");
      haptic.success();
      setShowAdd(false);
      setNewChore({ title: "", description: "", reward_amount: 50, due_date: "", is_recurring: false, recurrence: "weekly" });
      fetchData();
    } else {
      toast.fail("Couldn't add chore");
    }
  };

  const handleStatusUpdate = async (choreId: string, newStatus: string) => {
    haptic.light();
    const updates: any = { status: newStatus };
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();
    if (newStatus === "approved") updates.approved_at = new Date().toISOString();

    const { error } = await supabase.from("chores").update(updates).eq("id", choreId);
    if (!error) {
      if (newStatus === "approved") haptic.success();
      toast.ok(newStatus === "approved" ? "Chore approved" : `Status updated`);
      fetchData();
    }
  };

  const filtered = filter === "all" ? chores : chores.filter(c => c.status === filter);
  const totalEarned = chores.filter(c => c.status === "approved").reduce((s, c) => s + c.reward_amount, 0);

  const filters = [
    { key: "all", label: "All" },
    { key: "pending", label: "To Do" },
    { key: "completed", label: "Review" },
    { key: "approved", label: "Done" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => back()} className="p-2 -ml-2 rounded-xl hover:bg-card/50 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Chores & Tasks</h1>
          {userRole === "parent" && (
            <button onClick={() => { haptic.light(); setShowAdd(true); }} className="p-2 -mr-2 rounded-xl bg-primary/10 text-primary active:scale-90 transition-all">
              <Plus className="w-5 h-5" />
            </button>
          )}
          {userRole === "teen" && <div className="w-9" />}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">
        {/* Earnings card */}
        <div style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl">💰</div>
              <div>
                <p className="text-xs text-muted-foreground">{userRole === "parent" ? "Total Rewards Given" : "Total Earned"}</p>
                <p className="text-2xl font-bold">₹{(totalEarned / 100).toLocaleString()}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-bold">{chores.filter(c => c.status === "pending" || c.status === "in_progress").length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ animation: "slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => { haptic.light(); setFilter(f.key); }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-card/50 text-muted-foreground border border-border/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Chore list */}
        <div className="space-y-3">
          {filtered.map((chore, i) => {
            const cfg = statusConfig[chore.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div
                key={chore.id}
                style={{ animation: `slide-up-spring 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.25 + i * 0.06}s both` }}
                className="p-4 rounded-2xl bg-card/50 border border-border/30 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{chore.title}</p>
                    {chore.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{chore.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {chore.due_date && (
                        <span className="text-[10px] text-muted-foreground">Due: {new Date(chore.due_date).toLocaleDateString()}</span>
                      )}
                      {chore.is_recurring && <span className="text-[10px] text-primary">🔄 {chore.recurrence}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">₹{(chore.reward_amount / 100).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">reward</p>
                  </div>
                </div>

                {/* Action buttons */}
                {userRole === "teen" && chore.status === "pending" && (
                  <button
                    onClick={() => handleStatusUpdate(chore.id, "completed")}
                    className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold active:scale-[0.97] transition-all"
                  >
                    Mark as Done ✅
                  </button>
                )}
                {userRole === "parent" && chore.status === "completed" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(chore.id, "approved")}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold active:scale-[0.97] transition-all"
                    >
                      Approve ✅
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(chore.id, "rejected")}
                      className="flex-1 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold active:scale-[0.97] transition-all"
                    >
                      Reject ❌
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-primary/70" />}
            title="No chores here yet"
            description={userRole === "parent" ? "Tap + to assign your first chore." : "You're all caught up — check back soon."}
          />
        )}
      </div>

      {/* Add Chore Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-card border-t border-border/50 rounded-t-3xl p-6 space-y-4"
            style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto" />
            <h2 className="text-lg font-bold">New Chore</h2>

            {teens.length > 1 && (
              <select
                value={selectedTeen}
                onChange={e => setSelectedTeen(e.target.value)}
                className="w-full h-11 rounded-xl bg-background border border-border px-3 text-sm"
              >
                {teens.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            )}

            <input
              placeholder="Chore title..."
              value={newChore.title}
              onChange={e => setNewChore(p => ({ ...p, title: e.target.value }))}
              className="w-full h-11 rounded-xl bg-background border border-border px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <textarea
              placeholder="Description (optional)"
              value={newChore.description}
              onChange={e => setNewChore(p => ({ ...p, description: e.target.value }))}
              className="w-full h-20 rounded-xl bg-background border border-border px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Reward (₹)</label>
                <input
                  type="number"
                  value={newChore.reward_amount}
                  onChange={e => setNewChore(p => ({ ...p, reward_amount: +e.target.value }))}
                  className="w-full h-11 rounded-xl bg-background border border-border px-4 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={newChore.due_date}
                  onChange={e => setNewChore(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full h-11 rounded-xl bg-background border border-border px-4 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newChore.is_recurring}
                onChange={e => setNewChore(p => ({ ...p, is_recurring: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm">Recurring chore</span>
              {newChore.is_recurring && (
                <select
                  value={newChore.recurrence}
                  onChange={e => setNewChore(p => ({ ...p, recurrence: e.target.value }))}
                  className="ml-auto h-8 rounded-lg bg-background border border-border px-2 text-xs"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </label>

            <button
              onClick={handleAddChore}
              disabled={!newChore.title}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.97] transition-all disabled:opacity-50"
            >
              Assign Chore 📋
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Chores;
