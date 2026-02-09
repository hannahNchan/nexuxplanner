import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import { useTheme } from "@mui/material/styles";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTasks } from "@fortawesome/free-solid-svg-icons";
import TaskCard from "./TaskCard";
import type { Column as ColumnType, Task } from "../../../shared/types/board";

type ColumnProps = {
  column: ColumnType;
  tasks: Task[];
  index: number;
  onCreateTask: (columnId: string) => void;
  onTaskClick: (task: Task) => void;
  isCreatingTask?: boolean;
  currentUserId?: string;
  allowTaskCreation?: boolean;
  currentUserEmail?: string;
  columnRef?: (el: HTMLDivElement | null) => void;
  maxHeight?: number | null;
};

const Column = ({
  column,
  tasks,
  index,
  onCreateTask,
  onTaskClick,
  isCreatingTask = false,
  currentUserId,
  allowTaskCreation = false,
  currentUserEmail = "",
  columnRef,
  maxHeight
}: ColumnProps) => {
  const theme = useTheme();

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided, snapshot) => {
        const handleRef = (element: HTMLDivElement | null) => {
          if (columnRef) {
            columnRef(element);
          }
          
          if (provided.innerRef) {
            if (typeof provided.innerRef === 'function') {
              provided.innerRef(element);
            } else {
              (provided.innerRef as React.MutableRefObject<HTMLDivElement | null>).current = element;
            }
          }
        };
        return (
          <Paper
            ref={handleRef}
            {...provided.draggableProps}
            elevation={snapshot.isDragging ? 8 : 1}
            sx={{
              borderRadius: 1,
              background: `linear-gradient(135deg, 
                ${alpha(theme.palette.primary.main, 0.08)} 0%, 
                ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              backdropFilter: "blur(10px)",
              width: "100%",
              height: maxHeight ? `${maxHeight}px` : "auto",
            }}
          >
            <Stack spacing={2} p={2}>
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
                      color: snapshot.isDragging 
                        ? theme.palette.warning.dark 
                        : "text.primary",
                    }}
                  >
                    {column.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      backgroundColor: snapshot.isDragging 
                        ? theme.palette.warning.main
                        : "action.selected",
                      color: snapshot.isDragging 
                        ? theme.palette.warning.contrastText
                        : "text.primary",
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

              <Droppable droppableId={column.id} type="task">
                {(provided, dropSnapshot) => (
                  <Stack
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    spacing={1.5}
                    sx={{
                      minHeight: tasks.length === 0 ? 200 : 100,
                      backgroundColor: dropSnapshot.isDraggingOver
                        ? alpha(theme.palette.success.main, 0.12)
                        : "transparent",
                      border: dropSnapshot.isDraggingOver
                        ? `2px dashed ${theme.palette.success.main}`
                        : "2px dashed transparent",
                      borderRadius: 2,
                      p: dropSnapshot.isDraggingOver ? 1.5 : 0,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {tasks.length === 0 ? (
                      <Stack
                        spacing={2}
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                          py: 4,
                          px: 2,
                          textAlign: "center",
                        }}
                      >
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `linear-gradient(135deg, 
                              ${alpha(theme.palette.primary.main, 0.1)} 0%, 
                              ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                            animation: dropSnapshot.isDraggingOver 
                              ? "none" 
                              : "pulse 2s ease-in-out infinite",
                            "@keyframes pulse": {
                              "0%, 100%": {
                                transform: "scale(1)",
                                opacity: 0.7,
                              },
                              "50%": {
                                transform: "scale(1.05)",
                                opacity: 1,
                              },
                            },
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faTasks}
                            size="2x"
                            style={{
                              color: theme.palette.primary.main,
                              opacity: 0.6,
                            }}
                          />
                        </Box>

                        {!dropSnapshot.isDraggingOver && (
                          <>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color="text.secondary"
                              sx={{ fontSize: "0.875rem" }}
                            >
                              Sin tareas
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontSize: "1rem",
                                opacity: 0.7,
                              }}
                            >
                              {allowTaskCreation 
                                ? "Arrastra tareas aquí o crea una nueva"
                                : "Arrastra tareas aquí desde el Backlog"}
                            </Typography>
                          </>
                        )}

                        {dropSnapshot.isDraggingOver && (
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              color: theme.palette.success.main,
                              fontSize: "0.875rem",
                            }}
                          >
                            ↓ Soltar aquí
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      <>
                        {tasks.map((task, taskIndex) => (
                          <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                            {(taskProvided, taskSnapshot) => {
                              const child = (
                                <Box
                                  ref={taskProvided.innerRef}
                                  {...taskProvided.draggableProps}
                                  {...taskProvided.dragHandleProps}
                                  sx={{
                                    opacity: taskSnapshot.isDragging ? 0.5 : 1,
                                  }}
                                >
                                  <TaskCard 
                                    task={task} 
                                    onClick={() => onTaskClick(task)}
                                    currentUserId={currentUserId}
                                    isDragging={taskSnapshot.isDragging}
                                    currentUserEmail={currentUserEmail}
                                  />
                                </Box>
                              );

                              if (taskSnapshot.isDragging) {
                                return createPortal(
                                  <Box
                                    {...taskProvided.draggableProps}
                                    {...taskProvided.dragHandleProps}
                                    sx={{
                                      position: "fixed",
                                      pointerEvents: "none",
                                      zIndex: 9999,
                                      width: 300,
                                    }}
                                  >
                                    <TaskCard 
                                      task={task} 
                                      onClick={() => {}}
                                      currentUserId={currentUserId}
                                      isDragging={true}
                                    />
                                  </Box>,
                                  document.body
                                );
                              }

                              return child;
                            }}
                          </Draggable>
                        ))}

                        {dropSnapshot.isDraggingOver && (
                          <Box
                            sx={{
                              textAlign: "center",
                              py: 1,
                              color: theme.palette.success.main,
                              fontSize: "0.875rem",
                              fontWeight: 500,
                            }}
                          >
                            ↓ Soltar aquí
                          </Box>
                        )}
                      </>
                    )}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>

              {allowTaskCreation && (
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
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  {isCreatingTask ? "Creando..." : "Agregar tarea"}
                </Button>
              )}
            </Stack>
          </Paper>
      )}}
    </Draggable>
  );
};

export default Column;