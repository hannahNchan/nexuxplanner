import {
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
import { addWeeks, addDays } from "date-fns";

type CreateSprintModalProps = {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onCreateSprint: (data: {
    name: string;
    goal: string;
    start_date: string;
    end_date: string;
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
  const [duration, setDuration] = useState<string>("2"); // weeks
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addWeeks(new Date(), 2));
  const [isCreating, setIsCreating] = useState(false);

  // Auto-calcular endDate cuando cambia duration o startDate
  useEffect(() => {
    if (duration) {
      const weeks = parseInt(duration, 10);
      setEndDate(addWeeks(startDate, weeks));
    }
  }, [duration, startDate]);

  // Reset form cuando se abre
  useEffect(() => {
    if (open) {
      setName("");
      setGoal("");
      setDuration("2");
      setStartDate(new Date());
      setEndDate(addWeeks(new Date(), 2));
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("El nombre del sprint es obligatorio");
      return;
    }

    if (endDate <= startDate) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

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

            <FormControl fullWidth>
              <InputLabel>Duración</InputLabel>
              <Select
                value={duration}
                label="Duración"
                onChange={(e) => setDuration(e.target.value)}
              >
                <MenuItem value="1">1 semana</MenuItem>
                <MenuItem value="2">2 semanas</MenuItem>
                <MenuItem value="3">3 semanas</MenuItem>
                <MenuItem value="4">4 semanas</MenuItem>
              </Select>
            </FormControl>

            <DateTimePicker
              label="Fecha de Inicio"
              value={startDate}
              onChange={(newValue) => newValue && setStartDate(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />

            <DateTimePicker
              label="Fecha de Fin"
              value={endDate}
              onChange={(newValue) => newValue && setEndDate(newValue)}
              minDate={addDays(startDate, 1)}
              slotProps={{
                textField: {
                  fullWidth: true,
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