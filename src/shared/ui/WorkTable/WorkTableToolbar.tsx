import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import WorkTableToolbarPanel from "./WorkTableToolbarPanel";

type WorkTableToolbarProps = {
  description?: ReactNode;
  children: ReactNode;
};

const WorkTableToolbar = ({ description, children }: WorkTableToolbarProps) => (
  <WorkTableToolbarPanel>
    <Stack spacing={1.5}>
      {description ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        {children}
      </Stack>
    </Stack>
  </WorkTableToolbarPanel>
);

export default WorkTableToolbar;
