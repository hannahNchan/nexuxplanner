import { Stack } from "@mui/material";
import type { DataTableToolbarProps } from "./types";

export const DataTableToolbar = ({ children, containerSx }: DataTableToolbarProps) => {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center" sx={containerSx}>
      {children}
    </Stack>
  );
};