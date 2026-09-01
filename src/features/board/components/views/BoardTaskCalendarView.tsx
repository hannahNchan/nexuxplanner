import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventResizeDoneArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, EventInput, EventMountArg } from "@fullcalendar/core";
import { Box, Paper, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { BoardState, Task } from "../../../../shared/types/board";
import { addDays, getBoardViewTasks, getTaskDateRange, toDateInputValue } from "./boardViewTypes";

type BoardTaskCalendarViewProps = {
  data: BoardState;
  readOnly?: boolean;
  onTaskClick: (task: Task) => void;
  onTaskDatesChange: (taskId: string, plannedStartDate: string | null, plannedEndDate: string | null) => Promise<void>;
};

const toCalendarEnd = (inclusiveEnd: string) => addDays(inclusiveEnd, 1);

const fromCalendarEnd = (exclusiveEnd: Date | null, start: string) => {
  if (!exclusiveEnd) return start;
  const endDate = new Date(exclusiveEnd);
  endDate.setDate(endDate.getDate() - 1);
  return toDateInputValue(endDate);
};

const BoardTaskCalendarView = ({ data, readOnly = false, onTaskClick, onTaskDatesChange }: BoardTaskCalendarViewProps) => {
  const theme = useTheme();
  const tasks = getBoardViewTasks(data);
  const taskById = Object.fromEntries(tasks.map((task) => [task.id, task]));

  const events: EventInput[] = tasks.map((task) => {
    const range = getTaskDateRange(task);
    const taskColor = task.epic_color || theme.palette.primary.main;

    return {
      id: task.id,
      title: `${task.task_id_display || "SIN-ID"} ${task.title}`,
      start: range.start,
      end: toCalendarEnd(range.end),
      allDay: true,
      backgroundColor: alpha(taskColor, theme.palette.mode === "dark" ? 0.26 : 0.14),
      borderColor: alpha(taskColor, 0.42),
      textColor: theme.palette.text.primary,
      extendedProps: {
        hoverBackgroundColor: alpha(taskColor, theme.palette.mode === "dark" ? 0.38 : 0.24),
        hoverBorderColor: alpha(taskColor, 0.62),
      },
    };
  });

  const persistCalendarDates = async (
    taskId: string,
    startDate: Date | null,
    endDate: Date | null,
    revert: () => void
  ) => {
    if (!startDate) {
      revert();
      return;
    }

    const start = toDateInputValue(startDate);
    const end = fromCalendarEnd(endDate, start);

    try {
      await onTaskDatesChange(taskId, start, end);
    } catch {
      revert();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        p: 1.5,
        "--fc-page-bg-color": theme.palette.background.paper,
        "--fc-neutral-bg-color": alpha(theme.palette.text.primary, 0.035),
        "--fc-border-color": theme.palette.divider,
        "--fc-button-bg-color": theme.palette.background.default,
        "--fc-button-border-color": theme.palette.divider,
        "--fc-button-text-color": theme.palette.text.primary,
        "--fc-button-hover-bg-color": alpha(theme.palette.primary.main, 0.08),
        "--fc-button-hover-border-color": alpha(theme.palette.primary.main, 0.28),
        "--fc-button-active-bg-color": alpha(theme.palette.primary.main, 0.14),
        "--fc-button-active-border-color": alpha(theme.palette.primary.main, 0.35),
        "--fc-today-bg-color": alpha(theme.palette.primary.main, 0.08),
        "& .fc": {
          height: "100%",
          color: theme.palette.text.primary,
        },
        "& .fc-toolbar-title": {
          fontSize: "1rem",
          fontWeight: 900,
        },
        "& .fc-button": {
          borderRadius: "6px",
          fontWeight: 800,
          textTransform: "none",
        },
        "& .fc-event": {
          borderRadius: "6px",
          minHeight: 48,
          cursor: readOnly ? "pointer" : "grab",
          transition: "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
        },
        "& .fc-event:hover": {
          backgroundColor: "var(--nexus-calendar-event-hover-bg) !important",
          borderColor: "var(--nexus-calendar-event-hover-border) !important",
          boxShadow: `0 1px 0 ${alpha(theme.palette.common.black, 0.08)}`,
        },
        "& .fc-daygrid-event": {
          alignItems: "center",
          whiteSpace: "normal",
        },
        "& .fc-event-main": {
          display: "flex",
          alignItems: "center",
          minHeight: 46,
        },
        "& .fc-event-title": {
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.2,
        },
      }}
    >
      {tasks.length === 0 ? (
        <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
          <Typography color="text.secondary">No hay tareas en el sprint activo.</Typography>
        </Box>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="100%"
          locale="es"
          firstDay={1}
          editable={!readOnly}
          eventStartEditable={!readOnly}
          eventDurationEditable={!readOnly}
          events={events}
          eventDidMount={(arg: EventMountArg) => {
            const extendedProps = arg.event.extendedProps as {
              hoverBackgroundColor?: string;
              hoverBorderColor?: string;
            };
            if (extendedProps.hoverBackgroundColor) {
              arg.el.style.setProperty("--nexus-calendar-event-hover-bg", extendedProps.hoverBackgroundColor);
            }
            if (extendedProps.hoverBorderColor) {
              arg.el.style.setProperty("--nexus-calendar-event-hover-border", extendedProps.hoverBorderColor);
            }
          }}
          eventClick={(arg: EventClickArg) => {
            const task = taskById[arg.event.id];
            if (task) onTaskClick(task);
          }}
          eventDrop={(arg: EventDropArg) => {
            void persistCalendarDates(arg.event.id, arg.event.start, arg.event.end, arg.revert);
          }}
          eventResize={(arg: EventResizeDoneArg) => {
            void persistCalendarDates(arg.event.id, arg.event.start, arg.event.end, arg.revert);
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
        />
      )}
    </Paper>
  );
};

export default BoardTaskCalendarView;
