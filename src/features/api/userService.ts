import { supabase } from "../../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { logError } from "../../shared/utils/errorHandling";

export type UserPreferences = Record<string, unknown> & {
  themeMode?: "light" | "dark" | "solarized";
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  skills: string[];
  organization: string | null;
  avatar_url: string | null;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logError("users.fetchProfile", error);
    return null;
  }

  return data;
};

export const upsertUserProfile = async (
  userId: string,
  profile: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return data.publicUrl;
};

const getAvatarStoragePaths = (userId: string, avatarUrl?: string | null) => {
  const paths = new Set([
    `${userId}/avatar.jpg`,
    `${userId}/avatar.jpeg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
    `${userId}/avatar.gif`,
  ]);

  if (avatarUrl) {
    const marker = "/avatars/";
    const markerIndex = avatarUrl.indexOf(marker);
    if (markerIndex >= 0) {
      paths.add(decodeURIComponent(avatarUrl.slice(markerIndex + marker.length)));
    }
  }

  return [...paths];
};

export const removeAvatar = async (
  userId: string,
  avatarUrl?: string | null
): Promise<void> => {
  const paths = getAvatarStoragePaths(userId, avatarUrl);
  const { error } = await supabase.storage.from("avatars").remove(paths);

  if (error) throw error;
};

export const fetchUserProfilesByIds = async (userIds: string[]): Promise<UserProfile[]> => {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .in("id", userIds);

  if (error) throw error;
  return data ?? [];
};

export const ensureUserProfile = async (user: User): Promise<UserProfile | null> => {
  const existingProfile = await fetchUserProfile(user.id);
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const profile: Partial<UserProfile> & { id: string; updated_at: string } = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (fullName && !existingProfile?.full_name) {
    profile.full_name = fullName;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    logError("users.ensureProfile", error);
    return null;
  }

  return data;
};

export const ensureSessionProfile = async (session: Session | null): Promise<void> => {
  if (!session?.user) return;
  await ensureUserProfile(session.user);
};

export const getProviderAvatarUrl = (user: User): string | null => {
  const metadata = user.user_metadata ?? {};

  if (typeof metadata.avatar_url === "string" && metadata.avatar_url.trim()) {
    return metadata.avatar_url;
  }

  if (typeof metadata.picture === "string" && metadata.picture.trim()) {
    return metadata.picture;
  }

  return null;
};
