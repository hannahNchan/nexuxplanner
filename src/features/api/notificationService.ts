import { supabase } from "../../lib/supabase";

export type UserNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  project_id: string | null;
  task_id: string | null;
  type: "task_assigned";
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export const fetchUnreadNotifications = async (
  userId: string
): Promise<UserNotification[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  return (data ?? []) as UserNotification[];
};

export const markNotificationRead = async (
  notificationId: string
): Promise<void> => {
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
};

export const subscribeToUserNotifications = (
  userId: string,
  onChange: () => void
) =>
  supabase
    .channel(`user-notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe();
