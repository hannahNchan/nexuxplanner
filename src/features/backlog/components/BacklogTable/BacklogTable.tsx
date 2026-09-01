import {
  Badge,
  Button,
  CircularProgress,
  Container,
  Fade,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  Alert,
  Box,
  MenuItem,
} from "@mui/material";
import { useMemo, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

import { useBacklogTable } from "../../hooks/useBacklogTable";
import { DataTableHeader } from "../../../../shared/ui/DataTable";
import { EmptyState } from "../../../../shared/ui/EmptyState";
import { WorkTableToolbar } from "../../../../shared/ui/WorkTable";
import { useProject } from "../../../../shared/contexts/ProjectContext";
import ReadOnlyProjectNotice from "../../../../shared/ui/ReadOnlyProjectNotice";
import { getSprintDurationDays } from "../../../sprints/utils/sprintDates";
import type { Sprint } from "../../../sprints/types/sprint";

import BacklogTaskRow from "./BacklogTaskRow";
import TaskEditorModal from "../../../board/components/TaskEditorModal";
import { CreateSprintModal, SprintDropZone } from "../../../sprints";

import {
  PriorityMenu,
  EffortMenu,
  EpicMenu,
  AssigneeMenu,
  FilterMenu,
  SortMenu,
  HideMenu,
  DeleteConfirmDialog,
} from "./menus";

type BacklogTableProps = {
  userId: string;
};

type SprintSortMode = "start_asc" | "start_desc" | "created_desc" | "name_asc";

const getSprintSortDate = (sprint: Sprint) =>
  new Date(`${(sprint.start_date || sprint.end_date || sprint.created_at).slice(0, 10)}T00:00:00`).getTime();

const sortSprints = (sprints: Sprint[], mode: SprintSortMode) =>
  [...sprints].sort((a, b) => {
    if (mode === "name_asc") {
      return a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" });
    }

    if (mode === "created_desc") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    const startDiff = getSprintSortDate(a) - getSprintSortDate(b);
    if (startDiff !== 0) {
      return mode === "start_asc" ? startDiff : -startDiff;
    }

    return a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" });
  });

const BacklogTable = ({ userId }: BacklogTableProps) => {
  const theme = useTheme();
  const backlog = useBacklogTable(userId);
  const { currentProject } = useProject();
  const [sprintSortMode, setSprintSortMode] = useState<SprintSortMode>("start_asc");
  const canEditProject = currentProject?.can_edit ?? true;
  const sortedSprints = useMemo(
    () => sortSprints(backlog.sprintManager.sprints, sprintSortMode),
    [backlog.sprintManager.sprints, sprintSortMode]
  );
  const activeSprints = sortedSprints.filter((sprint) => sprint.status === "active");
  const futureSprints = sortedSprints.filter((sprint) => sprint.status === "future");
  const closedSprints = sortedSprints.filter((sprint) => sprint.status === "closed");
  const hasSprintPlanning = backlog.sprintManager.sprints.length > 0;
  const canStartFutureSprint = activeSprints.length === 0;

  const getTaskPointsTotal = (sprintId: string) =>
    (backlog.sprintManager.sprintTasksById[sprintId] ?? []).reduce((total, task) => {
      const points = Number(task.story_points);
      return total + (Number.isFinite(points) ? points : 0);
    }, 0);

  const historicalPointsPerDay = (() => {
    const samples = closedSprints
      .map((sprint) => {
        const durationDays = getSprintDurationDays(sprint.start_date, sprint.end_date);
        if (!durationDays) return null;

        const points = getTaskPointsTotal(sprint.id);
        return points > 0 ? points / durationDays : null;
      })
      .filter((sample): sample is number => sample !== null);

    if (samples.length === 0) return null;
    return samples.reduce((total, sample) => total + sample, 0) / samples.length;
  })();

  const getSuggestedCapacity = (sprint: Sprint) => {
    if (historicalPointsPerDay === null) return null;

    const durationDays = getSprintDurationDays(sprint.start_date, sprint.end_date);
    if (!durationDays) return null;

    return Math.max(1, Math.round(historicalPointsPerDay * durationDays));
  };

  if (!backlog.catalogsLoaded) {
    return (
      <Container maxWidth={false}>
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress size={48} thickness={4} />
          <Typography color="text.secondary" variant="h6">
            Cargando catálogos...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (backlog.isLoading) {
    return (
      <Container maxWidth={false}>
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress size={48} thickness={4} />
          <Typography color="text.secondary" variant="h6">
            Cargando backlog...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (!currentProject) {
    return (
      <Container maxWidth={false}>
        <Stack spacing={4} alignItems="center" py={8}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <FolderIcon sx={{ fontSize: 64, color: "primary.main", opacity: 0.6 }} />
          </Box>

          <Stack spacing={2} alignItems="center" maxWidth={500}>
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Selecciona un proyecto
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Para gestionar el backlog, primero debes seleccionar un proyecto desde el menú
              lateral. El backlog contiene las tareas pendientes de tu proyecto.
            </Typography>
          </Stack>

          <Alert severity="info" sx={{ maxWidth: 500 }}>
            <Typography variant="body2">
              <strong>Consejo:</strong> Si no tienes proyectos, créa uno desde el selector de
              proyectos en la barra lateral.
            </Typography>
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <DragDropContext onDragEnd={backlog.handleDragEnd}>
      <Container
        maxWidth={false}
        sx={{
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          pb: 3,
        }}
      >
        <Stack spacing={2} sx={{ flexShrink: 0, pb: 2 }}>
          {/* Header */}
          <DataTableHeader
            title="Backlog"
            subtitle={`Gestiona las tareas pendientes de ${currentProject.title}. Estas tareas aún no están en el tablero Scrum.`}
            action={
              <Stack direction="row" spacing={2}>
                {backlog.tasks.length > 0 && (
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => backlog.setIsSprintModalOpen(true)}
                    disabled={!canEditProject}
                    sx={{
                      px: 3,
                      borderColor: theme.palette.success.main,
                      color: theme.palette.success.main,
                      "&:hover": {
                        borderColor: theme.palette.success.dark,
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                      },
                    }}
                  >
                    Crear Sprint
                  </Button>
                )}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={backlog.handleAddTask}
                  disabled={!canEditProject}
                  sx={{
                    px: 3,
                  }}
                >
                  Nueva Tarea
                </Button>
              </Stack>
            }
          />
          {!canEditProject ? <ReadOnlyProjectNotice projectName={currentProject.title} /> : null}

        </Stack>

        <Box
          sx={{
            flex: "0 0 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "visible",
          }}
        >
          <Stack sx={{ minHeight: 0, overflow: "visible" }}>
            <Box sx={{ flexShrink: 0, mb: 2 }}>
              <WorkTableToolbar description="Backlog del proyecto. Arrastra tareas desde esta lista hacia la planificación de sprints de abajo.">
                  <Fade in={!backlog.searchOpen}>
                    <Button
                      variant="outlined"
                      startIcon={<SearchIcon />}
                      onClick={() => backlog.setSearchOpen(true)}
                      sx={{
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                      }}
                    >
                      Buscar
                    </Button>
                  </Fade>

                  {backlog.searchOpen && (
                    <Fade in={backlog.searchOpen}>
                      <TextField
                        size="small"
                        placeholder="Buscar tareas..."
                        value={backlog.searchText}
                        onChange={(e) => backlog.setSearchText(e.target.value)}
                        InputProps={{
                          startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                          endAdornment: (
                            <IconButton
                              size="small"
                              onClick={() => {
                                backlog.setSearchOpen(false);
                                backlog.setSearchText("");
                              }}
                            >
                              <CloseIcon />
                            </IconButton>
                          ),
                        }}
                        sx={{
                          width: 300,
                          "& .MuiOutlinedInput-root": {
                            bgcolor: "background.paper",
                          },
                        }}
                      />
                    </Fade>
                  )}

                  <Badge badgeContent={backlog.activeFiltersCount} color="primary">
                    <Button
                      variant="outlined"
                      startIcon={<FilterListIcon />}
                      onClick={(e) => backlog.setFilterAnchor(e.currentTarget)}
                      sx={{
                        borderColor:
                          backlog.activeFiltersCount > 0
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.3),
                        bgcolor:
                          backlog.activeFiltersCount > 0
                            ? alpha(theme.palette.primary.main, 0.08)
                            : "transparent",
                      }}
                    >
                      Filtrar
                    </Button>
                  </Badge>

                  <Button
                    variant="outlined"
                    startIcon={<SortIcon />}
                    onClick={(e) => backlog.setSortAnchor(e.currentTarget)}
                    sx={{
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    }}
                  >
                    Ordenar
                  </Button>

                  <Badge badgeContent={backlog.hiddenTasks.length} color="secondary">
                    <Button
                      variant="outlined"
                      startIcon={<VisibilityOffIcon />}
                      onClick={(e) => backlog.setHideAnchor(e.currentTarget)}
                      sx={{
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                      }}
                    >
                      Ocultar
                    </Button>
                  </Badge>
              </WorkTableToolbar>
            </Box>

            <Box
              sx={{
                flex: "0 0 auto",
                minHeight: 0,
                overflowY: "visible",
                overflowX: "hidden",
              }}
            >
              {backlog.rows.length === 0 ? (
                <EmptyState
                  icon={faClipboardList}
                  title="No hay tareas en el backlog"
                  description={`Crea tu primera tarea en el backlog de ${currentProject.title}.`}
                  action={
                    canEditProject
                      ? {
                          label: "Crear Primera Tarea",
                          onClick: backlog.handleAddTask,
                        }
                      : undefined
                  }
                />
              ) : (
                <Droppable
                  droppableId="backlog"
                  type="task"
                  renderClone={(provided, snapshot, rubric) => {
                    const row = backlog.rows[rubric.source.index];

                    return (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          width: 280,
                          minWidth: 280,
                          maxWidth: 280,
                          height: "auto",
                          minHeight: 78,
                        }}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          border: `1px solid ${theme.palette.primary.main}`,
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
                          opacity: snapshot.isDragging ? 0.96 : 1,
                          boxSizing: "border-box",
                        }}
                      >
                        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800} noWrap>
                            {row.title}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 0.5 }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: "monospace",
                                px: 0.75,
                                py: 0.35,
                                borderRadius: 0.75,
                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                                fontWeight: 800,
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {row.task_id}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                minWidth: 0,
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.epic || "Sin épica"}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  }}
                >
                  {(provided, snapshot) => (
                <Paper
                  elevation={0}
                  sx={{
                    overflow: "hidden",
                    borderRadius: 1,
                    border: `1px solid ${snapshot.isDraggingOver ? theme.palette.warning.main : theme.palette.divider}`,
                    bgcolor: snapshot.isDraggingOver
                      ? alpha(theme.palette.warning.main, 0.05)
                      : "background.paper",
                    transition: "background-color 0.16s ease, border-color 0.16s ease",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      px: 1.5,
                      py: 1,
                      minHeight: 40,
                      bgcolor: alpha(theme.palette.text.primary, 0.03),
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {["ID", "Tarea", "Prioridad", "Puntos", "Épica", "Acciones"].map((label, labelIndex) => (
                      <Typography
                        key={label}
                        variant="caption"
                        color="text.secondary"
                        fontWeight={800}
                        sx={{
                          width: [88, "auto", 116, 72, 150, 76][labelIndex],
                          flex: labelIndex === 1 ? 1 : "0 0 auto",
                          minWidth: labelIndex === 1 ? 160 : undefined,
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </Typography>
                    ))}
                  </Stack>
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 200,
                    }}
                  >
                    {backlog.rows.map((row, index) => (
                      <Draggable
                        key={row.id}
                        draggableId={row.id as string}
                        index={index}
                        isDragDisabled={!canEditProject}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <BacklogTaskRow
                              row={row}
                              isDragging={snapshot.isDragging}
                              dragHandleProps={provided.dragHandleProps}
                              onDelete={backlog.handleDeleteTask}
                              readOnly={!canEditProject}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                </Paper>
                  )}
                </Droppable>
              )}
            </Box>
          </Stack>

          {hasSprintPlanning ? (
            <Box sx={{ minHeight: 0, overflow: "visible", display: "flex", alignItems: "stretch" }}>
              <Paper
                elevation={0}
                sx={{
                  width: "100%",
                  minHeight: 0,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: "background.paper",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "visible",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                  sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={900}>
                      Planificación de Sprints
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Organiza el sprint activo, los próximos sprints y el histórico cerrado.
                    </Typography>
                  </Box>
                  <TextField
                    select
                    size="small"
                    label="Ordenar"
                    value={sprintSortMode}
                    onChange={(event) => setSprintSortMode(event.target.value as SprintSortMode)}
                    sx={{
                      width: { xs: "100%", sm: 220 },
                      flexShrink: 0,
                      "& .MuiInputBase-root": {
                        bgcolor: "background.paper",
                      },
                    }}
                  >
                    <MenuItem value="start_asc">Inicio mas proximo</MenuItem>
                    <MenuItem value="start_desc">Inicio mas lejano</MenuItem>
                    <MenuItem value="created_desc">Creacion reciente</MenuItem>
                    <MenuItem value="name_asc">Nombre A-Z</MenuItem>
                  </TextField>
                </Stack>

                <Stack
                  spacing={2}
                  sx={{
                    flex: "0 0 auto",
                    minHeight: 0,
                    overflowY: "visible",
                    p: 2,
                  }}
                >
                  {activeSprints.length > 1 ? (
                    <Alert severity="warning" variant="outlined">
                      Hay más de un sprint activo en este proyecto. NexusPlanner usará el más reciente; completa uno antes de iniciar otro.
                    </Alert>
                  ) : null}

                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={900}>
                      SPRINT ACTIVO
                    </Typography>
                    {activeSprints.length === 0 ? (
                      <Alert severity="info" variant="outlined">
                        No hay sprint activo. Puedes iniciar un sprint futuro cuando estés lista.
                      </Alert>
                    ) : (
                      activeSprints.map((sprint) => (
                        <SprintDropZone
                          key={sprint.id}
                          sprint={sprint}
                          tasks={backlog.sprintManager.sprintTasksById[sprint.id] ?? []}
                          capacityPoints={getSuggestedCapacity(sprint)}
                          capacitySourceLabel="Basada en sprints cerrados"
                        />
                      ))
                    )}
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={900}>
                      PRÓXIMOS SPRINTS
                    </Typography>
                    {futureSprints.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay sprints planificados.
                      </Typography>
                    ) : (
                      futureSprints.map((sprint) => (
                        <SprintDropZone
                          key={sprint.id}
                          sprint={sprint}
                          tasks={backlog.sprintManager.sprintTasksById[sprint.id] ?? []}
                          capacityPoints={getSuggestedCapacity(sprint)}
                          capacitySourceLabel="Basada en sprints cerrados"
                          compact
                          canStartSprint={canStartFutureSprint}
                          onStartSprint={async (sprintId) => {
                            try {
                              await backlog.sprintManager.startSprint(sprintId);
                            } catch (error) {
                              backlog.showError("backlog.startSprint", error, "No se pudo iniciar el sprint.");
                            }
                          }}
                        />
                      ))
                    )}
                  </Stack>

                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <HistoryIcon fontSize="small" color="disabled" />
                      <Typography variant="caption" color="text.secondary" fontWeight={900}>
                        SPRINTS CERRADOS
                      </Typography>
                    </Stack>
                    {closedSprints.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Todavía no hay sprints cerrados.
                      </Typography>
                    ) : (
                      closedSprints.slice(0, 5).map((sprint) => (
                        <SprintDropZone
                          key={sprint.id}
                          sprint={sprint}
                          tasks={backlog.sprintManager.sprintTasksById[sprint.id] ?? []}
                          capacityPoints={getSuggestedCapacity(sprint)}
                          capacitySourceLabel="Basada en sprints cerrados"
                          compact
                          canAcceptTasks={false}
                        />
                      ))
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Box>
          ) : null}
        </Box>

          {/* Menús */}
          <FilterMenu
            anchorEl={backlog.filterAnchor}
            filters={backlog.filters}
            projects={backlog.projects}
            priorities={backlog.priorities}
            onClose={() => backlog.setFilterAnchor(null)}
            onFilterChange={backlog.setFilters}
          />

          <SortMenu
            anchorEl={backlog.sortAnchor}
            sortColumn={backlog.sortColumn}
            sortOrder={backlog.sortOrder}
            onClose={() => backlog.setSortAnchor(null)}
            onSortColumnChange={backlog.setSortColumn}
            onSortOrderChange={backlog.setSortOrder}
          />

          <HideMenu
            anchorEl={backlog.hideAnchor}
            hiddenTasks={backlog.hiddenTasks}
            tasks={backlog.tasks}
            onClose={() => backlog.setHideAnchor(null)}
            onHiddenTasksChange={backlog.setHiddenTasks}
          />

          <PriorityMenu
            anchorEl={backlog.priorityMenuAnchor}
            editingPriority={backlog.editingPriority}
            priorities={backlog.priorities}
            onClose={() => {
              backlog.setPriorityMenuAnchor(null);
              backlog.setEditingPriority(null);
            }}
            onPriorityChange={backlog.handlePriorityChange}
          />

          <EffortMenu
            anchorEl={backlog.effortMenuAnchor}
            editingEffort={backlog.editingEffort}
            pointValues={backlog.pointValues}
            onClose={() => {
              backlog.setEffortMenuAnchor(null);
              backlog.setEditingEffort(null);
            }}
            onEffortChange={backlog.handleEffortChange}
          />

          <EpicMenu
            anchorEl={backlog.epicMenuAnchor}
            editingEpic={backlog.editingEpic}
            projectId={currentProject?.id || null}
            userId={userId}
            onClose={() => {
              backlog.setEpicMenuAnchor(null);
              backlog.setEditingEpic(null);
            }}
            onEpicChange={backlog.handleEpicChange}
          />

          <AssigneeMenu
            anchorEl={backlog.assigneeMenuAnchor}
            editingAssignee={backlog.editingAssignee}
            onClose={() => {
              backlog.setAssigneeMenuAnchor(null);
              backlog.setEditingAssignee(null);
            }}
            onAssigneeChange={backlog.handleAssigneeChange}
          />

          <DeleteConfirmDialog
            open={backlog.deleteDialogOpen}
            onClose={() => {
              backlog.setDeleteDialogOpen(false);
              backlog.setTaskToDelete(null);
            }}
            onConfirm={backlog.confirmDeleteTask}
          />

          <TaskEditorModal
            open={backlog.isTaskModalOpen}
            task={
              backlog.selectedBacklogTask
                ? {
                    ...backlog.selectedBacklogTask,
                    subtitle: backlog.selectedBacklogTask.subtitle ?? undefined,
                  }
                : null
            }
            columns={[]}
            issueTypes={backlog.issueTypes}
            priorities={backlog.priorities}
            pointValues={backlog.pointValues}
            currentUserId={userId}
            defaultDestination="backlog"
            disableDestinationSelector={true}
            presentation={backlog.taskEditorPresentation}
            onClose={() => {
              backlog.setIsTaskModalOpen(false);
              backlog.setSelectedBacklogTask(null);
            }}
            onSave={backlog.handleSaveTaskFromModal}
            onDelete={async (taskId) => {
              await backlog.handleDeleteTask(taskId);
              backlog.setIsTaskModalOpen(false);
              backlog.setSelectedBacklogTask(null);
            }}
          />

          <CreateSprintModal
            open={backlog.isSprintModalOpen}
            projectName={currentProject?.title || ""}
            onClose={() => backlog.setIsSprintModalOpen(false)}
            onCreateSprint={backlog.handleCreateSprint}
          />

          <Snackbar
            open={Boolean(backlog.notification)}
            autoHideDuration={5000}
            onClose={() => backlog.setNotification(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            {backlog.notification ? (
              <Alert
                severity={backlog.notification.severity}
                variant="filled"
                onClose={() => backlog.setNotification(null)}
                sx={{ width: "100%" }}
              >
                {backlog.notification.message}
              </Alert>
            ) : undefined}
          </Snackbar>
      </Container>
    </DragDropContext>
  );
};

export default BacklogTable;
