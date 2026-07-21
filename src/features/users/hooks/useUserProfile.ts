import { useState, useEffect } from "react";
import {
  fetchUserProfile,
  removeAvatar,
  upsertUserProfile,
  uploadAvatar,
  type UserProfile,
} from "../../api/userService";
import { logError } from "../../../shared/utils/errorHandling";

export const useUserProfile = (userId: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await fetchUserProfile(userId);
        setProfile(data);
      } catch (err) {
        logError("userProfile.load", err);
        setError("No se pudo cargar el perfil");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void loadProfile();
    }
  }, [userId]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>) => {
    try {
      const updated = await upsertUserProfile(userId, updates);
      setProfile(updated);
      setError(null);
    } catch (err) {
      logError("userProfile.update", err);
      setError("No se pudo actualizar el perfil");
      throw err;
    }
  };

  const updateAvatar = async (file: File) => {
    try {
      const avatarUrl = await uploadAvatar(userId, file);
      await updateProfile({
        avatar_url: avatarUrl,
      });
    } catch (err) {
      logError("userProfile.uploadAvatar", err);
      setError("No se pudo subir el avatar");
      throw err;
    }
  };

  const deleteAvatar = async () => {
    try {
      await removeAvatar(userId, profile?.avatar_url);
      await updateProfile({
        avatar_url: null,
      });
    } catch (err) {
      logError("userProfile.deleteAvatar", err);
      setError("No se pudo quitar el avatar");
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateAvatar,
    deleteAvatar,
  };
};
