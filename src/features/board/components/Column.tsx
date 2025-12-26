import { Box, Paper, Stack, Typography } from "@mui/material";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Column as ColumnType, Task } from "../../../shared/types/board";

type ColumnProps = {
  column: ColumnType;
  tasks: Task[];
  index: number;
};

const Column = ({ column, tasks, index }: ColumnProps) => {
  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            width: 320,
            bgcolor: "grey.100",
            borderRadius: 3,
            p: 2,
            flexShrink: 0,
          }}
        >
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography
                variant="subtitle1"
                fontWeight={700}
                {...provided.dragHandleProps}
              >
                {column.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tasks.length} tareas
              </Typography>
            </Box>
            <Droppable droppableId={column.id} type="task">
              {(dropProvided, dropSnapshot) => (
                <Stack
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  spacing={2}
                  sx={{
                    minHeight: 120,
                    transition: "background-color 0.2s ease",
                    bgcolor: dropSnapshot.isDraggingOver ? "primary.50" : "transparent",
                    borderRadius: 2,
                  }}
                >
                  {tasks.map((task, taskIndex) => (
                    <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                      {(taskProvided) => (
                        <Box
                          ref={taskProvided.innerRef}
                          {...taskProvided.draggableProps}
                          {...taskProvided.dragHandleProps}
                        >
                          <TaskCard task={task} />
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </Stack>
              )}
            </Droppable>
          </Stack>
        </Paper>
      )}
    </Draggable>
  );
};

export default Column;
