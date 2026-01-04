import { Menu, MenuItem, ListItemText, Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Priority } from "../../../../api/catalogService";

type PriorityMenuProps = {
  anchorEl: HTMLElement | null;
  editingPriority: string | null;
  priorities: Priority[];
  onClose: () => void;
  onPriorityChange: (taskId: string, priorityId: string | null) => void;
};

export const PriorityMenu = ({
  anchorEl,
  editingPriority,
  priorities,
  onClose,
  onPriorityChange,
}: PriorityMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{ sx: { minWidth: 200 } }}
    >
      <MenuItem
        onClick={() => {
          if (editingPriority) {
            onPriorityChange(editingPriority, null);
          }
          onClose();
        }}
      >
        <ListItemText primary="Sin prioridad" secondary="Ninguna" />
      </MenuItem>
      {priorities.map((priority) => (
        <MenuItem
          key={priority.id}
          onClick={() => {
            if (editingPriority) {
              onPriorityChange(editingPriority, priority.id);
            }
            onClose();
          }}
        >
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              bgcolor: priority.color,
              mr: 2,
              border: `2px solid ${alpha(priority.color || "#000", 0.3)}`,
            }}
          />
          <ListItemText primary={priority.name} secondary={`Nivel ${priority.level}`} />
        </MenuItem>
      ))}
    </Menu>
  );
};