import { addMonths, addWeeks, differenceInDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import type { EpicWithDetails } from "../../api/epicService";

export type RoadmapTimelineMode = "weeks" | "months" | "quarters";

export const ROADMAP_TIMELINE_MONTHS = 3;
export const ROADMAP_TIMELINE_WEEKS = 6;

const parseTimelineDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfCalendarQuarter = (date: Date) => {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
};

const endOfCalendarQuarter = (date: Date) => {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return endOfMonth(new Date(date.getFullYear(), quarterStartMonth + 2, 1));
};

const collectRoadmapDates = (epics: EpicWithDetails[]) =>
  epics.flatMap((epic) => [
    parseTimelineDate(epic.start_date),
    parseTimelineDate(epic.end_date),
    ...(epic.connected_tasks ?? []).flatMap((task) => [
      parseTimelineDate(task.planned_start_date),
      parseTimelineDate(task.planned_end_date),
      parseTimelineDate(task.sprint_start_date),
      parseTimelineDate(task.sprint_end_date),
    ]),
  ]).filter((date): date is Date => Boolean(date));

export const getRoadmapTimelineRange = (
  timelineMode: RoadmapTimelineMode,
  epics: EpicWithDetails[],
  baseDate = new Date()
) => {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });

  if (timelineMode === "weeks") {
    return {
      timelineStart: weekStart,
      timelineEnd: endOfWeek(addWeeks(weekStart, ROADMAP_TIMELINE_WEEKS - 1), { weekStartsOn: 1 }),
    };
  }

  if (timelineMode === "months") {
    return {
      timelineStart: weekStart,
      timelineEnd: endOfMonth(addMonths(startOfMonth(weekStart), ROADMAP_TIMELINE_MONTHS - 1)),
    };
  }

  const roadmapDates = collectRoadmapDates(epics);
  const minDate = roadmapDates.length > 0
    ? roadmapDates.reduce((min, date) => (date < min ? date : min), baseDate)
    : baseDate;
  const maxDate = roadmapDates.length > 0
    ? roadmapDates.reduce((max, date) => (date > max ? date : max), baseDate)
    : addMonths(baseDate, 5);
  const timelineStart = startOfCalendarQuarter(minDate);
  const timelineEnd = endOfCalendarQuarter(maxDate);
  const minimumEnd = endOfCalendarQuarter(addMonths(timelineStart, 3));

  return {
    timelineStart,
    timelineEnd: timelineEnd < minimumEnd ? minimumEnd : timelineEnd,
  };
};

export const getQuarterLabel = (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1} ${format(date, "yyyy")}`;

export const getQuarterMonthsLabel = (date: Date) => {
  const quarterStart = startOfCalendarQuarter(date);
  const firstMonth = format(quarterStart, "MMM", { locale: es });
  const lastMonth = format(addMonths(quarterStart, 2), "MMM", { locale: es });
  return `${firstMonth} - ${lastMonth}`.toUpperCase();
};

export const getQuarterUnits = (timelineStart: Date, timelineEnd: Date, dayWidth: number) => {
  const units = [];
  let cursor = startOfCalendarQuarter(timelineStart);

  while (cursor <= timelineEnd) {
    const quarterStart = cursor;
    const quarterEnd = endOfCalendarQuarter(quarterStart);
    const visibleStart = quarterStart < timelineStart ? timelineStart : quarterStart;
    const visibleEnd = quarterEnd > timelineEnd ? timelineEnd : quarterEnd;
    const visibleDays = differenceInDays(visibleEnd, visibleStart) + 1;

    units.push({
      type: "quarter" as const,
      label: getQuarterLabel(quarterStart),
      subLabel: getQuarterMonthsLabel(quarterStart),
      start: quarterStart,
      end: quarterEnd,
      width: visibleDays * dayWidth,
    });

    cursor = addMonths(cursor, 3);
  }

  return units;
};
