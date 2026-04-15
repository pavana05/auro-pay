import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const PersonalInfo = () => {
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };
    load();
  }, []);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url);
    setUploading(false);
    toast.success("Profile picture updated!");
  };

  const saveProfile = async () => {
    if (!fullName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      phone: phone.trim(),
    }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
    setSaving(false);
  };

  const initials = fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  if (loading) return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        <div className="w-32 h-5 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">Personal Info</h1>
      </div>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-primary/30" />
          ) : (
            <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full gradient-primary flex items-center justify-center border-2 border-background"
          >
            <Camera className="w-4 h-4 text-primary-foreground" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </div>
        {uploading && <p className="text-xs text-muted-foreground mt-2">Uploading...</p>}
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className="input-auro w-full" placeholder="Your full name" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Phone Number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="input-auro w-full" placeholder="+91 XXXXX XXXXX" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
          <div className="input-auro w-full flex items-center text-muted-foreground text-sm">{profile?.id ? "Linked to auth account" : "—"}</div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">KYC Status</label>
          <div className={`input-auro w-full flex items-center text-sm ${profile?.kyc_status === "verified" ? "text-success" : "text-warning"}`}>
            {profile?.kyc_status === "verified" ? "✓ Verified" : "⏳ Pending"}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Member Since</label>
          <div className="input-auro w-full flex items-center text-muted-foreground text-sm">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
          </div>
        </div>
      </div>

      <button onClick={saveProfile} disabled={saving} className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm mt-8 flex items-center justify-center gap-2">
        {saving ? "Saving..." : <><Check className="w-4 h-4" /> Save Changes</>}
      </button>

      <BottomNav />
    </div>
  );
};

export default PersonalInfo;
