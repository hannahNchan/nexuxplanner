import { Paper, Stack, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import type { Task } from "../../../shared/types/board";

type TaskCardProps = {
  task: Task;
  onClick: () => void;
};

const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={1}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          elevation: 3,
          transform: "translateY(-2px)",
          bgcolor: "action.hover",
          borderColor: alpha(theme.palette.primary.main, 0.3),
          boxShadow: theme.shadows[3],
        },
      }}
    >
      <Stack spacing={0.5}>
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