import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline";
import type { ReactNode } from "react";
import type { BoardViewMode } from "./boardViewTypes";

type BoardLayoutSwitcherProps = {
  value: BoardViewMode;
  onChange: (value: BoardViewMode) => void;
};

const viewOptions: Array<{
  value: BoardViewMode;
  label: string;
  icon: ReactNode;
}> = [
  { value: "list", label: "Lista", icon: <ViewListIcon fontSize="small" /> },
  { value: "board", label: "Tablero", icon: <DashboardIcon fontSize="small" /> },
  { value: "calendar", label: "Calendario", icon: <CalendarMonthIcon fontSize="small" /> },
  { value: "table", label: "Tabla", icon: <TableChartIcon fontSize="small" /> },
  { value: "timeline", label: "Timeline", icon: <ViewTimelineIcon fontSize="small" /> },
];

const BoardLayoutSwitcher = ({ value, onChange }: BoardLayoutSwitcherProps) => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    onChange={(_, nextValue: BoardViewMode | null) => {
      if (nextValue) {
        onChange(nextValue);
      }
    }}
    sx={{
      bgcolor: "background.default",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 1,
      overflow: "hidden",
      "& .MuiToggleButton-root": {
        width: 36,
        height: 34,
        p: 0,
        border: 0,
        borderRadius: 0,
      },
    }}
  >
    {viewOptions.map((option) => (
      <ToggleButton key={option.value} value={option.value} aria-label={option.label}>
        <Tooltip title={option.label}>
          <span>{option.icon}</span>
        </Tooltip>
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

export default BoardLayoutSwitcher;
