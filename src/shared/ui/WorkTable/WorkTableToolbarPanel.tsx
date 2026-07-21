import { Paper } from "@mui/material";
import type { ReactNode } from "react";

type WorkTableToolbarPanelProps = {
  children: ReactNode;
};

const WorkTableToolbarPanel = ({ children }: WorkTableToolbarPanelProps) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      borderRadius: 1,
      border: 1,
      borderColor: "divider",
    }}
  >
    {children}
  </Paper>
);

export default WorkTableToolbarPanel;
