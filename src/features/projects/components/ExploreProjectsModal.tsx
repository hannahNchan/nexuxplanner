import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Tooltip,
  Button,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExploreIcon from "@mui/icons-material/Explore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";
import { useState } from "react";
import type { ProjectWithTags } from "../../api/projectService";
import { getEmojiForTag, getColorForTag } from "../../../shared/utils/tagHelpers";
import { getProjectEpicsCount, deleteProject } from "../../api/projectService";

type ExploreProjectsModalProps = {
  open: boolean;
  onClose: () => void;
  projects: ProjectWithTags[];
  loading: boolean;
  onSelectProject: (project: ProjectWithTags) => void;
  onEditProject: (project: ProjectWithTags) => void;
  onRefresh: () => void;
};

const ExploreProjectsModal = ({
  open,
  onClose,
  projects,
  loading,
  onSelectProject,
  onEditProject,
  onRefresh,
}: ExploreProjectsModalProps) => {
  const theme = useTheme();
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithTags | null>(null);
  const [deleteError, setDeleteError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleProjectClick = (project: ProjectWithTags) => {
    onSelectProject(project);
    onClose();
  };

  const handleEditClick = (e: React.MouseEvent, project: ProjectWithTags) => {
    e.stopPropagation();
    onEditProject(project);
  };

  const handleDeleteClick = async (e: React.MouseEvent, project: ProjectWithTags) => {
    e.stopPropagation();

    try {
      setDeletingProject(project.id);
      const epicsCount = await getProjectEpicsCount(project.id);

      if (epicsCount > 0) {
        // Mostrar error en modal
        setDeleteError({
          title: "No se puede eliminar el proyecto",
          message: `El proyecto "${project.title}" contiene ${epicsCount} épica${
            epicsCount > 1 ? "s" : ""
          }. Debes eliminar o reasignar todas las épicas antes de eliminar el proyecto.`,
        });
        setDeletingProject(null);
        return;
      }

      // Mostrar confirmación
      setProjectToDelete(project);
      setDeleteDialogOpen(true);
      setDeletingProject(null);
    } catch (error) {
      console.error("Error verificando proyecto:", error);
      setDeleteError({
        title: "Error",
        message: "Error al verificar el proyecto. Por favor intenta de nuevo.",
      });
      setDeletingProject(null);
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      onRefresh();
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      setDeleteError({
        title: "Error",
        message: "Error al eliminar el proyecto. Por favor intenta de nuevo.",
      });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const closeErrorDialog = () => {
    setDeleteError(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <ExploreIcon color="primary" />
              <Typography variant="h6">Explorar proyectos</Typography>
            </Stack>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
              <Typography color="text.secondary" mt={2}>
                Cargando proyectos...
              </Typography>
            </Stack>
          ) : projects.length === 0 ? (
            <Stack alignItems="center" py={4}>
              <Typography color="text.secondary">No tienes proyectos aún</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Crea tu primer proyecto para comenzar
              </Typography>
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight={600}>Nombre</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>Descripción</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>Tags</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>Creado</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>ID de tarea</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={600}>Acciones</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map((project: ProjectWithTags) => (
                    <TableRow
                      key={project.id}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                      onClick={() => handleProjectClick(project)}
                    >
                      <TableCell>
                        <Typography fontWeight={500}>{project.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ maxWidth: 300 }}
                        >
                          {project.description || "Sin descripción"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {project.tags && project.tags.length > 0 ? (
                            project.tags.map((tag: string) => {
                              const emoji = getEmojiForTag(tag);
                              const color = getColorForTag(tag);
                              return (
                                <Chip
                                  key={tag}
                                  label={`${emoji} ${tag}`}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(color, 0.15),
                                    border: `1px solid ${alpha(color, 0.3)}`,
                                    color: color,
                                    fontWeight: 600,
                                  }}
                                />
                              );
                            })
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Sin tags
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(project.created_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={project.project_key}
                          size="small"
                          sx={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                            color: "primary.main",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Editar proyecto">
                            <IconButton
                              size="small"
                              onClick={(e) => handleEditClick(e, project)}
                              sx={{
                                color: theme.palette.primary.main,
                                "&:hover": {
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Eliminar proyecto (solo si está vacío)">
                            <span>
                              <IconButton
                                size="small"
                                onClick={(e) => handleDeleteClick(e, project)}
                                disabled={deletingProject === project.id}
                                sx={{
                                  color: theme.palette.error.main,
                                  "&:hover": {
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                  },
                                }}
                              >
                                {deletingProject === project.id ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <DeleteIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
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
              Eliminar Proyecto
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Typography>
              ¿Estás seguro de que deseas eliminar el proyecto{" "}
              <strong>"{projectToDelete?.title}"</strong>?
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
          <Button onClick={cancelDelete} sx={{ borderRadius: 1.5 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
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

      {/* Modal de error */}
      <Dialog
        open={!!deleteError}
        onClose={closeErrorDialog}
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
            <WarningIcon color="error" />
            <Typography variant="h6" fontWeight={600}>
              {deleteError?.title}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Typography>{deleteError?.message}</Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={closeErrorDialog}
            sx={{ borderRadius: 1.5 }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExploreProjectsModal;