import { useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ListIcon from "@mui/icons-material/List";
import CloseIcon from "@mui/icons-material/Close";

type TaskListCellProps = {
  epicId: string;
  tasks: Array<{ id: string; title: string }>;
  onAddTask: (epicId: string) => void;
  onRemoveTask: (epicId: string, taskId: string) => void;
};

const TaskListCell = ({ epicId, tasks, onAddTask, onRemoveTask }: TaskListCellProps) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "row-reverse", gap: 2, alignItems: "center" }}>
        {tasks.length > 0 && (
          <Chip
            icon={<ListIcon sx={{ fontSize: 16 }} />}
            label={`${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"}`}
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              bgcolor: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
              cursor: "pointer",
              "&:hover": {
                bgcolor: alpha(theme.palette.info.main, 0.2),
              },
            }}
          />
        )}

        <Tooltip title="Conectar tarea">
          <IconButton
            size="small"
            onClick={() => onAddTask(epicId)}
            sx={{
              width: 24,
              height: 24,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                transform: "rotate(90deg)",
              },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 2, maxWidth: 400 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Tareas conectadas
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {tasks.map((task) => (
              <Chip
                key={task.id}
                label={task.title}
                size="small"
                onDelete={() => {
                  onRemoveTask(epicId, task.id);
                  if (tasks.length === 1) setAnchorEl(null);
                }}
                sx={{
                  justifyContent: "space-between",
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  "& .MuiChip-label": { flex: 1 },
                }}
                deleteIcon={<CloseIcon sx={{ fontSize: 16 }} />}
              />
            ))}
          </Stack>
        </Box>
      </Popover>
    </>
  );
};

export default TaskListCell;