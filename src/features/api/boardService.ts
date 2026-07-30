import { supabase } from "../../lib/supabase";
import type { BoardState, Column, Task } from "../../shared/types/board";
import { logError } from "../../shared/utils/errorHandling";
import { assignTaskCommand, createTaskCommand, moveTaskColumnCommand } from "./taskCommandService";

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
  column_id: string | null;
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

type TaskUpdatePayload = {
  updated_at: string;
  title?: string;
  subtitle?: string;
  description?: string;
  column_id?: string | null;
  issue_type_id?: string | null;
  priority_id?: string | null;
  story_points?: string | null;
  assignee_id?: string | null;
  in_backlog?: boolean;
};

const assertColumnBelongsToProject = async (columnId: string, projectId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("columns")
    .select("id")
    .eq("id", columnId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("La columna no pertenece al proyecto activo.");
  }
};

export const fetchColumnProjectId = async (columnId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("columns")
    .select("project_id")
    .eq("id", columnId)
    .maybeSingle();

  if (error) throw error;
  return data?.project_id ?? null;
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
    logError("board.fetchColumnOrder", error);
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
    .eq("project_id", projectId)
    .in("column_id", columnIds);

  if (sprintId) {
    tasksQuery = tasksQuery.eq("sprint_id", sprintId);
  } else {
    tasksQuery = tasksQuery.is("sprint_id", null);
  }

  const { data: tasks, error: tasksError } = await tasksQuery.order("position", { ascending: true });

  if (tasksError) throw tasksError;

  let tasksWithEpics = tasks ?? [];
  if (tasksWithEpics.length > 0) {
    const epicIds = [...new Set(tasksWithEpics.map((task) => task.epic_id).filter(Boolean))] as string[];
    const epicById: Record<string, { name: string; color: string | null }> = {};

    if (epicIds.length > 0) {
      const { data: epics, error: epicsError } = await supabase
        .from("epics")
        .select("id, name, color")
        .eq("project_id", projectId)
        .in("id", epicIds);

      if (epicsError) throw epicsError;

      (epics ?? []).forEach((epic) => {
        epicById[epic.id] = {
          name: epic.name,
          color: epic.color,
        };
      });
    }

    tasksWithEpics = tasksWithEpics.map(task => ({
      ...task,
      epic_name: task.epic_id ? epicById[task.epic_id]?.name ?? null : null,
      epic_color: task.epic_id ? epicById[task.epic_id]?.color ?? null : null,
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
  isBacklog = false,
  expectedProjectId?: string,
  details: {
    subtitle?: string | null;
    description?: string | null;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    assignee_id?: string | null;
    sprint_id?: string | null;
  } = {}
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

  if (!projectId || (expectedProjectId && projectId !== expectedProjectId)) {
    throw new Error("La tarea debe pertenecer al proyecto activo.");
  }

  const data = await createTaskCommand({
    project_id: projectId,
    title,
    subtitle: details.subtitle ?? null,
    description: details.description ?? null,
    destination: isBacklog ? "backlog" : "scrum",
    column_id: isBacklog ? null : columnIdOrProjectId,
    sprint_id: details.sprint_id ?? null,
    position,
    issue_type_id: details.issue_type_id ?? null,
    priority_id: details.priority_id ?? null,
    story_points: details.story_points ?? null,
    assignee_id: details.assignee_id ?? null,
  });

  return data;
};

export const updateTask = async (
  projectId: string,
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

  if (updates.column_id) {
    await assertColumnBelongsToProject(updates.column_id, projectId);
  }

  const shouldUpdateAssignee = Object.prototype.hasOwnProperty.call(updates, "assignee_id");
  const shouldMoveColumn =
    Object.prototype.hasOwnProperty.call(updates, "column_id") &&
    updates.in_backlog !== true &&
    Boolean(updates.column_id);
  const nextAssigneeId = updates.assignee_id ?? null;
  const nonAssigneeUpdates = { ...updates };
  delete nonAssigneeUpdates.assignee_id;
  delete nonAssigneeUpdates.column_id;

  const updateData: TaskUpdatePayload = {
    ...nonAssigneeUpdates,
    updated_at: new Date().toISOString(),
  };

  if (updates.in_backlog === true) {
    updateData.column_id = null;
  } else if (shouldMoveColumn) {
    delete updateData.in_backlog;
  }

  let data: Task | null = null;

  if (Object.keys(updateData).length > 1) {
    const { data: updatedTask, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select("id, column_id, title, task_id_display, subtitle, description, position, issue_type_id, priority_id, story_points, assignee_id")
      .single();

    if (error) {
      throw error;
    }

    data = updatedTask;
  }

  if (shouldUpdateAssignee) {
    data = await assignTaskCommand({
      project_id: projectId,
      task_id: taskId,
      assignee_id: nextAssigneeId,
    });
  }

  if (shouldMoveColumn && updates.column_id) {
    data = await moveTaskColumnCommand({
      project_id: projectId,
      task_id: taskId,
      column_id: updates.column_id,
    });
  }

  if (!data) {
    throw new Error("No hubo cambios para guardar en la tarea.");
  }

  return data;
};

export const deleteTask = async (projectId: string, taskId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No se pudo eliminar la tarea del proyecto activo.");
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
    if (!task.column_id) {
      return acc;
    }

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
  projectId: string,
  updates: Array<{ id: string; column_id: string; position: number }>
) => {
  if (!updates.length) {
    return;
  }

  await Promise.all(
    updates.map(async (update) => {
      await assertColumnBelongsToProject(update.column_id, projectId);

      const { error } = await supabase
        .from("tasks")
        .update({
          column_id: update.column_id,
          position: update.position,
        })
        .eq("id", update.id)
        .eq("project_id", projectId);

      if (error) throw error;
    })
  );
};
