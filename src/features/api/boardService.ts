import { supabase } from "../../lib/supabase";
import type { BoardState, Column, Task } from "../../shared/types/board";

type BoardRecord = {
  id: string;
  name: string;
  user_id: string;
};

type ColumnRecord = {
  id: string;
  board_id: string;
  name: string;
  position: number;
};

type TaskRecord = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: number;
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

export const fetchBoardData = async (userId: string): Promise<{
  board: BoardRecord | null;
  columns: ColumnRecord[];
  tasks: TaskRecord[];
}> => {
  const board = await fetchPrimaryBoard(userId);

  if (!board) {
    return {
      board: null,
      columns: [],
      tasks: [],
    };
  }

  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, board_id, name, position")
    .eq("board_id", board.id)
    .order("position", { ascending: true });

  if (columnsError) {
    throw columnsError;
  }

  const columnIds = (columns ?? []).map((column) => column.id);
  const { data: tasks, error: tasksError } = columnIds.length
    ? await supabase
        .from("tasks")
        .select("id, column_id, title, description, position")
        .in("column_id", columnIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (tasksError) {
    throw tasksError;
  }

  return {
    board,
    columns: columns ?? [],
    tasks: tasks ?? [],
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

  const defaultColumns = [
    { board_id: created.id, name: "Por hacer", position: 0 },
    { board_id: created.id, name: "En progreso", position: 1 },
    { board_id: created.id, name: "Hecho", position: 2 },
  ];

  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .insert(defaultColumns)
    .select("id, board_id, name, position");

  if (columnsError) {
    throw columnsError;
  }

  return {
    board: created,
    columns: columns ?? [],
  };
};

export const createTask = async (
  columnId: string,
  title: string,
  position: number,
): Promise<TaskRecord> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ column_id: columnId, title, position })
    .select("id, column_id, title, description, position")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const toBoardState = (
  columns: ColumnRecord[],
  tasks: TaskRecord[],
): BoardState => {
  const taskMap: Record<string, Task> = {};
  const columnMap: Record<string, Column> = {};

  tasks.forEach((task) => {
    taskMap[task.id] = {
      id: task.id,
      title: task.title,
      description: task.description ?? undefined,
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
    columnOrder: columns.sort((a, b) => a.position - b.position).map((column) => column.id),
  };
};

export const persistColumnOrder = async (columnIds: string[]) => {
  const updates = columnIds.map((id, index) => ({ id, position: index }));
  const { error } = await supabase.from("columns").upsert(updates);

  if (error) {
    throw error;
  }
};

export const persistTaskOrder = async (
  updates: Array<{ id: string; column_id: string; position: number }>,
) => {
  if (!updates.length) {
    return;
  }

  const { error } = await supabase.from("tasks").upsert(updates);

  if (error) {
    throw error;
  }
};
