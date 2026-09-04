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
  color: string | null;
  owner_id: string | null;
  phase_id: string | null;
  estimated_effort: string | null;
  epic_id_display: string | null;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type RoadmapTask = {
  id: string;
  project_id: string | null;
  column_id: string | null;
  column_name?: string | null;
  sprint_id: string | null;
  sprint_name?: string | null;
  sprint_start_date?: string | null;
  sprint_end_date?: string | null;
  title: string;
  task_id_display: string | null;
  issue_type_id: string | null;
  priority_id: string | null;
  story_points: string | null;
  assignee_id: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
};

export type TaskSearchOption = {
  id: string;
  title: string;
  assigned_epic_id: string | null;
};

export type EpicWithDetails = Epic & {
  owner_name?: string;
  phase_name?: string;
  phase_color?: string | null;
  connected_tasks?: RoadmapTask[];
};

type EpicRow = Epic & {
  epic_phases?: {
    name: string;
    color: string | null;
  } | null;
};

type RoadmapTaskRow = Omit<
  RoadmapTask,
  "column_name" | "sprint_name" | "sprint_start_date" | "sprint_end_date"
>;

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
  if (!projectId) {
    return [];
  }

  const query = supabase
    .from("epics")
    .select(`
      *,
      epic_phases!epics_phase_id_fkey (
        name,
        color
      )
    `)
    .eq("user_id", userId)
    .eq("project_id", projectId);

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) throw error;

  const epicsWithDetails: EpicWithDetails[] = await Promise.all(
    ((data ?? []) as EpicRow[]).map(async (epic) => {
      const { data: directEpicTasks } = await supabase
        .from("tasks")
        .select(`
          id,
          project_id,
          column_id,
          sprint_id,
          title,
          task_id_display,
          issue_type_id,
          priority_id,
          story_points,
          assignee_id,
          planned_start_date,
          planned_end_date
        `)
        .eq("epic_id", epic.id)
        .eq("project_id", projectId);

      const tasksById = new Map<string, RoadmapTask>();

      ((directEpicTasks ?? []) as RoadmapTaskRow[]).forEach((task) => {
        if (task?.id && task.project_id === projectId) {
          tasksById.set(task.id, task);
        }
      });

      const connected_tasks = Array.from(tasksById.values());
      const columnIds = [...new Set(connected_tasks.map((task) => task.column_id).filter(Boolean))] as string[];
      const sprintIds = [...new Set(connected_tasks.map((task) => task.sprint_id).filter(Boolean))] as string[];

      if (columnIds.length > 0) {
        const { data: columns } = await supabase
          .from("columns")
          .select("id, name")
          .eq("project_id", projectId)
          .in("id", columnIds);

        const columnNameById = new Map((columns ?? []).map((column) => [column.id, column.name]));
        connected_tasks.forEach((task) => {
          task.column_name = task.column_id ? columnNameById.get(task.column_id) ?? null : null;
        });
      }

      if (sprintIds.length > 0) {
        const { data: sprints } = await supabase
          .from("sprints")
          .select("id, name, start_date, end_date")
          .eq("project_id", projectId)
          .in("id", sprintIds);

        const sprintById = new Map((sprints ?? []).map((sprint) => [sprint.id, sprint]));
        connected_tasks.forEach((task) => {
          const sprint = task.sprint_id ? sprintById.get(task.sprint_id) : null;
          task.sprint_name = sprint?.name ?? null;
          task.sprint_start_date = sprint?.start_date ?? null;
          task.sprint_end_date = sprint?.end_date ?? null;
        });
      }

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
  _userId: string,
  data: {
    name: string;
    color?: string | null;
    owner_id?: string | null;
    phase_id?: string | null;
    estimated_effort?: string | null;
    project_id: string;
    start_date?: string | null;
    end_date?: string | null;
  }
): Promise<Epic> => {
  if (!data.project_id) {
    throw new Error("La épica debe pertenecer a un proyecto.");
  }

  const { data: created, error } = await supabase
    .rpc("create_epic_command", {
      p_project_id: data.project_id,
      p_name: data.name,
      p_color: data.color ?? null,
      p_owner_id: data.owner_id ?? null,
      p_phase_id: data.phase_id ?? null,
      p_estimated_effort: data.estimated_effort ?? null,
      p_start_date: data.start_date ?? null,
      p_end_date: data.end_date ?? null,
    })
    .single();

  if (error) throw error;
  return created as Epic;
};

export const updateEpic = async (
  projectId: string,
  epicId: string,
  updates: {
    name?: string;
    color?: string | null;
    owner_id?: string | null;
    phase_id?: string | null;
    estimated_effort?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }
): Promise<Epic> => {
  const { data, error } = await supabase
    .from("epics")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", epicId)
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEpic = async (projectId: string, epicId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("epics")
    .delete()
    .eq("id", epicId)
    .eq("project_id", projectId)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("No se pudo eliminar la épica del proyecto actual.");
  }

  return true;
};

const assertTaskBelongsToEpicProject = async (
  projectId: string,
  taskId: string,
  epicId: string
): Promise<void> => {
  const [{ data: epic, error: epicError }, { data: task, error: taskError }] = await Promise.all([
    supabase.from("epics").select("project_id").eq("id", epicId).single(),
    supabase.from("tasks").select("project_id").eq("id", taskId).single(),
  ]);

  if (epicError) throw epicError;
  if (taskError) throw taskError;

  if (
    !epic?.project_id ||
    !task?.project_id ||
    epic.project_id !== task.project_id ||
    epic.project_id !== projectId
  ) {
    throw new Error("La tarea y la épica deben pertenecer al mismo proyecto.");
  }
};

export const connectTaskToEpic = async (
  projectId: string,
  epicId: string,
  taskId: string
): Promise<void> => {
  await assertTaskBelongsToEpicProject(projectId, taskId, epicId);

  const { error } = await supabase
    .from("tasks")
    .update({
      epic_id: epicId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) throw error;
};

export const disconnectTaskFromEpic = async (
  projectId: string,
  epicId: string,
  taskId: string
): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({
      epic_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("epic_id", epicId);

  if (error) throw error;
};

export const searchTasks = async (
  projectId: string | null,
  query: string = ""
): Promise<TaskSearchOption[]> => {

  if (!projectId) {
    return [];
  }

  let queryBuilder = supabase
    .from("tasks")
    .select("id, title, epic_id")
    .eq("project_id", projectId)
    .order("title", { ascending: true });

  if (query.trim()) {
    queryBuilder = queryBuilder.ilike("title", `%${query}%`);
  }

  queryBuilder = queryBuilder.limit(50);

  const { data, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return (data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    assigned_epic_id: task.epic_id ?? null,
  }));
};

export const updateTaskPlannedDates = async (
  projectId: string,
  taskId: string,
  startDate: string,
  endDate: string
): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({
      planned_start_date: startDate,
      planned_end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) throw error;
};

export const createRoadmapTaskForEpic = async (
  projectId: string,
  epicId: string,
  title: string
): Promise<RoadmapTask> => {
  const { data: epic, error: epicError } = await supabase
    .from("epics")
    .select("project_id")
    .eq("id", epicId)
    .single();

  if (epicError) throw epicError;

  if (epic.project_id !== projectId) {
    throw new Error("La tarea solo puede crearse bajo una épica del proyecto actual.");
  }

  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("in_backlog", true);

  if (countError) throw countError;

  const { data: createdTask, error: createError } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      column_id: null,
      epic_id: epicId,
      title,
      position: count ?? 0,
      in_backlog: true,
    })
    .select(
      "id, project_id, column_id, sprint_id, title, task_id_display, issue_type_id, priority_id, story_points, assignee_id, planned_start_date, planned_end_date"
    )
    .single();

  if (createError) throw createError;

  return {
    ...createdTask,
    column_name: null,
    sprint_name: null,
    sprint_start_date: null,
    sprint_end_date: null,
  };
};

export const moveTaskToEpic = async (projectId: string, taskId: string, epicId: string): Promise<void> => {
  await assertTaskBelongsToEpicProject(projectId, taskId, epicId);

  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      epic_id: epicId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (taskError) throw taskError;
};
