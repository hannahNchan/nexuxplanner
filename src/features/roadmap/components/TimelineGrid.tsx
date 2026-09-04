import {
  Alert,
  Box,
  Chip,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PersonIcon from "@mui/icons-material/Person";
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import UserAvatar from "../../../shared/ui/UserAvatar";
import type { EpicDependency, TaskDependency } from "../../../features/api/dependencyService";
import type { EpicWithDetails, RoadmapTask } from "../../../features/api/epicService";
import EpicBar from "./EpicBar";
import RoadmapDependencyLayer, { type RoadmapDependencyLine } from "./RoadmapDependencyLayer";
import TimelineBar from "./TimelineBar";
import {
  DAY_WIDTH,
  LEFT_PANEL_SHADOW,
  LEFT_PANEL_WIDTH,
  MONTH_DAY_WIDTH,
  QUARTER_DAY_WIDTH,
  ROADMAP_TASK_DRAG_TYPE,
  TIMELINE_MONTHS,
  TIMELINE_WEEKS,
  TimelineColumns,
  TimelineEmptyState,
  TimelineHeader,
  TimelineLeftHeader,
  TodayMarker,
  type TimelineUnit,
} from "./TimelineGridParts";
import { getQuarterUnits, getRoadmapTimelineRange, type RoadmapTimelineMode } from "../utils/timelineRange";

type TimelineGridProps = {
  epics: EpicWithDetails[];
  dependencies: EpicDependency[];
  taskDependencies: TaskDependency[];
  timelineMode: RoadmapTimelineMode;
  scrollRequest: { direction: "left" | "right"; nonce: number } | null;
  onOverflowChange: (hasOverflow: boolean) => void;
  onUpdateEpicDates: (epicId: string, startDate: string, endDate: string) => void;
  onUpdateTaskDates: (taskId: string, startDate: string, endDate: string) => void;
  onMoveTaskToEpic: (taskId: string, epicId: string) => void;
  onCreateTask: (epicId: string, title: string) => Promise<void>;
  onCreateDependency: (fromEpicId: string, toEpicId: string, dependencyType: string) => Promise<void> | void;
  onDeleteDependency: (dependencyId: string) => void;
  onCreateTaskDependency: (fromTaskId: string, toTaskId: string, dependencyType: string) => Promise<void> | void;
  onDeleteTaskDependency: (dependencyId: string) => void;
  showChildLevelIssues: boolean;
  readOnly?: boolean;
};

type ConnectionEndpoint = {
  id: string;
  anchor: "start" | "end";
  type: "epic" | "task";
};

type RoadmapBarTarget = {
  id: string;
  type?: "epic" | "task";
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo crear la dependencia.";

const getDragPreviewPath = (
  source: { x: number; y: number },
  target: { x: number; y: number }
) => {
  const distance = Math.abs(target.x - source.x);
  const bend = Math.max(56, Math.min(220, distance * 0.45));
  const sourceControlX = target.x >= source.x ? source.x + bend : source.x - bend;
  const targetControlX = target.x >= source.x ? target.x - bend : target.x + bend;

  return `M ${source.x},${source.y} C ${sourceControlX},${source.y} ${targetControlX},${target.y} ${target.x},${target.y}`;
};

const getDefaultTaskDates = (
  taskIndex: number,
  timelineStart: Date,
  timelineEnd: Date,
  epicIndex: number
) => {
  const totalDays = Math.max(1, differenceInDays(timelineEnd, timelineStart));
  const laneOffset = Math.min(Math.max(0, totalDays - 14), epicIndex * 14 + taskIndex * 7);
  const taskStart = addDays(timelineStart, laneOffset);
  const taskEnd = addDays(taskStart, 14);

  return {
    planned_start_date: format(taskStart, "yyyy-MM-dd"),
    planned_end_date: format(taskEnd, "yyyy-MM-dd"),
  };
};

const TimelineGrid = ({
  epics,
  dependencies: _dependencies,
  taskDependencies,
  timelineMode,
  scrollRequest,
  onOverflowChange,
  onUpdateEpicDates,
  onUpdateTaskDates,
  onMoveTaskToEpic,
  onCreateTask,
  onCreateDependency,
  onDeleteDependency,
  onCreateTaskDependency,
  onDeleteTaskDependency,
  showChildLevelIssues,
  readOnly = false,
}: TimelineGridProps) => {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const today = new Date();
  const { timelineStart, timelineEnd } = getRoadmapTimelineRange(timelineMode, epics, today);

  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<ConnectionEndpoint | null>(null);
  const [connectionSourcePoint, setConnectionSourcePoint] = useState({ x: 0, y: 0 });
  const [connectionCursor, setConnectionCursor] = useState({ x: 0, y: 0 });
  const [hoveredConnectionTarget, setHoveredConnectionTarget] = useState<RoadmapBarTarget | null>(null);
  const [dragOverEpicId, setDragOverEpicId] = useState<string | null>(null);
  const [collapsedEpicIds, setCollapsedEpicIds] = useState<Set<string>>(new Set());
  const [creatingInputEpicId, setCreatingInputEpicId] = useState<string | null>(null);
  const [draftTaskTitles, setDraftTaskTitles] = useState<Record<string, string>>({});
  const [creatingTaskEpicIds, setCreatingTaskEpicIds] = useState<Set<string>>(new Set());
  const [connectionWarning, setConnectionWarning] = useState("");
  const colorsById = useMemo(
    () =>
      Object.fromEntries(
        epics.flatMap((epic) => [
          [
            epic.id,
            epic.color || epic.phase_color || theme.palette.primary.main,
          ],
          ...(epic.connected_tasks ?? []).map((task) => [task.id, theme.palette.primary.main]),
        ])
      ),
    [epics, theme.palette.primary.main]
  );
  const activeConnectionColor = connectionStart
    ? colorsById[connectionStart.id] ?? theme.palette.warning.main
    : theme.palette.warning.main;
  const dependencyLines = useMemo<RoadmapDependencyLine[]>(
    () => [
      ..._dependencies.map((dependency) => ({
        id: `epic:${dependency.id}`,
        dependencyId: dependency.id,
        kind: "epic" as const,
        sourceId: dependency.depends_on_epic_id,
        targetId: dependency.epic_id,
      })),
      ...taskDependencies.map((dependency) => ({
        id: `task:${dependency.id}`,
        dependencyId: dependency.id,
        kind: "task" as const,
        sourceId: dependency.depends_on_task_id,
        targetId: dependency.task_id,
      })),
    ],
    [_dependencies, taskDependencies]
  );

  const timelineMonths = Array.from({ length: TIMELINE_MONTHS }, (_, index) => {
    const monthStart = startOfMonth(addMonths(timelineStart, index));
    const visibleStart = monthStart < timelineStart ? timelineStart : monthStart;
    const monthEnd = endOfMonth(monthStart);
    const visibleEnd = monthEnd > timelineEnd ? timelineEnd : monthEnd;
    const visibleDays = differenceInDays(visibleEnd, visibleStart) + 1;

    return {
      type: "month" as const,
      label: format(monthStart, "MMM yyyy", { locale: es }).toUpperCase(),
      start: monthStart,
      end: monthEnd,
      width: visibleDays * MONTH_DAY_WIDTH,
    };
  });

  const timelineDays = Array.from({ length: TIMELINE_WEEKS * 7 }, (_, index) => {
    const day = addDays(timelineStart, index);
    return {
      type: "day" as const,
      label: format(day, "EEEEE", { locale: es }).toUpperCase(),
      dayNumber: format(day, "d"),
      monthLabel: format(day, "MMM", { locale: es }).toUpperCase(),
      start: day,
      end: day,
      width: DAY_WIDTH,
      weekIndex: Math.floor(index / 7),
      isWeekStart: index % 7 === 0,
    };
  });

  const timelineQuarters = getQuarterUnits(timelineStart, timelineEnd, QUARTER_DAY_WIDTH);
  const timelineUnits: TimelineUnit[] =
    timelineMode === "weeks" ? timelineDays : timelineMode === "months" ? timelineMonths : timelineQuarters;
  const timelineWidth = timelineUnits.reduce((sum, unit) => sum + unit.width, 0);
  const timelineAreaSx = {
    width: timelineWidth,
    minWidth: timelineWidth,
    flex: "0 0 auto",
    position: "relative",
    display: "flex",
  } as const;
  const timelineTotalDays = differenceInDays(timelineEnd, timelineStart) + 1;
  const todayOffsetPercent = (differenceInDays(today, timelineStart) / timelineTotalDays) * 100;
  const roadmapLayoutKey = useMemo(
    () =>
      epics
        .map((epic) => {
          const taskIds = (epic.connected_tasks ?? []).map((task) => task.id).join(",");
          const expandedState = collapsedEpicIds.has(epic.id) ? "collapsed" : "expanded";
          return `${epic.id}:${expandedState}:${taskIds}`;
        })
        .join("|"),
    [collapsedEpicIds, epics]
  );

  const scrollTimeline = (direction: "left" | "right") => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollBy({
      left:
        (timelineMode === "weeks"
          ? DAY_WIDTH * 7
          : timelineUnits[0]?.width ?? timelineWidth / Math.max(1, timelineUnits.length)) *
        (direction === "left" ? -1 : 1),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!scrollRequest) return;
    scrollTimeline(scrollRequest.direction);
  }, [scrollRequest]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const updateOverflow = () => {
      onOverflowChange(scrollContainer.scrollWidth > scrollContainer.clientWidth + 1);
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(scrollContainer);
    window.addEventListener("resize", updateOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [collapsedEpicIds, epics, onOverflowChange, timelineMode, timelineWidth]);

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("roadmap-bars-change"));

      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("roadmap-bars-change"));
      });
    });

    return () => window.cancelAnimationFrame(firstFrame);
  }, [creatingInputEpicId, roadmapLayoutKey, showChildLevelIssues, timelineMode, timelineWidth]);

  const getRoadmapBarFromPoint = (clientX: number, clientY: number): RoadmapBarTarget | null => {
    const element = document.elementFromPoint(clientX, clientY);
    const bar = element?.closest<HTMLElement>("[data-roadmap-bar]");
    const id = bar?.dataset.roadmapBar;
    if (!id) return null;

    return {
      id,
      type: bar.dataset.roadmapBarType === "task" ? "task" : "epic",
    };
  };

  useEffect(() => {
    if (!isDraggingConnection || !connectionStart) return;
    if (readOnly) return;

    const finishConnection = (target: RoadmapBarTarget | null) => {
      const finalTarget = target ?? hoveredConnectionTarget;

      if (!finalTarget || finalTarget.id === connectionStart.id) {
        setIsDraggingConnection(false);
        setConnectionStart(null);
        setHoveredConnectionTarget(null);
        return;
      }

      if (finalTarget.type !== connectionStart.type) {
        setConnectionWarning("Por ahora solo puedes conectar épica con épica o tarea con tarea.");
      } else if (connectionStart.type === "task") {
        void Promise.resolve(onCreateTaskDependency(finalTarget.id, connectionStart.id, "finish-to-start"))
          .catch((error) => {
            setConnectionWarning(getErrorMessage(error));
          })
          .finally(() => {
            window.requestAnimationFrame(() => {
              window.dispatchEvent(new Event("roadmap-bars-change"));
            });
          });
      } else {
        void Promise.resolve(onCreateDependency(finalTarget.id, connectionStart.id, "finish-to-start"))
          .catch((error) => {
            setConnectionWarning(getErrorMessage(error));
          })
          .finally(() => {
            window.requestAnimationFrame(() => {
              window.dispatchEvent(new Event("roadmap-bars-change"));
            });
          });
      }
      setIsDraggingConnection(false);
      setConnectionStart(null);
      setHoveredConnectionTarget(null);
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      setConnectionCursor({ x: event.clientX, y: event.clientY });
      const target = getRoadmapBarFromPoint(event.clientX, event.clientY);
      setHoveredConnectionTarget(
        target && target.id !== connectionStart.id && target.type === connectionStart.type ? target : null
      );
    };

    const handleMouseUp = (event: MouseEvent) => {
      finishConnection(getRoadmapBarFromPoint(event.clientX, event.clientY));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDraggingConnection(false);
        setConnectionStart(null);
        setHoveredConnectionTarget(null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [connectionStart, hoveredConnectionTarget, isDraggingConnection, onCreateDependency, onCreateTaskDependency, readOnly]);

  const epicsWithTimelineData = epics;

  const handleStartConnection = (
    barId: string,
    anchor: "start" | "end",
    _connectorId: string,
    cursor: { x: number; y: number },
    barType: "epic" | "task"
  ) => {
    if (readOnly) return;
    if (anchor === "start") {
      setIsDraggingConnection(false);
      setConnectionStart(null);
      setHoveredConnectionTarget(null);
      setConnectionWarning("Las dependencias se crean desde el fin de una caja hacia el inicio de otra.");
      return;
    }

    setIsDraggingConnection(true);
    setConnectionStart({ id: barId, anchor, type: barType });
    setConnectionSourcePoint(cursor);
    setConnectionCursor(cursor);
    setHoveredConnectionTarget(null);
  };

  const handleEndConnection = (
    toEpicId: string,
    _anchor: "start" | "end",
    _connectorId: string
  ) => {
    if (readOnly) return;
    if (connectionStart && connectionStart.id !== toEpicId) {
      void onCreateDependency(toEpicId, connectionStart.id, "finish-to-start");
    }
    setIsDraggingConnection(false);
    setConnectionStart(null);
  };

  const toggleEpicCollapsed = (epicId: string) => {
    setCollapsedEpicIds((current) => {
      const next = new Set(current);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  const handleEpicDragOver = (event: React.DragEvent, epicId: string) => {
    if (readOnly) return;
    if (!showChildLevelIssues) return;
    if (!Array.from(event.dataTransfer.types).includes(ROADMAP_TASK_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverEpicId(epicId);
  };

  const handleEpicDrop = (event: React.DragEvent, epicId: string) => {
    if (readOnly) return;
    if (!showChildLevelIssues) return;
    const taskId = event.dataTransfer.getData(ROADMAP_TASK_DRAG_TYPE);
    setDragOverEpicId(null);

    if (!taskId) return;
    event.preventDefault();
    onMoveTaskToEpic(taskId, epicId);
  };

  const handleCreateTask = async (epicId: string) => {
    const title = draftTaskTitles[epicId]?.trim();
    if (readOnly) return;
    if (!title || creatingTaskEpicIds.has(epicId)) return;

    setCreatingTaskEpicIds((current) => new Set(current).add(epicId));
    try {
      await onCreateTask(epicId, title);
      setDraftTaskTitles((current) => ({ ...current, [epicId]: "" }));
      setCreatingInputEpicId(null);
      setCollapsedEpicIds((current) => {
        const next = new Set(current);
        next.delete(epicId);
        return next;
      });
    } finally {
      setCreatingTaskEpicIds((current) => {
        const next = new Set(current);
        next.delete(epicId);
        return next;
      });
    }
  };

  const renderTaskRow = (task: RoadmapTask, taskIndex: number, epicIndex: number) => {
    const fallbackDates = getDefaultTaskDates(taskIndex, timelineStart, timelineEnd, epicIndex);
    const taskStart = task.planned_start_date ?? task.sprint_start_date ?? fallbackDates.planned_start_date;
    const taskEnd = task.planned_end_date ?? task.sprint_end_date ?? fallbackDates.planned_end_date;

    return (
      <Box
        key={task.id}
        sx={{
          display: "flex",
          minHeight: 42,
          bgcolor: alpha(theme.palette.background.paper, 0.62),
          borderTop: 1,
          borderColor: "divider",
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        <Box
          sx={{
            width: LEFT_PANEL_WIDTH,
            flexShrink: 0,
            position: "sticky",
            left: 0,
            zIndex: 45,
            pl: 6,
            pr: 1.5,
            py: 0.75,
            borderRight: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            minWidth: 0,
            bgcolor: theme.palette.background.paper,
            overflow: "hidden",
            boxShadow: LEFT_PANEL_SHADOW,
          }}
        >
          <CheckBoxIcon sx={{ color: "primary.main", fontSize: 18, flexShrink: 0 }} />

          <Typography variant="body2" fontWeight={700} color="primary" noWrap sx={{ minWidth: 74 }}>
            {task.task_id_display || "TASK"}
          </Typography>

          <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {task.title}
          </Typography>

          <Chip
            label={task.column_name || "Por hacer"}
            size="small"
            sx={{
              height: 22,
              maxWidth: 94,
              fontWeight: 700,
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              "& .MuiChip-label": {
                px: 0.75,
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {task.assignee_id ? (
              <UserAvatar userId={task.assignee_id} size={24} showTooltip={false} />
            ) : (
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                  color: "text.disabled",
                }}
              >
                <PersonIcon sx={{ fontSize: 16 }} />
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={timelineAreaSx}>
          <TimelineColumns theme={theme} timelineMode={timelineMode} units={timelineUnits} />
          <TodayMarker offsetPercent={todayOffsetPercent} />

          <TimelineBar
            id={task.id}
            label={task.task_id_display ? `${task.task_id_display} ${task.title}` : task.title}
            color={theme.palette.primary.main}
            startDate={taskStart}
            endDate={taskEnd}
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
            height={28}
            barType="task"
            onUpdateDates={onUpdateTaskDates}
            connectors={{
              enabled: true,
              isDraggingConnection,
              draggingFromId: connectionStart?.id ?? null,
              hoveredTargetId: hoveredConnectionTarget?.id ?? null,
              onStartConnection: handleStartConnection,
              onEndConnection: handleEndConnection,
            }}
            connectionVisual={{
              active: isDraggingConnection,
              sourceId: connectionStart?.id ?? null,
              targetId: hoveredConnectionTarget?.id ?? null,
            }}
            onConnectionTargetChange={setHoveredConnectionTarget}
            verticalDrag={{
              dataType: ROADMAP_TASK_DRAG_TYPE,
              data: task.id,
              label: "Mover tarea entre épicas",
            }}
            readOnly={readOnly}
          />
        </Box>
      </Box>
    );
  };

  const renderCreateTaskRow = (epic: EpicWithDetails) => {
    if (creatingInputEpicId !== epic.id) return null;

    const value = draftTaskTitles[epic.id] ?? "";
    const isCreating = creatingTaskEpicIds.has(epic.id);

    return (
      <Box
        key={`${epic.id}-create-task`}
        sx={{
          display: "flex",
          minHeight: 42,
          bgcolor: alpha(theme.palette.background.paper, 0.82),
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: LEFT_PANEL_WIDTH,
            flexShrink: 0,
            position: "sticky",
            left: 0,
            zIndex: 45,
            pl: 6,
            pr: 1.5,
            py: 0.5,
            borderRight: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: theme.palette.background.paper,
            overflow: "hidden",
            boxShadow: LEFT_PANEL_SHADOW,
          }}
        >
          <IconButton
            size="small"
            disabled={!value.trim() || isCreating || readOnly}
            onClick={() => void handleCreateTask(epic.id)}
            aria-label="Crear tarea en épica"
            sx={{
              width: 28,
              height: 28,
              color: "primary.main",
            }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <TextField
            size="small"
            fullWidth
            value={value}
            disabled={isCreating}
            placeholder="¿Qué hay que hacer?"
            onChange={(event) =>
              setDraftTaskTitles((current) => ({
                ...current,
                [epic.id]: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreateTask(epic.id);
              } else if (event.key === "Escape") {
                setCreatingInputEpicId(null);
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 34,
                borderRadius: 1,
                bgcolor: "background.paper",
              },
            }}
          />
        </Box>

        <Box sx={timelineAreaSx}>
          <TimelineColumns theme={theme} timelineMode={timelineMode} units={timelineUnits} />
          <TodayMarker offsetPercent={todayOffsetPercent} />
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ position: "relative", width: "100%", maxWidth: "100%", minWidth: 0, height: "100%" }}>
      <Box
        ref={scrollContainerRef}
        sx={{
          overflow: "auto",
          height: "100%",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          position: "relative",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
      <RoadmapDependencyLayer
        dependencies={dependencyLines}
        scrollContainerRef={scrollContainerRef}
        refreshKey={`${timelineMode}:${timelineWidth}:${roadmapLayoutKey}:${creatingInputEpicId ?? ""}:${showChildLevelIssues}`}
        color={theme.palette.error.main}
        previewColor={theme.palette.warning.main}
        colorsById={colorsById}
        onDeleteDependency={(dependencyId, kind) => {
          if (kind === "task") {
            onDeleteTaskDependency(dependencyId);
          } else {
            onDeleteDependency(dependencyId);
          }
        }}
      />
      <Box
        sx={{
          display: "flex",
          borderBottom: 2,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          bgcolor: "background.paper",
          zIndex: 50,
        }}
      >
        <TimelineLeftHeader theme={theme} />

        <TimelineHeader theme={theme} timelineMode={timelineMode} units={timelineUnits} today={today} />
      </Box>

      <Box sx={{ position: "relative" }}>
        {epicsWithTimelineData.map((epic, epicIndex) => {
          const tasks = epic.connected_tasks ?? [];
          const isDragOver = dragOverEpicId === epic.id;
          const isExpanded = !collapsedEpicIds.has(epic.id);

          return (
            <Box
              key={epic.id}
              onDragOver={(event) => handleEpicDragOver(event, epic.id)}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragOverEpicId((current) => (current === epic.id ? null : current));
                }
              }}
              onDrop={(event) => handleEpicDrop(event, epic.id)}
              sx={{
                borderBottom: 1,
                borderColor: isDragOver ? "primary.main" : "divider",
                bgcolor: isDragOver ? alpha(theme.palette.primary.main, 0.08) : "transparent",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  minHeight: 52,
                  bgcolor: isExpanded
                    ? alpha(theme.palette.primary.main, 0.07)
                    : epicIndex % 2 === 0
                      ? "background.paper"
                      : "action.hover",
                  "&:hover": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                <Box
                  sx={{
                    width: LEFT_PANEL_WIDTH,
                    flexShrink: 0,
                    position: "sticky",
                    left: 0,
                    zIndex: 45,
                    px: 1.5,
                    py: 1,
                    borderRight: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    minWidth: 0,
                    bgcolor: isExpanded
                      ? theme.palette.mode === "dark"
                        ? theme.palette.primary.dark
                        : theme.palette.primary.light
                      : epicIndex % 2 === 0
                        ? theme.palette.background.paper
                        : theme.palette.action.hover,
                    overflow: "hidden",
                    boxShadow: LEFT_PANEL_SHADOW,
                  }}
                >
                  {showChildLevelIssues ? (
                    <IconButton
                      size="small"
                      onClick={() => toggleEpicCollapsed(epic.id)}
                      aria-label={isExpanded ? "Contraer épica" : "Expandir épica"}
                      sx={{
                        width: 28,
                        height: 28,
                        color: "text.secondary",
                      }}
                    >
                      {isExpanded ? (
                        <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />
                      ) : (
                        <KeyboardArrowRightIcon sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                  ) : (
                    <Box sx={{ width: 28, height: 28, flexShrink: 0 }} />
                  )}
                  <Chip
                    label={epic.epic_id_display || "ÉPICAs"}
                    size="small"
                    sx={{
                      bgcolor: alpha(epic.color || theme.palette.primary.main, 0.16),
                      color: "text.primary",
                      fontWeight: 700,
                      height: 22,
                      flexShrink: 0,
                    }}
                  />
                  <Stack minWidth={0} flex={1}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {epic.name}
                    </Typography>
                    {showChildLevelIssues && (
                      <Typography variant="caption" color="text.secondary">
                        {tasks.length} tarea{tasks.length === 1 ? "" : "s"}
                      </Typography>
                    )}
                  </Stack>
                  {showChildLevelIssues && (
                    <IconButton
                      size="small"
                      disabled={readOnly}
                      onClick={() => {
                        if (readOnly) return;
                        setCreatingInputEpicId((current) => (current === epic.id ? null : epic.id));
                        setCollapsedEpicIds((current) => {
                          const next = new Set(current);
                          next.delete(epic.id);
                          return next;
                        });
                      }}
                      aria-label="Agregar tarea a épica"
                      sx={{
                        width: 30,
                        height: 30,
                        color: "text.secondary",
                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                        flexShrink: 0,
                        "&:hover": {
                          color: "primary.main",
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                        },
                      }}
                    >
                      <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  )}
                </Box>

                <Box sx={timelineAreaSx}>
                  <TimelineColumns theme={theme} timelineMode={timelineMode} units={timelineUnits} />
                  <TodayMarker offsetPercent={todayOffsetPercent} />
                  <EpicBar
                    epic={epic}
                    monthStart={timelineStart}
                    monthEnd={timelineEnd}
                    onUpdateDates={onUpdateEpicDates}
                    isDraggingConnection={isDraggingConnection}
                    hoveredConnectionTargetId={hoveredConnectionTarget?.id ?? null}
                    onConnectionTargetChange={setHoveredConnectionTarget}
                    onStartConnection={handleStartConnection}
                    onEndConnection={handleEndConnection}
                    draggingFromEpic={connectionStart?.id ?? null}
                    readOnly={readOnly}
                  />
                </Box>
              </Box>

              {showChildLevelIssues && isExpanded ? (
                <>
                  {tasks.map((task, taskIndex) => renderTaskRow(task, taskIndex, epicIndex))}
                  {renderCreateTaskRow(epic)}
                </>
              ) : null}
            </Box>
          );
        })}

        {epicsWithTimelineData.length === 0 && <TimelineEmptyState theme={theme} />}
      </Box>

      </Box>

      {isDraggingConnection && connectionStart ? (
        <Box
          component="svg"
          sx={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: theme.zIndex.modal + 1,
          }}
        >
          <defs>
            <marker
              id="roadmap-preview-arrow"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 12 6 L 0 12 z" fill={activeConnectionColor} />
            </marker>
          </defs>
          <path
            d={getDragPreviewPath(connectionSourcePoint, connectionCursor)}
            fill="none"
            stroke={activeConnectionColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
            markerEnd="url(#roadmap-preview-arrow)"
          />
        </Box>
      ) : null}

      <Snackbar
        open={Boolean(connectionWarning)}
        autoHideDuration={4200}
        onClose={() => setConnectionWarning("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setConnectionWarning("")} sx={{ width: "100%" }}>
          {connectionWarning}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TimelineGrid;
