import { supabase } from "../../lib/supabase";
import type { BoardState, Task } from "../../shared/types/board";
import type { Sprint } from "../sprints/types/sprint";

export type BoardScope = "kanban" | "sprint";

export type BoardScopeOption = {
  id: BoardScope;
  label: string;
  available: boolean;
};

export type BoardCapabilities = {
  canCreateTask: boolean;
  canManageColumns: boolean;
  canCompleteSprint: boolean;
  showSprintCountdown: boolean;
};

type BoardViewColumn = {
  id: string;
  name: string;
  position: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

type BoardViewTask = {
  id: string;
  projectId: string;
  columnId: string;
  sprintId: string | null;
  epicId: string | null;
  parentTaskId: string | null;
  displayId: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  position: number;
  storyPoints: string | null;
  githubLink: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  issueType: { id: string; name: string; icon: string | null; color: string | null } | null;
  priority: { id: string; name: string; level: number | null; color: string | null } | null;
  assignee: { id: string; fullName: string | null; avatarUrl: string | null; jobTitle: string | null } | null;
  epic: { id: string; displayId: string | null; name: string; color: string | null } | null;
};

type BoardViewPayload = {
  project: {
    id: string;
    organizationId: string;
    title: string;
    projectKey: string;
    visibility: string;
  };
  selectedScope: BoardScope;
  effectiveScope: BoardScope;
  availableScopes: BoardScopeOption[];
  activeSprint: {
    id: string;
    name: string;
    goal: string | null;
    status: Sprint["status"];
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  capabilities: BoardCapabilities;
  defaultColumnId: string | null;
  columnOrder: string[];
  columns: BoardViewColumn[];
  tasks: BoardViewTask[];
};

export type ProjectBoardView = Omit<
  BoardViewPayload,
  "activeSprint" | "columns" | "tasks"
> & {
  activeSprint: Sprint | null;
  boardState: BoardState;
};

type FunctionEnvelope<T> = { data: T };

const invokeBoardFunction = async <T>(
  functionName: "board-view" | "board-commands",
  body: Record<string, unknown>
): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<FunctionEnvelope<T>>(functionName, {
    body,
  });

  if (error) throw error;
  if (!data?.data) {
    throw new Error("El backend no devolvió el estado del tablero.");
  }

  return data.data;
};

const toBoardState = (payload: BoardViewPayload): BoardState => {
  const columnsById = new Map(payload.columns.map((column) => [column.id, column]));
  const tasks: Record<string, Task> = {};
  const taskIdsByColumn = new Map<string, string[]>();

  payload.tasks.forEach((task) => {
    const column = columnsById.get(task.columnId);
    tasks[task.id] = {
      id: task.id,
      title: task.title,
      task_id_display: task.displayId ?? undefined,
      subtitle: task.subtitle ?? undefined,
      description: task.description ?? undefined,
      column_id: task.columnId,
      issue_type_id: task.issueType?.id,
      priority_id: task.priority?.id,
      story_points: task.storyPoints ?? undefined,
      assignee_id: task.assignee?.id,
      columnColor: column?.color ?? undefined,
      epic_id: task.epicId ?? undefined,
      epic_name: task.epic?.name,
      epic_color: task.epic?.color ?? undefined,
      planned_start_date: task.plannedStartDate,
      planned_end_date: task.plannedEndDate,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    };

    const columnTaskIds = taskIdsByColumn.get(task.columnId) ?? [];
    columnTaskIds.push(task.id);
    taskIdsByColumn.set(task.columnId, columnTaskIds);
  });

  return {
    tasks,
    columns: Object.fromEntries(
      payload.columns.map((column) => [
        column.id,
        {
          id: column.id,
          title: column.name,
          color: column.color ?? undefined,
          taskIds: taskIdsByColumn.get(column.id) ?? [],
        },
      ])
    ),
    columnOrder: payload.columnOrder,
  };
};

const normalizeBoardView = (payload: BoardViewPayload): ProjectBoardView => ({
  project: payload.project,
  selectedScope: payload.selectedScope,
  effectiveScope: payload.effectiveScope,
  availableScopes: payload.availableScopes,
  capabilities: payload.capabilities,
  defaultColumnId: payload.defaultColumnId,
  columnOrder: payload.columnOrder,
  activeSprint: payload.activeSprint
    ? {
        id: payload.activeSprint.id,
        project_id: payload.project.id,
        name: payload.activeSprint.name,
        goal: payload.activeSprint.goal,
        status: payload.activeSprint.status,
        start_date: payload.activeSprint.startDate,
        end_date: payload.activeSprint.endDate,
        created_at: payload.activeSprint.createdAt,
        updated_at: payload.activeSprint.updatedAt,
      }
    : null,
  boardState: toBoardState(payload),
});

export const fetchProjectBoardView = async (projectId: string): Promise<ProjectBoardView> => {
  const payload = await invokeBoardFunction<BoardViewPayload>("board-view", { projectId });
  return normalizeBoardView(payload);
};

export const setProjectBoardScope = async (
  projectId: string,
  scope: BoardScope
): Promise<ProjectBoardView> => {
  const payload = await invokeBoardFunction<BoardViewPayload>("board-commands", {
    action: "set_scope",
    payload: {
      p_project_id: projectId,
      p_scope: scope,
    },
  });

  return normalizeBoardView(payload);
};

export const moveBoardTaskToBacklog = async (
  projectId: string,
  taskId: string,
  position: number | null = null
): Promise<Task> =>
  invokeBoardFunction<Task>("board-commands", {
    action: "move_task_to_backlog",
    payload: {
      p_project_id: projectId,
      p_task_id: taskId,
      p_position: position,
    },
  });

export const moveBoardTaskToKanban = async (
  projectId: string,
  taskId: string,
  columnId: string | null = null,
  position: number | null = null
): Promise<Task> =>
  invokeBoardFunction<Task>("board-commands", {
    action: "move_task_to_kanban",
    payload: {
      p_project_id: projectId,
      p_task_id: taskId,
      p_column_id: columnId,
      p_position: position,
    },
  });

export const moveBoardTaskToSprint = async (
  projectId: string,
  taskId: string,
  sprintId: string,
  columnId: string | null = null,
  position: number | null = null
): Promise<Task> =>
  invokeBoardFunction<Task>("board-commands", {
    action: "move_task_to_sprint",
    payload: {
      p_project_id: projectId,
      p_task_id: taskId,
      p_sprint_id: sprintId,
      p_column_id: columnId,
      p_position: position,
    },
  });
