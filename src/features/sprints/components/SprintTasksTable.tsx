import { Stack, Paper, Typography, Chip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import UserAvatar from "../../../shared/ui/UserAvatar";

export type SprintTask = {
  id: string;
  title: string;
  task_id_display: string | null;
  priority_id: string | null;
  story_points: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  column_id?: string | null;
  created_at?: string | null;
  epic_id?: string | null;
  epic_name?: string | null;
  epic_color?: string | null;
  priority?: {
    name: string;
    color: string | null;
  } | null;
};

type SprintTasksTableProps = {
  tasks: SprintTask[];
};

const SprintTasksTable = ({ tasks }: SprintTasksTableProps) => {
  const theme = useTheme();
  const cardBackground = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.035);
  const cardHoverBackground = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08);

  if (tasks.length === 0) {
    return null;
  }

  const formatCreatedAt = (value?: string | null) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin fecha" : format(date, "dd MMM yyyy", { locale: es });
  };

  return (
    <Stack spacing={0.75} sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ px: 0.5, py: 1 }}>
        Tareas en el sprint ({tasks.length})
      </Typography>
      {tasks.map((task, index) => (
        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled>
          {(provided) => (
            <Paper
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              elevation={0}
              sx={{
                px: 1,
                py: 0.9,
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.12)}`,
                bgcolor: cardBackground,
                cursor: "default",
                transition: "background-color 0.16s ease, border-color 0.16s ease",
                "&:hover": {
                  bgcolor: cardHoverBackground,
                  borderColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.34 : 0.24),
                },
              }}
            >
              <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "monospace",
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      px: 0.75,
                      py: 0.5,
                      borderRadius: 0.75,
                      minWidth: 64,
                      textAlign: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    {task.task_id_display || "-"}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: "0.875rem",
                      fontWeight: 650,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                      {task.title}
                    </Typography>
                    {task.assignee_id ? (
                      <UserAvatar userId={task.assignee_id} size={24} showTooltip />
                    ) : null}
                  </Stack>

                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={task.epic_name || "Sin épica"}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: "0.68rem",
                      height: 20,
                      maxWidth: 132,
                      bgcolor: task.epic_color ? alpha(task.epic_color, theme.palette.mode === "dark" ? 0.28 : 0.14) : undefined,
                      borderColor: task.epic_color ? alpha(task.epic_color, 0.45) : undefined,
                      color: task.epic_color ?? "text.secondary",
                      fontWeight: 700,
                    }}
                  />
                  {!task.assignee_id ? (
                    <Chip
                      label="Sin asignar"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.68rem", height: 20, maxWidth: 132 }}
                    />
                  ) : null}
                  <Chip
                    label={`Creada ${formatCreatedAt(task.created_at)}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.68rem", height: 20 }}
                  />
                  {task.priority && (
                    <Chip
                      label={task.priority.name}
                      size="small"
                      sx={{
                        bgcolor: task.priority.color ? alpha(task.priority.color, 0.16) : theme.palette.action.selected,
                        color: task.priority.color ?? theme.palette.text.primary,
                        border: task.priority.color ? `1px solid ${alpha(task.priority.color, 0.32)}` : undefined,
                        fontWeight: 700,
                        fontSize: "0.68rem",
                        height: 20,
                      }}
                    />
                  )}
                  {task.story_points && (
                    <Chip
                      label={`${task.story_points} pts`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.68rem", height: 20 }}
                    />
                  )}
                </Stack>
              </Stack>
            </Paper>
          )}
        </Draggable>
      ))}
    </Stack>
  );
};

export default SprintTasksTable;
