import { addDays, addMonths, differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";

export type SprintDuration = "7d" | "15d" | "1m";

export const SPRINT_DURATION_OPTIONS: Array<{
  value: SprintDuration;
  label: string;
  helperText: string;
}> = [
  { value: "7d", label: "1 semana", helperText: "7 días exactos" },
  { value: "15d", label: "15 días", helperText: "15 días exactos" },
  { value: "1m", label: "1 mes", helperText: "Mismo día del mes siguiente" },
];

export const calculateSprintEndDate = (startDate: Date, duration: SprintDuration): Date => {
  const normalizedStart = startOfDay(startDate);

  if (duration === "7d") return endOfDay(addDays(normalizedStart, 7));
  if (duration === "15d") return endOfDay(addDays(normalizedStart, 15));

  return endOfDay(addMonths(normalizedStart, 1));
};

const getAllowedEndDates = (startDate: Date) =>
  SPRINT_DURATION_OPTIONS.map((option) => calculateSprintEndDate(startDate, option.value));

export const getNormalizedSprintEndDate = (
  startDateValue: string | null | undefined,
  endDateValue: string | null | undefined
): Date | null => {
  if (!startDateValue) {
    return endDateValue ? new Date(endDateValue) : null;
  }

  const startDate = new Date(startDateValue);
  if (Number.isNaN(startDate.getTime())) return endDateValue ? new Date(endDateValue) : null;

  const allowedEndDates = getAllowedEndDates(startDate);
  if (!endDateValue) return allowedEndDates[0] ?? null;

  const endDate = new Date(endDateValue);
  if (Number.isNaN(endDate.getTime())) return allowedEndDates[0] ?? null;

  const exactEndDate = allowedEndDates.find(
    (allowedDate) => Math.abs(allowedDate.getTime() - endDate.getTime()) < 60_000
  );

  if (exactEndDate) return exactEndDate;

  return allowedEndDates.reduce((closest, candidate) => {
    const closestDistance = Math.abs(closest.getTime() - endDate.getTime());
    const candidateDistance = Math.abs(candidate.getTime() - endDate.getTime());
    return candidateDistance < closestDistance ? candidate : closest;
  });
};

export const getSprintDaysRemaining = (
  startDateValue: string | null | undefined,
  endDateValue: string | null | undefined,
  now = new Date()
): number | null => {
  const endDate = getNormalizedSprintEndDate(startDateValue, endDateValue);
  if (!endDate) return null;

  return differenceInCalendarDays(endDate, startOfDay(now));
};

export const getSprintDurationDays = (
  startDateValue: string | null | undefined,
  endDateValue: string | null | undefined
): number | null => {
  if (!startDateValue) return null;

  const startDate = new Date(startDateValue);
  const endDate = getNormalizedSprintEndDate(startDateValue, endDateValue);

  if (Number.isNaN(startDate.getTime()) || !endDate) return null;

  return Math.max(1, differenceInCalendarDays(endDate, startOfDay(startDate)));
};
