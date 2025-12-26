import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import Column from "./Column";
import type { BoardState } from "../../../shared/types/board";
import {
  fetchBoardData,
  persistColumnOrder,
  persistTaskOrder,
  toBoardState,
} from "../../api/boardService";

const Board = () => {
  const [data, setData] = useState<BoardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const response = await fetchBoardData();
        setData(toBoardState(response.columns, response.tasks));
      } catch (error) {
        console.error(error);
        setErrorMessage("No se pudo cargar el tablero desde Supabase.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadBoard();
  }, []);

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

  if (errorMessage || !data) {
    return (
      <Stack spacing={1} py={4}>
        <Typography variant="h5" fontWeight={700}>
          Tablero
        </Typography>
        <Typography color="error">
          {errorMessage ?? "No hay datos disponibles."}
        </Typography>
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
                return <Column key={column.id} column={column} tasks={tasks} index={index} />;
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
