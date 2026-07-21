import { Box, Container, Stack } from "@mui/material";
import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";

type WorkTableShellProps = {
  header: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  contentSx?: SxProps<Theme>;
};

const WorkTableShell = ({ header, toolbar, children, contentSx }: WorkTableShellProps) => (
  <Container
    maxWidth={false}
    sx={{
      height: "100%",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}
  >
    <Stack spacing={2} sx={{ flexShrink: 0, pb: 2 }}>
      {header}
      {toolbar}
    </Stack>

    <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", ...contentSx }}>
      {children}
    </Box>
  </Container>
);

export default WorkTableShell;
