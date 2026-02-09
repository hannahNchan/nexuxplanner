import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useState, useMemo } from "react";
import Column from "./Column";
import TaskEditorModal from "./TaskEditorModal";
import AddColumnModal from "./AddColumnModal";
import BoardToolbar from "./BoardToolbar";
import { useBoardManager } from "../hooks/useBoardManager";
import { useMaxElementHeight } from "../hooks/useMaxElementHeight";

type BoardProps = {
  userId: string;
  userEmail: string;
};

const Board = ({ userId, userEmail }: BoardProps) => {
  const board = useBoardManager(userId);
  const allowBoardTaskCreation = board.currentProject?.allow_board_task_creation ?? false;

  const numColumns = board.data?.columnOrder.length || 0;
  const [setColumnRef, maxHeight] = useMaxElementHeight(numColumns, board.data?.tasks);

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
            No hay sprint
          </Typography>
          <Typography variant="body2">
            Ve al Backlog para crear un sprint. El tablero Scrum muestra las tareas del sprint activo.
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
      <Stack spacing={2}>
        <BoardToolbar 
          tasks={board.data?.tasks || {}}
          onSearchChange={setSearchQuery}
        />

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
                  sx={{ width: "100%" }}
                >
                  <Stack direction="column" justifyContent="space-between" alignItems="end" sx={{ width: "100%" }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => board.setIsAddColumnModalOpen(true)}
                      size="small"
                    >
                      Añadir columna
                    </Button>
                    <Stack direction="row" alignItems="start" spacing={2} mt={2} sx={{ width: "100%" }}>
                      {displayData?.columnOrder.map((columnId, index) => {
                        const column = displayData!.columns[columnId];
                        const tasks = column.taskIds.map((taskId) => displayData!.tasks[taskId]);
                        return (
                          <Box
                            key={column.id}
                            display="inline-flex"
                            gap={3}
                            flexWrap="nowrap"
                            overflow="auto"
                            pb={1}
                            sx={{
                              borderRadius: 1,
                              width: "100%",
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
                              allowTaskCreation={allowBoardTaskCreation}
                              columnRef={(el) => setColumnRef(el, index)}
                              maxHeight={maxHeight}
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