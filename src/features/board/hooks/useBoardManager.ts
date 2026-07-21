import { useState, useEffect, useCallback, useRef } from "react";
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

export const useBoardManager = (userId: string) => {
  const { currentProject } = useProject();
  const canEditProject = currentProject?.can_edit ?? true;
  const sprintManager = useSprintManager(currentProject?.id || null);

  // Board state
  const [data, setData] = useState<BoardState | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const boardReloadTimerRef = useRef<number | null>(null);

  // Catalogs
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    if (!currentProject?.id || !sprintManager.activeSprint?.id) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const subscriptionDelay = window.setTimeout(() => {
      channel = supabase
        .channel(`board-tasks:${currentProject.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${currentProject.id}`,
          },
          () => {
            if (boardReloadTimerRef.current) {
              window.clearTimeout(boardReloadTimerRef.current);
            }

            boardReloadTimerRef.current = window.setTimeout(() => {
              void loadBoard(false);
              boardReloadTimerRef.current = null;
            }, 300);
          }
        )
        .subscribe();
    }, 1200);

    return () => {
      window.clearTimeout(subscriptionDelay);
      if (boardReloadTimerRef.current) {
        window.clearTimeout(boardReloadTimerRef.current);
        boardReloadTimerRef.current = null;
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
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
    try {
      const column = data.columns[columnId];
      const position = column.taskIds.length;
      const created = await createTask(columnId, "Nueva tarea", position, false, currentProject.id);

      setData((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          tasks: {
            ...previous.tasks,
            [created.id]: {
              id: created.id,
              title: created.title,
              subtitle: created.subtitle ?? undefined,
              description: created.description ?? undefined,
              issue_type_id: created.issue_type_id ?? undefined,
              priority_id: created.priority_id ?? undefined,
              story_points: created.story_points ?? undefined,
              assignee_id: created.assignee_id ?? undefined,
            },
          },
          columns: {
            ...previous.columns,
            [columnId]: {
              ...previous.columns[columnId],
              taskIds: [...previous.columns[columnId].taskIds, created.id],
            },
          },
        };
      });

      setSelectedTask({
        id: created.id,
        title: created.title,
        description: created.description ?? undefined,
        column_id: created.column_id,
        issue_type_id: created.issue_type_id,
        priority_id: created.priority_id,
        story_points: created.story_points,
        assignee_id: created.assignee_id,
      });
      setIsModalOpen(true);
      setErrorMessage(null);
    } catch (error) {
      logError("board.createTask", error);
      setErrorMessage(getErrorMessage(error, "No se pudo crear la tarea."));
    } finally {
      setCreatingTaskColumnId(null);
    }
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
    });
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
    }
  ) => {
    if (!currentProject || !data) return;
    if (!canEditProject) {
      setErrorMessage("Solo puedes editar tareas en proyectos donde eres colaborador.");
      return;
    }

    try {
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
    isAddColumnModalOpen,
    selectedTask,
    setIsModalOpen,
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
    handleDeleteTask,
    onDragEnd,
  };
};
