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
        p: 6,
        borderRadius: 3,
        textAlign: "center",
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.03)} 0%, 
          ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
        ...containerSx,
      }}
    >
      <Stack spacing={3} alignItems="center">
        {/* Icono con animación */}
        <Box
          sx={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.primary.main, 0.1)} 0%, 
              ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
            animation: "pulse 2s ease-in-out infinite",
            "@keyframes pulse": {
              "0%, 100%": {
                transform: "scale(1)",
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
              },
              "50%": {
                transform: "scale(1.05)",
                boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.25)}`,
              },
            },
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

        {/* Título */}
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            background: `linear-gradient(135deg, 
              ${theme.palette.primary.main} 0%, 
              ${theme.palette.secondary.main} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {title}
        </Typography>

        {/* Descripción */}
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

        {/* Botón de acción */}
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
              borderRadius: 2,
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            {action.label}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};