import { Paper, Stack, Typography, Chip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import type { Task } from "../../../shared/types/board";
import UserAvatar from "../../../shared/ui/UserAvatar";

type TaskCardProps = {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
};

const TaskCard = ({
  task,
  onClick,
  isDragging = false,
}: TaskCardProps) => {
  const theme = useTheme();
  const epicColor = task.epic_color || theme.palette.secondary.main;
  const cardBackground = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.035);
  const cardHoverBackground = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08);

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 1.75,
        borderRadius: 1,
        bgcolor: isDragging
          ? alpha(theme.palette.warning.main, 0.12)
          : cardBackground,
        border: isDragging
          ? `1px solid ${theme.palette.warning.main}`
          : `1px solid ${theme.palette.divider}`,
        cursor: isDragging ? "grabbing" : "pointer",
        transform: isDragging ? "rotate(1deg)" : "none",
        transition: "border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease",
        boxShadow: "none",
        "&:hover": {
          transform: isDragging ? "rotate(1deg)" : "none",
          bgcolor: isDragging
            ? alpha(theme.palette.warning.main, 0.12)
            : cardHoverBackground,
          borderColor: isDragging
            ? theme.palette.warning.main
            : alpha(theme.palette.text.primary, 0.22),
          boxShadow: "none",
        },
      }}
    >
      <Stack>
        <Stack direction="column" justifyContent="start" alignItems="start" spacing={1}>
          <Typography fontWeight={600} fontSize={20}>
            {task.title}
          </Typography>
          {task.subtitle && (
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
              {task.subtitle}
            </Typography>
          )}
          {task.epic_name && (
            <Chip
              label={task.epic_name.toUpperCase()}
              size="small"
              sx={{
                height: 24,
                padding: "0 3px",
                borderRadius: 0.8,
                fontSize: "0.7rem",
                fontWeight: 600,
                bgcolor: alpha(epicColor, theme.palette.mode === "dark" ? 0.28 : 0.16),
                color: task.epic_color ? theme.palette.getContrastText(task.epic_color) : "secondary.main",
                border: `1px solid ${alpha(epicColor, 0.35)}`,
                "& .MuiChip-icon": {
                  color: "inherit",
                },
                "& .MuiChip-label": {
                  px: 0,
                },
              }}
            />
          )}
        </Stack>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              fontSize: 12,
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.task_id_display || "SIN-ID"}
          </Typography>
          {task.assignee_id ? (
            <UserAvatar 
              userId={task.assignee_id}
              size={36}
              showTooltip={true}
            />
          ) : (
            <Chip
              label="SIN ASIGNAR"
              size="small"
              variant="outlined"
              sx={{
                height: 24,
                borderRadius: 1,
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: 0,
                color: "text.secondary",
                borderColor: alpha(theme.palette.text.secondary, 0.35),
              }}
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default TaskCard;
