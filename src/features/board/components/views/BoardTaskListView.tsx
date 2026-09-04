import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { BoardState, Task } from "../../../../shared/types/board";
import { getTaskDateRange } from "./boardViewTypes";
import BoardTaskMeta from "./BoardTaskMeta";

type BoardTaskListViewProps = {
  data: BoardState;
  onTaskClick: (task: Task) => void;
};

const BoardTaskListView = ({ data, onTaskClick }: BoardTaskListViewProps) => {
  const theme = useTheme();

  return (
    <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0, overflow: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
      {data.columnOrder.map((columnId) => {
        const column = data.columns[columnId];
        const tasks = column.taskIds.map((taskId) => data.tasks[taskId]).filter((task): task is Task => Boolean(task));

        return (
          <Paper
            key={column.id}
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" fontWeight={900}>
                {column.title}
              </Typography>
              <Chip label={tasks.length} size="small" sx={{ height: 22, fontWeight: 800 }} />
            </Stack>

            {tasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2 }}>
                Sin tareas en esta columna.
              </Typography>
            ) : (
              tasks.map((task) => {
                const range = getTaskDateRange(task);

                return (
                  <Box
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "88px minmax(0, 1fr)", md: "104px minmax(0, 1fr) 180px 230px" },
                      gap: 1.5,
                      alignItems: "center",
                      px: 1.5,
                      py: 1.1,
                      cursor: "pointer",
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      "&:last-child": { borderBottom: 0 },
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.06),
                      },
                    }}
                  >
                    <Typography variant="caption" fontFamily="monospace" fontWeight={800} color="text.secondary" noWrap>
                      {task.task_id_display || "SIN-ID"}
                    </Typography>
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={800} noWrap>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {task.epic_name || "Sin epica"}
                      </Typography>
                      <Box sx={{ display: { xs: "flex", md: "none" }, minWidth: 0 }}>
                        <BoardTaskMeta
                          task={{ ...task, columnTitle: column.title, columnColor: task.columnColor ?? column.color }}
                          compact
                        />
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                      {range.start === range.end ? range.start : `${range.start} - ${range.end}`}
                    </Typography>
                    <Box sx={{ display: { xs: "none", md: "flex" }, justifyContent: "flex-end", minWidth: 0 }}>
                      <BoardTaskMeta
                        task={{ ...task, columnTitle: column.title, columnColor: task.columnColor ?? column.color }}
                      />
                    </Box>
                  </Box>
                );
              })
            )}
          </Paper>
        );
      })}
    </Stack>
  );
};

export default BoardTaskListView;
