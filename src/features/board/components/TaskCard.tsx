import { Paper, Stack, Typography } from "@mui/material";
import type { Task } from "../../../shared/types/board";

type TaskCardProps = {
  task: Task;
  onClick: () => void;
};

const TaskCard = ({ task, onClick }: TaskCardProps) => {
  return (
    <Paper
      elevation={1}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        cursor: "pointer",
        transition: "all 0.2s",
        "&:hover": {
          elevation: 3,
          transform: "translateY(-2px)",
          bgcolor: "action.hover",
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