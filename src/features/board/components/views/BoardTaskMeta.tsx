import { Chip, Stack } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import type { Task } from "../../../../shared/types/board";
import UserAvatar from "../../../../shared/ui/UserAvatar";
import { DEFAULT_STATUS_BADGE_COLOR } from "../../statusBadgePalette";

type BoardTaskStatusBadgeProps = {
  status?: string | null;
  color?: string | null;
  compact?: boolean;
};

type BoardTaskAssigneeBadgeProps = {
  task: Pick<Task, "assignee_id">;
  compact?: boolean;
};

type BoardTaskMetaProps = {
  task: Pick<Task, "assignee_id" | "columnColor"> & { columnTitle?: string | null };
  compact?: boolean;
};

export const BoardTaskStatusBadge = ({ status, color, compact = false }: BoardTaskStatusBadgeProps) => {
  const theme = useTheme();
  const badgeColor = color || DEFAULT_STATUS_BADGE_COLOR;

  return (
    <Chip
      label={status || "Sin estado"}
      size="small"
      sx={{
        height: compact ? 18 : 22,
        maxWidth: compact ? 110 : 150,
        borderRadius: 1,
        bgcolor: alpha(badgeColor, theme.palette.mode === "dark" ? 0.26 : 0.14),
        color: theme.palette.mode === "dark" ? theme.palette.common.white : badgeColor,
        border: `1px solid ${alpha(badgeColor, theme.palette.mode === "dark" ? 0.48 : 0.34)}`,
        fontSize: compact ? "0.62rem" : "0.68rem",
        fontWeight: 900,
        letterSpacing: 0,
        "& .MuiChip-label": {
          px: compact ? 0.65 : 0.85,
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
};

export const BoardTaskAssigneeBadge = ({ task, compact = false }: BoardTaskAssigneeBadgeProps) => {
  const theme = useTheme();

  if (task.assignee_id) {
    return <UserAvatar userId={task.assignee_id} size={compact ? 20 : 28} showTooltip />;
  }

  return (
    <Chip
      icon={<PersonIcon sx={{ fontSize: compact ? 13 : 15 }} />}
      label={compact ? "Sin asignar" : "Sin asignar"}
      size="small"
      variant="outlined"
      sx={{
        height: compact ? 18 : 22,
        maxWidth: compact ? 112 : 132,
        borderRadius: 1,
        color: "text.secondary",
        borderColor: alpha(theme.palette.text.secondary, 0.32),
        fontSize: compact ? "0.62rem" : "0.68rem",
        fontWeight: 800,
        letterSpacing: 0,
        "& .MuiChip-icon": {
          color: "text.secondary",
          ml: compact ? 0.45 : 0.6,
        },
        "& .MuiChip-label": {
          px: compact ? 0.55 : 0.75,
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
};

const BoardTaskMeta = ({ task, compact = false }: BoardTaskMetaProps) => (
  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0, overflow: "hidden" }}>
    <BoardTaskStatusBadge status={task.columnTitle} color={task.columnColor} compact={compact} />
    <BoardTaskAssigneeBadge task={task} compact={compact} />
  </Stack>
);

export default BoardTaskMeta;
