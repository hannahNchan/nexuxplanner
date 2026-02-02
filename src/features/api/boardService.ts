import { supabase } from "../../lib/supabase";
import type { BoardState, Column, Task } from "../../shared/types/board";

type BoardRecord = {
  id: string;
  name: string;
  user_id: string;
};

type ColumnRecord = {
  id: string;
  project_id: string;
  name: string;
  position: number;
};

type TaskRecord = {
  id: string;
  column_id: string;
  title: string;
  task_id_display: string | null;
  subtitle: string | null;
  description: string | null;
  position: number;
  issue_type_id: string | null;
  priority_id: string | null;
  story_points: string | null;
  assignee_id: string | null;
  epic_id?: string | null;
  epic_name?: string | null;
  epic_color?: string | null;
};

export const fetchPrimaryBoard = async (userId: string): Promise<BoardRecord | null> => {
  const { data, error } = await supabase
    .from("boards")
    .select("id, name, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

export const fetchColumnOrder = async (projectId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("column_order")
    .select("column_ids")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching column order:", error);
    return [];
  }

  return data?.column_ids ?? [];
};

export const fetchBoardDataByProject = async (
  userId: string,
  projectId: string | null,
  sprintId: string | null = null
): Promise<{
  board: BoardRecord | null;
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  columnOrder: string[];
  boardState?: BoardState;
}> => {
  const { data: board } = await supabase
    .from("boards")
    .select("id, name, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!projectId) {
    return {
      board: board ?? null,
      columns: [],
      tasks: [],
      columnOrder: [],
    };
  }

  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, project_id, name, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (columnsError) throw columnsError;

  const columnOrder = await fetchColumnOrder(projectId);

  const finalColumnOrder =
    columnOrder.length > 0
      ? columnOrder
      : (columns ?? []).map((c) => c.id);

  const columnIds = (columns ?? []).map((column) => column.id);

  if (columnIds.length === 0) {
    return {
      board: board ?? null,
      columns: columns ?? [],
      tasks: [],
      columnOrder: finalColumnOrder,
    };
  }

  let tasksQuery = supabase
    .from("tasks")
    .select(
      "id, column_id, title, task_id_display, subtitle, description, position, issue_type_id, priority_id, story_points, assignee_id, epic_id"
    )
    .in("column_id", columnIds);

  if (sprintId) {
    tasksQuery = tasksQuery.eq("sprint_id", sprintId);
  } else {
    tasksQuery = tasksQuery.eq("sprint_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: tasks, error: tasksError } = await tasksQuery.order("position", { ascending: true });

  if (tasksError) throw tasksError;

  let tasksWithEpics = tasks ?? [];
  if (tasksWithEpics.length > 0) {
    const taskIds = tasksWithEpics.map(t => t.id);
    
  const { data: epicTasks } = await supabase
    .from("epic_tasks")
    .select(`
      task_id,
      epic:epic_id(id, name, color)
    `)
    .in("task_id", taskIds);

    const taskEpicMap: Record<string, { id: string; name: string; color: string | null  }> = {};
    if (epicTasks) {
      epicTasks.forEach((et: any) => {
        if (et.epic && !taskEpicMap[et.task_id]) {
          taskEpicMap[et.task_id] = {
            id: et.epic.id,
            name: et.epic.name,
            color: et.epic.color,
          };
        }
      });
    }

    tasksWithEpics = tasksWithEpics.map(task => ({
      ...task,
      epic_id: taskEpicMap[task.id]?.id || task.epic_id || null,
      epic_name: taskEpicMap[task.id]?.name || null,
      epic_color: taskEpicMap[task.id]?.color || null,
    }));

  }

  return {
    board: board ?? null,
    columns: columns ?? [],
    tasks: tasksWithEpics,
    columnOrder: finalColumnOrder,
  };
};

export const createBoard = async (userId: string, name: string) => {
  const { data: created, error: createError } = await supabase
    .from("boards")
    .insert({ name, user_id: userId })
    .select("id, name, user_id")
    .single();

  if (createError) {
    throw createError;
  }

  return {
    board: created,
    columns: [],
  };
};

export const createColumn = async (
  projectId: string,
  name: string,
  position: number
): Promise<ColumnRecord> => {
  const { data, error } = await supabase
    .from("columns")
    .insert({
      project_id: projectId,
      name,
      position,
    })
    .select("id, project_id, name, position")
    .single();

  if (error) throw error;

  const currentOrder = await fetchColumnOrder(projectId);
  const newOrder = [...currentOrder, data.id];
  await persistColumnOrder(projectId, newOrder);

  return data;
};

export const createTask = async (
  columnIdOrProjectId: string,
  title: string,
  position: number,
  isBacklog = false
): Promise<TaskRecord> => {

  let projectId: string | null = null;
  
  if (!isBacklog) {
    const { data: column } = await supabase
      .from("columns")
      .select("project_id")
      .eq("id", columnIdOrProjectId)
      .single();
    
    projectId = column?.project_id || null;
  } else {
    projectId = columnIdOrProjectId;
  }

  const taskData: any = {
    title,
    position,
    in_backlog: isBacklog,
    project_id: projectId,
  };

  if (isBacklog) {
    taskData.column_id = null;
  } else {
    taskData.column_id = columnIdOrProjectId;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskData)
    .select("id, column_id, title, task_id_display, subtitle, description, position, issue_type_id, priority_id, story_points, assignee_id")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateTask = async (
  taskId: string,
  updates: {
    title?: string;
    subtitle?: string;
    description?: string;
    column_id?: string | null;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    assignee_id?: string | null;
    in_backlog?: boolean;
  }
): Promise<Task> => {

  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.in_backlog === true) {
    updateData.column_id = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("id, column_id, title, task_id_display, subtitle, description, position, issue_type_id, priority_id, story_points, assignee_id")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteTask = async (taskId: string): Promise<boolean> => {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw error;
  }

  return true;
};

export const toBoardState = (
  columns: ColumnRecord[],
  tasks: TaskRecord[],
  columnOrder: string[]
): BoardState => {
  
  const taskMap: Record<string, Task> = {};
  const columnMap: Record<string, Column> = {};

  tasks.forEach((task) => {
    taskMap[task.id] = {
      id: task.id,
      title: task.title,
      task_id_display: task.task_id_display ?? undefined,
      subtitle: task.subtitle ?? undefined,
      description: task.description ?? undefined,
      issue_type_id: task.issue_type_id ?? undefined,
      priority_id: task.priority_id ?? undefined,
      story_points: task.story_points ?? undefined,
      assignee_id: task.assignee_id ?? undefined,
      epic_id: task.epic_id ?? undefined,
      epic_name: task.epic_name ?? undefined,
      epic_color: task.epic_color ?? undefined,
    };
  });

  const tasksByColumn = tasks.reduce<Record<string, TaskRecord[]>>((acc, task) => {
    if (!acc[task.column_id]) {
      acc[task.column_id] = [];
    }
    acc[task.column_id].push(task);
    return acc;
  }, {});

  columns.forEach((column) => {
    const columnTasks = tasksByColumn[column.id] ?? [];
    const orderedTaskIds = columnTasks
      .sort((a, b) => a.position - b.position)
      .map((task) => task.id);

    columnMap[column.id] = {
      id: column.id,
      title: column.name,
      taskIds: orderedTaskIds,
    };
  });

  return {
    tasks: taskMap,
    columns: columnMap,
    columnOrder,
  };
};

export const persistColumnOrder = async (projectId: string, columnIds: string[]) => {
  const { error } = await supabase
    .from("column_order")
    .upsert(
      {
        project_id: projectId,
        column_ids: columnIds,
      },
      {
        onConflict: "project_id",
      }
    );

  if (error) throw error;
};

export const persistTaskOrder = async (
  updates: Array<{ id: string; column_id: string; position: number }>
) => {
  if (!updates.length) {
    return;
  }

  await Promise.all(
    updates.map(async (update) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          column_id: update.column_id,
          position: update.position,
        })
        .eq("id", update.id);

      if (error) throw error;
    })
  );
};