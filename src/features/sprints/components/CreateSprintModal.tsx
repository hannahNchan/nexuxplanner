import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";
import {
  calculateSprintEndDate,
  SPRINT_DURATION_OPTIONS,
  type SprintDuration,
} from "../utils/sprintDates";

type PickerDateValue = Date | { toDate: () => Date } | null;

const toNativeDate = (value: PickerDateValue) => {
  if (!value) return null;
  return value instanceof Date ? value : value.toDate();
};

type CreateSprintModalProps = {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onCreateSprint: (data: {
    name: string;
    goal: string;
    start_date: string;
    end_date: string | null;
  }) => Promise<void>;
};

const CreateSprintModal = ({
  open,
  projectName,
  onClose,
  onCreateSprint,
}: CreateSprintModalProps) => {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState<SprintDuration>("7d");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(calculateSprintEndDate(new Date(), "7d"));
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setEndDate(calculateSprintEndDate(startDate, duration));
  }, [duration, startDate]);

  useEffect(() => {
    if (open) {
      setName("");
      setGoal("");
      setDuration("7d");
      setFormError("");
      const now = new Date();
      setStartDate(now);
      setEndDate(calculateSprintEndDate(now, "7d"));
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setFormError("El nombre del sprint es obligatorio");
      return;
    }

    if (endDate <= startDate) {
      setFormError("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    setFormError("");
    setIsCreating(true);
    try {
      await onCreateSprint({
        name: name.trim(),
        goal: goal.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      onClose();
    } catch (error) {
      logError("sprint.create", error);
      setFormError(getErrorMessage(error, "No se pudo crear el sprint. Revisa las fechas e inténtalo de nuevo."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography component="div" variant="h6" fontWeight={700}>
            Crear Sprint
          </Typography>
          <Typography component="div" variant="caption" color="text.secondary">
            Proyecto: {projectName}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} pt={1}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}

            <TextField
              fullWidth
              label="Nombre del Sprint"
              placeholder="Ej: Sprint 1, Sprint Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <TextField
              fullWidth
              label="Objetivo del Sprint"
              placeholder="Describe el propósito de este sprint..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              multiline
              rows={3}
            />

            <FormControl fullWidth>
              <InputLabel>Duración</InputLabel>
              <Select
                value={duration}
                label="Duración"
                onChange={(e) => setDuration(e.target.value as SprintDuration)}
              >
                {SPRINT_DURATION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Stack spacing={0}>
                      <Typography variant="body2" fontWeight={700}>
                        {option.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.helperText}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DateTimePicker
              label="Fecha de Inicio"
              value={startDate}
              onChange={(newValue) => {
                const nextDate = toNativeDate(newValue);
                if (nextDate) {
                  setStartDate(nextDate);
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />

            <DateTimePicker
              label="Fecha de Fin"
              value={endDate}
              disabled
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText:
                    "Se calcula automaticamente para respetar la duracion exacta del sprint.",
                },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? "Creando..." : "Crear Sprint"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreateSprintModal;
