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
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import { useEpicsTable } from "../../hooks/useEpicsTable";
import { DataTable, DataTableHeader, DataTableToolbar } from "../../../../shared/ui/DataTable";
import { createEpicsTableColumns } from "./columns";

type EpicsTableProps = {
  userId: string;
};

const EpicsTable = ({ userId }: EpicsTableProps) => {
  const theme = useTheme();
  const {
    // Estado
    epics,
    phases,
    pointValues,
    projects,
    isLoading,
    rows,
    searchOpen,
    searchText,
    filters,
    sortColumn,
    sortOrder,
    hiddenEpics,
    filterAnchor,
    sortAnchor,
    hideAnchor,
    phaseMenuAnchor,
    effortMenuAnchor,
    projectMenuAnchor,
    editingName,
    editingPhase,
    editingEffort,
    editingProject,
    taskSearchOpen,
    taskOptions,
    taskSearchText,
    deleteDialogOpen,
    activeFiltersCount,

    // Setters
    setSearchOpen,
    setSearchText,
    setFilters,
    setSortColumn,
    setSortOrder,
    setHiddenEpics,
    setFilterAnchor,
    setSortAnchor,
    setHideAnchor,
    setPhaseMenuAnchor,
    setEffortMenuAnchor,
    setProjectMenuAnchor,
    setEditingName,
    setEditingPhase,
    setEditingEffort,
    setEditingProject,
    setTaskSearchOpen,
    setTaskSearchText,
    setTaskOptions,
    setDeleteDialogOpen,
    setEpicToDelete,

    // Handlers
    handleAddEpic,
    handleNameChange,
    handlePhaseChange,
    handleEffortChange,
    handleProjectChange,
    handleConnectTask,
    handleDisconnectTask,
    handleDeleteEpic,
    confirmDeleteEpic,
  } = useEpicsTable(userId);

  const columns = createEpicsTableColumns({
    theme,
    editingName,
    editingPhase,
    editingEffort,
    editingProject,
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
  });

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
        <DataTableHeader
          title="Épicas"
          subtitle="Gestiona las épicas de tu proyecto y conecta tareas relacionadas."
          action={
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
          }
        />

        {/* Toolbar Container */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <DataTableToolbar>
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
                  borderColor:
                    activeFiltersCount > 0
                      ? theme.palette.primary.main
                      : alpha(theme.palette.primary.main, 0.3),
                  bgcolor:
                    activeFiltersCount > 0 ? alpha(theme.palette.primary.main, 0.08) : "transparent",
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
          </DataTableToolbar>
        </Paper>

        {/* DataGrid */}
        <DataTable rows={rows} columns={columns} />

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
                <Button fullWidth size="small" onClick={() => setHiddenEpics([])} sx={{ borderRadius: 1.5 }}>
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
                          bgcolor: isConnected
                            ? alpha(theme.palette.primary.main, 0.05)
                            : "transparent",
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
                          <Checkbox checked={isConnected} sx={{ p: 0 }} />
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
              <Typography>¿Estás seguro de que deseas eliminar esta épica?</Typography>
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