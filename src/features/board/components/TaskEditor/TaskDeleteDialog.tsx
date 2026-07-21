import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import DeleteIcon from "@mui/icons-material/Delete";
import { alpha, useTheme } from "@mui/material/styles";

type TaskDeleteDialogProps = {
  open: boolean;
  taskTitle?: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const TaskDeleteDialog = ({
  open,
  taskTitle,
  isDeleting,
  onClose,
  onConfirm,
}: TaskDeleteDialogProps) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningIcon color="error" />
          <Typography variant="h6">Eliminar tarea</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1}>
          <Typography>
            ¿Estás seguro de eliminar la tarea <strong>"{taskTitle}"</strong>?
          </Typography>
          <Paper
            sx={{
              p: 2,
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              borderLeft: `4px solid ${theme.palette.error.main}`,
            }}
          >
            <Typography variant="body2" color="error.dark">
              Esta accion no se puede deshacer.
            </Typography>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isDeleting}
          startIcon={<DeleteIcon />}
        >
          {isDeleting ? "Eliminando..." : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDeleteDialog;
