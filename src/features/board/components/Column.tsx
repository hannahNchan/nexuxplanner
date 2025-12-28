import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import AddIcon from "@mui/icons-material/Add";
import TaskCard from "./TaskCard";
import type { Column as ColumnType, Task } from "../../../shared/types/board";

type ColumnProps = {
  column: ColumnType;
  tasks: Task[];
  index: number;
  onCreateTask: (columnId: string) => void;
  onTaskClick: (task: Task) => void;
  isCreatingTask?: boolean;
};

const Column = ({
  column,
  tasks,
  index,
  onCreateTask,
  onTaskClick,
  isCreatingTask = false,
}: ColumnProps) => {
  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          elevation={snapshot.isDragging ? 8 : 1}
          sx={{
            minWidth: 300,
            maxWidth: 300,
            borderRadius: 2,
            backgroundColor: snapshot.isDragging 
              ? "rgba(255, 251, 235, 0.95)"
              : "#fff",
            border: snapshot.isDragging
              ? "2px solid #fbbf24"
              : "1px solid #e5e7eb",
            transform: snapshot.isDragging 
              ? "rotate(2deg)"
              : "none",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: snapshot.isDragging
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          }}
        >
          <Stack spacing={2} p={2}>
            {/* Header de la columna - draggable */}
            <Box {...provided.dragHandleProps}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  cursor: "grab",
                  "&:active": {
                    cursor: "grabbing",
                  },
                  userSelect: "none",
                }}
              >
                <Typography 
                  variant="subtitle1" 
                  fontWeight={700}
                  sx={{
                    color: snapshot.isDragging ? "#92400e" : "text.primary",
                  }}
                >
                  {column.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: snapshot.isDragging 
                      ? "#fbbf24" 
                      : "#e2e8f0",
                    color: snapshot.isDragging ? "#78350f" : "#475569",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 600,
                  }}
                >
                  {tasks.length}
                </Typography>
              </Stack>
            </Box>

            {/* Lista de tareas - droppable */}
            <Droppable droppableId={column.id} type="task">
              {(provided, dropSnapshot) => (
                <Stack
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  spacing={1.5}
                  sx={{
                    minHeight: 100,
                    backgroundColor: dropSnapshot.isDraggingOver
                      ? "rgba(220, 252, 231, 0.8)"
                      : "transparent",
                    border: dropSnapshot.isDraggingOver
                      ? "2px dashed #10b981"
                      : "2px dashed transparent",
                    borderRadius: 2,
                    p: dropSnapshot.isDraggingOver ? 1.5 : 0,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {tasks.map((task, taskIndex) => (
                    <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                      {(taskProvided) => (
                        <div
                          ref={taskProvided.innerRef}
                          {...taskProvided.draggableProps}
                          {...taskProvided.dragHandleProps}
                        >
                          <TaskCard task={task} onClick={() => onTaskClick(task)} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {dropSnapshot.isDraggingOver && (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 1,
                        color: "#059669",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      ↓ Soltar aquí
                    </Box>
                  )}
                </Stack>
              )}
            </Droppable>

            {/* Botón para agregar tarea */}
            <Button
              variant="text"
              startIcon={<AddIcon />}
              onClick={() => onCreateTask(column.id)}
              disabled={isCreatingTask}
              sx={{
                justifyContent: "flex-start",
                color: "text.secondary",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "#f1f5f9",
                },
              }}
            >
              {isCreatingTask ? "Creando..." : "Agregar tarea"}
            </Button>
          </Stack>
        </Paper>
      )}
    </Draggable>
  );
};

export default Column;