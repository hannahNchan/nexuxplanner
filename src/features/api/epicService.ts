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
  phase_color?: string;
  connected_tasks?: RoadmapTask[];
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
      const { data: linkedEpicTasks } = await supabase
        .from("epic_tasks")
        .select(`
          task_id,
          tasks!epic_tasks_task_id_fkey (
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
          )
        `)
        .eq("epic_id", epic.id);

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
        .eq("epic_id", epic.id);

      const tasksById = new Map<string, RoadmapTask>();

      (linkedEpicTasks ?? []).forEach((et: any) => {
        if (et.tasks?.id) {
          tasksById.set(et.tasks.id, et.tasks);
        }
      });

      (directEpicTasks ?? []).forEach((task: any) => {
        if (task?.id) {
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
  userId: string,
  data: {
    name: string;
    color?: string | null;
    owner_id?: string | null;
    phase_id?: string | null;
    estimated_effort?: string | null;
    project_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }
): Promise<Epic> => {
  const { data: created, error } = await supabase
    .from("epics")
    .insert({
      user_id: userId,
       color: data.color || "#3B82F6",
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

export const searchTasks = async (
  projectId: string | null,
  query: string = ""
): Promise<TaskSearchOption[]> => {

  if (!projectId) {
    return [];
  }

  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id")
    .eq("project_id", projectId);

  if (columnsError) {
    throw columnsError;
  }

  if (!columns || columns.length === 0) {
    return [];
  }

  const columnIds = columns.map((c) => c.id);

  let queryBuilder = supabase
    .from("tasks")
    .select("id, title, epic_id")
    .in("column_id", columnIds)
    .order("title", { ascending: true });

  if (query.trim()) {
    queryBuilder = queryBuilder.ilike("title", `%${query}%`);
  }

  queryBuilder = queryBuilder.limit(50);

  const { data, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  const taskIds = (data ?? []).map((task) => task.id);
  const linkedEpicByTaskId = new Map<string, string>();

  if (taskIds.length > 0) {
    const { data: linkedTasks, error: linkedTasksError } = await supabase
      .from("epic_tasks")
      .select("task_id, epic_id")
      .in("task_id", taskIds);

    if (linkedTasksError) {
      throw linkedTasksError;
    }

    (linkedTasks ?? []).forEach((linkedTask) => {
      if (linkedTask.task_id && linkedTask.epic_id && !linkedEpicByTaskId.has(linkedTask.task_id)) {
        linkedEpicByTaskId.set(linkedTask.task_id, linkedTask.epic_id);
      }
    });
  }

  return (data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    assigned_epic_id: task.epic_id ?? linkedEpicByTaskId.get(task.id) ?? null,
  }));
};

export const updateTaskPlannedDates = async (
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
    .eq("id", taskId);

  if (error) throw error;
};

export const createRoadmapTaskForEpic = async (
  projectId: string,
  epicId: string,
  title: string
): Promise<RoadmapTask> => {
  const { data: todoColumn, error: todoColumnError } = await supabase
    .from("columns")
    .select("id, name")
    .eq("project_id", projectId)
    .ilike("name", "Por hacer")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (todoColumnError) throw todoColumnError;

  const { data: fallbackColumn, error: fallbackColumnError } = todoColumn
    ? { data: null, error: null }
    : await supabase
        .from("columns")
        .select("id, name")
        .eq("project_id", projectId)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();

  if (fallbackColumnError) throw fallbackColumnError;

  const column = todoColumn ?? fallbackColumn;

  if (!column) {
    throw new Error("No hay columnas disponibles para crear la tarea.");
  }

  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("column_id", column.id);

  if (countError) throw countError;

  const { data: createdTask, error: createError } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      column_id: column.id,
      epic_id: epicId,
      title,
      position: count ?? 0,
      in_backlog: false,
    })
    .select(
      "id, project_id, column_id, sprint_id, title, task_id_display, issue_type_id, priority_id, story_points, assignee_id, planned_start_date, planned_end_date"
    )
    .single();

  if (createError) throw createError;

  const { error: linkError } = await supabase
    .from("epic_tasks")
    .insert({
      epic_id: epicId,
      task_id: createdTask.id,
    });

  if (linkError) throw linkError;

  return {
    ...createdTask,
    column_name: column.name,
    sprint_name: null,
    sprint_start_date: null,
    sprint_end_date: null,
  };
};

export const moveTaskToEpic = async (taskId: string, epicId: string): Promise<void> => {
  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      epic_id: epicId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (taskError) throw taskError;

  const { error: deleteError } = await supabase
    .from("epic_tasks")
    .delete()
    .eq("task_id", taskId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("epic_tasks")
    .insert({
      epic_id: epicId,
      task_id: taskId,
    });

  if (insertError) throw insertError;
};
