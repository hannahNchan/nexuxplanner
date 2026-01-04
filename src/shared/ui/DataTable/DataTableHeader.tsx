import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
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
        p: 3,
        borderRadius: 3,
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.08)} 0%, 
          ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        ...containerSx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
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