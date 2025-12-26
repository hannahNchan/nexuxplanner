import { Box, Stack, Typography } from "@mui/material";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useState } from "react";
import Column from "./Column";
import type { BoardState } from "../../../shared/types/board";

const initialData: BoardState = {
  tasks: {
    "task-1": { id: "task-1", title: "Definir MVP", description: "Roadmap inicial" },
    "task-2": { id: "task-2", title: "Diseñar tablero" },
    "task-3": { id: "task-3", title: "Configurar auth" },
    "task-4": { id: "task-4", title: "QA flujo" },
  },
  columns: {
    "column-1": {
      id: "column-1",
      title: "Pendiente",
      taskIds: ["task-1", "task-2"],
    },
    "column-2": {
      id: "column-2",
      title: "En progreso",
      taskIds: ["task-3"],
    },
    "column-3": {
      id: "column-3",
      title: "Listo",
      taskIds: ["task-4"],
    },
  },
  columnOrder: ["column-1", "column-2", "column-3"],
};

const Board = () => {
  const [data, setData] = useState<BoardState>(initialData);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) {
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
      return;
    }

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    if (startColumn.id === finishColumn.id) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      setData({
        ...data,
        columns: {
          ...data.columns,
          [startColumn.id]: {
            ...startColumn,
            taskIds: newTaskIds,
          },
        },
      });
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: {
          ...startColumn,
          taskIds: startTaskIds,
        },
        [finishColumn.id]: {
          ...finishColumn,
          taskIds: finishTaskIds,
        },
      },
    });
  };

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
