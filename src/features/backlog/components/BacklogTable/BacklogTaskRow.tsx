import { Box, Stack, Typography, Chip, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import GitHubIcon from "@mui/icons-material/GitHub";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { GridRowsProp } from "@mui/x-data-grid";
import { WorkTableRow } from "../../../../shared/ui/WorkTable";

type BacklogTaskRowProps = {
  row: GridRowsProp[0];
  isDragging: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  onDelete: (taskId: string) => void;
  readOnly?: boolean;
};

const BacklogTaskRow = ({ row, isDragging, dragHandleProps, onDelete, readOnly = false }: BacklogTaskRowProps) => {
  return (
    <WorkTableRow isDragging={isDragging} dragHandleProps={dragHandleProps}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "monospace",
            color: "text.secondary",
            width: 88,
            flexShrink: 0,
            fontWeight: 700,
          }}
        >
          {row.task_id}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            flex: 1,
            minWidth: 160,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.title}
        </Typography>

        <Box sx={{ width: 116, flexShrink: 0 }}>
          {row.priority_color ? (
            <Chip
              label={row.priority}
              size="small"
              sx={{
                height: 22,
                bgcolor: alpha(row.priority_color as string, 0.16),
                color: row.priority_color as string,
                border: `1px solid ${alpha(row.priority_color as string, 0.3)}`,
                fontWeight: 700,
                maxWidth: "100%",
              }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              -
            </Typography>
          )}
        </Box>

        <Box sx={{ width: 72, flexShrink: 0 }}>
          {row.story_points !== "-" ? (
            <Chip label={`${row.story_points} pts`} size="small" variant="outlined" sx={{ height: 22 }} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              -
            </Typography>
          )}
        </Box>

        <Box sx={{ width: 150, flexShrink: 0, minWidth: 0 }}>
          {row.epic !== "Sin épica" ? (
            <Chip
              label={row.epic}
              size="small"
              variant="outlined"
              sx={{ height: 22, maxWidth: "100%" }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              Sin épica
            </Typography>
          )}
        </Box>

        <Box sx={{ width: 76, flexShrink: 0, display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
          {row.github_link && (
            <IconButton size="small" href={row.github_link} target="_blank">
              <GitHubIcon fontSize="small" />
            </IconButton>
          )}

          <IconButton
            size="small"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.id as string);
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Stack>
    </WorkTableRow>
  );
};

export default BacklogTaskRow;
