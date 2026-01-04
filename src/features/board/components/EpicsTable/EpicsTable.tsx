import {
  Box,
  Alert,
  Badge,
  Button,
  CircularProgress,
  Container,
  Fade,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import { useEpicsTable } from "../../hooks/useEpicsTable";
import { DataTable, DataTableHeader, DataTableToolbar } from "../../../../shared/ui/DataTable";
import { createEpicsTableColumns } from "./columns";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { EmptyState } from "../../../../shared/ui/EmptyState";
import { useProject } from "../../../../shared/contexts/ProjectContext";
import {
  FilterMenu,
  SortMenu,
  HideMenu,
  ProjectMenu,
  PhaseMenu,
  EffortMenu,
  TaskConnectDialog,
  DeleteConfirmDialog,
} from "./menus";

type EpicsTableProps = {
  userId: string;
};

const EpicsTable = ({ userId }: EpicsTableProps) => {
  const theme = useTheme();
  const epic = useEpicsTable(userId);
  const { currentProject } = useProject();

  const columns = createEpicsTableColumns({
    theme,
    editingName: epic.editingName,
    editingPhase: epic.editingPhase,
    editingEffort: epic.editingEffort,
    editingProject: epic.editingProject,
    setEditingName: epic.setEditingName,
    setEditingPhase: epic.setEditingPhase,
    setEditingEffort: epic.setEditingEffort,
    setEditingProject: epic.setEditingProject,
    setPhaseMenuAnchor: epic.setPhaseMenuAnchor,
    setEffortMenuAnchor: epic.setEffortMenuAnchor,
    setProjectMenuAnchor: epic.setProjectMenuAnchor,
    setTaskSearchOpen: epic.setTaskSearchOpen,
    setTaskSearchText: epic.setTaskSearchText,
    handleNameChange: epic.handleNameChange,
    handleDisconnectTask: epic.handleDisconnectTask,
    handleDeleteEpic: epic.handleDeleteEpic,
  });

  if (epic.isLoading) {
    return (
      <Container maxWidth={false}>
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress size={48} thickness={4} />
          <Typography color="text.secondary" variant="h6">
            Cargando épicas...
          </Typography>
        </Stack>
      </Container>
    );
  }

    if (!currentProject) {
    return (
      <Container maxWidth={false}>
        <Stack spacing={4} alignItems="center" py={8}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <FolderIcon sx={{ fontSize: 64, color: "primary.main", opacity: 0.6 }} />
          </Box>

          <Stack spacing={2} alignItems="center" maxWidth={500}>
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Selecciona un proyecto
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Para crear y gestionar épicas, primero debes seleccionar un proyecto desde el menú
              lateral. Las épicas se organizan por proyecto.
            </Typography>
          </Stack>

          <Alert severity="info" sx={{ maxWidth: 500 }}>
            <Typography variant="body2">
              <strong>Consejo:</strong> Si no tienes proyectos, créa uno desde el selector de
              proyectos en la barra lateral.
            </Typography>
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth={false}>
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
              onClick={epic.handleAddEpic}
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
            <Fade in={!epic.searchOpen}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => epic.setSearchOpen(true)}
                sx={{
                  borderRadius: 2,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                }}
              >
                Buscar
              </Button>
            </Fade>

            {epic.searchOpen && (
              <Fade in={epic.searchOpen}>
                <TextField
                  size="small"
                  placeholder="Buscar épicas..."
                  value={epic.searchText}
                  onChange={(e) => epic.setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={() => {
                          epic.setSearchOpen(false);
                          epic.setSearchText("");
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

            <Badge badgeContent={epic.activeFiltersCount} color="primary">
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={(e) => epic.setFilterAnchor(e.currentTarget)}
                sx={{
                  borderRadius: 2,
                  borderColor:
                    epic.activeFiltersCount > 0
                      ? theme.palette.primary.main
                      : alpha(theme.palette.primary.main, 0.3),
                  bgcolor:
                    epic.activeFiltersCount > 0
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
              onClick={(e) => epic.setSortAnchor(e.currentTarget)}
              sx={{
                borderRadius: 2,
                borderColor: alpha(theme.palette.primary.main, 0.3),
              }}
            >
              Ordenar
            </Button>

            <Badge badgeContent={epic.hiddenEpics.length} color="secondary">
              <Button
                variant="outlined"
                startIcon={<VisibilityOffIcon />}
                onClick={(e) => epic.setHideAnchor(e.currentTarget)}
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
        {epic.rows.length === 0 ? (
          <EmptyState
            icon={faLayerGroup}
            title="No hay épicas"
            description="Crea tu primera épica para organizar grandes características o iniciativas de tu proyecto."
            action={{
              label: "Crear Primera Épica",
              onClick: epic.handleAddEpic,
            }}
          />
        ) : (
          <DataTable rows={epic.rows} columns={columns} />
        )}

        {/* Menús */}
        <FilterMenu
          anchorEl={epic.filterAnchor}
          filters={epic.filters}
          projects={epic.projects}
          phases={epic.phases}
          pointValues={epic.pointValues}
          onClose={() => epic.setFilterAnchor(null)}
          onFilterChange={epic.setFilters}
        />

        <SortMenu
          anchorEl={epic.sortAnchor}
          sortColumn={epic.sortColumn}
          sortOrder={epic.sortOrder}
          onClose={() => epic.setSortAnchor(null)}
          onSortColumnChange={epic.setSortColumn}
          onSortOrderChange={epic.setSortOrder}
        />

        <HideMenu
          anchorEl={epic.hideAnchor}
          hiddenEpics={epic.hiddenEpics}
          epics={epic.epics}
          onClose={() => epic.setHideAnchor(null)}
          onHiddenEpicsChange={epic.setHiddenEpics}
        />

        <ProjectMenu
          anchorEl={epic.projectMenuAnchor}
          editingProject={epic.editingProject}
          projects={epic.projects}
          onClose={() => {
            epic.setProjectMenuAnchor(null);
            epic.setEditingProject(null);
          }}
          onProjectChange={epic.handleProjectChange}
        />

        <PhaseMenu
          anchorEl={epic.phaseMenuAnchor}
          editingPhase={epic.editingPhase}
          phases={epic.phases}
          onClose={() => {
            epic.setPhaseMenuAnchor(null);
            epic.setEditingPhase(null);
          }}
          onPhaseChange={epic.handlePhaseChange}
        />

        <EffortMenu
          anchorEl={epic.effortMenuAnchor}
          editingEffort={epic.editingEffort}
          pointValues={epic.pointValues}
          onClose={() => {
            epic.setEffortMenuAnchor(null);
            epic.setEditingEffort(null);
          }}
          onEffortChange={epic.handleEffortChange}
        />

        {/* Diálogos */}
        <TaskConnectDialog
          open={epic.taskSearchOpen !== null}
          taskSearchText={epic.taskSearchText}
          taskOptions={epic.taskOptions}
          connectedTaskIds={
            epic.rows.find((r) => r.id === epic.taskSearchOpen)?.connectedTasks?.map((t: any) => t.id) ||
            []
          }
          onClose={() => {
            epic.setTaskSearchOpen(null);
            epic.setTaskSearchText("");
            epic.setTaskOptions([]);
          }}
          onSearchTextChange={epic.setTaskSearchText}
          onTaskToggle={(taskId, isConnected) => {
            if (epic.taskSearchOpen) {
              if (isConnected) {
                epic.handleDisconnectTask(epic.taskSearchOpen, taskId);
              } else {
                epic.handleConnectTask(epic.taskSearchOpen, taskId);
              }
            }
          }}
        />

        <DeleteConfirmDialog
          open={epic.deleteDialogOpen}
          onClose={() => {
            epic.setDeleteDialogOpen(false);
            epic.setEpicToDelete(null);
          }}
          onConfirm={epic.confirmDeleteEpic}
        />
      </Stack>
    </Container>
  );
};

export default EpicsTable;