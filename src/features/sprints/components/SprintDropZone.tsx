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
import SprintTasksTable from "./SprintTasksTable";

type SprintDropZoneProps = {
  sprint: Sprint;
  tasks: any[];
  onStartSprint?: (sprintId: string) => void; // ✅ NUEVO
};

const SprintDropZone = ({ sprint, tasks, onStartSprint }: SprintDropZoneProps) => {
  const theme = useTheme();
  const isFuture = sprint.status === "future";

  return (
    <Droppable droppableId={`sprint-${sprint.id}`} type="task">
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.droppableProps}
          elevation={snapshot.isDraggingOver ? 8 : 2}
          sx={{
            p: 3,
            borderRadius: 3,
            border: snapshot.isDraggingOver
              ? `3px dashed ${theme.palette.success.main}`
              : isFuture
              ? `2px dashed ${alpha(theme.palette.warning.main, 0.5)}`
              : `2px solid ${alpha(theme.palette.success.main, 0.5)}`,
            backgroundColor: snapshot.isDraggingOver
              ? alpha(theme.palette.success.main, 0.08)
              : isFuture
              ? alpha(theme.palette.warning.main, 0.03)
              : alpha(theme.palette.success.main, 0.03),
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            minHeight: tasks.length > 0 ? "auto" : 180,
          }}
        >
          <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                {/* Icono */}
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: snapshot.isDraggingOver
                      ? alpha(theme.palette.success.main, 0.2)
                      : isFuture
                      ? alpha(theme.palette.warning.main, 0.2)
                      : alpha(theme.palette.success.main, 0.2),
                  }}
                >
                  <PlayArrowIcon
                    sx={{
                      fontSize: 28,
                      color: snapshot.isDraggingOver
                        ? theme.palette.success.main
                        : isFuture
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
                    }}
                  />
                </Box>

                {/* Título y estado */}
                <Stack spacing={0.5} flex={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" fontWeight={700}>
                      {sprint.name}
                    </Typography>
                    <Chip
                      label={isFuture ? "FUTURO" : "ACTIVO"}
                      size="small"
                      color={isFuture ? "warning" : "success"}
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                  {sprint.goal && (
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
                      {sprint.goal}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {/* Botón Iniciar Sprint (solo si es futuro y tiene tareas) */}
              {isFuture && onStartSprint && tasks.length > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<RocketLaunchIcon />}
                  onClick={() => onStartSprint(sprint.id)}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    fontWeight: 600,
                  }}
                >
                  Iniciar Sprint
                </Button>
              )}

              {/* Info del sprint */}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<EventIcon />}
                  label={`Inicia: ${format(new Date(sprint.start_date!), "dd MMM yyyy", {
                    locale: es,
                  })}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<FlagIcon />}
                  label={`Termina: ${format(new Date(sprint.end_date!), "dd MMM yyyy", {
                    locale: es,
                  })}`}
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
            </Stack>

            {/* Mensaje de instrucción cuando está vacío */}
            {tasks.length === 0 && (
              <Stack alignItems="center" py={2}>
                {snapshot.isDraggingOver ? (
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    sx={{ color: theme.palette.success.main }}
                  >
                    ↓ Soltar aquí para agregar al sprint
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Arrastra tareas desde el backlog a esta zona para asignarlas al sprint
                  </Typography>
                )}
              </Stack>
            )}

            {/* Tabla de tareas */}
            <SprintTasksTable tasks={tasks} />
          </Stack>
          {provided.placeholder}
        </Paper>
      )}
    </Droppable>
  );
};

export default SprintDropZone;