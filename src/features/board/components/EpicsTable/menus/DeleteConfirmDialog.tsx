import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";

type DeleteConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <DeleteIcon color="error" />
          <Typography variant="h6" fontWeight={600}>
            Eliminar Épica
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} pt={1}>
          <Typography>¿Estás seguro de que deseas eliminar esta épica?</Typography>
          <Paper
            sx={{
              p: 2,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="error.dark" fontWeight={600}>
              ⚠️ Esta acción no se puede deshacer
            </Typography>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1.5 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          startIcon={<DeleteIcon />}
          sx={{
            borderRadius: 1.5,
            boxShadow: `0 4px 14px ${alpha(theme.palette.error.main, 0.3)}`,
            "&:hover": {
              boxShadow: `0 6px 20px ${alpha(theme.palette.error.main, 0.4)}`,
            },
          }}
        >
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
};