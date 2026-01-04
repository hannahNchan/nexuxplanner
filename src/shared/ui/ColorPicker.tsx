import { useState } from "react";
import { Popover, Box } from "@mui/material";

type ColorPickerProps = {
  value: string | null;
  onChange: (color: string) => void;
};

const presetColors = [
  "#EF4444", "#DC2626", "#B91C1C", "#F97316", "#EA580C", "#C2410C",
  "#F59E0B", "#D97706", "#B45309", "#EAB308", "#CA8A04", "#A16207",
  "#84CC16", "#65A30D", "#4D7C0F", "#22C55E", "#16A34A", "#15803D",
  "#10B981", "#059669", "#047857", "#14B8A6", "#0D9488", "#0F766E",
  "#06B6D4", "#0891B2", "#0E7490", "#0EA5E9", "#0284C7", "#0369A1",
  "#3B82F6", "#2563EB", "#1D4ED8", "#6366F1", "#4F46E5", "#4338CA",
  "#8B5CF6", "#7C3AED", "#6D28D9", "#A855F7", "#9333EA", "#7E22CE",
  "#D946EF", "#C026D3", "#A21CAF", "#EC4899", "#DB2777", "#BE185D",
  "#F43F5E", "#E11D48", "#BE123C", "#64748B", "#475569", "#334155",
  "#6B7280", "#4B5563", "#374151", "#1F2937", "#111827", "#000000",
];

const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (color: string) => {
    onChange(color);
    handleClose();
  };

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1,
          bgcolor: value || "#ccc",
          cursor: "pointer",
          border: "2px solid",
          borderColor: "divider",
        }}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ p: 2, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.5 }}>
          {presetColors.map((color) => (
            <Box
              key={color}
              onClick={() => handleSelect(color)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: color,
                border: value === color ? "3px solid" : "1px solid",
                borderColor: value === color ? "primary.main" : "divider",
                cursor: "pointer",
                transition: "box-shadow 0.2s ease",
                "&:hover": {
                  boxShadow: "0 0 0 3px rgba(0, 0, 0, 0.2)",
                },
              }}
            />
          ))}
        </Box>
      </Popover>
    </>
  );
};

export default ColorPicker;