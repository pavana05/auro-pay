import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useAppSettings } from "@/hooks/useAppSettings";

export const useRealtimeNotifications = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const { isOn, loading } = useAppSettings();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    // Honor admin toggle: if realtime notifications are OFF, never subscribe.
    if (loading) return;
    if (!isOn("realtime_notifications")) return;
    if (!userId) return;

    const channel = supabase
      .channel("realtime-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "friendships",
        filter: `friend_id=eq.${userId}`,
      }, () => {
        haptic.light();
        toast("👋 New friend request!", { description: "Someone wants to connect with you" });
        insertNotification(userId, "Friend Request", "You received a new friend request", "friend_request");
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chores",
        filter: `teen_id=eq.${userId}`,
      }, (payload: any) => {
        haptic.medium();
        toast("📋 New chore assigned!", { description: payload.new?.title || "Check your chores" });
        insertNotification(userId, "New Chore", payload.new?.title || "A new chore was assigned to you", "chore");
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ticket_messages",
        filter: `is_admin=eq.true`,
      }, () => {
        haptic.light();
        toast("💬 Support reply", { description: "You got a response from support" });
        insertNotification(userId, "Support Reply", "You received a reply on your support ticket", "support");
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const n = payload.new || {};
        if (["friend_request", "chore", "support"].includes(n.type)) return;
        haptic.light();
        toast(n.title || "Notification", { description: n.body || undefined });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loading, isOn]);
};

const insertNotification = async (userId: string, title: string, body: string, type: string) => {
  await supabase.from("notifications").insert({ user_id: userId, title, body, type });
};
