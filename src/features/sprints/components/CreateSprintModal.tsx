import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import { addDays, addMonths, addWeeks, endOfDay } from "date-fns";

type SprintDuration = "1w" | "2w" | "1m" | "custom";

type PickerDateValue = Date | { toDate: () => Date } | null;

const toNativeDate = (value: PickerDateValue) => {
  if (!value) return null;
  return value instanceof Date ? value : value.toDate();
};

const calculateEndDate = (startDate: Date, duration: SprintDuration) => {
  if (duration === "1w") return endOfDay(addWeeks(startDate, 1));
  if (duration === "2w") return endOfDay(addWeeks(startDate, 2));
  if (duration === "1m") return endOfDay(addMonths(startDate, 1));
  return endOfDay(addWeeks(startDate, 2));
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
  const [duration, setDuration] = useState<SprintDuration>("2w");
  const [isOpenSprint, setIsOpenSprint] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(calculateEndDate(new Date(), "2w"));
  const [isCreating, setIsCreating] = useState(false);

  // Auto-calcular endDate cuando cambia duration o startDate
  useEffect(() => {
    if (!isOpenSprint && duration !== "custom") {
      setEndDate(calculateEndDate(startDate, duration));
    }
  }, [duration, isOpenSprint, startDate]);

  // Reset form cuando se abre
  useEffect(() => {
    if (open) {
      setName("");
      setGoal("");
      setDuration("2w");
      setIsOpenSprint(false);
      const now = new Date();
      setStartDate(now);
      setEndDate(calculateEndDate(now, "2w"));
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("El nombre del sprint es obligatorio");
      return;
    }

    if (!isOpenSprint && endDate <= startDate) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    setIsCreating(true);
    try {
      await onCreateSprint({
        name: name.trim(),
        goal: goal.trim(),
        start_date: startDate.toISOString(),
        end_date: isOpenSprint ? null : endOfDay(endDate).toISOString(),
      });
      onClose();
    } catch (error) {
      console.error("Error creando sprint:", error);
      alert("Error al crear el sprint");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Crear Sprint
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Proyecto: {projectName}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} pt={1}>
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

            <FormControlLabel
              control={
                <Switch
                  checked={isOpenSprint}
                  onChange={(event) => setIsOpenSprint(event.target.checked)}
                />
              }
              label="Sprint abierto, sin fecha de cierre"
            />

            {!isOpenSprint && (
              <FormControl fullWidth>
                <InputLabel>Duración</InputLabel>
                <Select
                  value={duration}
                  label="Duración"
                  onChange={(e) => setDuration(e.target.value as SprintDuration)}
                >
                  <MenuItem value="1w">1 semana</MenuItem>
                  <MenuItem value="2w">Quincena</MenuItem>
                  <MenuItem value="1m">1 mes</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            )}

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

            {!isOpenSprint && (
              <DateTimePicker
                label="Fecha de Fin"
                value={endDate}
                onChange={(newValue) => {
                  const nextDate = toNativeDate(newValue);
                  if (nextDate) {
                    setDuration("custom");
                    setEndDate(endOfDay(nextDate));
                  }
                }}
                minDate={addDays(startDate, 1)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: "El sprint cierra al final del día seleccionado (23:59).",
                  },
                }}
              />
            )}
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
