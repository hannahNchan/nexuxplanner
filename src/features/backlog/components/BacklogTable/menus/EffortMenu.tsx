import { Menu, MenuItem, ListItemText, Chip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { PointValue } from "../../../../api/catalogService";

type EffortMenuProps = {
  anchorEl: HTMLElement | null;
  editingEffort: string | null;
  pointValues: PointValue[];
  onClose: () => void;
  onEffortChange: (taskId: string, effort: string | null) => void;
};

export const EffortMenu = ({
  anchorEl,
  editingEffort,
  pointValues,
  onClose,
  onEffortChange,
}: EffortMenuProps) => {
  const theme = useTheme();

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{ sx: { minWidth: 200 } }}
    >
      <MenuItem
        onClick={() => {
          if (editingEffort) {
            onEffortChange(editingEffort, null);
          }
          onClose();
        }}
      >
        <ListItemText primary="Sin estimación" />
      </MenuItem>
      {pointValues.map((point) => (
        <MenuItem
          key={point.id}
          onClick={() => {
            if (editingEffort) {
              onEffortChange(editingEffort, point.value);
            }
            onClose();
          }}
        >
          <Chip
            label={point.value}
            size="small"
            sx={{
              mr: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
            }}
          />
          <ListItemText primary={`${point.numeric_value || "?"} puntos`} />
        </MenuItem>
      ))}
    </Menu>
  );
};