import { Box, Paper, Stack, Typography, Chip, Button } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Droppable } from "@hello-pangea/dnd";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EventIcon from "@mui/icons-material/Event";
import FlagIcon from "@mui/icons-material/Flag";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Sprint } from "../types/sprint";
import SprintTasksTable, { type SprintTask } from "./SprintTasksTable";
import { getNormalizedSprintEndDate } from "../utils/sprintDates";

type SprintDropZoneProps = {
  sprint: Sprint;
  tasks: SprintTask[];
  onStartSprint?: (sprintId: string) => void;
  canStartSprint?: boolean;
  canAcceptTasks?: boolean;
  compact?: boolean;
  capacityPoints?: number | null;
  capacitySourceLabel?: string;
};

const SprintDropZone = ({
  sprint,
  tasks,
  onStartSprint,
  canStartSprint = true,
  canAcceptTasks = true,
  compact = false,
  capacityPoints = null,
  capacitySourceLabel = "Basada en velocity histórica",
}: SprintDropZoneProps) => {
  const theme = useTheme();
  const isFuture = sprint.status === "future";
  const isClosed = sprint.status === "closed";
  const normalizedName = sprint.name.trim().toLowerCase();
  const normalizedGoal = sprint.goal?.trim().toLowerCase();
  const shouldShowGoal = Boolean(sprint.goal && normalizedGoal !== normalizedName);
  const normalizedEndDate = getNormalizedSprintEndDate(sprint.start_date, sprint.end_date);
  const statusLabel = isClosed ? "Sprint cerrado" : isFuture ? "Sprint planificado" : "Sprint activo";
  const statusChipLabel = isClosed ? "CERRADO" : isFuture ? "FUTURO" : "ACTIVO";
  const statusColor = isClosed ? theme.palette.text.secondary : isFuture ? theme.palette.warning.main : theme.palette.success.main;
  const plannedPoints = tasks.reduce((total, task) => {
    const points = Number(task.story_points);
    return total + (Number.isFinite(points) ? points : 0);
  }, 0);
  const capacityDelta = capacityPoints === null ? null : capacityPoints - plannedPoints;

  return (
    <Droppable
      droppableId={`sprint-${sprint.id}`}
      type="task"
      isDropDisabled={isClosed || !canAcceptTasks}
    >
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.droppableProps}
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 1,
            border: snapshot.isDraggingOver
              ? `1px dashed ${theme.palette.success.main}`
              : isClosed
                ? `1px solid ${theme.palette.divider}`
                : isFuture
                ? `1px dashed ${alpha(theme.palette.warning.main, 0.55)}`
                : `1px solid ${theme.palette.divider}`,
            backgroundColor: snapshot.isDraggingOver
              ? alpha(theme.palette.success.main, 0.08)
              : isClosed
                ? alpha(theme.palette.text.secondary, 0.035)
              : isFuture
                ? alpha(theme.palette.warning.main, 0.035)
                : theme.palette.background.paper,
            transition: "background-color 0.16s ease, border-color 0.16s ease",
            width: "100%",
            maxHeight: "100%",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack spacing={1.5} sx={{ minHeight: 0 }}>
            <Stack spacing={compact ? 0.75 : 1}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: alpha(statusColor, 0.1),
                      color: statusColor,
                      flexShrink: 0,
                    }}
                  >
                    <PlayArrowIcon fontSize="small" />
                  </Box>
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      {statusLabel}
                    </Typography>
                    <Typography variant={compact ? "subtitle1" : "h6"} fontWeight={800} noWrap>
                      Sprint: {sprint.name}
                    </Typography>
                  </Stack>
                </Stack>
                <Chip
                  label={statusChipLabel}
                  size="small"
                  color={isClosed ? "default" : isFuture ? "warning" : "success"}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              {shouldShowGoal && !compact && (
                <Typography variant="body2" color="text.secondary">
                  Objetivo: {sprint.goal}
                </Typography>
              )}

              {!isClosed ? (
                <Typography variant="body2" color="text.secondary">
                  Arrastra tareas del backlog a este panel para incluirlas en el sprint.
                </Typography>
              ) : null}

              {isFuture && onStartSprint && tasks.length > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<RocketLaunchIcon />}
                  onClick={() => onStartSprint(sprint.id)}
                  disabled={!canStartSprint}
                  sx={{
                    alignSelf: "flex-start",
                    fontWeight: 600,
                  }}
                >
                  Iniciar Sprint
                </Button>
              )}

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<EventIcon />}
                  label={
                    sprint.start_date
                      ? `Inicia: ${format(new Date(sprint.start_date), "dd MMM yyyy", {
                          locale: es,
                        })}`
                      : "Sin inicio"
                  }
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<FlagIcon />}
                  label={
                    normalizedEndDate
                      ? `Termina: ${format(normalizedEndDate, "dd MMM yyyy", {
                          locale: es,
                        })}`
                      : "Sin cierre"
                  }
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${tasks.length} tareas`}
                  size="small"
                  color="primary"
                  variant="filled"
                />
              </Stack>

              <Stack
                spacing={0.75}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.14)}`,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.035),
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={`Planeado: ${plannedPoints} pts`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 800 }}
                  />
                  {capacityPoints === null ? (
                    <Chip
                      label="Capacidad: sin histórico"
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 800 }}
                    />
                  ) : (
                    <Chip
                      label={`Capacidad: ${capacityPoints} pts`}
                      size="small"
                      color={capacityDelta !== null && capacityDelta < 0 ? "warning" : "success"}
                      variant="outlined"
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {capacityDelta === null
                    ? "Cuando cierres sprints, NexusPlanner sugerirá capacidad por duración."
                    : capacityDelta >= 0
                      ? `${capacityDelta} pts disponibles. ${capacitySourceLabel}.`
                      : `${Math.abs(capacityDelta)} pts sobre capacidad. ${capacitySourceLabel}.`}
                </Typography>
              </Stack>
            </Stack>

            <Box
              sx={{
                maxHeight: 560,
                overflowY: "auto",
                overflowX: "hidden",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": {
                  display: "none",
                },
              }}
            >
              {snapshot.isDraggingOver ? (
                <Box
                  sx={{
                    mb: 1,
                    p: 1.25,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    color: "success.main",
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  Soltar aquí para agregar al sprint
                </Box>
              ) : null}

              {tasks.length === 0 ? (
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: 1,
                    border: `1px dashed ${alpha(theme.palette.text.secondary, 0.28)}`,
                    color: "text.secondary",
                    textAlign: "center",
                    cursor: "pointer"
                  }}
                >
                  <PlayArrowIcon sx={{ mb: 0.5, color: "text.disabled" }} />
                  <Typography variant="body2">
                    {isClosed ? "Este sprint no tiene tareas." : "Suelta aquí las tareas que quieras planificar."}
                  </Typography>
                </Box>
              ) : (
                <SprintTasksTable tasks={tasks} />
              )}
            </Box>
          </Stack>
          {provided.placeholder}
        </Paper>
      )}
    </Droppable>
  );
};

export default SprintDropZone;
