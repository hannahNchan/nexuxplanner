import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import Column from "./Column";
import TaskEditorModal from "./TaskEditorModal";
import AddColumnModal from "./AddColumnModal";
import type { BoardState, Task } from "../../../shared/types/board";
import {
  createBoard,
  createColumn,
  createTask,
  deleteTask,
  fetchBoardData,
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

type BoardProps = {
  userId: string;
};

const Board = ({ userId }: BoardProps) => {
  const theme = useTheme();
  const [data, setData] = useState<BoardState | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("Tablero principal");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    title: string;
    description?: string;
    column_id: string;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
  } | null>(null);

  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);

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
        console.error("Error cargando catálogos:", error);
      }
    };

    void loadCatalogs();
  }, []);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const response = await fetchBoardData(userId);
        
        if (!response.board) {
          setBoardId(null);
          setData(null);
          return;
        }
        
        const boardState = toBoardState(
          response.columns, 
          response.tasks, 
          response.columnOrder
        );
        
        setBoardId(response.board.id);
        setData(boardState);
        setErrorMessage(null);
      } catch (error) {
        console.error(error);
        setErrorMessage("No se pudo cargar el tablero desde Supabase.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadBoard();
  }, [userId]);

  const handleCreateBoard = async () => {
    if (!boardName.trim()) {
      setErrorMessage("Ingresa un nombre para el tablero.");
      return;
    }

    setIsCreatingBoard(true);
    setErrorMessage(null);
    try {
      const created = await createBoard(userId, boardName.trim());
      const initialColumnOrder = created.columns.map(c => c.id);
      
      setBoardId(created.board.id);
      setData(toBoardState(created.columns, [], initialColumnOrder));
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo crear el tablero.");
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const handleCreateColumn = async (columnName: string) => {
    if (!boardId || !data) {
      return;
    }

    try {
      const position = data.columnOrder.length;
      const newColumn = await createColumn(boardId, columnName, position);
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
      console.error("Error creando columna:", error);
      setErrorMessage("No se pudo crear la columna.");
      throw error;
    }
  };

  const handleCreateTask = async (columnId: string) => {
    if (!data) {
      return;
    }

    setCreatingTaskColumnId(columnId);
    try {
      const column = data.columns[columnId];
      const position = column.taskIds.length;
      const created = await createTask(columnId, "Nueva tarea", position);

      setData((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          tasks: {
            ...previous.tasks,
            [created.id]: {
              id: created.id,
              title: created.title,
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
      });
      setIsModalOpen(true);

      setErrorMessage(null);
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo crear la tarea.");
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
      title: task.title,
      description: task.description,
      column_id: columnId,
      issue_type_id: task.issue_type_id ?? null,
      priority_id: task.priority_id ?? null,
      story_points: task.story_points ?? null,
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (
    taskId: string,
    updates: {
      title: string;
      description: string;
      column_id: string;
      issue_type_id: string | null;
      priority_id: string | null;
      story_points: string | null;
    }
  ) => {
    if (!data) return;

    try {
      const updated = await updateTask(taskId, updates);

      setData((previous) => {
        if (!previous) return previous;

        const updatedTasks = {
          ...previous.tasks,
          [taskId]: {
            id: updated.id,
            title: updated.title,
            description: updated.description ?? undefined,
            issue_type_id: updated.issue_type_id ?? undefined,
            priority_id: updated.priority_id ?? undefined,
            story_points: updated.story_points ?? undefined,
            assignee_id: updated.assignee_id ?? undefined,
          },
        };

        const oldColumnId = Object.keys(previous.columns).find((colId) =>
          previous.columns[colId].taskIds.includes(taskId)
        );

        if (oldColumnId && oldColumnId !== updates.column_id) {
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
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!data) return;

    try {
      await deleteTask(taskId);

      setData((previous) => {
        if (!previous) return previous;

        const { [taskId]: removed, ...remainingTasks } = previous.tasks;

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
      console.error("Error eliminando tarea:", error);
      throw error;
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination || !data) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "column") {
      const newColumnOrder = Array.from(data.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);

      setData({
        ...data,
        columnOrder: newColumnOrder,
      });

      try {
        await persistColumnOrder(boardId!, newColumnOrder);
      } catch (error) {
        console.error("Error guardando orden de columnas:", error);
        setData({
          ...data,
          columnOrder: data.columnOrder,
        });
      }
      return;
    }

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
        await persistTaskOrder(taskUpdates);
      } catch (error) {
        console.error(error);
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
      await persistTaskOrder(taskUpdates);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading || !catalogsLoaded) {
    return (
      <Stack spacing={2} alignItems="center" py={6}>
        <CircularProgress />
        <Typography color="text.secondary">
          {!catalogsLoaded ? "Cargando catálogos..." : "Cargando tablero..."}
        </Typography>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Stack spacing={1} py={4}>
        <Typography variant="h5" fontWeight={700}>
          Tablero
        </Typography>
        {boardId ? (
          <Typography color="error">
            {errorMessage ?? "No hay datos disponibles."}
          </Typography>
        ) : (
          <Stack spacing={2} maxWidth={360}>
            <Typography color="text.secondary">
              {errorMessage ?? "Aún no tienes un tablero creado."}
            </Typography>
            <TextField
              label="Nombre del tablero"
              value={boardName}
              onChange={(event) => setBoardName(event.target.value)}
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleCreateBoard}
              disabled={isCreatingBoard}
            >
              {isCreatingBoard ? "Creando..." : "Crear tablero"}
            </Button>
          </Stack>
        )}
      </Stack>
    );
  }

  const columnOptions = data.columnOrder.map((colId) => ({
    id: colId,
    title: data.columns[colId].title,
  }));

  return (
    <>
      <Stack spacing={2}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Tablero
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Arrastra columnas o tareas para reorganizar.
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setIsAddColumnModalOpen(true)}
              size="small"
            >
              Añadir columna
            </Button>
          </Stack>
          
          {errorMessage && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {errorMessage}
            </Typography>
          )}
        </Paper>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                display="flex"
                gap={3}
                flexWrap="nowrap"
                overflow="auto"
                pb={1}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, 
                    ${alpha(theme.palette.primary.main, 0.08)} 0%, 
                    ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  backdropFilter: "blur(10px)",
                }}
              >
                {data.columnOrder.map((columnId, index) => {
                  const column = data.columns[columnId];
                  const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);
                  return (
                    <Column
                      key={column.id}
                      column={column}
                      tasks={tasks}
                      index={index}
                      onCreateTask={handleCreateTask}
                      onTaskClick={handleTaskClick}
                      isCreatingTask={creatingTaskColumnId === column.id}
                    />
                  );
                })}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Stack>

      <TaskEditorModal
        open={isModalOpen}
        task={selectedTask}
        columns={columnOptions}
        issueTypes={issueTypes}
        priorities={priorities}
        pointValues={pointValues}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <AddColumnModal
        open={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        onSave={handleCreateColumn}
      />
    </>
  );
};

export default Board;