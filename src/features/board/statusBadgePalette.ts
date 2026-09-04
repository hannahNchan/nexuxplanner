export const STATUS_BADGE_COLORS = [
  "#64748B",
  "#3B82F6",
  "#06B6D4",
  "#14B8A6",
  "#22C55E",
  "#84CC16",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#6366F1",
] as const;

export type StatusBadgeColor = (typeof STATUS_BADGE_COLORS)[number];

export const DEFAULT_STATUS_BADGE_COLOR: StatusBadgeColor = "#64748B";
