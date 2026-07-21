import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { EmptyStateProps } from "./types";

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  iconSize = "5x",
  containerSx,
}: EmptyStateProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 1,
        textAlign: "center",
        bgcolor: "background.paper",
        border: `1px dashed ${alpha(theme.palette.text.secondary, 0.28)}`,
        ...containerSx,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
          }}
        >
          <FontAwesomeIcon
            icon={icon}
            size={iconSize}
            style={{
              color: theme.palette.primary.main,
              opacity: 0.7,
            }}
          />
        </Box>

        <Typography
          variant="h5"
          fontWeight={700}
          color="text.primary"
        >
          {title}
        </Typography>

        {description && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 450,
              lineHeight: 1.7,
            }}
          >
            {description}
          </Typography>
        )}

        {action && (
          <Button
            variant="contained"
            size="large"
            startIcon={
              action.icon ? (
                <FontAwesomeIcon icon={action.icon} />
              ) : undefined
            }
            onClick={action.onClick}
            sx={{
              mt: 2,
              px: 2.5,
              py: 1,
              fontWeight: 600,
            }}
          >
            {action.label}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};
