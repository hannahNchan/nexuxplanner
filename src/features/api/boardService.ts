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
  description: string | null;
  position: number;
  issue_type_id: string | null;
  priority_id: string | null;
  story_points: string | null;
  assignee_id: string | null;
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
  projectId: string | null
): Promise<{
  board: BoardRecord | null;
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  columnOrder: string[];
}> => {
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, name, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (boardError) throw boardError;

  if (!board) {
    return {
      board: null,
      columns: [],
      tasks: [],
      columnOrder: [],
    };
  }

  if (!projectId) {
    return {
      board,
      columns: [],
      tasks: [],
      columnOrder: [],
    };
  }

  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, project_id, name, position")
    .eq("project_id", projectId);

  if (columnsError) throw columnsError;

  const columnOrder = await fetchColumnOrder(projectId);

  const finalColumnOrder =
    columnOrder.length > 0
      ? columnOrder
      : (columns ?? []).sort((a, b) => a.position - b.position).map((c) => c.id);

  const columnIds = (columns ?? []).map((column) => column.id);

  if (columnIds.length === 0) {
    return {
      board,
      columns: columns ?? [],
      tasks: [],
      columnOrder: finalColumnOrder,
    };
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(
      "id, column_id, title, description, position, issue_type_id, priority_id, story_points, assignee_id"
    )
    .in("column_id", columnIds)
    .order("position", { ascending: true });

  if (tasksError) throw tasksError;

  return {
    board,
    columns: columns ?? [],
    tasks: tasks ?? [],
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
  columnId: string,
  title: string,
  position: number
): Promise<TaskRecord> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ column_id: columnId, title, position })
    .select("id, column_id, title, description, position, issue_type_id, priority_id, story_points, assignee_id")
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
    description?: string;
    column_id?: string;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    assignee_id?: string | null;
  }
): Promise<TaskRecord> => {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("id, column_id, title, description, position, issue_type_id, priority_id, story_points, assignee_id")
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
      description: task.description ?? undefined,
      issue_type_id: task.issue_type_id ?? undefined,
      priority_id: task.priority_id ?? undefined,
      story_points: task.story_points ?? undefined,
      assignee_id: task.assignee_id ?? undefined,
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