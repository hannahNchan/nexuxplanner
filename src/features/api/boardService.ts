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
  position: number; // ⚠️ DEPRECATED: Se mantiene por compatibilidad, pero ya no se usa
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

type ColumnOrderRecord = {
  id: string;
  board_id: string;
  column_ids: string[]; // Array de IDs en orden
  updated_at: string;
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

/**
 * ✅ NUEVA FUNCIÓN: Obtener el orden de columnas del board
 */
export const fetchColumnOrder = async (boardId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("column_order")
    .select("column_ids")
    .eq("board_id", boardId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching column order:", error);
    return []; // Si no existe, devolver array vacío
  }

  return data?.column_ids ?? [];
};

export const fetchBoardData = async (userId: string): Promise<{
  board: BoardRecord | null;
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  columnOrder: string[]; // ✅ NUEVO: Orden de columnas
}> => {
  const board = await fetchPrimaryBoard(userId);

  if (!board) {
    return {
      board: null,
      columns: [],
      tasks: [],
      columnOrder: [],
    };
  }

  // Obtener columnas (sin importar el orden en BD)
  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, board_id, name, position")
    .eq("board_id", board.id);

  if (columnsError) {
    throw columnsError;
  }

  // ✅ Obtener el orden de columnas desde column_order
  const columnOrder = await fetchColumnOrder(board.id);

  // Si no hay orden guardado, usar el orden por defecto (position)
  const finalColumnOrder = columnOrder.length > 0
    ? columnOrder
    : (columns ?? [])
        .sort((a, b) => a.position - b.position)
        .map((c) => c.id);

  const columnIds = (columns ?? []).map((column) => column.id);
  const { data: tasks, error: tasksError } = columnIds.length
    ? await supabase
        .from("tasks")
        .select("id, column_id, title, description, position, issue_type_id, priority_id, story_points, assignee_id")
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
    columnOrder: finalColumnOrder, // ✅ Devolver el orden correcto
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

  // ✅ Crear el orden inicial en column_order
  const columnIds = (columns ?? [])
    .sort((a, b) => a.position - b.position)
    .map((c) => c.id);

  await persistColumnOrder(created.id, columnIds);

  return {
    board: created,
    columns: columns ?? [],
  };
};

/**
 * Crea una nueva columna en el tablero
 */
export const createColumn = async (
  boardId: string,
  name: string,
  position: number
): Promise<ColumnRecord> => {
  const { data, error } = await supabase
    .from("columns")
    .insert({ 
      board_id: boardId, 
      name, 
      position 
    })
    .select("id, board_id, name, position")
    .single();

  if (error) {
    throw error;
  }

  // ✅ Actualizar el orden de columnas
  const currentOrder = await fetchColumnOrder(boardId);
  const newOrder = [...currentOrder, data.id];
  await persistColumnOrder(boardId, newOrder);

  return data;
};

export const createTask = async (
  columnId: string,
  title: string,
  position: number,
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

/**
 * Actualiza una tarea existente
 */
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

/**
 * Elimina una tarea
 */
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
  columnOrder: string[], // ✅ NUEVO: Recibir el orden desde BD
): BoardState => {
  console.log("🔧 toBoardState - Entrada:");
  console.log("  Columnas recibidas:", columns.map(c => `${c.name}`));
  console.log("  Orden de columnas (column_ids):", columnOrder);
  
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

  // ✅ Usar el orden de column_order en lugar de position
  console.log("🔧 toBoardState - Salida:");
  console.log("  columnOrder nombres:", columnOrder.map(id => columnMap[id]?.title));

  return {
    tasks: taskMap,
    columns: columnMap,
    columnOrder, // ✅ Usar el orden correcto
  };
};

/**
 * ✅ NUEVA FUNCIÓN: Guardar el orden de columnas en column_order
 */
export const persistColumnOrder = async (boardId: string, columnIds: string[]) => {
  console.log("💾 persistColumnOrder - Guardando:");
  console.log("  Board ID:", boardId);
  console.log("  Column IDs:", columnIds);
  
  const { error } = await supabase
    .from("column_order")
    .upsert({
      board_id: boardId,
      column_ids: columnIds,
    }, {
      onConflict: "board_id", // Actualizar si ya existe
    });

  if (error) {
    console.error("❌ Error en persistColumnOrder:", error);
    throw error;
  }
  
  console.log("✅ persistColumnOrder - Éxito");
};

export const persistTaskOrder = async (
  updates: Array<{ id: string; column_id: string; position: number }>,
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