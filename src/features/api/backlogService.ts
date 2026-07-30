import { supabase } from "../../lib/supabase";
import { assignTaskCommand, createTaskCommand } from "./taskCommandService";

export type BacklogTask = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  assignee_id: string | null;
  priority_id: string | null;
  story_points: string | null;
  parent_task_id: string | null;
  epic_id: string | null;
  issue_type_id: string | null;
  task_id_display: string | null;
  github_link: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type BacklogTaskWithDetails = BacklogTask & {
  assignee_name?: string;
  priority_name?: string;
  priority_color?: string | null;
  epic_name?: string;
  project_name?: string;
};

type BacklogTaskRow = BacklogTask & {
  priority?: {
    name: string;
    color: string | null;
  } | null;
};

type BacklogTaskUpdate = {
  updated_at: string;
  title?: string;
  subtitle?: string;
  description?: string;
  assignee_id?: string | null;
  priority_id?: string | null;
  story_points?: string | null;
  epic_id?: string | null;
  github_link?: string | null;
};

export const fetchFirstProjectColumnId = async (projectId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("columns")
    .select("id")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
};

export const fetchProjectEpicName = async (
  projectId: string,
  epicId: string
): Promise<string | undefined> => {
  const { data, error } = await supabase
    .from("epics")
    .select("name")
    .eq("id", epicId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data?.name;
};

const assertEpicBelongsToProject = async (projectId: string, epicId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("epics")
    .select("id")
    .eq("id", epicId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("La épica no pertenece al proyecto activo.");
  }
};

export const fetchBacklogTasks = async (
  userId: string,
  projectId?: string | null
): Promise<BacklogTaskWithDetails[]> => {
  
  if (!projectId) {
    return [];
  }

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      priority:priority_id(id, name, color)
    `)
    .eq("project_id", projectId)
    .eq("in_backlog", true)
    .order("position", { ascending: true });

  if (error) throw error;

  const { data: currentUser } = await supabase.auth.getUser();

  const tasksWithDetails = await Promise.all(
    ((data ?? []) as BacklogTaskRow[]).map(async (item) => {
      let epicName: string | undefined = undefined;
      let assigneeName: string | undefined = undefined;
      
      if (item.assignee_id && currentUser.user && item.assignee_id === currentUser.user.id) {
        assigneeName = currentUser.user.email || "Tú";
      } else if (item.assignee_id) {
        assigneeName = "Asignado";
      }
      
      if (item.epic_id) {
        const { data: epic } = await supabase
          .from("epics")
          .select("name")
          .eq("id", item.epic_id)
          .eq("project_id", projectId)
          .maybeSingle();
        
        epicName = epic?.name;
      }

      return {
        ...item,
        user_id: userId,
        epic_id: item.epic_id,
        assignee_name: assigneeName,
        priority_name: item.priority?.name,
        priority_color: item.priority?.color,
        epic_name: epicName,
      };
    })
  );

  return tasksWithDetails;
};

export const createBacklogTask = async (
  userId: string,
  projectId: string,
  data: {
    title: string;
    subtitle?: string;
    description?: string;
    assignee_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    epic_id?: string | null;
    issue_type_id?: string | null;
    github_link?: string | null;
  }
): Promise<BacklogTask> => {
  if (data.epic_id) {
    await assertEpicBelongsToProject(projectId, data.epic_id);
  }

  const task = await createTaskCommand({
      project_id: projectId,
      title: data.title,
      subtitle: data.subtitle || null,
      description: data.description || null,
      destination: "backlog",
      column_id: null,
      position: 0,
      assignee_id: data.assignee_id || null,
      priority_id: data.priority_id || null,
      story_points: data.story_points || null,
      epic_id: data.epic_id || null,
      issue_type_id: data.issue_type_id || null,
      github_link: data.github_link || null,
  });
  
  return {
    ...task,
    user_id: userId,
  };
};

export const updateBacklogTask = async (
  projectId: string,
  taskId: string,
  updates: {
    title?: string;
    subtitle?: string;
    description?: string;
    assignee_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    epic_id?: string | null;
    github_link?: string | null;
  }
): Promise<void> => {
  if (updates.epic_id) {
    await assertEpicBelongsToProject(projectId, updates.epic_id);
  }

  const shouldUpdateAssignee = Object.prototype.hasOwnProperty.call(updates, "assignee_id");
  const nextAssigneeId = updates.assignee_id ?? null;
  const nonAssigneeUpdates = { ...updates };
  delete nonAssigneeUpdates.assignee_id;

  const updateData: BacklogTaskUpdate = {
    ...nonAssigneeUpdates,
    updated_at: new Date().toISOString(),
  };

  if (Object.keys(updateData).length > 1) {
    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("project_id", projectId);

    if (error) throw error;
  }

  if (shouldUpdateAssignee) {
    await assignTaskCommand({
      project_id: projectId,
      task_id: taskId,
      assignee_id: nextAssigneeId,
    });
  }
};

export const deleteBacklogTask = async (projectId: string, taskId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id");

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("No se pudo eliminar la tarea del proyecto activo.");
  }
};

export const moveToKanban = async (
  projectId: string,
  taskId: string,
  columnId: string
): Promise<void> => {
  const { data: column, error: columnError } = await supabase
    .from("columns")
    .select("id")
    .eq("id", columnId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (columnError) throw columnError;
  if (!column) throw new Error("La columna no pertenece al proyecto activo.");

  const { error } = await supabase
    .from("tasks")
    .update({
      in_backlog: false,
      column_id: columnId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) throw error;
};

export const moveToBacklog = async (projectId: string, taskId: string): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({
      in_backlog: true,
      column_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) throw error;
};

export const assignBacklogTaskToSprint = async (
  projectId: string,
  taskId: string,
  sprintId: string,
  columnId: string
): Promise<void> => {
  const { data: sprint, error: sprintError } = await supabase
    .from("sprints")
    .select("id")
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (sprintError) throw sprintError;
  if (!sprint) {
    throw new Error("El sprint no pertenece al proyecto activo.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      sprint_id: sprintId,
      in_backlog: false,
      column_id: columnId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) throw error;
};
