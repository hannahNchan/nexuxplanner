import { supabase } from "../../lib/supabase";

export type EpicDependency = {
  id: string;
  epic_id: string;
  depends_on_epic_id: string;
  dependency_type: "finish-to-start" | "start-to-start" | "finish-to-finish" | "start-to-finish";
  lag_days: number;
  created_at: string;
};

export const fetchDependencies = async (epicIds: string[]): Promise<EpicDependency[]> => {
  if (epicIds.length === 0) return [];

  const { data, error } = await supabase
    .from("epic_dependencies")
    .select("*")
    .or(`epic_id.in.(${epicIds.join(",")}),depends_on_epic_id.in.(${epicIds.join(",")})`);

  if (error) throw error;
  return data ?? [];
};

export const createDependency = async (
  epicId: string,
  dependsOnEpicId: string,
  dependencyType: string = "finish-to-start"
): Promise<EpicDependency> => {
  const { data, error } = await supabase
    .from("epic_dependencies")
    .insert({
      epic_id: epicId,
      depends_on_epic_id: dependsOnEpicId,
      dependency_type: dependencyType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDependency = async (dependencyId: string): Promise<void> => {
  const { error } = await supabase
    .from("epic_dependencies")
    .delete()
    .eq("id", dependencyId);

  if (error) throw error;
};

export const updateDependencyType = async (
  dependencyId: string,
  dependencyType: string
): Promise<void> => {
  const { error } = await supabase
    .from("epic_dependencies")
    .update({ dependency_type: dependencyType })
    .eq("id", dependencyId);

  if (error) throw error;
};