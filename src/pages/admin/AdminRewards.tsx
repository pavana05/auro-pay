import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Gift, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Copy, Check, Tag, Clock, Users, Zap, Upload, Image, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  is_active: boolean | null;
  created_at: string | null;
}

interface Redemption {
  id: string;
  reward_id: string;
  user_id: string;
  redeemed_at: string;
}

const categories = ["general", "food", "shopping", "entertainment", "travel", "education"];

const AdminRewards = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", coupon_code: "", discount_type: "percentage",
    discount_value: 0, min_order_value: 0, max_uses: 0,
    expires_at: "", image_url: "", category: "general", is_active: true,
  });

  const fetchRewards = async () => {
    const { data } = await supabase.from("rewards").select("*").order("created_at", { ascending: false });
    if (data) setRewards(data as unknown as Reward[]);
    setLoading(false);
  };

  const fetchRedemptions = async () => {
    const { data } = await supabase.from("reward_redemptions").select("*").order("redeemed_at", { ascending: false }).limit(100);
    if (data) setRedemptions(data as unknown as Redemption[]);
  };

  useEffect(() => {
    fetchRewards();
    fetchRedemptions();
    const channel = supabase.channel("admin-rewards")
      .on("postgres_changes", { event: "*", schema: "public", table: "rewards" }, () => fetchRewards())
      .on("postgres_changes", { event: "*", schema: "public", table: "reward_redemptions" }, () => { fetchRedemptions(); fetchRewards(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", coupon_code: "", discount_type: "percentage", discount_value: 0, min_order_value: 0, max_uses: 0, expires_at: "", image_url: "", category: "general", is_active: true });
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `reward-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage.from("reward-images").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("reward-images").getPublicUrl(data.path);
    const publicUrl = urlData.publicUrl;
    setForm(f => ({ ...f, image_url: publicUrl }));
    setImagePreview(publicUrl);
    setUploading(false);
    toast.success("Image uploaded!");
  };

  const handleSubmit = async () => {
    if (!form.title || !form.coupon_code) { toast.error("Title and coupon code are required"); return; }
    const payload: any = {
      title: form.title, description: form.description || null, coupon_code: form.coupon_code.toUpperCase(),
      discount_type: form.discount_type, discount_value: form.discount_value,
      min_order_value: form.min_order_value || null, max_uses: form.max_uses || null,
      expires_at: form.expires_at || null, image_url: form.image_url || null,
      category: form.category, is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from("rewards").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Reward updated");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      const { error } = await supabase.from("rewards").insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Reward created");
    }
    resetForm();
  };

  const handleEdit = (r: Reward) => {
    setForm({
      title: r.title, description: r.description || "", coupon_code: r.coupon_code,
      discount_type: r.discount_type, discount_value: r.discount_value,
      min_order_value: r.min_order_value || 0, max_uses: r.max_uses || 0,
      expires_at: r.expires_at ? r.expires_at.slice(0, 16) : "", image_url: r.image_url || "",
      category: r.category || "general", is_active: r.is_active ?? true,
    });
    setImagePreview(r.image_url || null);
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("rewards").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else toast.success("Reward deleted");
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("rewards").update({ is_active: !current }).eq("id", id);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "AURO";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, coupon_code: code }));
  };

  const filtered = rewards.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.coupon_code.toLowerCase().includes(search.toLowerCase())
  );

  // Redemption stats
  const totalRedemptions = redemptions.length;
  const todayRedemptions = redemptions.filter(r => r.redeemed_at?.startsWith(new Date().toISOString().split("T")[0])).length;
  const topReward = rewards.reduce<Reward | null>((best, r) => (!best || (r.used_count || 0) > (best.used_count || 0)) ? r : best, null);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Rewards & Coupons</h1>
              <p className="text-xs text-muted-foreground">{rewards.length} total rewards</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Add Reward
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Active", value: rewards.filter(r => r.is_active).length, icon: Tag, color: "text-emerald-400" },
            { label: "Expired", value: rewards.filter(r => r.expires_at && new Date(r.expires_at) < new Date()).length, icon: Clock, color: "text-orange-400" },
            { label: "Total Used", value: rewards.reduce((s, r) => s + (r.used_count || 0), 0), icon: Users, color: "text-blue-400" },
            { label: "Today's Redemptions", value: todayRedemptions, icon: TrendingUp, color: "text-primary" },
            { label: "Top Reward", value: topReward?.used_count || 0, icon: BarChart3, color: "text-purple-400", sub: topReward?.title },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              {"sub" in s && s.sub && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search rewards..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-card border-border" />
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 animate-fade-in">
            <h3 className="font-semibold">{editingId ? "Edit Reward" : "Create Reward"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Reward Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              <div className="flex gap-2">
                <Input placeholder="Coupon Code *" value={form.coupon_code} onChange={e => setForm(f => ({ ...f, coupon_code: e.target.value.toUpperCase() }))} className="rounded-xl font-mono" />
                <Button variant="outline" size="icon" onClick={generateCode} title="Auto-generate" className="shrink-0 rounded-xl">
                  <Zap className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
            <div className="grid grid-cols-3 gap-4">
              <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed (₹)</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Discount Value" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} className="rounded-xl" />
              <Input type="number" placeholder="Min Order Value" value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: Number(e.target.value) }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input type="number" placeholder="Max Uses (0=unlimited)" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))} className="rounded-xl" />
              <Input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className="rounded-xl" />
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Promotional Banner</label>
              <div className="flex items-start gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 hover:border-primary/40 ${uploading ? "opacity-50 pointer-events-none" : "border-border"}`}>
                    {imagePreview || form.image_url ? (
                      <div className="relative">
                        <img src={imagePreview || form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                        <div className="absolute inset-0 bg-background/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <p className="text-xs font-medium">Click to replace</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                          {uploading ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{uploading ? "Uploading..." : "Click to upload banner"}</p>
                          <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
                {(imagePreview || form.image_url) && (
                  <Button variant="outline" size="sm" className="rounded-xl mt-2" onClick={() => { setForm(f => ({ ...f, image_url: "" })); setImagePreview(null); }}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="mt-2">
                <Input placeholder="Or paste image URL" value={form.image_url} onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); setImagePreview(e.target.value); }}
                  className="rounded-xl text-xs" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} className="rounded-xl">{editingId ? "Update" : "Create"} Reward</Button>
              <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        )}

        {/* Rewards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No rewards found</div>
          ) : filtered.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all duration-200">
              {/* Thumbnail */}
              {r.image_url ? (
                <img src={r.image_url} alt={r.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ${r.is_active ? "bg-primary/10" : "bg-muted"}`}>
                  🎁
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm truncate">{r.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-mono bg-primary/5 text-primary px-2 py-0.5 rounded">{r.coupon_code}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.discount_type === "percentage" ? `${r.discount_value}% off` : `₹${r.discount_value} off`}
                  </span>
                  <span className="text-xs text-muted-foreground">Used: {r.used_count || 0}{r.max_uses ? `/${r.max_uses}` : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(r.coupon_code, r.id)}>
                  {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(r.id, r.is_active ?? true)}>
                  {r.is_active ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Redemptions */}
        {redemptions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Recent Redemptions
            </h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
              {redemptions.slice(0, 10).map(rd => {
                const reward = rewards.find(r => r.id === rd.reward_id);
                return (
                  <div key={rd.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">🎫</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{reward?.title || "Unknown Reward"}</p>
                      <p className="text-[10px] text-muted-foreground">{reward?.coupon_code}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(rd.redeemed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRewards;
