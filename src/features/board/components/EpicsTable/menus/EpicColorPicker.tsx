import { Box, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";

const EPIC_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  "#F43F5E", "#64748B", "#475569", "#1E293B",
];

type EpicColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

const EpicColorPicker = ({ value, onChange }: EpicColorPickerProps) => {
  return (
    <Stack spacing={1}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 1,
        }}
      >
        {EPIC_COLORS.map((color) => (
          <Box
            key={color}
            onClick={() => onChange(color)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: color,
              cursor: "pointer",
              border: value === color 
                ? `3px solid ${alpha("#000", 0.8)}` 
                : `2px solid ${alpha("#000", 0.1)}`,
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "scale(1.15)",
                boxShadow: `0 4px 12px ${alpha(color, 0.4)}`,
                border: `3px solid ${alpha("#000", 0.6)}`,
              },
            }}
          />
        ))}
      </Box>
    </Stack>
  );
};

export default EpicColorPicker;