import { Paper, Stack, Typography } from "@mui/material";
import type { Task } from "../../../shared/types/board";

type TaskCardProps = {
  task: Task;
};

const TaskCard = ({ task }: TaskCardProps) => {
  return (
    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
      <Stack spacing={0.5}>
        <Typography fontWeight={600}>{task.title}</Typography>
        {task.description && (
          <Typography variant="body2" color="text.secondary">
            {task.description}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default TaskCard;
