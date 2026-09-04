import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import type { Sprint } from "../types/sprint";
import {
  fetchSprintCompletionSummary,
  type SprintCompletionSummary,
  type SprintTaskDisposition,
} from "../../api/sprintService";
import {
  calculateSprintEndDate,
  SPRINT_DURATION_OPTIONS,
  type SprintDuration,
} from "../utils/sprintDates";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";

type CreateSprintPayload = {
  name: string;
  goal: string;
  start_date: string;
  end_date: string | null;
};

type CompleteSprintDialogProps = {
  open: boolean;
  projectId: string | null;
  sprint: Sprint | null;
  futureSprints: Sprint[];
  onClose: () => void;
  onCreateSprint: (data: CreateSprintPayload) => Promise<Sprint>;
  onCompleteSprint: (sprintId: string, dispositions: SprintTaskDisposition[]) => Promise<void>;
};

const NEW_SPRINT_DESTINATION = "__new_sprint__";
const BACKLOG_DESTINATION = "__backlog__";

const toNativeDate = (value: Date | { toDate: () => Date } | null) => {
  if (!value) return null;
  return value instanceof Date ? value : value.toDate();
};

const CompleteSprintDialog = ({
  open,
  projectId,
  sprint,
  futureSprints,
  onClose,
  onCreateSprint,
  onCompleteSprint,
}: CompleteSprintDialogProps) => {
  const theme = useTheme();
  const [summary, setSummary] = useState<SprintCompletionSummary | null>(null);
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [newSprintName, setNewSprintName] = useState("Siguiente sprint");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintDuration, setNewSprintDuration] = useState<SprintDuration>("7d");
  const [newSprintStartDate, setNewSprintStartDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const newSprintEndDate = useMemo(
    () => calculateSprintEndDate(newSprintStartDate, newSprintDuration),
    [newSprintDuration, newSprintStartDate]
  );

  const needsNewSprint = Object.values(destinations).includes(NEW_SPRINT_DESTINATION);

  useEffect(() => {
    if (!open || !projectId || !sprint) return;

    const loadSummary = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const result = await fetchSprintCompletionSummary(projectId, sprint.id);
        setSummary(result);
        setDestinations(
          Object.fromEntries(
            result.incompleteTasks.map((task) => [task.id, BACKLOG_DESTINATION])
          )
        );

        const nextStartDate = sprint.end_date ? new Date(sprint.end_date) : new Date();
        setNewSprintStartDate(Number.isNaN(nextStartDate.getTime()) ? new Date() : nextStartDate);
        setNewSprintName(`Después de ${sprint.name}`);
      } catch (error) {
        logError("sprints.complete.loadSummary", error);
        setErrorMessage(getErrorMessage(error, "No se pudo preparar el cierre del sprint."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, [open, projectId, sprint]);

  const handleComplete = async () => {
    if (!sprint || !summary) return;

    setIsCompleting(true);
    setErrorMessage("");
    try {
      let createdSprintId: string | null = null;

      if (needsNewSprint) {
        if (!newSprintName.trim()) {
          setErrorMessage("Ponle nombre al nuevo sprint o cambia esas tareas a otro destino.");
          return;
        }

        const createdSprint = await onCreateSprint({
          name: newSprintName.trim(),
          goal: newSprintGoal.trim(),
          start_date: newSprintStartDate.toISOString(),
          end_date: newSprintEndDate.toISOString(),
        });
        createdSprintId = createdSprint.id;
      }

      const dispositions = summary.incompleteTasks.map((task) => {
        const destination = destinations[task.id] ?? BACKLOG_DESTINATION;

        if (destination === BACKLOG_DESTINATION) {
          return {
            taskId: task.id,
            destination: "backlog" as const,
          };
        }

        return {
          taskId: task.id,
          destination: "sprint" as const,
          sprintId: destination === NEW_SPRINT_DESTINATION ? createdSprintId ?? undefined : destination,
        };
      });

      await onCompleteSprint(sprint.id, dispositions);
      onClose();
    } catch (error) {
      logError("sprints.complete", error);
      setErrorMessage(getErrorMessage(error, "No se pudo completar el sprint."));
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Dialog open={open} onClose={isCompleting ? undefined : onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography component="div" variant="h6" fontWeight={800}>
            Completar sprint
          </Typography>
          <Typography component="div" variant="body2" color="text.secondary">
            {sprint ? sprint.name : "Sprint activo"}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} pt={1}>
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            {isLoading || !summary ? (
              <Typography color="text.secondary">Preparando tareas del sprint...</Typography>
            ) : (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Chip
                    label={`Tareas completadas: ${summary.completedTasks.length}`}
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 800 }}
                  />
                  <Chip
                    label={`Tareas incompletas: ${summary.incompleteTasks.length}`}
                    color={summary.incompleteTasks.length > 0 ? "warning" : "default"}
                    variant="outlined"
                    sx={{ fontWeight: 800 }}
                  />
                </Stack>

                {summary.incompleteTasks.length === 0 ? (
                  <Alert severity="success" variant="outlined">
                    Todas las tareas están completas. Al confirmar, el sprint se cerrará.
                  </Alert>
                ) : (
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Decide qué pasa con cada tarea incompleta
                    </Typography>
                    {summary.incompleteTasks.map((task) => (
                      <Paper
                        key={task.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          border: `1px solid ${theme.palette.divider}`,
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.035),
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.5}
                          alignItems={{ xs: "stretch", md: "center" }}
                        >
                          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                              <Chip
                                label={task.task_id_display || "-"}
                                size="small"
                                sx={{ fontFamily: "monospace", fontWeight: 800 }}
                              />
                              <Typography variant="body2" fontWeight={800} noWrap>
                                {task.title}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap">
                              <Chip label={task.column_name ?? "Sin columna"} size="small" variant="outlined" />
                              <Chip label={task.epic_name ?? "Sin épica"} size="small" variant="outlined" />
                              {task.priority ? (
                                <Chip label={task.priority.name} size="small" variant="outlined" />
                              ) : null}
                            </Stack>
                          </Stack>

                          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 260 } }}>
                            <InputLabel>Destino</InputLabel>
                            <Select
                              label="Destino"
                              value={destinations[task.id] ?? BACKLOG_DESTINATION}
                              onChange={(event) =>
                                setDestinations((previous) => ({
                                  ...previous,
                                  [task.id]: event.target.value,
                                }))
                              }
                            >
                              <MenuItem value={BACKLOG_DESTINATION}>Mover al backlog</MenuItem>
                              {futureSprints.map((futureSprint) => (
                                <MenuItem key={futureSprint.id} value={futureSprint.id}>
                                  Mover a {futureSprint.name}
                                </MenuItem>
                              ))}
                              <MenuItem value={NEW_SPRINT_DESTINATION}>Crear nuevo sprint</MenuItem>
                            </Select>
                          </FormControl>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {needsNewSprint ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.1 : 0.04),
                    }}
                  >
                    <Stack spacing={2}>
                      <Typography variant="subtitle2" fontWeight={800}>
                        Nuevo sprint para las tareas seleccionadas
                      </Typography>
                      <TextField
                        label="Nombre del sprint"
                        value={newSprintName}
                        onChange={(event) => setNewSprintName(event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Objetivo"
                        value={newSprintGoal}
                        onChange={(event) => setNewSprintGoal(event.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                      />
                      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <FormControl fullWidth>
                          <InputLabel>Duración</InputLabel>
                          <Select
                            label="Duración"
                            value={newSprintDuration}
                            onChange={(event) => setNewSprintDuration(event.target.value as SprintDuration)}
                          >
                            {SPRINT_DURATION_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <DateTimePicker
                          label="Fecha de Inicio"
                          value={newSprintStartDate}
                          onChange={(newValue) => {
                            const nextDate = toNativeDate(newValue);
                            if (nextDate) setNewSprintStartDate(nextDate);
                          }}
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                        <DateTimePicker
                          label="Fecha de Fin"
                          value={newSprintEndDate}
                          disabled
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                ) : null}
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isCompleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleComplete()}
            disabled={isLoading || !summary || isCompleting}
          >
            {isCompleting ? "Completando..." : "Completar sprint"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CompleteSprintDialog;
