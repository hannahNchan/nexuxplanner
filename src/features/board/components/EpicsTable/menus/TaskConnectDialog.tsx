import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import LinkIcon from "@mui/icons-material/Link";

type TaskConnectDialogProps = {
  open: boolean;
  taskSearchText: string;
  taskOptions: Array<{ id: string; title: string }>;
  connectedTaskIds: string[];
  onClose: () => void;
  onSearchTextChange: (text: string) => void;
  onTaskToggle: (taskId: string, isConnected: boolean) => void;
};

export const TaskConnectDialog = ({
  open,
  taskSearchText,
  taskOptions,
  connectedTaskIds,
  onClose,
  onSearchTextChange,
  onTaskToggle,
}: TaskConnectDialogProps) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: "80vh",
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LinkIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Conectar Tareas
            </Typography>
          </Stack>

          <TextField
            size="small"
            placeholder="Buscar tareas..."
            value={taskSearchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Stack>
          <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography variant="subtitle2" color="primary" fontWeight={600}>
              Todas las tareas
            </Typography>
          </Box>

          <Stack sx={{ maxHeight: "calc(80vh - 220px)", overflow: "auto" }}>
            {taskOptions.length === 0 ? (
              <Stack alignItems="center" py={6}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Cargando tareas...
                </Typography>
              </Stack>
            ) : (
              taskOptions.map((task) => {
                const isConnected = connectedTaskIds.includes(task.id);

                return (
                  <Box
                    key={task.id}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      bgcolor: isConnected
                        ? alpha(theme.palette.primary.main, 0.05)
                        : "transparent",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                    onClick={() => onTaskToggle(task.id, isConnected)}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Checkbox checked={isConnected} sx={{ p: 0 }} />
                      <Typography variant="body2" fontWeight={isConnected ? 600 : 400}>
                        {task.title}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })
            )}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {taskOptions.length} tarea{taskOptions.length !== 1 ? "s" : ""} disponible
          {taskOptions.length !== 1 ? "s" : ""}
        </Typography>
        <Button onClick={onClose} sx={{ borderRadius: 1.5 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};