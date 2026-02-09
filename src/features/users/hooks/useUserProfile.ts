import { useState, useEffect } from "react";
import { fetchUserProfile, upsertUserProfile, uploadAvatar, type UserProfile } from "../../api/userService";

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
        console.error("Error cargando perfil:", err);
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
      console.error("Error actualizando perfil:", err);
      setError("No se pudo actualizar el perfil");
      throw err;
    }
  };

  const updateAvatar = async (file: File) => {
    try {
      const avatarUrl = await uploadAvatar(userId, file);
      await updateProfile({ avatar_url: avatarUrl });
    } catch (err) {
      console.error("Error subiendo avatar:", err);
      setError("No se pudo subir el avatar");
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateAvatar,
  };
};