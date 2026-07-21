import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useState, useMemo } from "react";
import Column from "./Column";
import TaskEditorModal from "./TaskEditorModal";
import AddColumnModal from "./AddColumnModal";
import BoardToolbar from "./BoardToolbar";
import { useBoardManager } from "../hooks/useBoardManager";
import ReadOnlyProjectNotice from "../../../shared/ui/ReadOnlyProjectNotice";

type BoardProps = {
  userId: string;
  userEmail: string;
  header?: React.ReactNode;
};

const Board = ({ userId, userEmail, header }: BoardProps) => {
  const board = useBoardManager(userId);
  const allowBoardTaskCreation = board.currentProject?.allow_board_task_creation ?? false;
  const canEditProject = board.currentProject?.can_edit ?? true;
  const hasFutureSprints = board.sprintManager.sprints.some((sprint) => sprint.status === "future");

  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = useMemo(() => {
    if (!board.data || !searchQuery) return board.data;

    const filteredTasks: typeof board.data.tasks = {};
    Object.entries(board.data.tasks).forEach(([taskId, task]) => {
      const searchLower = searchQuery.toLowerCase();
      if (
        task.title.toLowerCase().includes(searchLower) ||
        task.subtitle?.toLowerCase().includes(searchLower) ||
        task.task_id_display?.toLowerCase().includes(searchLower)
      ) {
        filteredTasks[taskId] = task;
      }
    });

    const filteredColumns = { ...board.data.columns };
    Object.keys(filteredColumns).forEach(colId => {
      filteredColumns[colId] = {
        ...filteredColumns[colId],
        taskIds: filteredColumns[colId].taskIds.filter(taskId => filteredTasks[taskId]),
      };
    });

    return {
      ...board.data,
      tasks: filteredTasks,
      columns: filteredColumns,
    };
  }, [board.data, searchQuery]);

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

  if (!board.currentProject) {
    return (
      <Stack spacing={3} py={4} alignItems="center">
        <Alert severity="info" sx={{ maxWidth: 600 }}>
          Selecciona un proyecto desde el menú lateral para ver su tablero
        </Alert>
      </Stack>
    );
  }

  if (!board.displaySprint) {
    return (
      <Stack spacing={3} py={4} alignItems="center">
        <Alert severity="info" sx={{ maxWidth: 600 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            No hay sprint activo
          </Typography>
          <Typography variant="body2">
            {hasFutureSprints
              ? "Hay sprints planificados en el Backlog. Inicia uno para ver sus tareas en el Tablero Scrum."
              : "Ve al Backlog para crear tu primer sprint. El Tablero Scrum muestra solo las tareas del sprint activo."}
          </Typography>
        </Alert>
      </Stack>
    );
  }

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

  const displayData = filteredData || board.data;

  return (
    <>
      <Stack
        sx={{
          minWidth: 0,
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Stack
          spacing={2}
          sx={{
            flexShrink: 0,
            bgcolor: "background.default",
            pb: 2,
            zIndex: 2,
          }}
        >
          {header}
          <BoardToolbar
            tasks={board.data?.tasks || {}}
            onSearchChange={setSearchQuery}
            projectId={board.currentProject?.id || ""}
            onAddColumn={() => board.setIsAddColumnModalOpen(true)}
            readOnly={!canEditProject}
          />
          {!canEditProject ? <ReadOnlyProjectNotice projectName={board.currentProject.title} /> : null}
        </Stack>

        <DragDropContext onDragEnd={board.onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column">
            {(provided) => (
              <Box
                sx={{
                  flexGrow: 1,
                  minHeight: 0,
                  overflowX: "auto",
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                }}
              >
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    display: "inline-flex",
                    gap: 3,
                    flexWrap: "nowrap",
                    alignItems: "stretch",
                    minWidth: "100%",
                    minHeight: "100%",
                    pb: 1,
                  }}
                >
                  <Stack direction="column" alignItems="stretch" sx={{ minWidth: "100%", minHeight: "100%" }}>
                    <Stack
                      direction="row"
                      alignItems="stretch"
                      spacing={2}
                      sx={{
                        width: "max-content",
                        minWidth: "100%",
                        minHeight: "100%",
                      }}
                    >
                      {displayData?.columnOrder.map((columnId, index) => {
                        const column = displayData!.columns[columnId];
                        const tasks = column.taskIds.map((taskId) => displayData!.tasks[taskId]);
                        return (
                          <Box
                            key={column.id}
                            sx={{
                              flex: "0 0 360px",
                              width: 360,
                              maxWidth: "calc(100vw - 48px)",
                              display: "flex",
                              minHeight: "100%",
                            }}
                          >
                            <Column
                              column={column}
                              tasks={tasks}
                              index={index}
                              onCreateTask={board.handleCreateTask}
                              onTaskClick={board.handleTaskClick}
                              isCreatingTask={board.creatingTaskColumnId === column.id}
                              currentUserId={userId}
                              currentUserEmail={userEmail}
                              allowTaskCreation={allowBoardTaskCreation && canEditProject}
                              readOnly={!canEditProject}
                            />
                          </Box>
                        );
                      })}
                    </Stack>
                  </Stack>
                  {provided.placeholder}
                </Box>
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Stack>

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
