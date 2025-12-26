import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import Column from "./Column";
import type { BoardState } from "../../../shared/types/board";
import {
  createBoard,
  createTask,
  fetchBoardData,
  persistColumnOrder,
  persistTaskOrder,
  toBoardState,
} from "../../api/boardService";

type BoardProps = {
  userId: string;
};

const Board = ({ userId }: BoardProps) => {
  const [data, setData] = useState<BoardState | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("Tablero principal");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [creatingTaskColumnId, setCreatingTaskColumnId] = useState<string | null>(null);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const response = await fetchBoardData(userId);
        if (!response.board) {
          setBoardId(null);
          setData(null);
          return;
        }
        setBoardId(response.board.id);
        setData(toBoardState(response.columns, response.tasks));
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
      setBoardId(created.board.id);
      setData(toBoardState(created.columns, []));
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo crear el tablero.");
    } finally {
      setIsCreatingBoard(false);
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
      setErrorMessage(null);
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo crear la tarea.");
    } finally {
      setCreatingTaskColumnId(null);
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
        await persistColumnOrder(newColumnOrder);
      } catch (error) {
        console.error(error);
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

  if (isLoading) {
    return (
      <Stack spacing={2} alignItems="center" py={6}>
        <CircularProgress />
        <Typography color="text.secondary">Cargando tablero...</Typography>
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

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Tablero
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Arrastra columnas o tareas para reorganizar.
        </Typography>
        {errorMessage && (
          <Typography variant="body2" color="error">
            {errorMessage}
          </Typography>
        )}
      </Stack>
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
  );
};

export default Board;
