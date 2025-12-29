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
  project_id: string | null;
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

export const fetchEpicPhases = async (): Promise<EpicPhase[]> => {
  const { data, error } = await supabase
    .from("epic_phases")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const fetchEpics = async (
  userId: string,
  projectId?: string | null
): Promise<EpicWithDetails[]> => {
  let query = supabase
    .from("epics")
    .select(`
      *,
      epic_phases!epics_phase_id_fkey (
        name,
        color
      )
    `)
    .eq("user_id", userId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;

  const epicsWithDetails: EpicWithDetails[] = await Promise.all(
    (data ?? []).map(async (epic: any) => {
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

export const createEpic = async (
  userId: string,
  data: {
    name: string;
    owner_id?: string | null;
    phase_id?: string | null;
    estimated_effort?: string | null;
    project_id?: string | null;
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

export const deleteEpic = async (epicId: string): Promise<boolean> => {
  const { error } = await supabase.from("epics").delete().eq("id", epicId);

  if (error) throw error;
  return true;
};

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

export const searchTasks = async (userId: string, query: string = ""): Promise<Array<{ id: string; title: string }>> => {
  const { data: board } = await supabase
    .from("boards")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!board) return [];

  const { data: columns } = await supabase
    .from("columns")
    .select("id")
    .eq("board_id", board.id);

  if (!columns || columns.length === 0) return [];

  const columnIds = columns.map((c) => c.id);

  let queryBuilder = supabase
    .from("tasks")
    .select("id, title")
    .in("column_id", columnIds)
    .order("title", { ascending: true });

  if (query.trim()) {
    queryBuilder = queryBuilder.ilike("title", `%${query}%`);
  }

  queryBuilder = queryBuilder.limit(50);

  const { data, error } = await queryBuilder;

  if (error) throw error;
  return data ?? [];
};