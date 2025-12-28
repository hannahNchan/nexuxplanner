import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";

type AddColumnModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (columnName: string) => Promise<void>;
};

const AddColumnModal = ({ open, onClose, onSave }: AddColumnModalProps) => {
  const [columnName, setColumnName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setColumnName("");
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    // Validación
    if (!columnName.trim()) {
      setError("El nombre de la columna es obligatorio");
      return;
    }

    if (columnName.trim().length > 50) {
      setError("El nombre es demasiado largo (máximo 50 caracteres)");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(columnName.trim());
      handleClose();
    } catch (err) {
      console.error("Error creando columna:", err);
      setError("No se pudo crear la columna. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      void handleSave();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <AddIcon color="primary" />
          <Typography variant="h6">Añadir columna</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} pt={1}>
          <Typography variant="body2" color="text.secondary">
            Crea una nueva columna para organizar tus tareas.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label="Nombre de la columna"
            placeholder="Ej: En revisión, Bloqueado, Listo..."
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            onKeyPress={handleKeyPress}
            error={!!error}
            helperText={error || `${columnName.length}/50 caracteres`}
            inputProps={{
              maxLength: 50,
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !columnName.trim()}
          startIcon={<AddIcon />}
        >
          {isSaving ? "Creando..." : "Crear columna"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddColumnModal;