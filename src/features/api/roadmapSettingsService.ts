import { supabase } from "../../lib/supabase";
import { logError } from "../../shared/utils/errorHandling";

export type RoadmapSettings = {
  id: string;
  user_id: string;
  project_id: string;
  child_level_issue_scheduling: boolean;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_ROADMAP_SETTINGS = {
  child_level_issue_scheduling: false,
};

export const fetchRoadmapSettings = async (
  userId: string,
  projectId: string | null
): Promise<typeof DEFAULT_ROADMAP_SETTINGS> => {
  if (!projectId) {
    return DEFAULT_ROADMAP_SETTINGS;
  }

  const { data, error } = await supabase
    .from("roadmap_settings")
    .select("child_level_issue_scheduling")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    logError("roadmapSettings.fetch", error);
    return DEFAULT_ROADMAP_SETTINGS;
  }

  return data ?? DEFAULT_ROADMAP_SETTINGS;
};

export const upsertRoadmapSettings = async (
  userId: string,
  projectId: string,
  settings: Partial<typeof DEFAULT_ROADMAP_SETTINGS>
): Promise<typeof DEFAULT_ROADMAP_SETTINGS> => {
  const { data, error } = await supabase
    .from("roadmap_settings")
    .upsert(
      {
        user_id: userId,
        project_id: projectId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" }
    )
    .select("child_level_issue_scheduling")
    .single();

  if (error) {
    throw error;
  }

  return data ?? DEFAULT_ROADMAP_SETTINGS;
};
