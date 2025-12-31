import {
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
  Alert,
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import { useBacklogTable } from "../../hooks/useBacklogTable";
import { DataTable, DataTableHeader, DataTableToolbar } from "../../../../shared/ui/DataTable";
import { createBacklogTableColumns } from "./columns";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { EmptyState } from "../../../../shared/ui/EmptyState";
import { useProject } from "../../../../shared/contexts/ProjectContext";
import TaskEditorModal from "../../../board/components/TaskEditorModal";
import {
  PriorityMenu,
  EffortMenu,
  EpicMenu,
  AssigneeMenu,
  FilterMenu,
  SortMenu,
  HideMenu,
  DeleteConfirmDialog,
} from "./menus";

type BacklogTableProps = {
  userId: string;
};

const BacklogTable = ({ userId }: BacklogTableProps) => {
  const theme = useTheme();
  const backlog = useBacklogTable(userId);
  const { currentProject } = useProject();

  const columns = createBacklogTableColumns({
    theme,
    editingTitle: backlog.editingTitle,
    editingPriority: backlog.editingPriority,
    editingEffort: backlog.editingEffort,
    editingEpic: backlog.editingEpic,
    editingAssignee: backlog.editingAssignee,
    editingGithubLink: backlog.editingGithubLink,
    setEditingTitle: backlog.setEditingTitle,
    setEditingPriority: backlog.setEditingPriority,
    setEditingEffort: backlog.setEditingEffort,
    setEditingEpic: backlog.setEditingEpic,
    setEditingAssignee: backlog.setEditingAssignee,
    setEditingGithubLink: backlog.setEditingGithubLink,
    setPriorityMenuAnchor: backlog.setPriorityMenuAnchor,
    setEffortMenuAnchor: backlog.setEffortMenuAnchor,
    setEpicMenuAnchor: backlog.setEpicMenuAnchor,
    setAssigneeMenuAnchor: backlog.setAssigneeMenuAnchor,
    handleTitleChange: backlog.handleTitleChange,
    handleGithubLinkChange: backlog.handleGithubLinkChange,
    handleDeleteTask: backlog.handleDeleteTask,
  });

  if (!backlog.catalogsLoaded) {
    return (
      <Container maxWidth="xl">
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress size={48} thickness={4} />
          <Typography color="text.secondary" variant="h6">
            Cargando catálogos...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (backlog.isLoading) {
    return (
      <Container maxWidth="xl">
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress size={48} thickness={4} />
          <Typography color="text.secondary" variant="h6">
            Cargando backlog...
          </Typography>
        </Stack>
      </Container>
    );
  }

  // ✨ Si no hay proyecto seleccionado, mostrar mensaje
  if (!currentProject) {
    return (
      <Container maxWidth="xl">
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
              Para gestionar el backlog, primero debes seleccionar un proyecto desde el menú
              lateral. El backlog contiene las tareas pendientes de tu proyecto.
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
    <Container maxWidth="xl">
      <Stack spacing={3}>
        {/* Header */}
        <DataTableHeader
          title="Backlog"
          subtitle={`Gestiona las tareas pendientes de ${currentProject.title}. Estas tareas aún no están en el tablero Scrum.`}
          action={
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={backlog.handleAddTask}
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
              Nueva Tarea
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
            <Fade in={!backlog.searchOpen}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => backlog.setSearchOpen(true)}
                sx={{
                  borderRadius: 2,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                }}
              >
                Buscar
              </Button>
            </Fade>

            {backlog.searchOpen && (
              <Fade in={backlog.searchOpen}>
                <TextField
                  size="small"
                  placeholder="Buscar tareas..."
                  value={backlog.searchText}
                  onChange={(e) => backlog.setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={() => {
                          backlog.setSearchOpen(false);
                          backlog.setSearchText("");
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

            <Badge badgeContent={backlog.activeFiltersCount} color="primary">
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={(e) => backlog.setFilterAnchor(e.currentTarget)}
                sx={{
                  borderRadius: 2,
                  borderColor:
                    backlog.activeFiltersCount > 0
                      ? theme.palette.primary.main
                      : alpha(theme.palette.primary.main, 0.3),
                  bgcolor:
                    backlog.activeFiltersCount > 0
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
              onClick={(e) => backlog.setSortAnchor(e.currentTarget)}
              sx={{
                borderRadius: 2,
                borderColor: alpha(theme.palette.primary.main, 0.3),
              }}
            >
              Ordenar
            </Button>

            <Badge badgeContent={backlog.hiddenTasks.length} color="secondary">
              <Button
                variant="outlined"
                startIcon={<VisibilityOffIcon />}
                onClick={(e) => backlog.setHideAnchor(e.currentTarget)}
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
        {backlog.rows.length === 0 ? (
          <EmptyState
            icon={faClipboardList}
            title="No hay tareas en el backlog"
            description={`Crea tu primera tarea en el backlog de ${currentProject.title}. Las tareas del backlog son aquellas que aún no están en el tablero Scrum.`}
            action={{
              label: "Crear Primera Tarea",
              onClick: backlog.handleAddTask,
            }}
          />
        ) : (
          <DataTable rows={backlog.rows} columns={columns} />
        )}

        {/* Menús */}
        <FilterMenu
          anchorEl={backlog.filterAnchor}
          filters={backlog.filters}
          projects={backlog.projects}
          priorities={backlog.priorities}
          onClose={() => backlog.setFilterAnchor(null)}
          onFilterChange={backlog.setFilters}
        />

        <SortMenu
          anchorEl={backlog.sortAnchor}
          sortColumn={backlog.sortColumn}
          sortOrder={backlog.sortOrder}
          onClose={() => backlog.setSortAnchor(null)}
          onSortColumnChange={backlog.setSortColumn}
          onSortOrderChange={backlog.setSortOrder}
        />

        <HideMenu
          anchorEl={backlog.hideAnchor}
          hiddenTasks={backlog.hiddenTasks}
          tasks={backlog.tasks}
          onClose={() => backlog.setHideAnchor(null)}
          onHiddenTasksChange={backlog.setHiddenTasks}
        />

        <PriorityMenu
          anchorEl={backlog.priorityMenuAnchor}
          editingPriority={backlog.editingPriority}
          priorities={backlog.priorities}
          onClose={() => {
            backlog.setPriorityMenuAnchor(null);
            backlog.setEditingPriority(null);
          }}
          onPriorityChange={backlog.handlePriorityChange}
        />

        <EffortMenu
          anchorEl={backlog.effortMenuAnchor}
          editingEffort={backlog.editingEffort}
          pointValues={backlog.pointValues}
          onClose={() => {
            backlog.setEffortMenuAnchor(null);
            backlog.setEditingEffort(null);
          }}
          onEffortChange={backlog.handleEffortChange}
        />

        <EpicMenu
          anchorEl={backlog.epicMenuAnchor}
          editingEpic={backlog.editingEpic}
          projectId={currentProject?.id || null}
          userId={userId}
          onClose={() => {
            backlog.setEpicMenuAnchor(null);
            backlog.setEditingEpic(null);
          }}
          onEpicChange={backlog.handleEpicChange}
        />

        <AssigneeMenu
          anchorEl={backlog.assigneeMenuAnchor}
          editingAssignee={backlog.editingAssignee}
          onClose={() => {
            backlog.setAssigneeMenuAnchor(null);
            backlog.setEditingAssignee(null);
          }}
          onAssigneeChange={backlog.handleAssigneeChange}
        />

        {/* Diálogo de confirmación */}
        <DeleteConfirmDialog
          open={backlog.deleteDialogOpen}
          onClose={() => {
            backlog.setDeleteDialogOpen(false);
            backlog.setTaskToDelete(null);
          }}
          onConfirm={backlog.confirmDeleteTask}
        />
        <TaskEditorModal
          open={backlog.isTaskModalOpen}
          task={backlog.selectedBacklogTask}
          columns={[]} // No usa columnas en backlog
          issueTypes={backlog.issueTypes}
          priorities={backlog.priorities}
          pointValues={backlog.pointValues}
          currentUserId={userId}
          defaultDestination="backlog"
          disableDestinationSelector={true}
          onClose={() => {
            backlog.setIsTaskModalOpen(false);
            backlog.setSelectedBacklogTask(null);
          }}
          onSave={backlog.handleSaveTaskFromModal}
          onDelete={async (taskId) => {
            await backlog.handleDeleteTask(taskId);
            backlog.setIsTaskModalOpen(false);
            backlog.setSelectedBacklogTask(null);
          }}
        />
      </Stack>
    </Container>
  );
};

export default BacklogTable;