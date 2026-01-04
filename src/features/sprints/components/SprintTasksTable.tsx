import { Stack, Paper, Typography, Chip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Draggable } from "@hello-pangea/dnd";

type SprintTask = {
  id: string;
  title: string;
  task_id_display: string | null;
  priority_id: string | null;
  story_points: string | null;
  priority?: {
    name: string;
    color: string;
  };
};

type SprintTasksTableProps = {
  tasks: SprintTask[];
};

const SprintTasksTable = ({ tasks }: SprintTasksTableProps) => {
  const theme = useTheme();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        TAREAS ASIGNADAS ({tasks.length})
      </Typography>
      {tasks.map((task, index) => (
        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled>
          {(provided) => (
            <Paper
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              elevation={1}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                cursor: "default",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Task ID */}
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "monospace",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    minWidth: 70,
                    textAlign: "center",
                    fontSize: "0.7rem",
                  }}
                >
                  {task.task_id_display || "-"}
                </Typography>

                {/* Title */}
                <Typography variant="body2" sx={{ flex: 1, fontSize: "0.875rem" }}>
                  {task.title}
                </Typography>

                {/* Priority */}
                {task.priority && (
                  <Chip
                    label={task.priority.name}
                    size="small"
                    sx={{
                      bgcolor: task.priority.color,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      height: 20,
                    }}
                  />
                )}

                {/* Story Points */}
                {task.story_points && (
                  <Chip
                    label={`${task.story_points} pts`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.7rem", height: 20 }}
                  />
                )}
              </Stack>
            </Paper>
          )}
        </Draggable>
      ))}
    </Stack>
  );
};

export default SprintTasksTable;