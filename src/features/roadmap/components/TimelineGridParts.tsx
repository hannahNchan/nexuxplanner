import { Box, Stack, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { format } from "date-fns";
import {
  ROADMAP_TIMELINE_MONTHS,
  ROADMAP_TIMELINE_WEEKS,
  type RoadmapTimelineMode,
} from "../utils/timelineRange";

export const LEFT_PANEL_WIDTH = 520;
export const MONTH_DAY_WIDTH = 18;
export const QUARTER_DAY_WIDTH = 7;
export const DAY_WIDTH = 72;
export const ROADMAP_TASK_DRAG_TYPE = "application/x-roadmap-task";
export const TIMELINE_MONTHS = ROADMAP_TIMELINE_MONTHS;
export const TIMELINE_WEEKS = ROADMAP_TIMELINE_WEEKS;
export const LEFT_PANEL_SHADOW = "8px 0 12px rgba(15, 23, 42, 0.08)";

export type TimelineUnit = {
  type: "day" | "month" | "quarter";
  label: string;
  start: Date;
  end: Date;
  width: number;
  subLabel?: string;
  dayNumber?: string;
  monthLabel?: string;
  weekIndex?: number;
  isWeekStart?: boolean;
};

type TimelinePartProps = {
  theme: Theme;
};

type TimelineUnitsProps = TimelinePartProps & {
  timelineMode: RoadmapTimelineMode;
  units: TimelineUnit[];
};

export const TimelineLeftHeader = ({ theme }: TimelinePartProps) => (
  <Box
    sx={{
      width: LEFT_PANEL_WIDTH,
      flexShrink: 0,
      position: "sticky",
      left: 0,
      zIndex: 60,
      display: "flex",
      alignItems: "center",
      bgcolor: theme.palette.background.paper,
      overflow: "hidden",
      px: 1.5,
      py: 1.25,
      borderRight: 1,
      borderColor: "divider",
      boxShadow: LEFT_PANEL_SHADOW,
    }}
  >
    <Typography variant="caption" color="text.secondary" fontWeight={800}>
      EPICA
    </Typography>
  </Box>
);

export const TimelineColumns = ({ theme, timelineMode, units }: TimelineUnitsProps) => (
  <>
    {units.map((unit, unitIndex) => (
      <Box
        key={unitIndex}
        sx={{
          width: unit.width,
          flexShrink: 0,
          borderRight: 1,
          borderLeft: timelineMode === "weeks" && unit.type === "day" && unit.isWeekStart ? 2 : 0,
          borderColor: "divider",
          position: "relative",
          bgcolor:
            timelineMode === "weeks" && unit.type === "day" && (unit.weekIndex ?? 0) % 2 === 1
              ? alpha(theme.palette.text.primary, 0.035)
              : timelineMode === "quarters" && unit.type === "quarter" && unitIndex % 2 === 1
              ? alpha(theme.palette.text.primary, 0.035)
              : "transparent",
        }}
      />
    ))}
  </>
);

export const TimelineHeader = ({
  theme,
  timelineMode,
  units,
  today,
}: TimelineUnitsProps & { today: Date }) => (
  <>
    {units.map((unit, index) => {
      const isToday = format(unit.start, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

      return (
        <Box
          key={index}
          sx={{
            width: unit.width,
            flexShrink: 0,
            px: timelineMode === "weeks" ? 0.5 : 2,
            py: timelineMode === "weeks" ? 0.5 : 1.25,
            borderRight: 1,
            borderLeft: timelineMode === "weeks" && unit.type === "day" && unit.isWeekStart ? 2 : 0,
            borderColor: "divider",
            textAlign: "center",
            bgcolor:
              timelineMode === "weeks" && unit.type === "day" && (unit.weekIndex ?? 0) % 2 === 1
                ? alpha(theme.palette.text.primary, 0.035)
                : timelineMode === "quarters" && unit.type === "quarter" && index % 2 === 1
                ? alpha(theme.palette.text.primary, 0.035)
                : "transparent",
          }}
        >
          {unit.type === "day" ? (
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ lineHeight: 1 }}>
                {unit.monthLabel}
              </Typography>
              <Typography
                variant="caption"
                color={isToday ? "primary" : "text.secondary"}
                fontWeight={800}
                sx={{ lineHeight: 1.1 }}
              >
                {unit.label}
              </Typography>
              <Typography
                variant="body2"
                color={isToday ? "primary" : "text.primary"}
                fontWeight={isToday ? 800 : 600}
                sx={{ lineHeight: 1.1 }}
              >
                {unit.dayNumber}
              </Typography>
            </Stack>
          ) : unit.type === "quarter" ? (
            <Stack spacing={0.35} alignItems="center">
              <Typography variant="subtitle2" fontWeight={800}>
                {unit.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {unit.subLabel}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="subtitle2" fontWeight={700}>
              {unit.label}
            </Typography>
          )}
        </Box>
      );
    })}
  </>
);

export const TodayMarker = ({ offsetPercent }: { offsetPercent: number }) => (
  <Box
    sx={{
      position: "absolute",
      left: `${offsetPercent}%`,
      top: 0,
      bottom: 0,
      width: 2,
      bgcolor: "warning.main",
      zIndex: 1,
      pointerEvents: "none",
    }}
  />
);

export const TimelineEmptyState = ({ theme }: TimelinePartProps) => (
  <Box sx={{ display: "flex", minHeight: 120 }}>
    <Box
      sx={{
        width: LEFT_PANEL_WIDTH,
        flexShrink: 0,
        position: "sticky",
        left: 0,
        zIndex: 45,
        borderRight: 1,
        borderColor: "divider",
        bgcolor: theme.palette.background.paper,
        overflow: "hidden",
        boxShadow: LEFT_PANEL_SHADOW,
      }}
    />
    <Box sx={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography variant="body2" color="text.secondary">
        Crea epicas o asigna tareas para comenzar el roadmap.
      </Typography>
    </Box>
  </Box>
);
