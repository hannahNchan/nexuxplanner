import { Popover } from "@mui/material";
import EpicColorPicker from "./EpicColorPicker";

type ColorMenuProps = {
  anchorEl: HTMLElement | null;
  editingColor: string | null;
  currentColor?: string;
  onClose: () => void;
  onColorChange: (epicId: string, color: string | null) => void;
};

const ColorMenu = ({
  anchorEl,
  editingColor,
  currentColor,
  onClose,
  onColorChange,
}: ColorMenuProps) => {
  return (
    <Popover
      open={Boolean(anchorEl) && editingColor !== null}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.5,
            p: 2,
            borderRadius: 2,
          },
        },
      }}
    >
      <EpicColorPicker
        value={currentColor || "#3B82F6"}
        onChange={(color) => {
          if (editingColor) {
            onColorChange(editingColor, color);
            onClose();
          }
        }}
      />
    </Popover>
  );
};

export default ColorMenu;