import { supabase } from "../../lib/supabase";
import type { Sprint, SprintWithStats, CreateSprintData } from "../../features/sprints/types/sprint";
import { completeSprintCommand } from "./taskCommandService";

const assertSprintBelongsToProject = async (projectId: string, sprintId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("sprints")
    .select("id")
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("El sprint no pertenece al proyecto activo.");
  }
};

const DONE_COLUMN_NAMES = new Set([
  "done",
  "hecho",
  "finalizado",
  "completado",
  "cerrado",
]);

const normalizeColumnName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

const parseStoryPoints = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") return 0;

  const points = Number(value);
  return Number.isFinite(points) ? points : 0;
};

type SprintTaskPriority = {
  name: string;
  color: string | null;
};

export type SprintTaskRecord = {
  id: string;
  title: string;
  task_id_display: string | null;
  priority_id: string | null;
  story_points: string | null;
  assignee_id: string | null;
  column_id: string | null;
  created_at: string;
  epic_id: string | null;
  epic_name?: string | null;
  epic_color?: string | null;
  assignee_name?: string | null;
  priority: SprintTaskPriority | null;
};

export type SprintCompletionTask = SprintTaskRecord & {
  column_name: string | null;
  is_completed: boolean;
};

export type SprintCompletionSummary = {
  completedTasks: SprintCompletionTask[];
  incompleteTasks: SprintCompletionTask[];
};

export type SprintTaskDisposition = {
  taskId: string;
  destination: "backlog" | "sprint";
  sprintId?: string;
};

type SprintTaskRow = Omit<SprintTaskRecord, "priority"> & {
  priority: SprintTaskPriority | SprintTaskPriority[] | null;
};

// Fetch sprints por proyecto
export const fetchSprints = async (projectId: string): Promise<Sprint[]> => {
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// Fetch sprint activo
export const fetchActiveSprint = async (projectId: string): Promise<Sprint | null> => {
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
};

// Crear sprint
export const createSprint = async (
  projectId: string,
  sprintData: CreateSprintData
): Promise<Sprint> => {
  const { data, error } = await supabase
    .from("sprints")
    .insert({
      project_id: projectId,
      name: sprintData.name,
      goal: sprintData.goal || null,
      status: "future",
      start_date: sprintData.start_date,
      end_date: sprintData.end_date,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Actualizar sprint
export const updateSprint = async (
  projectId: string,
  sprintId: string,
  updates: Partial<CreateSprintData>
): Promise<Sprint> => {
  const { data, error } = await supabase
    .from("sprints")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Iniciar sprint (cambiar a active)
export const startSprint = async (projectId: string, sprintId: string): Promise<Sprint> => {
  const { data: activeSprint, error: activeSprintError } = await supabase
    .from("sprints")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "active")
    .neq("id", sprintId)
    .limit(1);

  if (activeSprintError) throw activeSprintError;
  if ((activeSprint ?? []).length > 0) {
    throw new Error("Ya existe un sprint activo en este proyecto. Completa el sprint actual antes de iniciar otro.");
  }

  const { data, error } = await supabase
    .from("sprints")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .eq("status", "future")
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Cerrar sprint (cambiar a closed)
export const closeSprint = async (projectId: string, sprintId: string): Promise<Sprint> => {
  return completeSprintCommand(projectId, sprintId, []);
};

// Eliminar sprint
export const deleteSprint = async (projectId: string, sprintId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("sprints")
    .delete()
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .select("id");

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("No se pudo eliminar el sprint del proyecto activo.");
  }
};

// Obtener sprint con estadísticas
export const fetchSprintWithStats = async (
  projectId: string,
  sprintId: string
): Promise<SprintWithStats | null> => {
  // Fetch sprint
  const { data: sprint, error: sprintError } = await supabase
    .from("sprints")
    .select("*")
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .single();

  if (sprintError) throw sprintError;
  if (!sprint) return null;

  // Fetch tareas del sprint
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("story_points, column_id")
    .eq("sprint_id", sprintId)
    .eq("project_id", projectId);

  if (tasksError) throw tasksError;

  const { data: doneColumns, error: doneColumnsError } = await supabase
    .from("columns")
    .select("id, name, color")
    .eq("project_id", projectId);

  if (doneColumnsError) throw doneColumnsError;

  const doneColumnIds = new Set(
    (doneColumns ?? [])
      .filter((column) => DONE_COLUMN_NAMES.has(normalizeColumnName(column.name)))
      .map((column) => column.id)
  );

  // Calcular estadísticas
  const total_tasks = tasks?.length ?? 0;
  const completedTasks = (tasks ?? []).filter(
    (task) => Boolean(task.column_id) && doneColumnIds.has(task.column_id)
  );
  const completed_tasks = completedTasks.length;
  const total_story_points = (tasks ?? []).reduce(
    (sum, task) => sum + parseStoryPoints(task.story_points),
    0
  );
  const completed_story_points = completedTasks.reduce(
    (sum, task) => sum + parseStoryPoints(task.story_points),
    0
  );

  return {
    ...sprint,
    total_tasks,
    completed_tasks,
    total_story_points,
    completed_story_points,
  };
};

// Asignar tareas a sprint
export const assignTasksToSprint = async (
  projectId: string,
  sprintId: string,
  taskIds: string[]
): Promise<void> => {
  await assertSprintBelongsToProject(projectId, sprintId);

  const { error } = await supabase
    .from("tasks")
    .update({ sprint_id: sprintId, in_backlog: false })
    .eq("project_id", projectId)
    .in("id", taskIds);

  if (error) throw error;
};

// Mover tareas de vuelta al backlog
export const moveTasksToBacklog = async (projectId: string, taskIds: string[]): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ sprint_id: null, in_backlog: true, column_id: null })
    .eq("project_id", projectId)
    .in("id", taskIds);

  if (error) throw error;
};

export const fetchSprintTasks = async (
  projectId: string,
  sprintId: string
): Promise<SprintTaskRecord[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      task_id_display,
      priority_id,
      story_points,
      assignee_id,
      column_id,
      created_at,
      epic_id,
      priority:priority_id(name, color)
    `)
    .eq("sprint_id", sprintId)
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as SprintTaskRow[];
  const epicIds = [...new Set(rows.map((task) => task.epic_id).filter(Boolean))] as string[];
  const epicDetailsById: Record<string, { name: string; color: string | null }> = {};

  if (epicIds.length > 0) {
    const { data: epics, error: epicsError } = await supabase
      .from("epics")
      .select("id, name, color")
      .eq("project_id", projectId)
      .in("id", epicIds);

    if (epicsError) throw epicsError;

    (epics ?? []).forEach((epic) => {
      epicDetailsById[epic.id] = {
        name: epic.name,
        color: epic.color,
      };
    });
  }

  const { data: currentUser } = await supabase.auth.getUser();

  return rows.map((task) => ({
    ...task,
    epic_name: task.epic_id ? epicDetailsById[task.epic_id]?.name ?? null : null,
    epic_color: task.epic_id ? epicDetailsById[task.epic_id]?.color ?? null : null,
    assignee_name:
      task.assignee_id && currentUser.user && task.assignee_id === currentUser.user.id
        ? currentUser.user.email || "Tú"
        : task.assignee_id
          ? "Asignado"
          : null,
    priority: Array.isArray(task.priority) ? task.priority[0] ?? null : task.priority,
  }));
};

export const fetchSprintCompletionSummary = async (
  projectId: string,
  sprintId: string
): Promise<SprintCompletionSummary> => {
  await assertSprintBelongsToProject(projectId, sprintId);

  const [tasks, columnsResponse] = await Promise.all([
    fetchSprintTasks(projectId, sprintId),
    supabase
      .from("columns")
      .select("id, name")
      .eq("project_id", projectId),
  ]);

  const { data: columns, error: columnsError } = columnsResponse;
  if (columnsError) throw columnsError;

  const columnById = new Map((columns ?? []).map((column) => [column.id, column.name]));
  const doneColumnIds = new Set(
    (columns ?? [])
      .filter((column) => DONE_COLUMN_NAMES.has(normalizeColumnName(column.name)))
      .map((column) => column.id)
  );

  const completionTasks = tasks.map((task) => ({
    ...task,
    column_name: task.column_id ? columnById.get(task.column_id) ?? null : null,
    is_completed: Boolean(task.column_id && doneColumnIds.has(task.column_id)),
  }));

  return {
    completedTasks: completionTasks.filter((task) => task.is_completed),
    incompleteTasks: completionTasks.filter((task) => !task.is_completed),
  };
};

export const closeSprintWithTaskDisposition = async (
  projectId: string,
  sprintId: string,
  dispositions: SprintTaskDisposition[]
): Promise<Sprint> => {
  return completeSprintCommand(projectId, sprintId, dispositions);
};
