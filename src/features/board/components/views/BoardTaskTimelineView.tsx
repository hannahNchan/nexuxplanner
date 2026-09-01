import { Box, Chip, ListItemText, Menu, MenuItem, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
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

const minDayWidth = 34;
const leftPaneWidth = 280;
const todayColumnColor = "rgb(230, 240, 253)";

const dateTime = (value: string) => new Date(`${value}T00:00:00`).getTime();

const daysBetween = (start: string, end: string) =>
  Math.round((dateTime(end) - dateTime(start)) / 86400000);

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDay = (value: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));

const BoardTaskTimelineView = ({ data, readOnly = false, onTaskClick, onTaskDatesChange }: BoardTaskTimelineViewProps) => {
  const theme = useTheme();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const tasks = getBoardViewTasks(data);
  const [drag, setDrag] = useState<TimelineDrag | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; task: Task } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const rangesByTaskId = useMemo(() => {
    const ranges: Record<string, { start: string; end: string }> = {};
    tasks.forEach((task) => {
      ranges[task.id] = getTaskDateRange(task);
    });
    return ranges;
  }, [tasks]);

  const timeline = useMemo(() => {
    const ranges = Object.values(rangesByTaskId);
    const today = getLocalDateString(new Date());
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

  const today = getLocalDateString(new Date());
  const todayIndex = timeline.days.indexOf(today);

  const timelineDayWidth = useMemo(() => {
    const availableTimelineWidth = Math.max(0, viewportWidth - leftPaneWidth);
    const fittedDayWidth = availableTimelineWidth / Math.max(1, timeline.days.length);
    return Math.max(minDayWidth, fittedDayWidth);
  }, [timeline.days.length, viewportWidth]);

  const timelineGridBackground = useMemo(() => {
    const gridLines = `linear-gradient(to right, ${theme.palette.divider} 1px, transparent 1px)`;

    if (todayIndex < 0) {
      return {
        backgroundImage: gridLines,
        backgroundSize: `${timelineDayWidth}px 100%`,
        backgroundRepeat: "repeat",
      };
    }

    const todayColumnStart = todayIndex * timelineDayWidth;
    const todayColumnEnd = todayColumnStart + timelineDayWidth;
    const todayHighlight = `linear-gradient(to right, transparent ${todayColumnStart}px, ${todayColumnColor} ${todayColumnStart}px, ${todayColumnColor} ${todayColumnEnd}px, transparent ${todayColumnEnd}px)`;

    return {
      backgroundImage: `${todayHighlight}, ${gridLines}`,
      backgroundSize: `100% 100%, ${timelineDayWidth}px 100%`,
      backgroundRepeat: "no-repeat, repeat",
    };
  }, [theme.palette.divider, timelineDayWidth, todayIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportWidth = () => {
      setViewportWidth(viewport.clientWidth);
    };

    updateViewportWidth();
    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

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
    const deltaDays = Math.round((event.clientX - drag.pointerStartX) / timelineDayWidth);
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

  const handleTaskContextMenu = (event: MouseEvent, task: Task) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      task,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleViewContextTask = () => {
    if (contextMenu) {
      onTaskClick(contextMenu.task);
    }
    handleCloseContextMenu();
  };

  return (
    <>
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
        <Box sx={{ minWidth: leftPaneWidth + timeline.days.length * timelineDayWidth }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `${leftPaneWidth}px repeat(${timeline.days.length}, ${timelineDayWidth}px)`,
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
              <Typography
                key={day}
                variant="caption"
                color="text.secondary"
                textAlign="center"
                sx={{
                  py: 1.25,
                  borderLeft: `1px solid ${theme.palette.divider}`,
                  bgcolor: day === today ? todayColumnColor : "transparent",
                }}
              >
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
                  gridTemplateColumns: `${leftPaneWidth}px repeat(${timeline.days.length}, ${timelineDayWidth}px)`,
                  minHeight: 56,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Stack
                  spacing={0.25}
                  justifyContent="center"
                  onContextMenu={(event) => handleTaskContextMenu(event, task)}
                  sx={{ px: 1.25, minWidth: 0, position: "sticky", left: 0, zIndex: 2, bgcolor: "background.paper", cursor: "context-menu" }}
                >
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
                    gridTemplateColumns: `repeat(${timeline.days.length}, ${timelineDayWidth}px)`,
                    alignItems: "center",
                    ...timelineGridBackground,
                  }}
                >
                  <Box
                    onClick={() => onTaskClick(task)}
                    onContextMenu={(event) => handleTaskContextMenu(event, task)}
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

      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleViewContextTask}>
          <ListItemText primary="Ver tarea" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default BoardTaskTimelineView;
