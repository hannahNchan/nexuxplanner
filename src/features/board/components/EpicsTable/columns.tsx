import {
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Zoom,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { GridActionsCellItem } from "@mui/x-data-grid";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FolderIcon from "@mui/icons-material/Folder";

type CreateColumnsParams = {
  theme: Theme;
  editingName: string | null;
  editingPhase: string | null;
  editingEffort: string | null;
  editingProject: string | null;
  setEditingName: (id: string | null) => void;
  setEditingPhase: (id: string | null) => void;
  setEditingEffort: (id: string | null) => void;
  setEditingProject: (id: string | null) => void;
  setPhaseMenuAnchor: (el: HTMLElement | null) => void;
  setEffortMenuAnchor: (el: HTMLElement | null) => void;
  setProjectMenuAnchor: (el: HTMLElement | null) => void;
  setTaskSearchOpen: (id: string | null) => void;
  setTaskSearchText: (text: string) => void;
  handleNameChange: (epicId: string, newName: string) => void;
  handleDisconnectTask: (epicId: string, taskId: string) => void;
  handleDeleteEpic: (epicId: string) => void;
};

export const createEpicsTableColumns = (params: CreateColumnsParams): GridColDef[] => {
  const {
    theme,
    editingName,
    setEditingName,
    setEditingPhase,
    setEditingEffort,
    setEditingProject,
    setPhaseMenuAnchor,
    setEffortMenuAnchor,
    setProjectMenuAnchor,
    setTaskSearchOpen,
    setTaskSearchText,
    handleNameChange,
    handleDisconnectTask,
    handleDeleteEpic,
  } = params;

  return [
    {
      field: "name",
      headerName: "Épica",
      width: 250,
      renderCell: (cellParams) => {
        const isEditing = editingName === cellParams.row.id;

        if (isEditing) {
          return (
            <TextField
              autoFocus
              fullWidth
              size="small"
              defaultValue={cellParams.value as string}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleNameChange(cellParams.row.id as string, e.target.value);
                }
                setEditingName(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                }
              }}
              sx={{
                my: -1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
          );
        }

        return (
          <Tooltip title="Click para editar" placement="top">
            <Box
              sx={{
                cursor: "pointer",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                borderRadius: 1.5,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  transform: "translateX(2px)",
                },
              }}
              onClick={() => setEditingName(cellParams.row.id as string)}
            >
              <EditIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
              <Typography variant="body2" fontWeight={600}>
                {cellParams.value as string}
              </Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "project",
      headerName: "Proyecto",
      width: 220,
      renderCell: (cellParams) => (
        <Tooltip title="Click para cambiar proyecto" placement="top">
          <Box
            sx={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
            onClick={(e) => {
              setEditingProject(cellParams.row.id as string);
              setProjectMenuAnchor(e.currentTarget);
            }}
          >
            <Chip
              label={cellParams.value as string}
              size="small"
              icon={<FolderIcon sx={{ fontSize: 16, color: "inherit !important" }} />}
              sx={{
                bgcolor: cellParams.row.project_id
                  ? alpha(theme.palette.info.main, 0.1)
                  : alpha(theme.palette.grey[500], 0.1),
                color: cellParams.row.project_id
                  ? theme.palette.info.dark
                  : theme.palette.text.secondary,
                border: `1px solid ${
                  cellParams.row.project_id
                    ? alpha(theme.palette.info.main, 0.3)
                    : alpha(theme.palette.grey[500], 0.2)
                }`,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: `0 4px 12px ${alpha(
                    cellParams.row.project_id ? theme.palette.info.main : theme.palette.grey[500],
                    0.3
                  )}`,
                },
              }}
            />
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "phase",
      headerName: "Fase",
      width: 180,
      renderCell: (cellParams) => (
        <Tooltip title="Click para cambiar fase" placement="top">
          <Box
            sx={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
            onClick={(e) => {
              setEditingPhase(cellParams.row.id as string);
              setPhaseMenuAnchor(e.currentTarget);
            }}
          >
            <Chip
              label={cellParams.value as string}
              size="small"
              sx={{
                bgcolor: (cellParams.row.phaseColor as string) || theme.palette.grey[400],
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: `0 4px 12px ${alpha(
                    (cellParams.row.phaseColor as string) || theme.palette.grey[400],
                    0.3
                  )}`,
                },
              }}
              icon={<CheckCircleIcon sx={{ fontSize: 16, color: "#fff !important" }} />}
            />
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "connectedTasks",
      headerName: "Tareas conectadas",
      width: 320,
      renderCell: (cellParams) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center" sx={{ py: 0.5 }}>
          {(cellParams.value as Array<{ id: string; title: string }>).map((task) => (
            <Zoom key={task.id} in timeout={200}>
              <Chip
                label={task.title}
                size="small"
                onDelete={() => handleDisconnectTask(cellParams.row.id as string, task.id)}
                sx={{
                  m: 0.25,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  color: theme.palette.success.dark,
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                    transform: "translateY(-1px)",
                  },
                }}
                deleteIcon={
                  <CloseIcon
                    sx={{
                      fontSize: 16,
                      "&:hover": {
                        color: theme.palette.error.main,
                      },
                    }}
                  />
                }
              />
            </Zoom>
          ))}
          <Tooltip title="Conectar tareas" placement="top">
            <IconButton
              size="small"
              onClick={() => {
                setTaskSearchOpen(cellParams.row.id as string);
                setTaskSearchText("");
              }}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  transform: "rotate(90deg)",
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
    {
      field: "estimatedEffort",
      headerName: "Esfuerzo estimado",
      width: 160,
      renderCell: (cellParams) => (
        <Tooltip title="Click para cambiar esfuerzo" placement="top">
          <Box
            sx={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              px: 1.5,
              borderRadius: 1.5,
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.warning.main, 0.08),
              },
            }}
            onClick={(e) => {
              setEditingEffort(cellParams.row.id as string);
              setEffortMenuAnchor(e.currentTarget);
            }}
          >
            <Typography
              variant="body2"
              fontWeight={cellParams.value ? 600 : 400}
              color={cellParams.value ? "warning.dark" : "text.secondary"}
            >
              {cellParams.value || "Sin estimar"}
            </Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "epicId",
      headerName: "ID",
      width: 100,
      renderCell: (cellParams) => (
        <Chip
          label={cellParams.value as string}
          size="small"
          variant="outlined"
          sx={{
            borderColor: alpha(theme.palette.text.primary, 0.2),
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Acciones",
      width: 80,
      getActions: (cellParams) => [
        <GridActionsCellItem
          key="delete"
          icon={
            <Tooltip title="Eliminar épica">
              <DeleteIcon />
            </Tooltip>
          }
          label="Eliminar"
          onClick={() => handleDeleteEpic(cellParams.row.id as string)}
        />,
      ],
    },
  ];
};