import { supabase } from "../../lib/supabase";

export type BacklogTask = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority_id: string | null;
  story_points: string | null;
  parent_task_id: string | null;
  epic_id: string | null;
  issue_type_id: string | null;
  task_id_display: string | null;
  github_link: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type BacklogTaskWithDetails = BacklogTask & {
  assignee_name?: string;
  priority_name?: string;
  priority_color?: string;
  epic_name?: string;
  project_name?: string;
};

// Fetch backlog tasks (in_backlog = true)
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

  // Obtener el usuario actual para comparar
  const { data: currentUser } = await supabase.auth.getUser();

  // Buscar épicas separadamente
  const tasksWithDetails = await Promise.all(
    (data ?? []).map(async (item: any) => {
      let epicName = undefined;
      let assigneeName = undefined;
      
      // Si está asignado al usuario actual, usar su email
      if (item.assignee_id && currentUser.user && item.assignee_id === currentUser.user.id) {
        assigneeName = currentUser.user.email || "Tú";
      } else if (item.assignee_id) {
        assigneeName = "Asignado"; // Placeholder por ahora
      }
      
      // Buscar épica
      if (item.epic_id) {
        const { data: epic } = await supabase
          .from("epics")
          .select("name")
          .eq("id", item.epic_id)
          .maybeSingle();
        
        epicName = epic?.name;
      }

      return {
        ...item,
        user_id: userId, // Agregar manualmente para compatibilidad de tipos
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

// Create backlog task
export const createBacklogTask = async (
  userId: string,
  projectId: string,
  data: {
    title: string;
    description?: string;
    assignee_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    epic_id?: string | null;
    github_link?: string | null;
  }
): Promise<BacklogTask> => {
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId, // ✅ Usar project_id, no user_id
      title: data.title,
      description: data.description || null,
      assignee_id: data.assignee_id || null,
      priority_id: data.priority_id || null,
      story_points: data.story_points || null,
      epic_id: data.epic_id || null,
      github_link: data.github_link || null,
      in_backlog: true,
      column_id: null,
      position: 0,
    })
    .select()
    .single();

  if (error) throw error;
  
  // Agregar user_id manualmente para compatibilidad
  return {
    ...task,
    user_id: userId,
  };
};

// Update backlog task
export const updateBacklogTask = async (
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    assignee_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    epic_id?: string | null;
    github_link?: string | null;
  }
): Promise<void> => {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) throw error;
};

// Delete backlog task
export const deleteBacklogTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
};

// Move task from backlog to Kanban
export const moveToKanban = async (
  taskId: string,
  columnId: string
): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({
      in_backlog: false,
      column_id: columnId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) throw error;
};

// Move task from Kanban to backlog
export const moveToBacklog = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({
      in_backlog: true,
      column_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) throw error;
};