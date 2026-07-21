import { useState, useEffect } from "react";
import { fetchUserProfilesByIds, type UserProfile } from "../../api/userService";
import { logError } from "../../../shared/utils/errorHandling";

const profileCache = new Map<string, UserProfile | null>();

export const useUserProfiles = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfiles = async () => {
      const uniqueIds = [...new Set(userIds)].filter(Boolean);
      if (uniqueIds.length === 0) {
        setLoading(false);
        return;
      }

      const idsToFetch = uniqueIds.filter(id => !profileCache.has(id));
      const cachedProfiles: Record<string, UserProfile | null> = {};
      
      uniqueIds.forEach(id => {
        if (profileCache.has(id)) {
          cachedProfiles[id] = profileCache.get(id)!;
        }
      });

      if (idsToFetch.length === 0) {
        setProfiles(cachedProfiles);
        setLoading(false);
        return;
      }

      try {
        const data = await fetchUserProfilesByIds(idsToFetch);

        const fetchedProfiles: Record<string, UserProfile | null> = {};
        
        idsToFetch.forEach(id => {
          const profile = data.find(p => p.id === id) || null;
          profileCache.set(id, profile);
          fetchedProfiles[id] = profile;
        });

        setProfiles({ ...cachedProfiles, ...fetchedProfiles });
      } catch (error) {
        logError("userProfiles.load", error);
        idsToFetch.forEach(id => {
          profileCache.set(id, null);
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProfiles();
  }, [userIds.join(",")]);

  return { profiles, loading };
};

// Hook para un solo usuario
export const useUserProfile = (userId: string | null | undefined) => {
  const { profiles, loading } = useUserProfiles(userId ? [userId] : []);
  return {
    profile: userId ? profiles[userId] : null,
    loading,
  };
};
