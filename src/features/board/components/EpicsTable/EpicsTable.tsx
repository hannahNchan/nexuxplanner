import {
  Box,
  Alert,
  Badge,
  Button,
  CircularProgress,
  Container,
  Fade,
  IconButton,
  Snackbar,
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
import { DataTable, DataTableHeader } from "../../../../shared/ui/DataTable";
import { createEpicsTableColumns } from "./columns";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { EmptyState } from "../../../../shared/ui/EmptyState";
import { WorkTableShell, WorkTableToolbar } from "../../../../shared/ui/WorkTable";
import { useProject } from "../../../../shared/contexts/ProjectContext";
import ReadOnlyProjectNotice from "../../../../shared/ui/ReadOnlyProjectNotice";
import {
  FilterMenu,
  SortMenu,
  HideMenu,
  ProjectMenu,
  PhaseMenu,
  ColorMenu,
  EffortMenu,
  TaskConnectDialog,
  DeleteConfirmDialog,
} from "./menus";

type EpicsTableProps = {
  userId: string;
};

type ConnectedTaskRef = {
  id: string;
};

const isConnectedTaskRef = (value: unknown): value is ConnectedTaskRef =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string";

const EpicsTable = ({ userId }: EpicsTableProps) => {
  const theme = useTheme();
  const epic = useEpicsTable(userId);
  const { currentProject } = useProject();
  const canEditProject = currentProject?.can_edit ?? true;
  const currentConnectedTasks = epic.rows.find((r) => r.id === epic.taskSearchOpen)?.connectedTasks;
  const connectedTaskIds = Array.isArray(currentConnectedTasks)
    ? currentConnectedTasks.filter(isConnectedTaskRef).map((task) => task.id)
    : [];

  const columns = createEpicsTableColumns({
    theme,
    editingName: epic.editingName,
    editingColor: epic.editingColor,
    editingPhase: epic.editingPhase,
    editingEffort: epic.editingEffort,
    editingProject: epic.editingProject,
    setEditingName: epic.setEditingName,
    setEditingColor: epic.setEditingColor,
    setEditingPhase: epic.setEditingPhase,
    setEditingEffort: epic.setEditingEffort,
    setEditingProject: epic.setEditingProject,
    setColorMenuAnchor: epic.setColorMenuAnchor,
    setPhaseMenuAnchor: epic.setPhaseMenuAnchor,
    setEffortMenuAnchor: epic.setEffortMenuAnchor,
    setProjectMenuAnchor: epic.setProjectMenuAnchor,
    setTaskSearchOpen: epic.setTaskSearchOpen,
    setTaskSearchText: epic.setTaskSearchText,
    handleNameChange: epic.handleNameChange,
    handleEpicDateChange: epic.handleEpicDateChange,
    handleDisconnectTask: epic.handleDisconnectTask,
    handleDeleteEpic: epic.handleDeleteEpic,
    readOnly: !canEditProject,
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
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
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

  const tableHeader = (
    <DataTableHeader
      title="Épicas"
      subtitle="Gestiona las épicas de tu proyecto y conecta tareas relacionadas."
      action={
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={epic.handleAddEpic}
          disabled={!canEditProject}
          sx={{
            px: 3,
          }}
        >
          Nueva Épica
        </Button>
      }
    />
  );

  const tableToolbar = (
    <WorkTableToolbar>
      <Fade in={!epic.searchOpen}>
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={() => epic.setSearchOpen(true)}
          sx={{
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
            borderColor:
              epic.activeFiltersCount > 0
                ? theme.palette.primary.main
                : alpha(theme.palette.primary.main, 0.3),
            bgcolor:
              epic.activeFiltersCount > 0 ? alpha(theme.palette.primary.main, 0.08) : "transparent",
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
            borderColor: alpha(theme.palette.primary.main, 0.3),
          }}
        >
          Ocultar
        </Button>
      </Badge>
    </WorkTableToolbar>
  );

  return (
    <>
      <WorkTableShell
        header={
          <Stack spacing={2}>
            {tableHeader}
            {!canEditProject ? <ReadOnlyProjectNotice projectName={currentProject.title} /> : null}
          </Stack>
        }
        toolbar={tableToolbar}
      >
        {/* DataGrid */}
        {epic.rows.length === 0 ? (
          <EmptyState
            icon={faLayerGroup}
            title="No hay épicas"
            description="Crea tu primera épica para organizar grandes características o iniciativas de tu proyecto."
            action={
              canEditProject
                ? {
                    label: "Crear Primera Épica",
                    onClick: epic.handleAddEpic,
                  }
                : undefined
            }
          />
        ) : (
          <DataTable 
            rows={epic.rows} 
            columns={columns}
            height="100%"
            containerSx={{ height: "100%" }}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
            }}
          />
        )}
      </WorkTableShell>

        {/* Menús */}
        <ColorMenu
          anchorEl={epic.colorMenuAnchor}
          editingColor={epic.editingColor}
          currentColor={epic.rows.find((r) => r.id === epic.editingColor)?.color as string}
          onClose={() => {
            epic.setColorMenuAnchor(null);
            epic.setEditingColor(null);
          }}
          onColorChange={epic.handleColorChange}
        />
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
          isLoading={epic.isTaskSearchLoading}
          currentEpicId={epic.taskSearchOpen}
          connectedTaskIds={connectedTaskIds}
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

        <Snackbar
          open={Boolean(epic.notification)}
          autoHideDuration={5000}
          onClose={() => epic.setNotification(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          {epic.notification ? (
            <Alert
              severity={epic.notification.severity}
              variant="filled"
              onClose={() => epic.setNotification(null)}
              sx={{ width: "100%" }}
            >
              {epic.notification.message}
            </Alert>
          ) : undefined}
        </Snackbar>
    </>
  );
};

export default EpicsTable;
