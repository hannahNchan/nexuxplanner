import { supabase } from "../../lib/supabase";

export type EpicDependency = {
  id: string;
  epic_id: string;
  depends_on_epic_id: string;
  dependency_type: "finish-to-start" | "start-to-start" | "finish-to-finish" | "start-to-finish";
  lag_days: number;
  created_at: string;
};

export type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: "finish-to-start" | "start-to-start" | "finish-to-finish" | "start-to-finish";
  lag_days: number;
  created_at: string;
};

export const fetchDependencies = async (epicIds: string[]): Promise<EpicDependency[]> => {
  if (epicIds.length === 0) return [];

  const { data, error } = await supabase
    .from("epic_dependencies")
    .select("*")
    .in("epic_id", epicIds)
    .in("depends_on_epic_id", epicIds);

  if (error) throw error;
  return data ?? [];
};

export const fetchTaskDependencies = async (taskIds: string[]): Promise<TaskDependency[]> => {
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from("task_dependencies")
    .select("*")
    .in("task_id", taskIds)
    .in("depends_on_task_id", taskIds);

  if (error) throw error;
  return data ?? [];
};

const assertEpicsShareProject = async (epicId: string, dependsOnEpicId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("epics")
    .select("id, project_id")
    .in("id", [epicId, dependsOnEpicId]);

  if (error) throw error;

  const epicProjectId = data?.find((epic) => epic.id === epicId)?.project_id;
  const dependsOnEpicProjectId = data?.find((epic) => epic.id === dependsOnEpicId)?.project_id;

  if (!epicProjectId || !dependsOnEpicProjectId || epicProjectId !== dependsOnEpicProjectId) {
    throw new Error("Las dependencias de épicas solo pueden crearse dentro del mismo proyecto.");
  }
};

const assertTasksShareProject = async (taskId: string, dependsOnTaskId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, project_id")
    .in("id", [taskId, dependsOnTaskId]);

  if (error) throw error;

  const taskProjectId = data?.find((task) => task.id === taskId)?.project_id;
  const dependsOnTaskProjectId = data?.find((task) => task.id === dependsOnTaskId)?.project_id;

  if (!taskProjectId || !dependsOnTaskProjectId || taskProjectId !== dependsOnTaskProjectId) {
    throw new Error("Las dependencias de tareas solo pueden crearse dentro del mismo proyecto.");
  }
};

export const createDependency = async (
  epicId: string,
  dependsOnEpicId: string,
  dependencyType: string = "finish-to-start"
): Promise<EpicDependency> => {
  await assertEpicsShareProject(epicId, dependsOnEpicId);

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

export const createTaskDependency = async (
  taskId: string,
  dependsOnTaskId: string,
  dependencyType: string = "finish-to-start"
): Promise<TaskDependency> => {
  await assertTasksShareProject(taskId, dependsOnTaskId);

  const { data, error } = await supabase
    .from("task_dependencies")
    .insert({
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
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

export const deleteTaskDependency = async (dependencyId: string): Promise<void> => {
  const { error } = await supabase
    .from("task_dependencies")
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
