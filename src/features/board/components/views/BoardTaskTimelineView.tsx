import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { BoardState, Task } from "../../../../shared/types/board";
import { addDays, getBoardViewTasks, getInclusiveDaySpan, getTaskDateRange } from "./boardViewTypes";

type BoardTaskTimelineViewProps = {
  data: BoardState;
  readOnly?: boolean;
  onTaskClick: (task: Task) => void;
  onTaskDatesChange: (taskId: string, plannedStartDate: string | null, plannedEndDate: string | null) => Promise<void>;
};

type DragMode = "move" | "start" | "end";

type TimelineDrag = {
  taskId: string;
  mode: DragMode;
  pointerStartX: number;
  originalStart: string;
  originalEnd: string;
  currentStart: string;
  currentEnd: string;
};

const dayWidth = 34;
const leftPaneWidth = 280;

const dateTime = (value: string) => new Date(`${value}T00:00:00`).getTime();

const daysBetween = (start: string, end: string) =>
  Math.round((dateTime(end) - dateTime(start)) / 86400000);

const formatDay = (value: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));

const BoardTaskTimelineView = ({ data, readOnly = false, onTaskClick, onTaskDatesChange }: BoardTaskTimelineViewProps) => {
  const theme = useTheme();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const tasks = getBoardViewTasks(data);
  const [drag, setDrag] = useState<TimelineDrag | null>(null);

  const rangesByTaskId = useMemo(() => {
    const ranges: Record<string, { start: string; end: string }> = {};
    tasks.forEach((task) => {
      ranges[task.id] = getTaskDateRange(task);
    });
    return ranges;
  }, [tasks]);

  const timeline = useMemo(() => {
    const ranges = Object.values(rangesByTaskId);
    const today = new Date().toISOString().slice(0, 10);
    const minStart = ranges.length > 0
      ? ranges.reduce((min, range) => (dateTime(range.start) < dateTime(min) ? range.start : min), ranges[0].start)
      : today;
    const maxEnd = ranges.length > 0
      ? ranges.reduce((max, range) => (dateTime(range.end) > dateTime(max) ? range.end : max), ranges[0].end)
      : today;

    const start = addDays(minStart, -3);
    const end = addDays(maxEnd, 7);
    const count = daysBetween(start, end) + 1;
    const days = Array.from({ length: count }, (_, index) => addDays(start, index));

    return { start, end, days };
  }, [rangesByTaskId]);

  const getCurrentRange = (taskId: string) => {
    if (drag?.taskId === taskId) {
      return { start: drag.currentStart, end: drag.currentEnd };
    }

    return rangesByTaskId[taskId];
  };

  const updateDragRange = (current: TimelineDrag, deltaDays: number): TimelineDrag => {
    const duration = getInclusiveDaySpan(current.originalStart, current.originalEnd);

    if (current.mode === "move") {
      const nextStart = addDays(current.originalStart, deltaDays);
      return {
        ...current,
        currentStart: nextStart,
        currentEnd: addDays(nextStart, duration),
      };
    }

    if (current.mode === "start") {
      const nextStart = addDays(current.originalStart, deltaDays);
      return {
        ...current,
        currentStart: dateTime(nextStart) <= dateTime(current.currentEnd) ? nextStart : current.currentEnd,
      };
    }

    const nextEnd = addDays(current.originalEnd, deltaDays);
    return {
      ...current,
      currentEnd: dateTime(nextEnd) >= dateTime(current.currentStart) ? nextEnd : current.currentStart,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const deltaDays = Math.round((event.clientX - drag.pointerStartX) / dayWidth);
    setDrag(updateDragRange(drag, deltaDays));
  };

  const handlePointerUp = () => {
    if (!drag) return;
    const nextDrag = drag;
    setDrag(null);

    if (nextDrag.currentStart !== nextDrag.originalStart || nextDrag.currentEnd !== nextDrag.originalEnd) {
      void onTaskDatesChange(nextDrag.taskId, nextDrag.currentStart, nextDrag.currentEnd);
    }
  };

  const startDrag = (event: PointerEvent, task: Task, mode: DragMode) => {
    if (readOnly) return;
    const range = getCurrentRange(task.id);
    if (!range) return;

    event.preventDefault();
    event.stopPropagation();
    viewportRef.current?.setPointerCapture(event.pointerId);
    setDrag({
      taskId: task.id,
      mode,
      pointerStartX: event.clientX,
      originalStart: range.start,
      originalEnd: range.end,
      currentStart: range.start,
      currentEnd: range.end,
    });
  };

  return (
    <Paper
      elevation={0}
      ref={viewportRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(null)}
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
      <Box sx={{ minWidth: leftPaneWidth + timeline.days.length * dayWidth }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `${leftPaneWidth}px repeat(${timeline.days.length}, ${dayWidth}px)`,
            position: "sticky",
            top: 0,
            zIndex: 3,
            bgcolor: "background.paper",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ p: 1.25 }}>
            Tareas
          </Typography>
          {timeline.days.map((day) => (
            <Typography key={day} variant="caption" color="text.secondary" textAlign="center" sx={{ py: 1.25, borderLeft: `1px solid ${theme.palette.divider}` }}>
              {formatDay(day)}
            </Typography>
          ))}
        </Box>

        {tasks.map((task) => {
          const range = getCurrentRange(task.id);
          const startOffset = daysBetween(timeline.start, range.start);
          const span = getInclusiveDaySpan(range.start, range.end) + 1;

          return (
            <Box
              key={task.id}
              sx={{
                display: "grid",
                gridTemplateColumns: `${leftPaneWidth}px repeat(${timeline.days.length}, ${dayWidth}px)`,
                minHeight: 56,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={0.25} justifyContent="center" sx={{ px: 1.25, minWidth: 0, position: "sticky", left: 0, zIndex: 2, bgcolor: "background.paper" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Chip label={task.task_id_display || "SIN-ID"} size="small" sx={{ height: 22, fontWeight: 800 }} />
                  <Typography variant="body2" fontWeight={800} noWrap>
                    {task.title}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {task.columnTitle} · {range.start === range.end ? range.start : `${range.start} - ${range.end}`}
                </Typography>
              </Stack>

              <Box
                sx={{
                  gridColumn: `2 / span ${timeline.days.length}`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${timeline.days.length}, ${dayWidth}px)`,
                  alignItems: "center",
                  backgroundImage: `linear-gradient(to right, ${theme.palette.divider} 1px, transparent 1px)`,
                  backgroundSize: `${dayWidth}px 100%`,
                }}
              >
                <Box
                  onClick={() => onTaskClick(task)}
                  onPointerDown={(event) => startDrag(event, task, "move")}
                  sx={{
                    gridColumn: `${Math.max(1, startOffset + 1)} / span ${Math.max(1, span)}`,
                    mx: 0.5,
                    height: 30,
                    borderRadius: 1,
                    bgcolor: alpha(task.epic_color || theme.palette.primary.main, theme.palette.mode === "dark" ? 0.32 : 0.18),
                    border: `1px solid ${alpha(task.epic_color || theme.palette.primary.main, 0.48)}`,
                    color: "text.primary",
                    cursor: readOnly ? "pointer" : "grab",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    overflow: "hidden",
                    boxShadow: drag?.taskId === task.id ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.22)}` : "none",
                  }}
                >
                  <Box
                    onPointerDown={(event) => startDrag(event, task, "start")}
                    sx={{
                      width: 8,
                      alignSelf: "stretch",
                      cursor: readOnly ? "pointer" : "ew-resize",
                      bgcolor: alpha(theme.palette.text.primary, 0.18),
                    }}
                  />
                  <Typography variant="caption" fontWeight={900} noWrap sx={{ px: 0.75, minWidth: 0 }}>
                    {task.title}
                  </Typography>
                  <Box
                    onPointerDown={(event) => startDrag(event, task, "end")}
                    sx={{
                      width: 8,
                      alignSelf: "stretch",
                      cursor: readOnly ? "pointer" : "ew-resize",
                      bgcolor: alpha(theme.palette.text.primary, 0.18),
                    }}
                  />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default BoardTaskTimelineView;
