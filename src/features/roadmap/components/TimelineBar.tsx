import { Box, Tooltip, Typography } from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LinkIcon from "@mui/icons-material/Link";
import { alpha, useTheme } from "@mui/material/styles";
import { addDays, differenceInDays, format, isValid, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

type TimelineBarProps = {
  id: string;
  label: string;
  color: string;
  startDate: string | null;
  endDate: string | null;
  timelineStart: Date;
  timelineEnd: Date;
  height?: number;
  top?: string | number;
  barType?: "epic" | "task";
  onUpdateDates: (id: string, startDate: string, endDate: string) => void;
  connectors?: {
    enabled: boolean;
    isDraggingConnection: boolean;
    draggingFromId: string | null;
    hoveredTargetId: string | null;
    onStartConnection: (
      id: string,
      anchor: "start" | "end",
      connectorId: string,
      cursor: { x: number; y: number },
      barType: "epic" | "task"
    ) => void;
    onEndConnection: (id: string, anchor: "start" | "end", connectorId: string) => void;
  };
  connectionVisual?: {
    active: boolean;
    sourceId: string | null;
    targetId: string | null;
  };
  onConnectionTargetChange?: (target: { id: string; type: "epic" | "task" } | null) => void;
  verticalDrag?: {
    dataType: string;
    data: string;
    label: string;
  };
};

const parseRoadmapDate = (value: string | null) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
};

const TimelineBar = ({
  id,
  label,
  color,
  startDate,
  endDate,
  timelineStart,
  timelineEnd,
  height = 44,
  top = "50%",
  barType,
  onUpdateDates,
  connectors,
  connectionVisual,
  onConnectionTargetChange,
  verticalDrag,
}: TimelineBarProps) => {
  const theme = useTheme();
  const resolvedBarType = barType ?? (verticalDrag ? "task" : "epic");
  const [isResizingStart, setIsResizingStart] = useState(false);
  const [isResizingEnd, setIsResizingEnd] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipDate, setTooltipDate] = useState<Date | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const originalStartDate = useRef<Date | null>(null);
  const originalEndDate = useRef<Date | null>(null);

  const requestDependencyLayerMeasure = () => {
    window.dispatchEvent(new Event("roadmap-bars-change"));
  };

  const barStart = tempStartDate || parseRoadmapDate(startDate);
  const barEnd = tempEndDate || parseRoadmapDate(endDate);
  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;

  const calculateDateFromX = (clientX: number): Date => {
    if (!containerRef.current) return timelineStart;

    const timelineContainer = containerRef.current.parentElement;
    if (!timelineContainer) return timelineStart;

    const rect = timelineContainer.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentX = Math.max(0, Math.min(1, relativeX / rect.width));
    const daysFromStart = Math.min(totalDays - 1, Math.max(0, Math.floor(percentX * totalDays)));

    return addDays(timelineStart, daysFromStart);
  };

  useEffect(() => {
    if (!barStart || !barEnd) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;

      if (isResizingStart) {
        const newDate = calculateDateFromX(event.clientX);
        if (newDate < barEnd) {
          setTempStartDate(newDate);
          setTooltipDate(newDate);
          setTooltipPosition({ x: event.clientX, y: event.clientY });
          requestDependencyLayerMeasure();
        }
      } else if (isResizingEnd) {
        const newDate = calculateDateFromX(event.clientX);
        if (newDate > barStart) {
          setTempEndDate(newDate);
          setTooltipDate(newDate);
          setTooltipPosition({ x: event.clientX, y: event.clientY });
          requestDependencyLayerMeasure();
        }
      } else if (isDragging && originalStartDate.current && originalEndDate.current) {
        const timelineContainer = containerRef.current.parentElement;
        if (!timelineContainer) return;

        const deltaX = event.clientX - dragStartX.current;
        const rect = timelineContainer.getBoundingClientRect();
        const dayWidth = rect.width / totalDays;
        const deltaDays = Math.round(deltaX / dayWidth);

        const newStart = addDays(originalStartDate.current, deltaDays);
        const newEnd = addDays(originalEndDate.current, deltaDays);

        if (newStart >= timelineStart && newEnd <= timelineEnd) {
          setTempStartDate(newStart);
          setTempEndDate(newEnd);
          setTooltipDate(newStart);
          setTooltipPosition({ x: event.clientX, y: event.clientY });
          requestDependencyLayerMeasure();
        }
      }
    };

    const handleMouseUp = () => {
      if (tempStartDate && tempEndDate) {
        onUpdateDates(id, format(tempStartDate, "yyyy-MM-dd"), format(tempEndDate, "yyyy-MM-dd"));
      }

      setIsResizingStart(false);
      setIsResizingEnd(false);
      setIsDragging(false);
      setTooltipDate(null);
      setTempStartDate(null);
      setTempEndDate(null);
      originalStartDate.current = null;
      originalEndDate.current = null;
      requestDependencyLayerMeasure();
    };

    if (isResizingStart || isResizingEnd || isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    barEnd,
    barStart,
    id,
    isDragging,
    isResizingEnd,
    isResizingStart,
    onUpdateDates,
    tempEndDate,
    tempStartDate,
    timelineEnd,
    timelineStart,
    totalDays,
  ]);

  if (!startDate || !endDate || !barStart || !barEnd) return null;
  if (barEnd < timelineStart || barStart > timelineEnd) return null;

  const visibleStart = barStart < timelineStart ? timelineStart : barStart;
  const visibleEnd = barEnd > timelineEnd ? timelineEnd : barEnd;
  const startOffset = differenceInDays(visibleStart, timelineStart);
  const duration = differenceInDays(visibleEnd, visibleStart) + 1;
  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = (duration / totalDays) * 100;
  const connectorActiveColor = theme.palette.warning.main;
  const barTextColor = theme.palette.getContrastText(color);
  const showConnectors = connectors?.enabled && isHovering;
  const isConnectionSource = connectionVisual?.active && connectionVisual.sourceId === id;
  const isConnectionTarget = connectionVisual?.active && connectionVisual.targetId === id;
  const isConnectionDimmed =
    connectionVisual?.active && !isConnectionSource && !isConnectionTarget;
  const startConnectorId = `${id}-connector-start`;
  const endConnectorId = `${id}-connector-end`;

  const handleMouseDownStart = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsResizingStart(true);
    setTempStartDate(barStart);
    setTempEndDate(barEnd);
    setTooltipDate(barStart);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseDownEnd = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsResizingEnd(true);
    setTempStartDate(barStart);
    setTempEndDate(barEnd);
    setTooltipDate(barEnd);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseDownDrag = (event: React.MouseEvent) => {
    if (connectors?.isDraggingConnection) return;
    event.stopPropagation();
    setIsDragging(true);
    dragStartX.current = event.clientX;
    originalStartDate.current = barStart;
    originalEndDate.current = barEnd;
    setTempStartDate(barStart);
    setTempEndDate(barEnd);
    setTooltipDate(barStart);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleVerticalDragStart = (event: React.DragEvent) => {
    if (!verticalDrag) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(verticalDrag.dataType, verticalDrag.data);
  };

  const handleConnectorClick = (
    event: React.MouseEvent,
    anchor: "start" | "end",
    connectorId: string
  ) => {
    event.stopPropagation();
    event.preventDefault();
    if (!connectors?.enabled) return;

    if (!connectors.isDraggingConnection) {
      connectors.onStartConnection(id, anchor, connectorId, { x: event.clientX, y: event.clientY }, resolvedBarType);
    }
  };

  const handleBarMouseEnter = () => {
    setIsHovering(true);
    if (connectionVisual?.active && connectionVisual.sourceId !== id) {
      onConnectionTargetChange?.({ id, type: resolvedBarType });
    }
  };

  const handleBarMouseLeave = () => {
    setIsHovering(false);
    if (connectionVisual?.active && connectionVisual.targetId === id) {
      onConnectionTargetChange?.(null);
    }
  };

  return (
    <Box sx={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <Box
        ref={containerRef}
        data-roadmap-bar={id}
        data-roadmap-bar-type={resolvedBarType}
        onMouseEnter={handleBarMouseEnter}
        onMouseLeave={handleBarMouseLeave}
        onMouseDown={handleMouseDownDrag}
        sx={{
          position: "absolute",
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          height,
          top,
          transform: "translateY(-50%)",
          bgcolor: color,
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          minWidth: 72,
          px: 1,
          zIndex: 4,
          cursor: isDragging ? "grabbing" : "grab",
          opacity: isDragging || isResizingStart || isResizingEnd ? 0.7 : isConnectionDimmed ? 0.24 : 1,
          transition: isDragging || isResizingStart || isResizingEnd ? "none" : "opacity 0.16s",
          boxShadow: 2,
          "&:hover": {
            opacity: isConnectionDimmed ? 0.24 : 0.9,
          },
        }}
      >
        {connectors?.enabled && (
          <Tooltip title="Conectar desde el inicio" placement="top">
            <Box
              id={startConnectorId}
              onMouseDown={(event) => handleConnectorClick(event, "start", startConnectorId)}
              sx={{
                position: "absolute",
                left: -10,
                top: -10,
                width: 22,
                height: 22,
                borderRadius: "50%",
                bgcolor: connectors.draggingFromId === id ? connectorActiveColor : theme.palette.background.paper,
                border: "2px solid",
                borderColor: connectorActiveColor,
                color: connectorActiveColor,
                cursor: "crosshair",
                zIndex: 100,
                display: "grid",
                placeItems: "center",
                visibility: showConnectors ? "visible" : "hidden",
                opacity: showConnectors ? 1 : 0,
                boxShadow: 2,
                "&:hover": {
                  bgcolor: connectorActiveColor,
                  color: theme.palette.getContrastText(connectorActiveColor),
                  transform: "scale(1.12)",
                },
              }}
            >
              <LinkIcon sx={{ fontSize: 13 }} />
            </Box>
          </Tooltip>
        )}

        <Box
          onMouseDown={handleMouseDownStart}
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            cursor: "ew-resize",
            bgcolor: alpha(theme.palette.common.black, 0.3),
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&:hover": {
              bgcolor: alpha(theme.palette.common.black, 0.5),
            },
          }}
        >
          <Box sx={{ width: 2, height: 16, bgcolor: alpha(barTextColor, 0.65), borderRadius: 1 }} />
        </Box>

        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            color: barTextColor,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            px: 2,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {label}
        </Typography>

        {verticalDrag && (
          <Tooltip title={verticalDrag.label}>
            <Box
              draggable
              onDragStart={handleVerticalDragStart}
              onMouseDown={(event) => event.stopPropagation()}
              sx={{
                width: 22,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: alpha(barTextColor, 0.8),
                cursor: "grab",
                flexShrink: 0,
                "&:active": {
                  cursor: "grabbing",
                },
              }}
            >
              <DragIndicatorIcon sx={{ fontSize: 16 }} />
            </Box>
          </Tooltip>
        )}

        <Box
          onMouseDown={handleMouseDownEnd}
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 12,
            cursor: "ew-resize",
            bgcolor: alpha(theme.palette.common.black, 0.3),
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&:hover": {
              bgcolor: alpha(theme.palette.common.black, 0.5),
            },
          }}
        >
          <Box sx={{ width: 2, height: 16, bgcolor: alpha(barTextColor, 0.65), borderRadius: 1 }} />
        </Box>

        {connectors?.enabled && (
          <Tooltip title="Conectar desde el fin" placement="bottom">
            <Box
              id={endConnectorId}
              onMouseDown={(event) => handleConnectorClick(event, "end", endConnectorId)}
              sx={{
                position: "absolute",
                right: -10,
                bottom: -10,
                width: 22,
                height: 22,
                borderRadius: "50%",
                bgcolor: connectors.draggingFromId === id ? connectorActiveColor : theme.palette.background.paper,
                border: "2px solid",
                borderColor: connectorActiveColor,
                color: connectorActiveColor,
                cursor: "crosshair",
                zIndex: 100,
                display: "grid",
                placeItems: "center",
                visibility: showConnectors ? "visible" : "hidden",
                opacity: showConnectors ? 1 : 0,
                boxShadow: 2,
                "&:hover": {
                  bgcolor: connectorActiveColor,
                  color: theme.palette.getContrastText(connectorActiveColor),
                  transform: "scale(1.12)",
                },
              }}
            >
              <LinkIcon sx={{ fontSize: 13 }} />
            </Box>
          </Tooltip>
        )}
      </Box>

      {tooltipDate && (
        <Box
          sx={{
            position: "fixed",
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 35,
            bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[100] : theme.palette.grey[900],
            color: theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
            px: 2,
            py: 1,
            borderRadius: 1,
            fontSize: 13,
            fontWeight: 600,
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: 3,
            whiteSpace: "nowrap",
          }}
        >
          {format(tooltipDate, "d MMM yyyy", { locale: es })}
        </Box>
      )}
    </Box>
  );
};

export default TimelineBar;
