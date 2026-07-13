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
import AssignmentIcon from "@mui/icons-material/Assignment";
import LockIcon from "@mui/icons-material/Lock";
import type { TaskSearchOption } from "../../../../api/epicService";

type TaskConnectDialogProps = {
  open: boolean;
  taskSearchText: string;
  taskOptions: TaskSearchOption[];
  currentEpicId: string | null;
  connectedTaskIds: string[];
  isLoading: boolean;
  onClose: () => void;
  onSearchTextChange: (text: string) => void;
  onTaskToggle: (taskId: string, isConnected: boolean) => void;
};

export const TaskConnectDialog = ({
  open,
  taskSearchText,
  taskOptions,
  currentEpicId,
  connectedTaskIds,
  isLoading,
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
            {isLoading ? (
              <Stack alignItems="center" py={6}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Cargando tareas...
                </Typography>
              </Stack>
            ) : taskOptions.length === 0 ? (
              <Stack alignItems="center" spacing={1.5} py={7} px={3} textAlign="center">
                <AssignmentIcon sx={{ fontSize: 44, color: "text.disabled" }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  No hay tareas disponibles
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                  {taskSearchText.trim()
                    ? "No encontramos tareas que coincidan con tu búsqueda."
                    : "Crea tareas en el backlog para poder conectarlas con esta épica."}
                </Typography>
              </Stack>
            ) : (
              taskOptions.map((task) => {
                const isConnected = connectedTaskIds.includes(task.id);
                const isAssignedToOtherEpic = Boolean(
                  task.assigned_epic_id && task.assigned_epic_id !== currentEpicId
                );

                return (
                  <Box
                    key={task.id}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      cursor: isAssignedToOtherEpic ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      opacity: isAssignedToOtherEpic ? 0.52 : 1,
                      bgcolor: isConnected
                        ? alpha(theme.palette.primary.main, 0.05)
                        : "transparent",
                      "&:hover": {
                        bgcolor: isAssignedToOtherEpic
                          ? "transparent"
                          : alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                    onClick={() => {
                      if (isAssignedToOtherEpic) return;
                      onTaskToggle(task.id, isConnected);
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Checkbox checked={isConnected} disabled={isAssignedToOtherEpic} sx={{ p: 0 }} />
                      <Stack spacing={0.25} minWidth={0} flex={1}>
                        <Typography variant="body2" fontWeight={isConnected ? 600 : 400} noWrap>
                          {task.title}
                        </Typography>
                        {isAssignedToOtherEpic ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LockIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                              Ya asignada a otra épica
                            </Typography>
                          </Stack>
                        ) : null}
                      </Stack>
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
          {
            taskOptions.filter(
              (task) => !task.assigned_epic_id || task.assigned_epic_id === currentEpicId
            ).length
          }{" "}
          tarea
          {taskOptions.filter((task) => !task.assigned_epic_id || task.assigned_epic_id === currentEpicId).length !==
          1
            ? "s"
            : ""}{" "}
          disponible
          {taskOptions.filter((task) => !task.assigned_epic_id || task.assigned_epic_id === currentEpicId).length !==
          1
            ? "s"
            : ""}
        </Typography>
        <Button onClick={onClose} sx={{ borderRadius: 1.5 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
