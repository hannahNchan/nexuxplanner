import { supabase } from "../../lib/supabase";

export type EpicPhase = {
  id: string;
  name: string;
  color: string | null;
  position: number;
};

export type Epic = {
  id: string;
  user_id: string;
  name: string;
  owner_id: string | null;
  phase_id: string | null;
  estimated_effort: string | null;
  epic_id_display: string | null;
  created_at: string;
  updated_at: string;
};

export type EpicWithDetails = Epic & {
  owner_name?: string;
  phase_name?: string;
  phase_color?: string;
  connected_tasks?: Array<{
    id: string;
    title: string;
  }>;
};

/**
 * Obtiene todas las fases de épicas
 */
export const fetchEpicPhases = async (): Promise<EpicPhase[]> => {
  const { data, error } = await supabase
    .from("epic_phases")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/**
 * Obtiene todas las épicas del usuario
 */
export const fetchEpics = async (userId: string): Promise<EpicWithDetails[]> => {
  const { data, error } = await supabase
    .from("epics")
    .select(`
      *,
      epic_phases!epics_phase_id_fkey (
        name,
        color
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Transformar datos
  const epicsWithDetails: EpicWithDetails[] = await Promise.all(
    (data ?? []).map(async (epic: any) => {
      // Obtener tareas conectadas
      const { data: epicTasks } = await supabase
        .from("epic_tasks")
        .select(`
          task_id,
          tasks!epic_tasks_task_id_fkey (
            id,
            title
          )
        `)
        .eq("epic_id", epic.id);

      const connected_tasks = (epicTasks ?? []).map((et: any) => ({
        id: et.tasks.id,
        title: et.tasks.title,
      }));

      return {
        ...epic,
        phase_name: epic.epic_phases?.name,
        phase_color: epic.epic_phases?.color,
        connected_tasks,
      };
    })
  );

  return epicsWithDetails;
};

/**
 * Crea una nueva épica
 */
export const createEpic = async (
  userId: string,
  data: {
    name: string;
    owner_id?: string | null;
    phase_id?: string | null;
    estimated_effort?: string | null;
  }
): Promise<Epic> => {
  const { data: created, error } = await supabase
    .from("epics")
    .insert({
      user_id: userId,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return created;
};

/**
 * Actualiza una épica
 */
export const updateEpic = async (
  epicId: string,
  updates: {
    name?: string;
    owner_id?: string | null;
    phase_id?: string | null;
    estimated_effort?: string | null;
  }
): Promise<Epic> => {
  const { data, error } = await supabase
    .from("epics")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", epicId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Elimina una épica
 */
export const deleteEpic = async (epicId: string): Promise<boolean> => {
  const { error } = await supabase.from("epics").delete().eq("id", epicId);

  if (error) throw error;
  return true;
};

/**
 * Conecta una tarea a una épica
 */
export const connectTaskToEpic = async (
  epicId: string,
  taskId: string
): Promise<void> => {
  const { error } = await supabase.from("epic_tasks").insert({
    epic_id: epicId,
    task_id: taskId,
  });

  if (error) throw error;
};

/**
 * Desconecta una tarea de una épica
 */
export const disconnectTaskFromEpic = async (
  epicId: string,
  taskId: string
): Promise<void> => {
  const { error } = await supabase
    .from("epic_tasks")
    .delete()
    .eq("epic_id", epicId)
    .eq("task_id", taskId);

  if (error) throw error;
};

/**
 * Busca tareas por título (para autocompletar)
 * Si query está vacío, devuelve todas las tareas disponibles
 */
export const searchTasks = async (userId: string, query: string = ""): Promise<Array<{ id: string; title: string }>> => {
  // Primero obtener el board del usuario
  const { data: board } = await supabase
    .from("boards")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!board) return [];

  // Obtener columnas del board
  const { data: columns } = await supabase
    .from("columns")
    .select("id")
    .eq("board_id", board.id);

  if (!columns || columns.length === 0) return [];

  const columnIds = columns.map((c) => c.id);

  // Construir query con o sin filtro de búsqueda
  let queryBuilder = supabase
    .from("tasks")
    .select("id, title")
    .in("column_id", columnIds)
    .order("title", { ascending: true });

  // Si hay query, filtrar por título
  if (query.trim()) {
    queryBuilder = queryBuilder.ilike("title", `%${query}%`);
  }

  // Limitar resultados
  queryBuilder = queryBuilder.limit(50);

  const { data, error } = await queryBuilder;

  if (error) throw error;
  return data ?? [];
};