import { AvatarGroup, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { BoardState, Task } from "../../../../shared/types/board";
import UserAvatar from "../../../../shared/ui/UserAvatar";
import { getBoardViewTasks, getTaskDateRange } from "./boardViewTypes";

type BoardTaskTableViewProps = {
  data: BoardState;
  onTaskClick: (task: Task) => void;
};

const headers = ["ID", "Tarea", "Estado", "Epica", "Inicio", "Fin", "Puntos", "Responsable"];

const BoardTaskTableView = ({ data, onTaskClick }: BoardTaskTableViewProps) => {
  const theme = useTheme();
  const tasks = getBoardViewTasks(data);

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        minHeight: 0,
        overflow: "auto",
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Box sx={{ minWidth: 1060 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "110px minmax(260px, 1.5fr) 150px 180px 116px 116px 90px 120px",
            px: 1.5,
            py: 1,
            position: "sticky",
            top: 0,
            zIndex: 3,
            bgcolor: "background.paper",
            borderBottom: `1px solid ${theme.palette.divider}`,
            boxShadow: `0 1px 0 ${theme.palette.divider}`,
          }}
        >
          {headers.map((header) => (
            <Typography key={header} variant="caption" color="text.secondary" fontWeight={900} textTransform="uppercase">
              {header}
            </Typography>
          ))}
        </Box>

        {tasks.map((task) => {
          const range = getTaskDateRange(task);

          return (
            <Box
              key={task.id}
              onClick={() => onTaskClick(task)}
              sx={{
                display: "grid",
                gridTemplateColumns: "110px minmax(260px, 1.5fr) 150px 180px 116px 116px 90px 120px",
                alignItems: "center",
                px: 1.5,
                py: 1,
                minHeight: 52,
                borderBottom: `1px solid ${theme.palette.divider}`,
                cursor: "pointer",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.055),
                },
              }}
            >
              <Typography variant="caption" fontFamily="monospace" fontWeight={800} color="text.secondary">
                {task.task_id_display || "SIN-ID"}
              </Typography>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={800} noWrap>
                  {task.title}
                </Typography>
                {task.subtitle ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {task.subtitle}
                  </Typography>
                ) : null}
              </Stack>
              <Typography variant="body2" color="text.secondary" noWrap>
                {task.columnTitle}
              </Typography>
              <Chip
                label={task.epic_name || "Sin epica"}
                size="small"
                variant="outlined"
                sx={{ height: 22, maxWidth: 160, justifyContent: "flex-start" }}
              />
              <Typography variant="caption" color="text.secondary">
                {range.start}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {range.end}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {task.story_points ? `${task.story_points} pts` : "-"}
              </Typography>
              <AvatarGroup max={2} sx={{ justifyContent: "flex-start" }}>
                {task.assignee_id ? <UserAvatar userId={task.assignee_id} size={28} showTooltip /> : null}
              </AvatarGroup>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default BoardTaskTableView;
