import { Divider, Menu, MenuItem } from "@mui/material";

type EffortMenuProps = {
  anchorEl: HTMLElement | null;
  editingEffort: string | null;
  pointValues: Array<{ id: string; value: string }>;
  onClose: () => void;
  onEffortChange: (epicId: string, effort: string) => void;
};

export const EffortMenu = ({
  anchorEl,
  editingEffort,
  pointValues,
  onClose,
  onEffortChange,
}: EffortMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl) && editingEffort !== null}
      onClose={onClose}
      PaperProps={{
        sx: { borderRadius: 2, mt: 1 },
      }}
    >
      <MenuItem
        onClick={() => {
          if (editingEffort) {
            onEffortChange(editingEffort, "");
          }
          onClose();
        }}
      >
        <em>Sin estimar</em>
      </MenuItem>
      <Divider />
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
          {point.value}
        </MenuItem>
      ))}
    </Menu>
  );
};