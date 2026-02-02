import { Box, Typography, Tooltip } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useXarrow } from "react-xarrows";
import type { EpicWithDetails } from "../../../features/api/epicService";

type EpicBarProps = {
  epic: EpicWithDetails;
  monthStart: Date;
  monthEnd: Date;
  onUpdateDates: (epicId: string, startDate: string, endDate: string) => void;
  isDraggingConnection: boolean;
  onStartConnection: (epicId: string) => void;
  onEndConnection: (epicId: string) => void;
  draggingFromEpic: string | null;
};

const EpicBar = ({ 
  epic, 
  monthStart, 
  monthEnd, 
  onUpdateDates, 
  isDraggingConnection,
  onStartConnection,
  onEndConnection,
  draggingFromEpic
}: EpicBarProps) => {
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

  const updateXarrow = useXarrow();

  const epicStart = tempStartDate || (epic.start_date ? new Date(epic.start_date) : null);
  const epicEnd = tempEndDate || (epic.end_date ? new Date(epic.end_date) : null);

  const totalDays = differenceInDays(monthEnd, monthStart) + 1;

  const calculateDateFromX = (clientX: number): Date => {
    if (!containerRef.current) return monthStart;
    
    const timelineContainer = containerRef.current.parentElement;
    if (!timelineContainer) return monthStart;
    
    const rect = timelineContainer.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentX = Math.max(0, Math.min(1, relativeX / rect.width));
    const daysFromStart = Math.round(percentX * totalDays);
    
    return addDays(monthStart, daysFromStart);
  };

  useEffect(() => {
    if (!epicStart || !epicEnd) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isResizingStart) {
        const newDate = calculateDateFromX(e.clientX);
        if (newDate < epicEnd) {
          setTempStartDate(newDate);
          setTooltipDate(newDate);
          setTooltipPosition({ x: e.clientX, y: e.clientY });
          updateXarrow();
        }
      } else if (isResizingEnd) {
        const newDate = calculateDateFromX(e.clientX);
        if (newDate > epicStart) {
          setTempEndDate(newDate);
          setTooltipDate(newDate);
          setTooltipPosition({ x: e.clientX, y: e.clientY });
          updateXarrow();
        }
      } else if (isDragging && originalStartDate.current && originalEndDate.current) {
        const timelineContainer = containerRef.current.parentElement;
        if (!timelineContainer) return;

        const deltaX = e.clientX - dragStartX.current;
        const rect = timelineContainer.getBoundingClientRect();
        const deltaPercent = deltaX / rect.width;
        const deltaDays = Math.round(deltaPercent * totalDays);

        const newStart = addDays(originalStartDate.current, deltaDays);
        const newEnd = addDays(originalEndDate.current, deltaDays);

        if (newStart >= monthStart && newEnd <= monthEnd) {
          setTempStartDate(newStart);
          setTempEndDate(newEnd);
          setTooltipDate(newStart);
          setTooltipPosition({ x: e.clientX, y: e.clientY });
          updateXarrow();
        }
      }
    };

    const handleMouseUp = () => {
      if (tempStartDate && tempEndDate) {
        onUpdateDates(
          epic.id,
          format(tempStartDate, "yyyy-MM-dd"),
          format(tempEndDate, "yyyy-MM-dd")
        );
      }

      setIsResizingStart(false);
      setIsResizingEnd(false);
      setIsDragging(false);
      setTooltipDate(null);
      setTempStartDate(null);
      setTempEndDate(null);
      originalStartDate.current = null;
      originalEndDate.current = null;
    };

    if (isResizingStart || isResizingEnd || isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingStart, isResizingEnd, isDragging, epic.id, epicStart, epicEnd, monthStart, monthEnd, totalDays, tempStartDate, tempEndDate, onUpdateDates, updateXarrow]);

  if (!epic.start_date || !epic.end_date || !epicStart || !epicEnd) return null;

  const startOffset = differenceInDays(epicStart, monthStart);
  const duration = differenceInDays(epicEnd, epicStart) + 1;

  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = (duration / totalDays) * 100;

  const handleMouseDownStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingStart(true);
    setTempStartDate(epicStart);
    setTempEndDate(epicEnd);
    setTooltipDate(epicStart);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDownEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingEnd(true);
    setTempStartDate(epicStart);
    setTempEndDate(epicEnd);
    setTooltipDate(epicEnd);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (isDraggingConnection) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    originalStartDate.current = epicStart;
    originalEndDate.current = epicEnd;
    setTempStartDate(epicStart);
    setTempEndDate(epicEnd);
    setTooltipDate(epicStart);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleConnectorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingConnection && draggingFromEpic && draggingFromEpic !== epic.id) {
      onEndConnection(epic.id);
    } else if (!isDraggingConnection) {
      onStartConnection(epic.id);
    }
  };

  const showConnectors = isHovering || isDraggingConnection;

  return (
    <Box sx={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <Box
        ref={containerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        sx={{
          position: "absolute",
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          height: 48,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: epic.phase_color || "#3B82F6",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          px: 1,
          cursor: isDragging ? "grabbing" : "grab",
          opacity: isDragging || isResizingStart || isResizingEnd ? 0.7 : 1,
          transition: isDragging || isResizingStart || isResizingEnd ? "none" : "opacity 0.2s",
          "&:hover": {
            opacity: 0.9,
          },
          boxShadow: 2,
        }}
        onMouseDown={handleMouseDownDrag}
      >
        <Tooltip title="Conectar épica" placement="left">
          <Box
            id={`${epic.id}-left`}
            onClick={handleConnectorClick}
            sx={{
              position: "absolute",
              left: -6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: draggingFromEpic === epic.id ? "#4CAF50" : "white",
              border: "2px solid",
              borderColor: epic.phase_color || "#3B82F6",
              cursor: "crosshair",
              zIndex: 100,
              transition: "all 0.2s",
              visibility: showConnectors ? "visible" : "hidden",
              opacity: showConnectors ? 1 : 0,
              "&:hover": {
                bgcolor: "#4CAF50",
                transform: "translateY(-50%) scale(1.3)",
              },
            }}
          />
        </Tooltip>

        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            cursor: "ew-resize",
            bgcolor: "rgba(0,0,0,0.3)",
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&:hover": {
              bgcolor: "rgba(0,0,0,0.5)",
            },
          }}
          onMouseDown={handleMouseDownStart}
        >
          <Box
            sx={{
              width: 2,
              height: 16,
              bgcolor: "rgba(255,255,255,0.6)",
              borderRadius: 1,
            }}
          />
        </Box>

        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            color: "white",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            px: 2,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {epic.epic_id_display || epic.name}
        </Typography>

        <Box
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 12,
            cursor: "ew-resize",
            bgcolor: "rgba(0,0,0,0.3)",
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&:hover": {
              bgcolor: "rgba(0,0,0,0.5)",
            },
          }}
          onMouseDown={handleMouseDownEnd}
        >
          <Box
            sx={{
              width: 2,
              height: 16,
              bgcolor: "rgba(255,255,255,0.6)",
              borderRadius: 1,
            }}
          />
        </Box>

        <Tooltip title="Conectar épica" placement="right">
          <Box
            id={`${epic.id}-right`}
            onClick={handleConnectorClick}
            sx={{
              position: "absolute",
              right: -6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: draggingFromEpic === epic.id ? "#4CAF50" : "white",
              border: "2px solid",
              borderColor: epic.phase_color || "#3B82F6",
              cursor: "crosshair",
              zIndex: 100,
              transition: "all 0.2s",
              visibility: showConnectors ? "visible" : "hidden",
              opacity: showConnectors ? 1 : 0,
              "&:hover": {
                bgcolor: "#4CAF50",
                transform: "translateY(-50%) scale(1.3)",
              },
            }}
          />
        </Tooltip>
      </Box>

      {tooltipDate && (
        <Box
          sx={{
            position: "fixed",
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 35,
            bgcolor: "rgba(0, 0, 0, 0.9)",
            color: "white",
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

export default EpicBar;