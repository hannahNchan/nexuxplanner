import { Paper, Stack, Typography, Chip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import type { Task } from "../../../shared/types/board";

type TaskCardProps = {
  task: Task;
  onClick: () => void;
  currentUserId?: string;
  isDragging?: boolean;  // ✅ NUEVO: Para efectos visuales al arrastrar
};

const TaskCard = ({ task, onClick, currentUserId, isDragging = false }: TaskCardProps) => {
  const theme = useTheme();
  const isAssignedToMe = task.assignee_id === currentUserId;

  return (
    <Paper
      elevation={isDragging ? 8 : 1}  // ✅ Mayor elevación al arrastrar
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        // ✅ Color amarillo translúcido al arrastrar
        bgcolor: isDragging 
          ? alpha(theme.palette.warning.main, 0.2)
          : "background.paper",
        // ✅ Borde amarillo al arrastrar
        border: isDragging
          ? `2px solid ${theme.palette.warning.main}`
          : `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        cursor: isDragging ? "grabbing" : "pointer",
        // ✅ Rotación sutil al arrastrar
        transform: isDragging ? "rotate(3deg)" : "none",
        transition: "all 0.2s ease-in-out",
        // ✅ Sombra más pronunciada al arrastrar
        boxShadow: isDragging 
          ? theme.shadows[8]
          : theme.shadows[1],
        "&:hover": {
          elevation: 3,
          transform: isDragging ? "rotate(3deg)" : "translateY(-2px)",
          bgcolor: isDragging 
            ? alpha(theme.palette.warning.main, 0.2)
            : "action.hover",
          borderColor: isDragging
            ? theme.palette.warning.main
            : alpha(theme.palette.primary.main, 0.3),
          boxShadow: theme.shadows[3],
        },
      }}
    >
      <Stack spacing={1}>
        {isAssignedToMe && (
          <Chip
            icon={<PersonIcon sx={{ fontSize: 16 }} />}
            label="Asignada a ti"
            size="small"
            color="primary"
            sx={{
              height: 20,
              fontSize: "0.75rem",
              fontWeight: 600,
              alignSelf: "flex-start",
            }}
          />
        )}

        <Typography fontWeight={600}>{task.title}</Typography>
        
        {task.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.description}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default TaskCard;