import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Badge,
  Tooltip,
  Fade,
  Zoom,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRowsProp,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LinkIcon from "@mui/icons-material/Link";
import FolderIcon from "@mui/icons-material/Folder";
import {
  fetchEpics,
  fetchEpicPhases,
  createEpic,
  updateEpic,
  deleteEpic,
  connectTaskToEpic,
  disconnectTaskFromEpic,
  searchTasks,
  type EpicWithDetails,
  type EpicPhase,
} from "../../api/epicService";
import {
  fetchDefaultPointSystem,
  fetchPointValues,
  type PointValue,
} from "../../api/catalogService";
import { fetchProjects, linkEpicToProject, type ProjectWithTags } from "../../api/projectService";
import { useProject } from "../../../shared/contexts/ProjectContext";

type EpicsTableProps = {
  userId: string;
};

const EpicsTable = ({ userId }: EpicsTableProps) => {
  const theme = useTheme();
  const [epics, setEpics] = useState<EpicWithDetails[]>([]);
  const [phases, setPhases] = useState<EpicPhase[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [projects, setProjects] = useState<ProjectWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [rows, setRows] = useState<GridRowsProp>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [hideAnchor, setHideAnchor] = useState<HTMLElement | null>(null);

  const { currentProject } = useProject();

  const [filters, setFilters] = useState<{
    phases: string[];
    efforts: string[];
    projects: string[];
  }>({
    phases: [],
    efforts: [],
    projects: [],
  });

  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [hiddenEpics, setHiddenEpics] = useState<string[]>([]);

  const [taskSearchOpen, setTaskSearchOpen] = useState<string | null>(null);
  const [taskOptions, setTaskOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [taskSearchText, setTaskSearchText] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [epicToDelete, setEpicToDelete] = useState<string | null>(null);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingEffort, setEditingEffort] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [phaseMenuAnchor, setPhaseMenuAnchor] = useState<HTMLElement | null>(null);
  const [effortMenuAnchor, setEffortMenuAnchor] = useState<HTMLElement | null>(null);
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<HTMLElement | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [epicsData, phasesData, pointSystem, projectsData] = await Promise.all([
        fetchEpics(userId, currentProject?.id ?? null),
        fetchEpicPhases(),
        fetchDefaultPointSystem(),
        fetchProjects(userId),
      ]);

      setEpics(epicsData);
      setPhases(phasesData);
      setProjects(projectsData);

      if (pointSystem) {
        const points = await fetchPointValues(pointSystem.id);
        setPointValues(points);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId, currentProject]);

  useEffect(() => {
    let processedEpics = epics.filter((epic) => !hiddenEpics.includes(epic.id));

    if (searchText) {
      processedEpics = processedEpics.filter(
        (epic) =>
          epic.name.toLowerCase().includes(searchText.toLowerCase()) ||
          epic.epic_id_display?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filters.phases.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.phases.includes(epic.phase_id || "")
      );
    }

    if (filters.efforts.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.efforts.includes(epic.estimated_effort || "")
      );
    }

    if (filters.projects.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.projects.includes(epic.project_id || "")
      );
    }

    processedEpics.sort((a, b) => {
      let aValue: string = "";
      let bValue: string = "";

      switch (sortColumn) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "phase":
          aValue = a.phase_name || "";
          bValue = b.phase_name || "";
          break;
        case "effort":
          aValue = a.estimated_effort || "";
          bValue = b.estimated_effort || "";
          break;
        case "project": {
          const projectA = projects.find(p => p.id === a.project_id);
          const projectB = projects.find(p => p.id === b.project_id);
          aValue = projectA?.title || "";
          bValue = projectB?.title || "";
          break;
        }
        case "epicId":
          aValue = a.epic_id_display || "";
          bValue = b.epic_id_display || "";
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const mappedRows = processedEpics.map((epic) => {
      const project = projects.find(p => p.id === epic.project_id);
      
      return {
        id: epic.id,
        name: epic.name,
        owner: "Usuario",
        phase_id: epic.phase_id,
        phase: epic.phase_name || "Sin fase",
        phaseColor: epic.phase_color,
        project_id: epic.project_id,
        project: project?.title || "Sin proyecto",
        projectTags: project?.tags || [],
        connectedTasks: epic.connected_tasks || [],
        estimatedEffort: epic.estimated_effort || "",
        epicId: epic.epic_id_display || "-",
      };
    });

    setRows(mappedRows);
  }, [epics, projects, hiddenEpics, searchText, filters, sortColumn, sortOrder]);

  useEffect(() => {
    if (taskSearchOpen !== null) {
      searchTasks(userId, taskSearchText).then(setTaskOptions);
    }
  }, [taskSearchText, taskSearchOpen, userId]);

  const handleAddEpic = async () => {
    try {
      await createEpic(userId, { 
        name: "Nueva épica",
        project_id: currentProject?.id ?? null 
      });
      await loadData();
    } catch (error) {
      console.error("Error creando épica:", error);
    }
  };

  const handleNameChange = async (epicId: string, newName: string) => {
    try {
      await updateEpic(epicId, { name: newName });
      await loadData();
    } catch (error) {
      console.error("Error actualizando nombre:", error);
    }
  };

  const handlePhaseChange = async (epicId: string, phaseId: string) => {
    try {
      await updateEpic(epicId, { phase_id: phaseId || null });
      await loadData();
    } catch (error) {
      console.error("Error actualizando fase:", error);
    }
  };

  const handleEffortChange = async (epicId: string, effort: string) => {
    try {
      await updateEpic(epicId, { estimated_effort: effort || null });
      await loadData();
    } catch (error) {
      console.error("Error actualizando esfuerzo:", error);
    }
  };

  const handleProjectChange = async (epicId: string, projectId: string) => {
    try {
      await linkEpicToProject(epicId, projectId || null);
      await loadData();
    } catch (error) {
      console.error("Error actualizando proyecto:", error);
    }
  };

  const handleConnectTask = async (epicId: string, taskId: string) => {
    try {
      await connectTaskToEpic(epicId, taskId);
      await loadData();
    } catch (error) {
      console.error("Error conectando tarea:", error);
    }
  };

  const handleDisconnectTask = async (epicId: string, taskId: string) => {
    try {
      await disconnectTaskFromEpic(epicId, taskId);
      await loadData();
    } catch (error) {
      console.error("Error desconectando tarea:", error);
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    setEpicToDelete(epicId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEpic = async () => {
    if (!epicToDelete) return;

    try {
      await deleteEpic(epicToDelete);
      await loadData();
      setDeleteDialogOpen(false);
      setEpicToDelete(null);
    } catch (error) {
      console.error("Error eliminando épica:", error);
    }
  };

  const activeFiltersCount = filters.phases.length + filters.efforts.length + filters.projects.length;

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Épica",
      width: 250,
      renderCell: (params) => {
        const isEditing = editingName === params.row.id;
        
        if (isEditing) {
          return (
            <TextField
              autoFocus
              fullWidth
              size="small"
              defaultValue={params.value as string}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleNameChange(params.row.id as string, e.target.value);
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
              onClick={() => setEditingName(params.row.id as string)}
            >
              <EditIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
              <Typography variant="body2" fontWeight={600}>
                {params.value as string}
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
      renderCell: (params) => (
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
              setEditingProject(params.row.id as string);
              setProjectMenuAnchor(e.currentTarget);
            }}
          >
            <Chip
              label={params.value as string}
              size="small"
              icon={<FolderIcon sx={{ fontSize: 16, color: "inherit !important" }} />}
              sx={{
                bgcolor: params.row.project_id 
                  ? alpha(theme.palette.info.main, 0.1)
                  : alpha(theme.palette.grey[500], 0.1),
                color: params.row.project_id 
                  ? theme.palette.info.dark
                  : theme.palette.text.secondary,
                border: `1px solid ${params.row.project_id 
                  ? alpha(theme.palette.info.main, 0.3)
                  : alpha(theme.palette.grey[500], 0.2)}`,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: `0 4px 12px ${alpha(
                    params.row.project_id ? theme.palette.info.main : theme.palette.grey[500], 
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
      renderCell: (params) => (
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
              setEditingPhase(params.row.id as string);
              setPhaseMenuAnchor(e.currentTarget);
            }}
          >
            <Chip
              label={params.value as string}
              size="small"
              sx={{
                bgcolor: (params.row.phaseColor as string) || theme.palette.grey[400],
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: `0 4px 12px ${alpha((params.row.phaseColor as string) || theme.palette.grey[400], 0.3)}`,
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
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center" sx={{ py: 0.5 }}>
          {(params.value as Array<{ id: string; title: string }>).map((task) => (
            <Zoom key={task.id} in timeout={200}>
              <Chip
                label={task.title}
                size="small"
                onDelete={() => handleDisconnectTask(params.row.id as string, task.id)}
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
                setTaskSearchOpen(params.row.id as string);
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
      renderCell: (params) => (
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
              setEditingEffort(params.row.id as string);
              setEffortMenuAnchor(e.currentTarget);
            }}
          >
            <Typography 
              variant="body2" 
              fontWeight={params.value ? 600 : 400}
              color={params.value ? "warning.dark" : "text.secondary"}
            >
              {params.value || "Sin estimar"}
            </Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "epicId",
      headerName: "ID",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value as string}
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
      headerName: "",
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          key="delete"
          icon={
            <Tooltip title="Eliminar épica" color="error">
              <DeleteIcon />
            </Tooltip>
          }
          label="Eliminar"
          onClick={() => handleDeleteEpic(params.row.id as string)}
        />,
      ],
    },
  ];

  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress size={48} thickness={4} />
          <Typography color="text.secondary" variant="h6">
            Cargando épicas...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Stack spacing={3}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, 
              ${alpha(theme.palette.primary.main, 0.08)} 0%, 
              ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Épicas
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Gestiona las épicas de tu proyecto y conecta tareas relacionadas.
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={handleAddEpic}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              >
                Nueva Épica
              </Button>
            </Stack>

            {/* Toolbar */}
            <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
              <Fade in={!searchOpen}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={() => setSearchOpen(true)}
                  sx={{
                    borderRadius: 2,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  }}
                >
                  Buscar
                </Button>
              </Fade>
              
              {searchOpen && (
                <Fade in={searchOpen}>
                  <TextField
                    size="small"
                    placeholder="Buscar épicas..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                      endAdornment: (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchText("");
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      ),
                    }}
                    sx={{
                      width: 300,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "background.paper",
                      },
                    }}
                  />
                </Fade>
              )}

              <Badge badgeContent={activeFiltersCount} color="primary">
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={(e) => setFilterAnchor(e.currentTarget)}
                  sx={{
                    borderRadius: 2,
                    borderColor: activeFiltersCount > 0 
                      ? theme.palette.primary.main 
                      : alpha(theme.palette.primary.main, 0.3),
                    bgcolor: activeFiltersCount > 0 
                      ? alpha(theme.palette.primary.main, 0.08) 
                      : "transparent",
                  }}
                >
                  Filtrar
                </Button>
              </Badge>

              <Button
                variant="outlined"
                startIcon={<SortIcon />}
                onClick={(e) => setSortAnchor(e.currentTarget)}
                sx={{
                  borderRadius: 2,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                }}
              >
                Ordenar
              </Button>

              <Badge badgeContent={hiddenEpics.length} color="secondary">
                <Button
                  variant="outlined"
                  startIcon={<VisibilityOffIcon />}
                  onClick={(e) => setHideAnchor(e.currentTarget)}
                  sx={{
                    borderRadius: 2,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  }}
                >
                  Ocultar
                </Button>
              </Badge>
            </Stack>
          </Stack>
        </Paper>

        {/* DataGrid */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderBottom: `2px solid ${theme.palette.divider}`,
                  fontWeight: 700,
                },
                "& .MuiDataGrid-cell": {
                  py: 1.5,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  display: "flex",
                  alignItems: "center",
                },
                "& .MuiDataGrid-row": {
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    cursor: "pointer",
                  },
                },
                "& .MuiDataGrid-cell:focus": {
                  outline: "none",
                },
                "& .MuiDataGrid-cell:focus-within": {
                  outline: "none",
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTop: `2px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.background.paper, 0.5),
                },
              }}
            />
          </Box>
        </Paper>

        {/* Menu de Filtros */}
        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={() => setFilterAnchor(null)}
          PaperProps={{
            sx: {
              width: 320,
              maxHeight: 500,
              borderRadius: 2,
              mt: 1,
            },
          }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2" fontWeight={700}>
              Filtros
            </Typography>
          </MenuItem>
          <Divider />

          {/* Filtro por Proyecto */}
          <MenuItem>
            <Stack spacing={1} width="100%">
              <Typography variant="body2" fontWeight={600} color="primary">
                Por Proyecto
              </Typography>
              {projects.map((project) => (
                <Box key={project.id} display="flex" alignItems="center">
                  <Checkbox
                    size="small"
                    checked={filters.projects.includes(project.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({
                          ...filters,
                          projects: [...filters.projects, project.id],
                        });
                      } else {
                        setFilters({
                          ...filters,
                          projects: filters.projects.filter((id) => id !== project.id),
                        });
                      }
                    }}
                  />
                  <ListItemText primary={project.title} />
                </Box>
              ))}
            </Stack>
          </MenuItem>

          <Divider />

          {/* Filtro por Fase */}
          <MenuItem>
            <Stack spacing={1} width="100%">
              <Typography variant="body2" fontWeight={600} color="primary">
                Por Fase
              </Typography>
              {phases.map((phase) => (
                <Box key={phase.id} display="flex" alignItems="center">
                  <Checkbox
                    size="small"
                    checked={filters.phases.includes(phase.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({
                          ...filters,
                          phases: [...filters.phases, phase.id],
                        });
                      } else {
                        setFilters({
                          ...filters,
                          phases: filters.phases.filter((id) => id !== phase.id),
                        });
                      }
                    }}
                  />
                  <ListItemText primary={phase.name} />
                </Box>
              ))}
            </Stack>
          </MenuItem>

          <Divider />

          {/* Filtro por Esfuerzo */}
          <MenuItem>
            <Stack spacing={1} width="100%">
              <Typography variant="body2" fontWeight={600} color="primary">
                Por Esfuerzo
              </Typography>
              {pointValues.map((point) => (
                <Box key={point.id} display="flex" alignItems="center">
                  <Checkbox
                    size="small"
                    checked={filters.efforts.includes(point.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({
                          ...filters,
                          efforts: [...filters.efforts, point.value],
                        });
                      } else {
                        setFilters({
                          ...filters,
                          efforts: filters.efforts.filter((v) => v !== point.value),
                        });
                      }
                    }}
                  />
                  <ListItemText primary={point.value} />
                </Box>
              ))}
            </Stack>
          </MenuItem>

          <Divider />

          <MenuItem>
            <Button
              fullWidth
              size="small"
              onClick={() => setFilters({ phases: [], efforts: [], projects: [] })}
              sx={{ borderRadius: 1.5 }}
            >
              Limpiar filtros
            </Button>
          </MenuItem>
        </Menu>

        {/* Menu de Ordenar */}
        <Menu
          anchorEl={sortAnchor}
          open={Boolean(sortAnchor)}
          onClose={() => setSortAnchor(null)}
          PaperProps={{
            sx: { width: 300, p: 2, borderRadius: 2, mt: 1 },
          }}
        >
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={700}>
              Ordenar por
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Columna</InputLabel>
              <Select
                value={sortColumn}
                label="Columna"
                onChange={(e) => setSortColumn(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="name">Épica</MenuItem>
                <MenuItem value="project">Proyecto</MenuItem>
                <MenuItem value="phase">Fase</MenuItem>
                <MenuItem value="effort">Esfuerzo estimado</MenuItem>
                <MenuItem value="epicId">ID de épica</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Orden</InputLabel>
              <Select
                value={sortOrder}
                label="Orden"
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="asc">Ascendente (A-Z)</MenuItem>
                <MenuItem value="desc">Descendente (Z-A)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Menu>

        {/* Menu de Ocultar */}
        <Menu
          anchorEl={hideAnchor}
          open={Boolean(hideAnchor)}
          onClose={() => setHideAnchor(null)}
          PaperProps={{
            sx: { width: 320, maxHeight: 400, borderRadius: 2, mt: 1 },
          }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2" fontWeight={700}>
              Ocultar épicas
            </Typography>
          </MenuItem>
          <Divider />

          {epics.map((epic) => (
            <MenuItem key={epic.id}>
              <Checkbox
                checked={hiddenEpics.includes(epic.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setHiddenEpics([...hiddenEpics, epic.id]);
                  } else {
                    setHiddenEpics(hiddenEpics.filter((id) => id !== epic.id));
                  }
                }}
              />
              <ListItemText primary={epic.name} />
            </MenuItem>
          ))}

          {hiddenEpics.length > 0 && (
            <>
              <Divider />
              <MenuItem>
                <Button 
                  fullWidth 
                  size="small" 
                  onClick={() => setHiddenEpics([])}
                  sx={{ borderRadius: 1.5 }}
                >
                  Mostrar todas
                </Button>
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Menu de Proyecto */}
        <Menu
          anchorEl={projectMenuAnchor}
          open={Boolean(projectMenuAnchor) && editingProject !== null}
          onClose={() => {
            setProjectMenuAnchor(null);
            setEditingProject(null);
          }}
          PaperProps={{
            sx: { borderRadius: 2, mt: 1, minWidth: 250 },
          }}
        >
          <MenuItem
            onClick={() => {
              if (editingProject) {
                handleProjectChange(editingProject, "");
              }
              setProjectMenuAnchor(null);
              setEditingProject(null);
            }}
          >
            <em>Sin proyecto</em>
          </MenuItem>
          <Divider />
          {projects.map((project) => (
            <MenuItem
              key={project.id}
              onClick={() => {
                if (editingProject) {
                  handleProjectChange(editingProject, project.id);
                }
                setProjectMenuAnchor(null);
                setEditingProject(null);
              }}
            >
              <Stack spacing={0.5} width="100%">
                <Typography fontWeight={500}>{project.title}</Typography>
                {project.tags.length > 0 && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {project.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem", height: 18 }}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            </MenuItem>
          ))}
        </Menu>

        {/* Menu de Fase */}
        <Menu
          anchorEl={phaseMenuAnchor}
          open={Boolean(phaseMenuAnchor) && editingPhase !== null}
          onClose={() => {
            setPhaseMenuAnchor(null);
            setEditingPhase(null);
          }}
          PaperProps={{
            sx: { borderRadius: 2, mt: 1 },
          }}
        >
          <MenuItem
            onClick={() => {
              if (editingPhase) {
                handlePhaseChange(editingPhase, "");
              }
              setPhaseMenuAnchor(null);
              setEditingPhase(null);
            }}
          >
            <em>Sin fase</em>
          </MenuItem>
          {phases.map((phase) => (
            <MenuItem
              key={phase.id}
              onClick={() => {
                if (editingPhase) {
                  handlePhaseChange(editingPhase, phase.id);
                }
                setPhaseMenuAnchor(null);
                setEditingPhase(null);
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: phase.color || "#ccc",
                  }}
                />
                <Typography>{phase.name}</Typography>
              </Stack>
            </MenuItem>
          ))}
        </Menu>

        {/* Menu de Esfuerzo */}
        <Menu
          anchorEl={effortMenuAnchor}
          open={Boolean(effortMenuAnchor) && editingEffort !== null}
          onClose={() => {
            setEffortMenuAnchor(null);
            setEditingEffort(null);
          }}
          PaperProps={{
            sx: { borderRadius: 2, mt: 1 },
          }}
        >
          <MenuItem
            onClick={() => {
              if (editingEffort) {
                handleEffortChange(editingEffort, "");
              }
              setEffortMenuAnchor(null);
              setEditingEffort(null);
            }}
          >
            <em>Sin estimar</em>
          </MenuItem>
          {pointValues.map((point) => (
            <MenuItem
              key={point.id}
              onClick={() => {
                if (editingEffort) {
                  handleEffortChange(editingEffort, point.value);
                }
                setEffortMenuAnchor(null);
                setEditingEffort(null);
              }}
            >
              {point.value}
            </MenuItem>
          ))}
        </Menu>

        {/* Dialog de conectar tareas */}
        <Dialog
          open={taskSearchOpen !== null}
          onClose={() => {
            setTaskSearchOpen(null);
            setTaskSearchText("");
            setTaskOptions([]);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              height: "80vh",
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LinkIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Conectar Tareas
                </Typography>
              </Stack>
              
              <TextField
                size="small"
                placeholder="Buscar tareas..."
                value={taskSearchText}
                onChange={(e) => setTaskSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ p: 0 }}>
            <Stack>
              <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <Typography variant="subtitle2" color="primary" fontWeight={600}>
                  Todas las tareas
                </Typography>
              </Box>

              <Stack sx={{ maxHeight: "calc(80vh - 220px)", overflow: "auto" }}>
                {taskOptions.length === 0 ? (
                  <Stack alignItems="center" py={6}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Cargando tareas...
                    </Typography>
                  </Stack>
                ) : (
                  taskOptions.map((task) => {
                    const epicRow = rows.find((r) => r.id === taskSearchOpen);
                    const isConnected = epicRow
                      ? (epicRow.connectedTasks as Array<{ id: string; title: string }>).some(
                          (t) => t.id === task.id
                        )
                      : false;

                    return (
                      <Box
                        key={task.id}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          bgcolor: isConnected ? alpha(theme.palette.primary.main, 0.05) : "transparent",
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                        onClick={() => {
                          if (taskSearchOpen) {
                            if (isConnected) {
                              handleDisconnectTask(taskSearchOpen, task.id);
                            } else {
                              handleConnectTask(taskSearchOpen, task.id);
                            }
                          }
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Checkbox
                            checked={isConnected}
                            sx={{ p: 0 }}
                          />
                          <Typography variant="body2" fontWeight={isConnected ? 600 : 400}>
                            {task.title}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })
                )}
              </Stack>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              {taskOptions.length} tarea{taskOptions.length !== 1 ? "s" : ""} disponible
              {taskOptions.length !== 1 ? "s" : ""}
            </Typography>
            <Button
              onClick={() => {
                setTaskSearchOpen(null);
                setTaskSearchText("");
                setTaskOptions([]);
              }}
              sx={{ borderRadius: 1.5 }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de confirmación de eliminación */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setEpicToDelete(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle>
            <Stack direction="row" spacing={1} alignItems="center">
              <DeleteIcon color="error" />
              <Typography variant="h6" fontWeight={600}>
                Eliminar Épica
              </Typography>
            </Stack>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2} pt={1}>
              <Typography>
                ¿Estás seguro de que deseas eliminar esta épica?
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="error.dark" fontWeight={600}>
                  ⚠️ Esta acción no se puede deshacer
                </Typography>
              </Paper>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setEpicToDelete(null);
              }}
              sx={{ borderRadius: 1.5 }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={confirmDeleteEpic}
              startIcon={<DeleteIcon />}
              sx={{
                borderRadius: 1.5,
                boxShadow: `0 4px 14px ${alpha(theme.palette.error.main, 0.3)}`,
                "&:hover": {
                  boxShadow: `0 6px 20px ${alpha(theme.palette.error.main, 0.4)}`,
                },
              }}
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  );
};

export default EpicsTable;