import { useTheme } from "@mui/material/styles";
import { addDays, format } from "date-fns";
import type { EpicWithDetails } from "../../../features/api/epicService";
import TimelineBar from "./TimelineBar";

type EpicBarProps = {
  epic: EpicWithDetails;
  monthStart: Date;
  monthEnd: Date;
  onUpdateDates: (epicId: string, startDate: string, endDate: string) => void;
  isDraggingConnection: boolean;
  hoveredConnectionTargetId: string | null;
  onConnectionTargetChange: (target: { id: string; type: "epic" | "task" } | null) => void;
  onStartConnection: (
    epicId: string,
    anchor: "start" | "end",
    connectorId: string,
    cursor: { x: number; y: number },
    barType: "epic" | "task"
  ) => void;
  onEndConnection: (epicId: string, anchor: "start" | "end", connectorId: string) => void;
  draggingFromEpic: string | null;
};

const EpicBar = ({
  epic,
  monthStart,
  monthEnd,
  onUpdateDates,
  isDraggingConnection,
  hoveredConnectionTargetId,
  onConnectionTargetChange,
  onStartConnection,
  onEndConnection,
  draggingFromEpic,
}: EpicBarProps) => {
  const theme = useTheme();
  const color = epic.color || epic.phase_color || theme.palette.primary.main;
  const fallbackEnd = addDays(monthStart, 10) > monthEnd ? monthEnd : addDays(monthStart, 10);
  const startDate = epic.start_date ?? format(monthStart, "yyyy-MM-dd");
  const endDate = epic.end_date ?? format(fallbackEnd, "yyyy-MM-dd");

  return (
    <TimelineBar
      id={epic.id}
      label={epic.epic_id_display ? `${epic.epic_id_display} ${epic.name}` : epic.name}
      color={color}
      startDate={startDate}
      endDate={endDate}
      timelineStart={monthStart}
      timelineEnd={monthEnd}
      height={30}
      barType="epic"
      onUpdateDates={onUpdateDates}
      connectors={{
        enabled: true,
        isDraggingConnection,
        draggingFromId: draggingFromEpic,
        hoveredTargetId: hoveredConnectionTargetId,
        onStartConnection,
        onEndConnection,
      }}
      connectionVisual={{
        active: isDraggingConnection,
        sourceId: draggingFromEpic,
        targetId: hoveredConnectionTargetId,
      }}
      onConnectionTargetChange={onConnectionTargetChange}
    />
  );
};

export default EpicBar;
