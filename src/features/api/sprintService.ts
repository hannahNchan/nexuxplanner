import { supabase } from "../../lib/supabase";
import type { Sprint, SprintWithStats, CreateSprintData } from "../../features/sprints/types/sprint";

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
    .maybeSingle();

  if (error) throw error;
  return data;
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
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Iniciar sprint (cambiar a active)
export const startSprint = async (sprintId: string): Promise<Sprint> => {
  const { data, error } = await supabase
    .from("sprints")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sprintId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Cerrar sprint (cambiar a closed)
export const closeSprint = async (sprintId: string): Promise<Sprint> => {
  const { data, error } = await supabase
    .from("sprints")
    .update({
      status: "closed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sprintId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Eliminar sprint
export const deleteSprint = async (sprintId: string): Promise<void> => {
  const { error } = await supabase
    .from("sprints")
    .delete()
    .eq("id", sprintId);

  if (error) throw error;
};

// Obtener sprint con estadísticas
export const fetchSprintWithStats = async (
  sprintId: string
): Promise<SprintWithStats | null> => {
  // Fetch sprint
  const { data: sprint, error: sprintError } = await supabase
    .from("sprints")
    .select("*")
    .eq("id", sprintId)
    .single();

  if (sprintError) throw sprintError;
  if (!sprint) return null;

  // Fetch tareas del sprint
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("story_points, column_id")
    .eq("sprint_id", sprintId);

  if (tasksError) throw tasksError;

  // Calcular estadísticas
  const total_tasks = tasks?.length ?? 0;
  
  // Asumimos que si column_id apunta a columna "Hecho" está completada
  // Esto requiere conocer el ID de la columna "Hecho" - por ahora usamos heurística
  const completed_tasks = 0; // TODO: implementar lógica de columna "Hecho"
  
  const total_story_points = tasks?.reduce((sum, task) => {
    const points = parseInt(task.story_points || "0", 10);
    return sum + (isNaN(points) ? 0 : points);
  }, 0) ?? 0;
  
  const completed_story_points = 0; // TODO: implementar

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
  sprintId: string,
  taskIds: string[]
): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ sprint_id: sprintId, in_backlog: false })
    .in("id", taskIds);

  if (error) throw error;
};

// Mover tareas de vuelta al backlog
export const moveTasksToBacklog = async (taskIds: string[]): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ sprint_id: null, in_backlog: true, column_id: null })
    .in("id", taskIds);

  if (error) throw error;
};

export const fetchSprintTasks = async (sprintId: string) => {
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
      priority:priority_id(name, color)
    `)
    .eq("sprint_id", sprintId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};