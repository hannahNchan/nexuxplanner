import { useState, useEffect, useCallback } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { supabase } from "../../../lib/supabase";
import type { BoardState, Task } from "../../../shared/types/board";
import {
  createColumn,
  createTask,
  deleteTask,
  fetchBoardDataByProject,
  persistColumnOrder,
  persistTaskOrder,
  toBoardState,
  updateTask,
} from "../../api/boardService";
import {
  fetchIssueTypes,
  fetchPriorities,
  fetchDefaultPointSystem,
  fetchPointValues,
  type IssueType,
  type Priority,
  type PointValue,
} from "../../api/catalogService";
import { useProject } from "../../../shared/contexts/ProjectContext";
import { useSprintManager } from "../../sprints/hooks/useSprintManager";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";
import {
  createDebouncedRealtimeCallback,
  createRealtimeChannelName,
  removeRealtimeChannel,
} from "../../../shared/realtime/realtimeChannels";

const BOARD_DRAFT_TASK_ID = "__draft_board_task__";

export const useBoardManager = (userId: string) => {
  const { currentProject } = useProject();
  const canEditProject = currentProject?.can_edit ?? true;
  const sprintManager = useSprintManager(currentProject?.id || null);

  // Board state
  const [data, setData] = useState<BoardState | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Catalogs
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskEditorPresentation, setTaskEditorPresentation] = useState<"drawer" | "modal">("drawer");
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    project_id?: string | null;
    title: string;
    subtitle?: string;
    description?: string;
    column_id: string;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    assignee_id?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
  } | null>(null);

  // Creating states
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null);

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [types, prioritiesList, pointSystem] = await Promise.all([
          fetchIssueTypes(),
          fetchPriorities(),
          fetchDefaultPointSystem(),
        ]);

        setIssueTypes(types);
        setPriorities(prioritiesList);

        if (pointSystem) {
          const points = await fetchPointValues(pointSystem.id);
          setPointValues(points);
        }

        setCatalogsLoaded(true);
      } catch (error) {
        logError("board.loadCatalogs", error);
        setErrorMessage(getErrorMessage(error, "No se pudieron cargar los catálogos del tablero."));
      }
    };

    void loadCatalogs();
  }, []);

  const loadBoard = useCallback(async (showLoading = true) => {
    if (!currentProject) {
      setData(null);
      setBoardId(null);
      setIsLoading(false);
      return;
    }

    if (sprintManager.isLoading) {
      return;
    }

    const displaySprint = sprintManager.activeSprint;

    if (!displaySprint) {
      setBoardId(null);
      setData(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setIsLoading(true);
      }

      const response = await fetchBoardDataByProject(
        userId,
        currentProject.id,
        displaySprint.id
      );

      if (!response.columns || response.columns.length === 0) {
        setBoardId(null);
        setData(null);
        return;
      }

      const boardState = toBoardState(response.columns, response.tasks, response.columnOrder);

      setBoardId(response.board?.id ?? null);
      setData(boardState);
      setErrorMessage(null);
    } catch (error) {
      logError("board.loadBoard", error);
      setErrorMessage(getErrorMessage(error, "No se pudo cargar el tablero desde Supabase."));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [userId, currentProject, sprintManager.activeSprint, sprintManager.isLoading]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, sprintManager.lastUpdate]);

  useEffect(() => {
    if (!currentProject?.id) return;

    const handleColumnBadgeColorsChanged = (event: Event) => {
      const projectId = (event as CustomEvent<{ projectId?: string }>).detail?.projectId;
      if (projectId === currentProject.id) {
        void loadBoard(false);
      }
    };

    window.addEventListener("nexusplanner:column-badge-colors-changed", handleColumnBadgeColorsChanged);

    return () => {
      window.removeEventListener("nexusplanner:column-badge-colors-changed", handleColumnBadgeColorsChanged);
    };
  }, [currentProject?.id, loadBoard]);

  useEffect(() => {
    if (!currentProject?.id || !sprintManager.activeSprint?.id) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const reloadBoard = createDebouncedRealtimeCallback(() => {
      void loadBoard(false);
    });

    const subscriptionDelay = window.setTimeout(() => {
      channel = supabase
        .channel(createRealtimeChannelName({
          scope: "project",
          scopeId: currentProject.id,
          topic: "board-tasks",
          subtopic: sprintManager.activeSprint?.id,
        }))
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${currentProject.id}`,
          },
          reloadBoard.run
        )
        .subscribe();
    }, 1200);

    return () => {
      window.clearTimeout(subscriptionDelay);
      reloadBoard.cancel();
      removeRealtimeChannel(channel);
    };
  }, [currentProject?.id, sprintManager.activeSprint?.id, loadBoard]);

  // Handlers
  const handleCreateColumn = async (columnName: string) => {
    if (!currentProject || !data) {
      setErrorMessage("Selecciona un proyecto primero");
      return;
    }
    if (!canEditProject) {
      setErrorMessage("Solo puedes editar proyectos donde eres colaborador.");
      return;
    }

    try {
      const position = data.columnOrder.length;
      const newColumn = await createColumn(currentProject.id, columnName, position);
      const newColumnOrder = [...data.columnOrder, newColumn.id];

      setData((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          columns: {
            ...previous.columns,
            [newColumn.id]: {
              id: newColumn.id,
              title: newColumn.name,
              color: newColumn.color ?? undefined,
              taskIds: [],
            },
          },
          columnOrder: newColumnOrder,
        };
      });

      setErrorMessage(null);
    } catch (error) {
      logError("board.createColumn", error);
      setErrorMessage(getErrorMessage(error, "No se pudo crear la columna."));
      throw error;
    }
  };

  const handleCreateTask = async (columnId: string) => {
    if (!currentProject || !data) return;
    if (!canEditProject) {
      setErrorMessage("Solo puedes crear tareas en proyectos donde eres colaborador.");
      return;
    }

    setCreatingTaskColumnId(columnId);
    setSelectedTask({
      id: BOARD_DRAFT_TASK_ID,
      project_id: currentProject.id,
      title: "Nueva tarea",
      subtitle: "",
      description: "",
      column_id: columnId,
      issue_type_id: null,
      priority_id: null,
      story_points: null,
      assignee_id: null,
      planned_start_date: null,
      planned_end_date: null,
    });
    setTaskEditorPresentation("modal");
    setIsModalOpen(true);
    setErrorMessage(null);
    setCreatingTaskColumnId(null);
  };

  const handleTaskClick = (task: Task) => {
    if (!data) return;

    let columnId = "";
    for (const [colId, column] of Object.entries(data.columns)) {
      if (column.taskIds.includes(task.id)) {
        columnId = colId;
        break;
      }
    }

    setSelectedTask({
      id: task.id,
      project_id: currentProject?.id ?? null,
      title: task.title,
      subtitle: task.subtitle,
      description: task.description,
      column_id: columnId,
      issue_type_id: task.issue_type_id ?? null,
      priority_id: task.priority_id ?? null,
      story_points: task.story_points ?? null,
      assignee_id: task.assignee_id ?? null,
      planned_start_date: task.planned_start_date ?? null,
      planned_end_date: task.planned_end_date ?? null,
    });
    setTaskEditorPresentation("drawer");
    setIsModalOpen(true);
  };

  const handleSaveTask = async (
    taskId: string,
    updates: {
      title: string;
      subtitle: string;
      description: string;
      destination: "backlog" | "scrum";
      column_id: string | null;
      issue_type_id: string | null;
      priority_id: string | null;
      story_points: string | null;
      assignee_id: string | null;
      planned_start_date: string | null;
      planned_end_date: string | null;
    }
  ) => {
    if (!currentProject || !data) return;
    if (!canEditProject) {
      setErrorMessage("Solo puedes editar tareas en proyectos donde eres colaborador.");
      return;
    }

    try {
      if (taskId === BOARD_DRAFT_TASK_ID) {
        const destinationColumnId = updates.destination === "scrum"
          ? updates.column_id ?? selectedTask?.column_id ?? data.columnOrder[0]
          : currentProject.id;
        const position = updates.destination === "scrum" && updates.column_id
          ? data.columns[updates.column_id]?.taskIds.length ?? 0
          : 0;
        const created = await createTask(
          destinationColumnId,
          updates.title,
          position,
          updates.destination === "backlog",
          currentProject.id,
          {
            subtitle: updates.subtitle,
            description: updates.description,
            issue_type_id: updates.issue_type_id,
            priority_id: updates.priority_id,
            story_points: updates.story_points,
            assignee_id: updates.assignee_id,
            planned_start_date: updates.planned_start_date,
            planned_end_date: updates.planned_end_date,
            sprint_id: updates.destination === "scrum" ? sprintManager.activeSprint?.id ?? null : null,
          }
        );

        if (updates.destination === "scrum" && created.column_id) {
          setData((previous) => {
            if (!previous || !created.column_id) return previous;
            const columnColor = previous.columns[created.column_id]?.color;

            return {
              ...previous,
              tasks: {
                ...previous.tasks,
                [created.id]: {
                  id: created.id,
                  title: created.title,
                  task_id_display: created.task_id_display ?? undefined,
                  subtitle: created.subtitle ?? undefined,
                  description: created.description ?? undefined,
                  issue_type_id: created.issue_type_id ?? undefined,
                  priority_id: created.priority_id ?? undefined,
                  story_points: created.story_points ?? undefined,
                  assignee_id: created.assignee_id ?? undefined,
                  columnColor,
                  planned_start_date: created.planned_start_date ?? null,
                  planned_end_date: created.planned_end_date ?? null,
                  created_at: created.created_at,
                  updated_at: created.updated_at,
                },
              },
              columns: {
                ...previous.columns,
                [created.column_id]: {
                  ...previous.columns[created.column_id],
                  taskIds: [...previous.columns[created.column_id].taskIds, created.id],
                },
              },
            };
          });
        }

        void loadBoard(false);
        return;
      }

      const { destination, ...dbUpdates } = updates;
      const in_backlog = destination === "backlog";

      const updated = await updateTask(
        currentProject.id,
        taskId,
        {
          ...dbUpdates,
          in_backlog,
          column_id: in_backlog ? null : updates.column_id,
        }
      );

      setData((previous) => {
        if (!previous) return previous;
        const previousTask = previous.tasks[taskId];
        const nextColumnColor = updates.column_id
          ? previous.columns[updates.column_id]?.color
          : previousTask?.columnColor;

        const updatedTasks = {
          ...previous.tasks,
          [taskId]: {
            ...previousTask,
            id: updated.id,
            title: updated.title,
            task_id_display: updated.task_id_display ?? previousTask?.task_id_display,
            subtitle: updated.subtitle ?? undefined,
            description: updated.description ?? undefined,
            issue_type_id: updated.issue_type_id ?? undefined,
            priority_id: updated.priority_id ?? undefined,
            story_points: updated.story_points ?? undefined,
            assignee_id: updated.assignee_id ?? undefined,
            columnColor: nextColumnColor,
            planned_start_date: updated.planned_start_date ?? previousTask?.planned_start_date ?? null,
            planned_end_date: updated.planned_end_date ?? previousTask?.planned_end_date ?? null,
            created_at: updated.created_at ?? previousTask?.created_at,
            updated_at: updated.updated_at ?? previousTask?.updated_at,
          },
        };

        if (in_backlog) {
          const oldColumnId = Object.keys(previous.columns).find((colId) =>
            previous.columns[colId].taskIds.includes(taskId)
          );

          if (oldColumnId) {
            const updatedOldColumn = {
              ...previous.columns[oldColumnId],
              taskIds: previous.columns[oldColumnId].taskIds.filter((id) => id !== taskId),
            };

            const { [taskId]: _removed, ...remainingTasks } = updatedTasks;

            return {
              ...previous,
              tasks: remainingTasks,
              columns: {
                ...previous.columns,
                [oldColumnId]: updatedOldColumn,
              },
            };
          }
        }

        const oldColumnId = Object.keys(previous.columns).find((colId) =>
          previous.columns[colId].taskIds.includes(taskId)
        );

        if (oldColumnId && updates.column_id && oldColumnId !== updates.column_id) {
          const updatedOldColumn = {
            ...previous.columns[oldColumnId],
            taskIds: previous.columns[oldColumnId].taskIds.filter((id) => id !== taskId),
          };

          const updatedNewColumn = {
            ...previous.columns[updates.column_id],
            taskIds: [...previous.columns[updates.column_id].taskIds, taskId],
          };

          return {
            ...previous,
            tasks: updatedTasks,
            columns: {
              ...previous.columns,
              [oldColumnId]: updatedOldColumn,
              [updates.column_id]: updatedNewColumn,
            },
          };
        }

        return {
          ...previous,
          tasks: updatedTasks,
        };
      });
      void loadBoard(false);
    } catch (error) {
      logError("board.updateTask", error);
      setErrorMessage(getErrorMessage(error, "No se pudo actualizar la tarea."));
      throw error;
    }
  };

  const handleMoveTaskColumn = async (taskId: string, columnId: string) => {
    if (!currentProject || !data) return;
    if (!canEditProject) {
      setErrorMessage("Solo puedes mover tareas en proyectos donde eres colaborador.");
      return;
    }

    const previousData = data;
    const previousSelectedTask = selectedTask;
    const oldColumnId = Object.keys(data.columns).find((colId) =>
      data.columns[colId].taskIds.includes(taskId)
    );

    if (oldColumnId === columnId) {
      return;
    }

    try {
      setData((previous) => {
        if (!previous || !oldColumnId || !previous.columns[columnId]) return previous;

        return {
          ...previous,
          columns: {
            ...previous.columns,
            [oldColumnId]: {
              ...previous.columns[oldColumnId],
              taskIds: previous.columns[oldColumnId].taskIds.filter((id) => id !== taskId),
            },
            [columnId]: {
              ...previous.columns[columnId],
              taskIds: [...previous.columns[columnId].taskIds.filter((id) => id !== taskId), taskId],
            },
          },
        };
      });

      setSelectedTask((previous) =>
        previous?.id === taskId ? { ...previous, column_id: columnId } : previous
      );

      const updated = await updateTask(currentProject.id, taskId, {
        column_id: columnId,
        in_backlog: false,
      });

      setData((previous) => {
        if (!previous || !previous.tasks[taskId]) return previous;
        const nextColumnColor = previous.columns[columnId]?.color;

        return {
          ...previous,
          tasks: {
            ...previous.tasks,
            [taskId]: {
              ...previous.tasks[taskId],
              id: updated.id,
              title: updated.title,
              task_id_display: updated.task_id_display ?? previous.tasks[taskId].task_id_display,
              subtitle: updated.subtitle ?? undefined,
              description: updated.description ?? undefined,
              issue_type_id: updated.issue_type_id ?? undefined,
              priority_id: updated.priority_id ?? undefined,
              story_points: updated.story_points ?? undefined,
              assignee_id: updated.assignee_id ?? undefined,
              columnColor: nextColumnColor,
              planned_start_date: updated.planned_start_date ?? previous.tasks[taskId].planned_start_date ?? null,
              planned_end_date: updated.planned_end_date ?? previous.tasks[taskId].planned_end_date ?? null,
              created_at: updated.created_at ?? previous.tasks[taskId].created_at,
              updated_at: updated.updated_at ?? previous.tasks[taskId].updated_at,
            },
          },
        };
      });

      void loadBoard(false);
    } catch (error) {
      logError("board.moveTaskColumn", error);
      setData(previousData);
      setSelectedTask(previousSelectedTask);
      setErrorMessage(getErrorMessage(error, "No se pudo cambiar el estado de la tarea."));
      throw error;
    }
  };

  const handleUpdateTaskDates = async (
    taskId: string,
    plannedStartDate: string | null,
    plannedEndDate: string | null
  ) => {
    if (!currentProject || !data) return;
    if (!canEditProject) {
      setErrorMessage("Solo puedes modificar fechas en proyectos donde eres colaborador.");
      return;
    }

    const previousTask = data.tasks[taskId];
    if (!previousTask) return;

    setData((previous) => {
      if (!previous || !previous.tasks[taskId]) return previous;

      return {
        ...previous,
        tasks: {
          ...previous.tasks,
          [taskId]: {
            ...previous.tasks[taskId],
            planned_start_date: plannedStartDate,
            planned_end_date: plannedEndDate,
          },
        },
      };
    });

    try {
      const updated = await updateTask(currentProject.id, taskId, {
        planned_start_date: plannedStartDate,
        planned_end_date: plannedEndDate,
      });

      setData((previous) => {
        if (!previous || !previous.tasks[taskId]) return previous;

        return {
          ...previous,
          tasks: {
            ...previous.tasks,
            [taskId]: {
              ...previous.tasks[taskId],
              planned_start_date: updated.planned_start_date ?? null,
              planned_end_date: updated.planned_end_date ?? null,
              updated_at: updated.updated_at ?? previous.tasks[taskId].updated_at,
            },
          },
        };
      });
    } catch (error) {
      logError("board.updateTaskDates", error);
      setData((previous) => {
        if (!previous || !previous.tasks[taskId]) return previous;

        return {
          ...previous,
          tasks: {
            ...previous.tasks,
            [taskId]: previousTask,
          },
        };
      });
      setErrorMessage(getErrorMessage(error, "No se pudieron guardar las fechas de la tarea."));
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentProject || !data) return;
    if (!canEditProject) {
      setErrorMessage("Solo puedes eliminar tareas en proyectos donde eres colaborador.");
      return;
    }

    try {
      await deleteTask(currentProject.id, taskId);

      setData((previous) => {
        if (!previous) return previous;

        const { [taskId]: _removed, ...remainingTasks } = previous.tasks;

        const updatedColumns = { ...previous.columns };
        for (const colId of Object.keys(updatedColumns)) {
          if (updatedColumns[colId].taskIds.includes(taskId)) {
            updatedColumns[colId] = {
              ...updatedColumns[colId],
              taskIds: updatedColumns[colId].taskIds.filter((id) => id !== taskId),
            };
          }
        }

        return {
          ...previous,
          tasks: remainingTasks,
          columns: updatedColumns,
        };
      });
    } catch (error) {
      logError("board.deleteTask", error);
      setErrorMessage(getErrorMessage(error, "No se pudo eliminar la tarea."));
      throw error;
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination || !currentProject || !data) return;
    if (!canEditProject) {
      setErrorMessage("Solo puedes mover trabajo en proyectos donde eres colaborador.");
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (type === "column") {
      const previousData = data;
      const newColumnOrder = Array.from(data.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);

      setData({
        ...data,
        columnOrder: newColumnOrder,
      });

      try {
        await persistColumnOrder(currentProject.id, newColumnOrder);
      } catch (error) {
        logError("board.persistColumnOrder", error);
        setData(previousData);
        setErrorMessage(getErrorMessage(error, "No se pudo guardar el orden de columnas."));
      }
      return;
    }

    const previousData = data;
    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    if (startColumn.id === finishColumn.id) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const updatedColumn = {
        ...startColumn,
        taskIds: newTaskIds,
      };

      setData({
        ...data,
        columns: {
          ...data.columns,
          [updatedColumn.id]: updatedColumn,
        },
      });

      const taskUpdates = newTaskIds.map((taskId, index) => ({
        id: taskId,
        column_id: startColumn.id,
        position: index,
      }));

      try {
        await persistTaskOrder(currentProject.id, taskUpdates);
      } catch (error) {
        logError("board.persistTaskOrder.sameColumn", error);
        setData(previousData);
        setErrorMessage(getErrorMessage(error, "No se pudo guardar el orden de tareas."));
      }
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);

    const updatedStart = {
      ...startColumn,
      taskIds: startTaskIds,
    };

    const updatedFinish = {
      ...finishColumn,
      taskIds: finishTaskIds,
    };

    setData({
      ...data,
      columns: {
        ...data.columns,
        [updatedStart.id]: updatedStart,
        [updatedFinish.id]: updatedFinish,
      },
    });

    const taskUpdates = [
      ...startTaskIds.map((taskId, index) => ({
        id: taskId,
        column_id: startColumn.id,
        position: index,
      })),
      ...finishTaskIds.map((taskId, index) => ({
        id: taskId,
        column_id: finishColumn.id,
        position: index,
      })),
    ];

    try {
      await persistTaskOrder(currentProject.id, taskUpdates);
    } catch (error) {
      logError("board.persistTaskOrder.crossColumn", error);
      setData(previousData);
      setErrorMessage(getErrorMessage(error, "No se pudo mover la tarea."));
    }
  };

  // Computed values
  const displaySprint = sprintManager.activeSprint;

  const columnOptions = data
    ? data.columnOrder.map((colId) => ({
        id: colId,
        title: data.columns[colId].title,
      }))
    : [];

  return {
    // State
    data,
    boardId,
    isLoading,
    errorMessage,
    catalogsLoaded,
    issueTypes,
    priorities,
    pointValues,
    currentProject,
    sprintManager,
    displaySprint,

    // Modals
    isModalOpen,
    taskEditorPresentation,
    isAddColumnModalOpen,
    selectedTask,
    setIsModalOpen,
    setTaskEditorPresentation,
    setIsAddColumnModalOpen,
    setSelectedTask,

    // Creating states
    creatingTaskColumnId,

    // Computed
    columnOptions,

    // Handlers
    handleCreateColumn,
    handleCreateTask,
    handleTaskClick,
    handleSaveTask,
    handleMoveTaskColumn,
    handleUpdateTaskDates,
    handleDeleteTask,
    onDragEnd,
  };
};
