import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Paper,
  Alert,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { alpha, useTheme } from "@mui/material/styles";
import Column from "./Column";
import TaskEditorModal from "./TaskEditorModal";
import AddColumnModal from "./AddColumnModal";
import { useBoardManager } from "../hooks/useBoardManager";

type BoardProps = {
  userId: string;
  initials: string;
};

const Board = ({ userId, initials }: BoardProps) => {
  const theme = useTheme();
  const board = useBoardManager(userId);

  const allowBoardTaskCreation = board.currentProject?.allow_board_task_creation ?? false;

  // Loading state
  if (board.isLoading || !board.catalogsLoaded) {
    return (
      <Stack spacing={2} alignItems="center" py={6}>
        <CircularProgress />
        <Typography color="text.secondary">
          {!board.catalogsLoaded ? "Cargando catálogos..." : "Cargando tablero..."}
        </Typography>
      </Stack>
    );
  }

  // No project selected
  if (!board.currentProject) {
    return (
      <Stack spacing={3} py={4} alignItems="center">
        <Alert severity="info" sx={{ maxWidth: 600 }}>
          Selecciona un proyecto desde el menú lateral para ver su tablero
        </Alert>
      </Stack>
    );
  }

  // No sprint
  if (!board.displaySprint) {
    return (
      <Stack spacing={3} py={4} alignItems="center">
        <Alert severity="info" sx={{ maxWidth: 600 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            No hay sprint
          </Typography>
          <Typography variant="body2">
            Ve al Backlog para crear un sprint. El tablero Scrum muestra las tareas del sprint activo.
          </Typography>
        </Alert>
      </Stack>
    );
  }

  // No columns
  if (!board.data || board.data.columnOrder.length === 0) {
    return (
      <Stack spacing={3} py={4}>
        <Alert severity="warning">
          Este proyecto no tiene columnas.
          {board.currentProject && ` Proyecto: ${board.currentProject.title}`}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Revisa la consola del navegador (F12) para ver los detalles.
        </Typography>
      </Stack>
    );
  }

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
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5" fontWeight={700}>
                  {board.currentProject.title}
                </Typography>
                {board.displaySprint && (
                  <Chip
                    label={
                      board.displaySprint.status === "active" ? "SPRINT ACTIVO" : "SPRINT FUTURO"
                    }
                    color={board.displaySprint.status === "active" ? "success" : "warning"}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {board.displaySprint?.name} - Arrastra columnas o tareas para reorganizar.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => board.setIsAddColumnModalOpen(true)}
              size="small"
            >
              Añadir columna
            </Button>
          </Stack>

          {board.errorMessage && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {board.errorMessage}
            </Typography>
          )}
        </Paper>

        {/* Board */}
        <DragDropContext onDragEnd={board.onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column">
            {(provided) => (
              <Box
                sx={{
                  overflowX: "auto",
                  overflowY: "hidden",
                }}
              >
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  display="inline-flex"
                  gap={3}
                  flexWrap="nowrap"
                  overflow="auto"
                  pb={1}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    background: `linear-gradient(135deg, 
                      ${alpha(theme.palette.primary.main, 0.08)} 0%, 
                      ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    backdropFilter: "blur(10px)",
                    minWidth: "fit-content"
                  }}
                >
                  {board.data?.columnOrder.map((columnId, index) => {
                    const column = board.data!.columns[columnId];
                    const tasks = column.taskIds.map((taskId) => board.data!.tasks[taskId]);
                    return (
                      <Column
                        key={column.id}
                        column={column}
                        tasks={tasks}
                        index={index}
                        onCreateTask={board.handleCreateTask}
                        onTaskClick={board.handleTaskClick}
                        isCreatingTask={board.creatingTaskColumnId === column.id}
                        currentUserId={userId}
                        currentUserInitials={initials}
                        allowTaskCreation={allowBoardTaskCreation}
                      />
                    );
                  })}
                  {provided.placeholder}
                </Box>
            </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Stack>

      {/* Modals */}
      <TaskEditorModal
        open={board.isModalOpen}
        task={board.selectedTask}
        columns={board.columnOptions}
        issueTypes={board.issueTypes}
        priorities={board.priorities}
        pointValues={board.pointValues}
        currentUserId={userId}
        onClose={() => board.setIsModalOpen(false)}
        onSave={board.handleSaveTask}
        onDelete={board.handleDeleteTask}
      />

      <AddColumnModal
        open={board.isAddColumnModalOpen}
        onClose={() => board.setIsAddColumnModalOpen(false)}
        onSave={board.handleCreateColumn}
      />
    </>
  );
};

export default Board;