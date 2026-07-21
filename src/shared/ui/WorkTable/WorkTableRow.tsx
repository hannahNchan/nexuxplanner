import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

type WorkTableRowProps = {
  children: ReactNode;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  sx?: SxProps<Theme>;
};

const WorkTableRow = ({ children, isDragging = false, dragHandleProps, sx }: WorkTableRowProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        minHeight: 52,
        opacity: isDragging ? 0.86 : 1,
        transform: isDragging ? "rotate(1deg)" : "none",
        transition: "background-color 0.16s ease, border-color 0.16s ease",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.68)}`,
        bgcolor: isDragging ? alpha(theme.palette.warning.main, 0.1) : theme.palette.background.paper,
        cursor: isDragging ? "grabbing" : "grab",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.1 : 0.055),
        },
        ...sx,
      }}
      {...dragHandleProps}
    >
      {children}
    </Box>
  );
};

export default WorkTableRow;
