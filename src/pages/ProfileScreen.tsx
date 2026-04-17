// Screen 16 — Profile: hero, count-up stats, weekly mini-chart, menu.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Shield, Users, Gauge, Bell, Gift, Headphones, FileText, Info, LogOut,
  ChevronRight, Pencil, BadgeCheck, Camera as CameraIcon, Image as ImageIcon, X, TrendingDown, TrendingUp,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useCountUp } from "@/hooks/useCountUp";
import { Capacitor } from "@capacitor/core";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  kyc_status: string | null;
  upi_id: string | null;
  created_at: string | null;
  pin_set_at: string | null;
}

interface DailyTotal { day: string; total: number; }

const APP_VERSION = "1.0.0";

// ─── Count-up stat tile ───
const StatTile = ({ label, value, prefix = "", suffix = "", delay, ready }: {
  label: string; value: number; prefix?: string; suffix?: string; delay: number; ready: boolean;
}) => {
  const animated = useCountUp(ready ? value : 0, 1100, ready);
  return (
    <div
      className="rounded-[16px] p-3 border border-white/[0.04] text-center"
      style={{
        background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
        animation: `prof-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
      }}
    >
      <p className="text-[14px] font-bold tracking-[-0.3px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {prefix}{animated.toLocaleString("en-IN")}{suffix}
      </p>
      <p className="text-[9px] text-white/30 font-medium mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
};

// ─── Weekly mini bar chart ───
const WeeklyChart = ({ data }: { data: DailyTotal[] }) => {
  const max = Math.max(1, ...data.map(d => d.total));
  return (
    <div className="flex items-end gap-1.5 h-[44px]">
      {data.map((d, i) => {
        const h = (d.total / max) * 100;
        const isToday = i === data.length - 1;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-[3px] transition-all"
                style={{
                  height: `${Math.max(h, 4)}%`,
                  background: isToday
                    ? "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
                    : "linear-gradient(180deg, hsl(var(--primary) / 0.45), hsl(var(--primary) / 0.18))",
                  animation: `bar-grow 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + i * 0.05}s both`,
                  transformOrigin: "bottom",
                }}
              />
            </div>
            <span className="text-[8px] text-white/25 font-medium">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Avatar source picker sheet ───
const SourceSheet = ({ onPick, onClose }: { onPick: (src: "camera" | "gallery") => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end" style={{ animation: "prof-fade 0.2s ease-out" }}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full rounded-t-[28px] border-t border-white/[0.08] p-6 pb-8"
      style={{
        background: "linear-gradient(180deg, hsl(220 20% 9%), hsl(220 22% 5%))",
        animation: "prof-sheet 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}>
      <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mb-5" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-bold">Change photo</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
          <X className="w-4 h-4 text-white/50" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onPick("camera")}
          className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-white/[0.06] active:scale-95 transition-transform"
          style={{ background: "linear-gradient(160deg, hsl(var(--primary) / 0.08), hsl(220 18% 7%))" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(var(--primary) / 0.12)" }}>
            <CameraIcon className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[12px] font-semibold">Camera</span>
        </button>
        <button onClick={() => onPick("gallery")}
          className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-white/[0.06] active:scale-95 transition-transform"
          style={{ background: "linear-gradient(160deg, hsl(var(--primary) / 0.08), hsl(220 18% 7%))" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(var(--primary) / 0.12)" }}>
            <ImageIcon className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[12px] font-semibold">Gallery</span>
        </button>
      </div>
    </div>
  </div>
);

// ─── Logout confirmation modal ───
const LogoutModal = ({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ animation: "prof-fade 0.2s ease-out" }}>
    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full max-w-sm rounded-[24px] border border-white/[0.08] p-6"
      style={{
        background: "linear-gradient(180deg, hsl(220 20% 10%), hsl(220 22% 6%))",
        animation: "prof-pop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}>
      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-destructive/30"
        style={{ background: "hsl(0 70% 50% / 0.1)" }}>
        <LogOut className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-[17px] font-bold text-center mb-1.5">Log out?</h3>
      <p className="text-[12px] text-white/50 text-center mb-5">You'll need to sign in again to access your account.</p>
      <div className="flex gap-2.5">
        <button onClick={onClose}
          className="flex-1 h-[46px] rounded-2xl text-[13px] font-semibold border border-white/[0.08] active:scale-[0.98]"
          style={{ background: "hsl(220 15% 10%)" }}>
          Cancel
        </button>
        <button onClick={onConfirm}
          className="flex-1 h-[46px] rounded-2xl text-[13px] font-bold text-destructive border border-destructive/30 active:scale-[0.98]"
          style={{ background: "hsl(0 70% 50% / 0.12)" }}>
          Log out
        </button>
      </div>
    </div>
  </div>
);

const ProfileScreen = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [memberMonths, setMemberMonths] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [parentName, setParentName] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<DailyTotal[]>([]);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);
  const [lastWeekTotal, setLastWeekTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [pRes, wRes, gRes, nRes, ptlRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("*").eq("user_id", user.id).single(),
        supabase.from("savings_goals").select("id").eq("teen_id", user.id),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
        supabase.from("parent_teen_links").select("parent_id").eq("teen_id", user.id).eq("is_active", true).maybeSingle(),
      ]);

      const p = pRes.data as Profile | null;
      // Backfill upi_id locally if missing but phone present
      if (p && !p.upi_id && p.phone) {
        const upi = `${p.phone}@auropay`;
        await supabase.from("profiles").update({ upi_id: upi }).eq("id", p.id);
        p.upi_id = upi;
      }
      setProfile(p);
      setWalletBalance(wRes.data?.balance || 0);
      setDailyLimit(wRes.data?.daily_limit || 0);
      setGoalCount(gRes.data?.length || 0);
      setUnreadNotif(nRes.count || 0);

      if (p?.created_at) {
        const months = Math.max(0, Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)));
        setMemberMonths(months);
      }

      if (ptlRes.data?.parent_id) {
        const { data: parent } = await supabase.from("profiles").select("full_name").eq("id", ptlRes.data.parent_id).single();
        setParentName(parent?.full_name || null);
      }

      if (wRes.data?.id) {
        const { data: txns } = await supabase
          .from("transactions")
          .select("amount, type, created_at")
          .eq("wallet_id", wRes.data.id)
          .eq("type", "debit")
          .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString());

        const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("wallet_id", wRes.data.id);
        setTxCount(count || 0);

        // Build last 7 days bucket
        const days: DailyTotal[] = [];
        const labels = ["S", "M", "T", "W", "T", "F", "S"];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          days.push({ day: labels[d.getDay()], total: 0 });
        }
        let weekTotal = 0;
        let prevWeekTotal = 0;
        const now = Date.now();
        (txns || []).forEach(tx => {
          const ts = new Date(tx.created_at!).getTime();
          const ageDays = Math.floor((now - ts) / 86400000);
          if (ageDays < 7) {
            weekTotal += tx.amount;
            const idx = 6 - ageDays;
            if (idx >= 0 && idx < 7) days[idx].total += tx.amount;
          } else if (ageDays < 14) {
            prevWeekTotal += tx.amount;
          }
        });
        setWeekly(days);
        setThisWeekTotal(weekTotal);
        setLastWeekTotal(prevWeekTotal);
      }

      setLoading(false);
    };
    load();
  }, []);

  const initials = useMemo(() =>
    profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?",
  [profile?.full_name]);

  const uploadAvatar = async (file: File | Blob, ext: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: `image/${ext}` });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
      if (updErr) throw updErr;
      setProfile(prev => prev ? { ...prev, avatar_url: pub.publicUrl } : prev);
      toast.success("Photo updated");
      haptic.success();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async () => {
    setShowSource(false);
    if (!Capacitor.isNativePlatform()) {
      // Web fallback: use input with capture
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "user";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) await uploadAvatar(file, file.name.split(".").pop() || "jpg");
      };
      input.click();
      return;
    }
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 80, allowEditing: true, resultType: CameraResultType.Base64, source: CameraSource.Camera,
      });
      if (photo.base64String) {
        const blob = await (await fetch(`data:image/${photo.format};base64,${photo.base64String}`)).blob();
        await uploadAvatar(blob, photo.format || "jpg");
      }
    } catch (e: any) {
      if (!String(e?.message || "").toLowerCase().includes("cancel")) toast.error("Camera unavailable");
    }
  };

  const pickFromGallery = async () => {
    setShowSource(false);
    if (!Capacitor.isNativePlatform()) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) await uploadAvatar(file, file.name.split(".").pop() || "jpg");
      };
      input.click();
      return;
    }
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 80, allowEditing: true, resultType: CameraResultType.Base64, source: CameraSource.Photos,
      });
      if (photo.base64String) {
        const blob = await (await fetch(`data:image/${photo.format};base64,${photo.base64String}`)).blob();
        await uploadAvatar(blob, photo.format || "jpg");
      }
    } catch (e: any) {
      if (!String(e?.message || "").toLowerCase().includes("cancel")) toast.error("Gallery unavailable");
    }
  };

  const handleLogout = async () => {
    setShowLogout(false);
    haptic.medium();
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Logged out");
  };

  const weekDelta = thisWeekTotal - lastWeekTotal;
  const weekDeltaAbs = Math.abs(weekDelta);

  const menuItems: { icon: any; label: string; path?: string; desc?: string; badge?: string | number; danger?: boolean; onClick?: () => void; }[] = [
    { icon: User, label: "Personal Information", path: "/personal-info", desc: "Name, phone, email" },
    { icon: Shield, label: "Security & PIN", path: "/security", desc: profile?.pin_set_at ? "PIN set" : "Set up PIN" } as any,
    { icon: Users, label: "Linked Parent Account", path: "/linked-parents", desc: parentName ? `Linked to ${parentName}` : "Connect a parent" },
    { icon: Gauge, label: "Spending Limits", path: "/spending-limits", desc: dailyLimit ? `Daily limit ₹${(dailyLimit / 100).toLocaleString("en-IN")}` : "Set limits" },
    { icon: Bell, label: "Notifications", path: "/notifications", desc: "Alert preferences", badge: unreadNotif > 0 ? unreadNotif : undefined },
    { icon: Gift, label: "Referral Program", path: "/referrals", desc: "Earn ₹50 per referral" },
    { icon: Headphones, label: "Help & Support", path: "/support-chat", desc: "Chat with AI assistant" },
    { icon: FileText, label: "Privacy Policy", path: "/about", desc: "How we handle your data" },
    { icon: Info, label: "About AuroPay", path: "/about", desc: `Version ${APP_VERSION}` },
    { icon: LogOut, label: "Log Out", danger: true, onClick: () => setShowLogout(true) },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <div className="px-5 pt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-3 w-40 bg-white/[0.04] rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[1,2,3,4].map(i => <div key={i} className="h-[60px] rounded-[16px] bg-white/[0.04] animate-pulse" />)}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[110px]"
          style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="relative z-10 px-5">
        {/* Hero card */}
        <div className="pt-6 mb-5" style={{ animation: "prof-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <div className="rounded-[24px] p-5 border border-white/[0.05] relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, hsl(var(--primary) / 0.06), hsl(220 18% 7%))" }}>
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-[0.07]"
              style={{ background: "hsl(var(--primary))" }} />

            <div className="relative flex items-start gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10" />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-[22px] font-bold ring-2 ring-white/10"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                      color: "hsl(220 22% 6%)",
                    }}>
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => { haptic.light(); setShowSource(true); }}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 ring-2 ring-background shadow-lg"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))" }}>
                  <Pencil className="w-3.5 h-3.5" style={{ color: "hsl(220 22% 6%)" }} />
                </button>
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-[19px] font-bold tracking-[-0.4px] truncate">{profile?.full_name || "Set your name"}</h1>
                <p className="text-[11px] text-white/40 mt-0.5">{profile?.phone || "—"}</p>
                {(() => {
                  const upiDisplay = profile?.upi_id || (profile?.phone ? `${profile.phone}@auropay` : "");
                  const canCopy = !!upiDisplay;
                  return (
                    <button
                      type="button"
                      disabled={!canCopy}
                      onClick={async () => {
                        if (!canCopy) return;
                        try {
                          await navigator.clipboard.writeText(upiDisplay);
                          haptic.light();
                          toast.success("UPI ID copied");
                        } catch {
                          toast.error("Couldn't copy UPI ID");
                        }
                      }}
                      className="text-[11px] mt-1.5 text-primary/85 truncate max-w-full text-left active:scale-[0.97] transition-transform disabled:opacity-60"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em" }}
                      aria-label="Copy UPI ID"
                    >
                      {upiDisplay || "—"}
                    </button>
                  );
                })()}
                {profile?.kyc_status === "verified" ? (
                  <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "hsl(152 65% 42% / 0.15)", color: "hsl(152 65% 60%)" }}>
                    <BadgeCheck className="w-3 h-3" />
                    KYC Verified
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 60%)" }}>
                    KYC {profile?.kyc_status || "pending"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <StatTile label="Balance" value={Math.floor(walletBalance / 100)} prefix="₹" delay={0.05} ready={!loading} />
          <StatTile label="Txns" value={txCount} delay={0.10} ready={!loading} />
          <StatTile label="Goals" value={goalCount} delay={0.15} ready={!loading} />
          <StatTile label="Months" value={memberMonths} delay={0.20} ready={!loading} />
        </div>

        {/* Spending insight strip */}
        <div className="mb-5 rounded-[20px] p-4 border border-white/[0.04]"
          style={{
            background: "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
            animation: "prof-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both",
          }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">This week</p>
              <p className="text-[16px] font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ₹{(thisWeekTotal / 100).toLocaleString("en-IN")}
              </p>
            </div>
            {lastWeekTotal > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  background: weekDelta < 0 ? "hsl(152 65% 42% / 0.12)" : "hsl(38 92% 50% / 0.12)",
                  color: weekDelta < 0 ? "hsl(152 65% 60%)" : "hsl(38 92% 60%)",
                }}>
                {weekDelta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                ₹{(weekDeltaAbs / 100).toLocaleString("en-IN")} {weekDelta < 0 ? "less" : "more"}
              </div>
            )}
          </div>
          <WeeklyChart data={weekly} />
        </div>

        {/* Menu */}
        <div className="space-y-1.5">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => {
                  haptic.light();
                  if (item.onClick) item.onClick();
                  else if (item.path) navigate(item.path);
                }}
                className="group w-full text-left rounded-[16px] border border-white/[0.04] p-3.5 flex items-center gap-3 active:scale-[0.99] transition-all hover:border-white/[0.08]"
                style={{
                  background: item.danger
                    ? "linear-gradient(160deg, hsl(0 70% 50% / 0.05), hsl(220 18% 7%))"
                    : "linear-gradient(160deg, hsl(220 18% 9%), hsl(220 20% 5.5%))",
                  animation: `prof-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + i * 0.04}s both`,
                }}>
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border"
                  style={{
                    background: item.danger ? "hsl(0 70% 50% / 0.1)" : "hsl(var(--primary) / 0.08)",
                    borderColor: item.danger ? "hsl(0 70% 50% / 0.2)" : "hsl(var(--primary) / 0.15)",
                  }}>
                  <Icon className="w-[18px] h-[18px]" style={{ color: item.danger ? "hsl(0 75% 65%)" : "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold ${item.danger ? "text-destructive" : ""}`}>{item.label}</p>
                  {item.desc && <p className="text-[10px] text-white/35 mt-0.5 truncate">{item.desc}</p>}
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold mr-1"
                    style={{ background: "hsl(var(--primary))", color: "hsl(220 22% 6%)" }}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-white/25 transition-transform group-hover:translate-x-1" />
              </button>
            );
          })}
        </div>
      </div>

      {showSource && <SourceSheet onPick={(s) => s === "camera" ? pickFromCamera() : pickFromGallery()} onClose={() => setShowSource(false)} />}
      {showLogout && <LogoutModal onConfirm={handleLogout} onClose={() => setShowLogout(false)} />}

      <BottomNav />

      <style>{`
        @keyframes prof-in    { 0% { opacity: 0; transform: translateY(14px) scale(0.98); } 100% { opacity: 1; transform: none; } }
        @keyframes prof-fade  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes prof-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes prof-pop   { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes bar-grow   { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  );
};

export default ProfileScreen;
