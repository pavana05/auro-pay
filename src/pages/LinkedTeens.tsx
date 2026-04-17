import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, UserPlus, Phone, Loader2, Check, X, Wallet, Calendar, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone");

interface TeenLink {
  id: string;
  teen_id: string;
  is_active: boolean;
  pocket_money_amount: number | null;
  pocket_money_frequency: string | null;
  pocket_money_day: number | null;
  created_at: string | null;
  teen_name?: string;
  teen_avatar?: string | null;
}

type LookupState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; profile: { id: string; full_name: string | null; avatar_url: string | null } }
  | { status: "missing" }
  | { status: "already_linked" }
  | { status: "error"; message?: string };

const LinkedTeens = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [links, setLinks] = useState<TeenLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-teen sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [linking, setLinking] = useState(false);

  // Pause confirm dialog
  const [pauseTarget, setPauseTarget] = useState<TeenLink | null>(null);

  const loadLinks = async (uid: string) => {
    const { data } = await supabase.from("parent_teen_links").select("*").eq("parent_id", uid);
    if (!data || data.length === 0) {
      setLinks([]);
      return;
    }
    const teenIds = data.map((l) => l.teen_id);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", teenIds);
    const map: Record<string, { name: string; avatar: string | null }> = {};
    profiles?.forEach((p) => { map[p.id] = { name: p.full_name || "Teen", avatar: p.avatar_url }; });
    setLinks(data.map((l) => ({ ...l, teen_name: map[l.teen_id]?.name || "Teen", teen_avatar: map[l.teen_id]?.avatar })));
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);
      await loadLinks(user.id);
      setLoading(false);
    })();
  }, [navigate]);

  /* ---------- Lookup (debounced) ---------- */
  useEffect(() => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length !== 10) { setLookup({ status: "idle" }); return; }
    const v = phoneSchema.safeParse(cleaned);
    if (!v.success) { setLookup({ status: "idle" }); return; }

    const t = setTimeout(async () => {
      setLookup({ status: "searching" });
      try {
        const { data, error } = await (supabase.rpc as any)("lookup_teen_by_phone", { _phone: cleaned });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) { setLookup({ status: "missing" }); return; }
        // Already linked?
        if (links.some((l) => l.teen_id === row.id)) {
          setLookup({ status: "already_linked" });
          return;
        }
        setLookup({ status: "found", profile: { id: row.id, full_name: row.full_name, avatar_url: row.avatar_url } });
      } catch (e: any) {
        setLookup({ status: "error", message: e?.message });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [phone, links]);

  const openSheet = () => {
    setPhone("");
    setLookup({ status: "idle" });
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setPhone("");
    setLookup({ status: "idle" });
  };

  const handleLink = async () => {
    if (!userId || lookup.status !== "found") return;
    setLinking(true);
    try {
      const { error } = await supabase.from("parent_teen_links").insert({
        parent_id: userId,
        teen_id: lookup.profile.id,
        is_active: true,
      });
      if (error) throw error;
      // Notify the teen in real-time via notifications insert
      await supabase.from("notifications").insert({
        user_id: lookup.profile.id,
        title: "Parent linked 🎉",
        body: "Your parent just connected with you on AuroPay 🎉",
        type: "parent_link",
      });
      toast.success(`Linked with ${lookup.profile.full_name || "teen"}`);
      await loadLinks(userId);
      closeSheet();
    } catch (e: any) {
      toast.error(e.message || "Couldn't link teen");
    } finally {
      setLinking(false);
    }
  };

  const performToggle = async (link: TeenLink) => {
    const { error } = await supabase
      .from("parent_teen_links")
      .update({ is_active: !link.is_active })
      .eq("id", link.id);
    if (error) { toast.error(error.message); return; }
    toast.success(link.is_active ? "Paused" : "Reactivated");
    if (userId) await loadLinks(userId);
  };

  const handleToggle = (link: TeenLink) => {
    if (link.is_active) {
      setPauseTarget(link);
    } else {
      performToggle(link);
    }
  };

  const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold flex-1">Linked Teens</h1>
        <button
          onClick={openSheet}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
            color: "hsl(220 15% 5%)",
            boxShadow: "0 8px 20px hsl(42 78% 55% / 0.4)",
          }}
          aria-label="Add teen"
        >
          <UserPlus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : links.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No teens linked yet</p>
          <p className="text-xs text-muted-foreground mb-5">Add a teen to track their spending and send pocket money</p>
          <button
            onClick={openSheet}
            className="h-11 px-5 rounded-full text-[13px] font-bold inline-flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
              color: "hsl(220 15% 5%)",
              boxShadow: "0 10px 28px hsl(42 78% 55% / 0.4)",
            }}
          >
            <UserPlus className="w-4 h-4" /> Add a teen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="rounded-xl bg-card border border-border card-glow p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[24px] shrink-0"
                  style={{
                    background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
                    boxShadow: "0 6px 16px hsl(42 78% 55% / 0.35)",
                    color: "hsl(220 15% 5%)",
                  }}
                >
                  {link.teen_avatar || (link.teen_name?.[0]?.toUpperCase() || "T")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{link.teen_name}</p>
                  <span className={`text-xs ${link.is_active ? "text-success" : "text-muted-foreground"}`}>
                    {link.is_active ? "● Active" : "○ Paused"}
                  </span>
                </div>
                <button
                  onClick={() => handleToggle(link)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full"
                  style={{
                    background: link.is_active ? "hsl(0 0% 100% / 0.06)" : "hsl(42 78% 55% / 0.15)",
                    color: link.is_active ? "hsl(0 0% 100% / 0.7)" : "hsl(42 90% 75%)",
                  }}
                >
                  {link.is_active ? "Pause" : "Resume"}
                </button>
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
              <div className="flex items-center justify-between mt-3">
                {link.created_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Linked {new Date(link.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/parent/teen/${link.teen_id}`)}
                  className="text-[11px] font-bold text-primary"
                >
                  View details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Teen Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "lt-fade 0.2s ease-out" }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeSheet} />
          <div
            className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
            style={{
              background: "linear-gradient(180deg, hsl(220 20% 9%), hsl(220 22% 5%))",
              animation: "lt-sheet 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold">Link a teen</h3>
              <button onClick={closeSheet} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            <label className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 block">TEEN'S PHONE</label>
            <div
              className="w-full h-14 rounded-2xl px-4 flex items-center gap-3 transition-all"
              style={{
                background: "hsl(0 0% 100% / 0.04)",
                border: `1.5px solid ${phone.length === 10 ? "hsl(42 78% 55% / 0.5)" : "hsl(0 0% 100% / 0.1)"}`,
                boxShadow: phone.length === 10 ? "0 0 16px hsl(42 78% 55% / 0.2)" : "none",
              }}
            >
              <Phone className="w-4 h-4" style={{ color: phone.length === 10 ? "hsl(42 90% 70%)" : "hsl(0 0% 100% / 0.4)" }} />
              <span className="text-[15px] text-white/50">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98765 43210"
                maxLength={10}
                className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-white/30 font-medium tracking-wider"
                autoFocus
              />
              {lookup.status === "searching" && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(42 90% 70%)" }} />}
              {lookup.status === "found" && <Check className="w-4 h-4" strokeWidth={3} style={{ color: "hsl(140 60% 60%)" }} />}
            </div>

            {/* Result */}
            <div className="mt-4 min-h-[80px]">
              {lookup.status === "found" && (
                <div
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{
                    background: "linear-gradient(135deg, hsl(42 78% 55% / 0.1), hsl(42 78% 55% / 0.03))",
                    border: "1.5px solid hsl(42 78% 55% / 0.4)",
                    animation: "lt-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-[24px] shrink-0"
                    style={{
                      background: "linear-gradient(135deg, hsl(42 95% 70%), hsl(42 78% 55%))",
                      boxShadow: "0 8px 20px hsl(42 78% 55% / 0.4)",
                    }}
                  >
                    {lookup.profile.avatar_url || "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "hsl(140 60% 65%)" }}>Teen found</p>
                    <p className="font-bold text-[15px] text-white truncate">{lookup.profile.full_name || "Unnamed teen"}</p>
                  </div>
                </div>
              )}
              {lookup.status === "already_linked" && (
                <div className="rounded-2xl p-4 text-[12px]" style={{ background: "hsl(42 78% 55% / 0.08)", border: "1.5px solid hsl(42 78% 55% / 0.3)", color: "hsl(42 90% 75%)" }}>
                  This teen is already linked to your account.
                </div>
              )}
              {lookup.status === "missing" && (
                <div className="rounded-2xl p-4 text-[12px]" style={{ background: "hsl(0 0% 100% / 0.04)", border: "1.5px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 100% / 0.55)" }}>
                  No teen account found with this number. They need to sign up first.
                </div>
              )}
              {lookup.status === "error" && (
                <div className="rounded-2xl p-4 text-[12px]" style={{ background: "hsl(0 70% 50% / 0.08)", border: "1.5px solid hsl(0 70% 50% / 0.3)", color: "hsl(0 80% 75%)" }}>
                  {lookup.message || "Couldn't search right now."}
                </div>
              )}
            </div>

            <button
              onClick={handleLink}
              disabled={lookup.status !== "found" || linking}
              className="mt-5 w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[14px] active:scale-[0.97] transition disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, hsl(42 95% 70%) 0%, hsl(42 78% 55%) 60%, hsl(38 80% 45%) 100%)",
                color: "hsl(220 15% 5%)",
                boxShadow: "0 14px 40px hsl(42 78% 55% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
              }}
            >
              {linking ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Link teen</>}
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={!!pauseTarget} onOpenChange={(o) => !o && setPauseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Pause {pauseTarget?.teen_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              While paused, scheduled pocket money transfers will be suspended and won't be sent until you resume the link. You can resume at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pauseTarget) performToggle(pauseTarget);
                setPauseTarget(null);
              }}
            >
              Pause link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />

      <style>{`
        @keyframes lt-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lt-sheet {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes lt-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LinkedTeens;
