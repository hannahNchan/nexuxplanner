import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { IconButton, Stack, Chip, TextField, Box, Link } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useState } from "react";

type ColumnsProps = {
  theme: Theme;
  editingTitle: string | null;
  editingPriority: string | null;
  editingEffort: string | null;
  editingEpic: string | null;
  editingAssignee: string | null;
  editingGithubLink: string | null;
  setEditingTitle: (id: string | null) => void;
  setEditingPriority: (id: string | null) => void;
  setEditingEffort: (id: string | null) => void;
  setEditingEpic: (id: string | null) => void;
  setEditingAssignee: (id: string | null) => void;
  setEditingGithubLink: (id: string | null) => void;
  setPriorityMenuAnchor: (anchor: HTMLElement | null) => void;
  setEffortMenuAnchor: (anchor: HTMLElement | null) => void;
  setEpicMenuAnchor: (anchor: HTMLElement | null) => void;
  setAssigneeMenuAnchor: (anchor: HTMLElement | null) => void;
  handleTitleChange: (id: string, value: string) => void;
  handleGithubLinkChange: (id: string, value: string) => void;
  handleDeleteTask: (id: string) => void;
};

export const createBacklogTableColumns = (props: ColumnsProps): GridColDef[] => {
  const {
    theme,
    editingTitle,
    editingGithubLink,
    setEditingTitle,
    setEditingPriority,
    setEditingEffort,
    setEditingEpic,
    setEditingAssignee,
    setEditingGithubLink,
    setPriorityMenuAnchor,
    setEffortMenuAnchor,
    setEpicMenuAnchor,
    setAssigneeMenuAnchor,
    handleTitleChange,
    handleGithubLinkChange,
    handleDeleteTask,
  } = props;

  return [
    // ID de Tarea
    {
      field: "task_id",
      headerName: "ID",
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            fontFamily: "monospace",
            fontWeight: 700,
            bgcolor: alpha(theme.palette.info.main, 0.1),
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            color: "info.main",
          }}
        />
      ),
    },

    // Tarea (editable)
    {
      field: "title",
      headerName: "Tarea",
      flex: 1,
      minWidth: 250,
      renderCell: (params: GridRenderCellParams) => {
        const isEditing = editingTitle === params.row.id;
        const [localValue, setLocalValue] = useState(params.value);

        if (isEditing) {
          return (
            <Stack direction="row" spacing={1} alignItems="center" width="100%">
              <TextField
                size="small"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                autoFocus
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleChange(params.row.id, localValue);
                    setEditingTitle(null);
                  } else if (e.key === "Escape") {
                    setEditingTitle(null);
                  }
                }}
              />
              <IconButton
                size="small"
                onClick={() => {
                  handleTitleChange(params.row.id, localValue);
                  setEditingTitle(null);
                }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setEditingTitle(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        }

        return (
          <Box
            onClick={() => setEditingTitle(params.row.id)}
            sx={{
              cursor: "pointer",
              width: "100%",
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
              p: 1,
              borderRadius: 1,
            }}
          >
            {params.value}
          </Box>
        );
      },
    },

    // Responsable (Assignee)
    {
      field: "assignee",
      headerName: "Responsable",
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          onClick={(e) => {
            setEditingAssignee(params.row.id);
            setAssigneeMenuAnchor(e.currentTarget);
          }}
          sx={{
            cursor: "pointer",
            bgcolor: params.row.assignee_id
              ? alpha(theme.palette.success.main, 0.1)
              : alpha(theme.palette.grey[500], 0.1),
            border: `1px solid ${alpha(
              params.row.assignee_id ? theme.palette.success.main : theme.palette.grey[500],
              0.3
            )}`,
            "&:hover": {
              bgcolor: params.row.assignee_id
                ? alpha(theme.palette.success.main, 0.2)
                : alpha(theme.palette.grey[500], 0.2),
            },
          }}
        />
      ),
    },

    // Prioridad
    {
      field: "priority",
      headerName: "Prioridad",
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          onClick={(e) => {
            setEditingPriority(params.row.id);
            setPriorityMenuAnchor(e.currentTarget);
          }}
          sx={{
            cursor: "pointer",
            bgcolor: params.row.priority_color
              ? alpha(params.row.priority_color, 0.15)
              : alpha(theme.palette.grey[500], 0.1),
            border: `1px solid ${alpha(
              params.row.priority_color || theme.palette.grey[500],
              0.3
            )}`,
            color: params.row.priority_color || "text.secondary",
            fontWeight: 600,
            "&:hover": {
              bgcolor: params.row.priority_color
                ? alpha(params.row.priority_color, 0.25)
                : alpha(theme.palette.grey[500], 0.2),
            },
          }}
        />
      ),
    },

    // SP Estimado
    {
      field: "story_points",
      headerName: "SP Estimado",
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          onClick={(e) => {
            setEditingEffort(params.row.id);
            setEffortMenuAnchor(e.currentTarget);
          }}
          sx={{
            cursor: "pointer",
            fontFamily: "monospace",
            fontWeight: 700,
            bgcolor: alpha(theme.palette.secondary.main, 0.1),
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
            "&:hover": {
              bgcolor: alpha(theme.palette.secondary.main, 0.2),
            },
          }}
        />
      ),
    },

    // Épica
    {
      field: "epic",
      headerName: "Épica",
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          onClick={(e) => {
            setEditingEpic(params.row.id);
            setEpicMenuAnchor(e.currentTarget);
          }}
          sx={{
            cursor: "pointer",
            bgcolor: params.row.epic_id
              ? alpha(theme.palette.warning.main, 0.1)
              : alpha(theme.palette.grey[500], 0.1),
            border: `1px solid ${alpha(
              params.row.epic_id ? theme.palette.warning.main : theme.palette.grey[500],
              0.3
            )}`,
            "&:hover": {
              bgcolor: params.row.epic_id
                ? alpha(theme.palette.warning.main, 0.2)
                : alpha(theme.palette.grey[500], 0.2),
            },
          }}
        />
      ),
    },

    // Enlace a GitHub
    {
      field: "github_link",
      headerName: "GitHub",
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const isEditing = editingGithubLink === params.row.id;
        const [localValue, setLocalValue] = useState(params.value || "");

        if (isEditing) {
          return (
            <Stack direction="row" spacing={1} alignItems="center" width="100%">
              <TextField
                size="small"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="https://github.com/..."
                autoFocus
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleGithubLinkChange(params.row.id, localValue);
                    setEditingGithubLink(null);
                  } else if (e.key === "Escape") {
                    setEditingGithubLink(null);
                  }
                }}
              />
              <IconButton
                size="small"
                onClick={() => {
                  handleGithubLinkChange(params.row.id, localValue);
                  setEditingGithubLink(null);
                }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setEditingGithubLink(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        }

        if (params.value) {
          return (
            <Link
              href={params.value}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <GitHubIcon sx={{ color: "text.secondary" }} />
            </Link>
          );
        }

        return (
          <IconButton
            size="small"
            onClick={() => setEditingGithubLink(params.row.id)}
            sx={{ color: "text.disabled" }}
          >
            <GitHubIcon />
          </IconButton>
        );
      },
    },

    // Acciones
    {
      field: "actions",
      headerName: "Acciones",
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          onClick={() => handleDeleteTask(params.row.id)}
          sx={{
            color: theme.palette.error.main,
            "&:hover": {
              bgcolor: alpha(theme.palette.error.main, 0.1),
            },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];
};