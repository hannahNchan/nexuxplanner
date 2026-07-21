import { Box, Paper, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { DataTableHeaderProps } from "./types";

export const DataTableHeader = ({
  title,
  subtitle,
  action,
  containerSx,
}: DataTableHeaderProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 1,
        bgcolor: "background.paper",
        border: `1px solid ${theme.palette.divider}`,
        ...containerSx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
    </Paper>
  );
};
