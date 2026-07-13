import { supabase } from "../../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

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
    console.error("Error fetching profile:", error);
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

  // Subir archivo
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  // Obtener URL pública
  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return data.publicUrl;
};

export const ensureUserProfile = async (user: User): Promise<UserProfile | null> => {
  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : null;
  const profile: Partial<UserProfile> & { id: string; updated_at: string } = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (fullName) {
    profile.full_name = fullName;
  }

  if (avatarUrl) {
    profile.avatar_url = avatarUrl;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Error ensuring profile:", error);
    return null;
  }

  return data;
};

export const ensureSessionProfile = async (session: Session | null): Promise<void> => {
  if (!session?.user) return;
  await ensureUserProfile(session.user);
};
