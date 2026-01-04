import { Paper, Stack, Typography, Chip, IconButton } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import GitHubIcon from "@mui/icons-material/GitHub";
import type { GridRowsProp } from "@mui/x-data-grid";

type BacklogTaskRowProps = {
  row: GridRowsProp[0];
  isDragging: boolean;
  dragHandleProps: any;
  onDelete: (taskId: string) => void;
};

const BacklogTaskRow = ({ row, isDragging, dragHandleProps, onDelete }: BacklogTaskRowProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={isDragging ? 8 : 1}
      sx={{
        p: 2,
        borderRadius: 2,
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? "rotate(2deg)" : "none",
        transition: "all 0.2s",
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        cursor: isDragging ? "grabbing" : "grab",
        "&:hover": {
          borderColor: theme.palette.primary.main,
          boxShadow: theme.shadows[4],
        },
      }}
      {...dragHandleProps}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {/* Task ID */}
        <Typography
          variant="caption"
          sx={{
            fontFamily: "monospace",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            px: 1,
            py: 0.5,
            borderRadius: 1,
            minWidth: 80,
            textAlign: "center",
          }}
        >
          {row.task_id}
        </Typography>

        {/* Title */}
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
          {row.title}
        </Typography>

        {/* Priority */}
        {row.priority_color && (
          <Chip
            label={row.priority}
            size="small"
            sx={{
              bgcolor: row.priority_color,
              color: "#fff",
              fontWeight: 600,
            }}
          />
        )}

        {/* Story Points */}
        {row.story_points !== "-" && (
          <Chip label={`${row.story_points} pts`} size="small" variant="outlined" />
        )}

        {/* Epic */}
        {row.epic !== "Sin épica" && (
          <Chip label={row.epic} size="small" color="secondary" variant="outlined" />
        )}

        {/* GitHub Link */}
        {row.github_link && (
          <IconButton size="small" href={row.github_link} target="_blank">
            <GitHubIcon fontSize="small" />
          </IconButton>
        )}

        {/* Delete */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.id as string);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
};

export default BacklogTaskRow;