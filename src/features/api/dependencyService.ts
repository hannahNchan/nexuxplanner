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

const wouldCreateCycle = <T extends { sourceId: string; targetId: string }>(
  dependencies: T[],
  sourceId: string,
  targetId: string
) => {
  const targetsBySource = dependencies.reduce<Record<string, string[]>>((acc, dependency) => {
    if (!acc[dependency.sourceId]) {
      acc[dependency.sourceId] = [];
    }
    acc[dependency.sourceId].push(dependency.targetId);
    return acc;
  }, {});

  const visited = new Set<string>();
  const stack = [targetId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || visited.has(currentId)) {
      continue;
    }

    if (currentId === sourceId) {
      return true;
    }

    visited.add(currentId);
    stack.push(...(targetsBySource[currentId] ?? []));
  }

  return false;
};

const assertEpicsShareProject = async (epicId: string, dependsOnEpicId: string): Promise<string> => {
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

  return epicProjectId;
};

const assertTasksShareProject = async (taskId: string, dependsOnTaskId: string): Promise<string> => {
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

  return taskProjectId;
};

const assertEpicDependencyDoesNotCreateCycle = async (
  epicId: string,
  dependsOnEpicId: string,
  projectId: string
): Promise<void> => {
  const { data: projectEpics, error: epicsError } = await supabase
    .from("epics")
    .select("id")
    .eq("project_id", projectId);

  if (epicsError) throw epicsError;

  const epicIds = (projectEpics ?? []).map((epic) => epic.id);
  const dependencies = await fetchDependencies(epicIds);

  const cycle = wouldCreateCycle(
    dependencies.map((dependency) => ({
      sourceId: dependency.depends_on_epic_id,
      targetId: dependency.epic_id,
    })),
    dependsOnEpicId,
    epicId
  );

  if (cycle) {
    throw new Error("Esta dependencia crea un ciclo. Una épica no puede depender directa o indirectamente de sí misma.");
  }
};

const assertTaskDependencyDoesNotCreateCycle = async (
  taskId: string,
  dependsOnTaskId: string,
  projectId: string
): Promise<void> => {
  const { data: projectTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId);

  if (tasksError) throw tasksError;

  const taskIds = (projectTasks ?? []).map((task) => task.id);
  const dependencies = await fetchTaskDependencies(taskIds);

  const cycle = wouldCreateCycle(
    dependencies.map((dependency) => ({
      sourceId: dependency.depends_on_task_id,
      targetId: dependency.task_id,
    })),
    dependsOnTaskId,
    taskId
  );

  if (cycle) {
    throw new Error("Esta dependencia crea un ciclo. Una tarea no puede depender directa o indirectamente de sí misma.");
  }
};

const assertEpicDependencyBelongsToProject = async (
  projectId: string,
  dependencyId: string
): Promise<void> => {
  const { data: dependency, error } = await supabase
    .from("epic_dependencies")
    .select("epic_id, depends_on_epic_id")
    .eq("id", dependencyId)
    .single();

  if (error) throw error;

  const dependencyProjectId = await assertEpicsShareProject(
    dependency.epic_id,
    dependency.depends_on_epic_id
  );

  if (dependencyProjectId !== projectId) {
    throw new Error("La dependencia no pertenece al proyecto actual.");
  }
};

const assertTaskDependencyBelongsToProject = async (
  projectId: string,
  dependencyId: string
): Promise<void> => {
  const { data: dependency, error } = await supabase
    .from("task_dependencies")
    .select("task_id, depends_on_task_id")
    .eq("id", dependencyId)
    .single();

  if (error) throw error;

  const dependencyProjectId = await assertTasksShareProject(
    dependency.task_id,
    dependency.depends_on_task_id
  );

  if (dependencyProjectId !== projectId) {
    throw new Error("La dependencia no pertenece al proyecto actual.");
  }
};

export const createDependency = async (
  epicId: string,
  dependsOnEpicId: string,
  dependencyType: string = "finish-to-start"
): Promise<EpicDependency> => {
  const projectId = await assertEpicsShareProject(epicId, dependsOnEpicId);
  await assertEpicDependencyDoesNotCreateCycle(epicId, dependsOnEpicId, projectId);

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
  const projectId = await assertTasksShareProject(taskId, dependsOnTaskId);
  await assertTaskDependencyDoesNotCreateCycle(taskId, dependsOnTaskId, projectId);

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

export const deleteDependency = async (projectId: string, dependencyId: string): Promise<void> => {
  await assertEpicDependencyBelongsToProject(projectId, dependencyId);

  const { error } = await supabase
    .from("epic_dependencies")
    .delete()
    .eq("id", dependencyId);

  if (error) throw error;
};

export const deleteTaskDependency = async (projectId: string, dependencyId: string): Promise<void> => {
  await assertTaskDependencyBelongsToProject(projectId, dependencyId);

  const { error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("id", dependencyId);

  if (error) throw error;
};

export const updateDependencyType = async (
  projectId: string,
  dependencyId: string,
  dependencyType: string
): Promise<void> => {
  await assertEpicDependencyBelongsToProject(projectId, dependencyId);

  const { error } = await supabase
    .from("epic_dependencies")
    .update({ dependency_type: dependencyType })
    .eq("id", dependencyId);

  if (error) throw error;
};
