import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteIcon from "@mui/icons-material/Delete";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { alpha, useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProject } from "../../shared/contexts/ProjectContext";
import {
  autoSaveNote,
  createSnapshot,
  deleteSnapshot,
  fetchActiveNote,
  fetchSnapshots,
  restoreSnapshot,
  type EditorNote,
} from "../api/editorService";
import { logError } from "../../shared/utils/errorHandling";

type QuillEditorProps = {
  userId: string;
};

type QuillContents = Parameters<Quill["setContents"]>[0];

const QuillEditor = ({ userId: _userId }: QuillEditorProps) => {
  const theme = useTheme();
  const { currentProject } = useProject();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const projectId = currentProject?.id ?? null;
  const [hasDocument, setHasDocument] = useState(false);
  const [isLoadingNote, setIsLoadingNote] = useState(true);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-save estado
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Snapshots
  const [snapshots, setSnapshots] = useState<EditorNote[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  
  // Confirmación para cambiar versión
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    snapshotId: string | null;
    versionNumber: number | null;
  }>({
    open: false,
    snapshotId: null,
    versionNumber: null,
  });

  // Confirmación para eliminar
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    snapshotId: string | null;
    versionNumber: number | null;
  }>({
    open: false,
    snapshotId: null,
    versionNumber: null,
  });

  // Inicializar Quill cuando el proyecto tenga documento.
  useEffect(() => {
    if (!editorRef.current || quillRef.current || !projectId || !hasDocument) {
      return;
    }

    const toolbarOptions = [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "link"],
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["clean"],
    ];

    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: toolbarOptions,
      },
      placeholder: "Escribe una descripción o nota rápida...",
    });

    quillRef.current = quill;

    void loadActiveNote();
    void loadSnapshots();

    quill.on("text-change", () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        void handleAutoSave();
      }, 3000);
    });

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      quill.off("text-change");
    };
  }, [hasDocument, projectId]);

  // Cargar nota del proyecto activo.
  const loadProjectNote = useCallback(async () => {
    if (!projectId) {
      setHasDocument(false);
      setSnapshots([]);
      setLastSaved(null);
      setIsLoadingNote(false);
      return;
    }

    setIsLoadingNote(true);
    try {
      const note = await fetchActiveNote(projectId);
      setHasDocument(Boolean(note));
      setLastSaved(note?.updated_at ? new Date(note.updated_at) : null);
      const allSnapshots = await fetchSnapshots(projectId);
      setSnapshots(allSnapshots);
    } catch (error) {
      logError("editor.loadProjectNote", error);
      setHasDocument(false);
    } finally {
      setIsLoadingNote(false);
    }
  }, [projectId]);

  useEffect(() => {
    quillRef.current = null;
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    void loadProjectNote();
  }, [loadProjectNote]);

  const loadActiveNote = async () => {
    if (!projectId || !quillRef.current) {
      return;
    }

    try {
      const note = await fetchActiveNote(projectId);

      if (note && note.content) {
        quillRef.current.setContents(note.content as QuillContents);
        setLastSaved(new Date(note.updated_at));
      }
    } catch (error) {
      logError("editor.loadActiveNote", error);
    }
  };

  const loadSnapshots = async () => {
    if (!projectId) {
      return;
    }

    try {
      const allSnapshots = await fetchSnapshots(projectId);
      setSnapshots(allSnapshots);
    } catch (error) {
      logError("editor.loadSnapshots", error);
    }
  };

  const handleAutoSave = async () => {
    if (!projectId || !quillRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      const content = quillRef.current.getContents();
      await autoSaveNote(projectId, content);
      setLastSaved(new Date());
    } catch (error) {
      logError("editor.autoSave", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!projectId || !quillRef.current) {
      return;
    }

    setIsCreatingSnapshot(true);
    try {
      const content = quillRef.current.getContents();
      await createSnapshot(projectId, content);
      await loadSnapshots();
    } catch (error) {
      logError("editor.createSnapshot", error);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleOpenRestoreDialog = (snapshotId: string, versionNumber: number) => {
    setConfirmDialog({
      open: true,
      snapshotId,
      versionNumber,
    });
  };

  const handleConfirmRestore = async () => {
    const { snapshotId } = confirmDialog;
    
    if (!projectId || !quillRef.current || !snapshotId) {
      return;
    }

    try {
      const currentContent = quillRef.current.getContents();
      await autoSaveNote(projectId, currentContent);
      
      await restoreSnapshot(projectId, snapshotId);
      await loadActiveNote();
      
      setConfirmDialog({ open: false, snapshotId: null, versionNumber: null });
      setIsHistoryOpen(false);
    } catch (error) {
      logError("editor.restoreSnapshot", error);
    }
  };

  const handleOpenDeleteDialog = (snapshotId: string, versionNumber: number) => {
    setDeleteDialog({
      open: true,
      snapshotId,
      versionNumber,
    });
  };

  const handleConfirmDelete = async () => {
    const { snapshotId } = deleteDialog;
    
    if (!snapshotId) {
      return;
    }

    try {
      await deleteSnapshot(snapshotId);
      await loadSnapshots();
      
      setDeleteDialog({ open: false, snapshotId: null, versionNumber: null });
    } catch (error) {
      logError("editor.deleteSnapshot", error);
    }
  };

  const handleCreateDocument = async () => {
    if (!projectId) {
      return;
    }

    setIsCreatingDocument(true);
    try {
      await autoSaveNote(projectId, { ops: [{ insert: "\n" }] });
      setHasDocument(true);
      setLastSaved(new Date());
      await loadSnapshots();
    } catch (error) {
      logError("editor.createDocument", error);
    } finally {
      setIsCreatingDocument(false);
    }
  };

  const formatHumanDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return "Hace unos segundos";
    }

    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? "minuto" : "minutos"}`;
    }

    if (diffInHours < 24) {
      return `Hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
    }

    if (diffInDays < 7) {
      return `Hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
    }

    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day} de ${month} de ${year} a las ${hours}:${minutes}`;
  };

  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "hace unos segundos";
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
    return formatHumanDate(date.toISOString());
  };
  const editorBorder = theme.palette.divider;
  const editorToolbarBg = theme.palette.action.selected;
  const editorText = theme.palette.text.primary;
  const editorMuted = theme.palette.text.secondary;

  return (
    <Stack spacing={2}>

      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Stack spacing={2}>
          {!currentProject && (
            <Alert severity="info">
              Selecciona un proyecto desde el menú lateral para crear o editar sus notas.
            </Alert>
          )}

          {currentProject && isLoadingNote && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {currentProject && !hasDocument && !isLoadingNote && (
            <Stack spacing={2} alignItems="flex-start">
              <Typography color="text.secondary" variant="body2">
                Este proyecto todavía no tiene documento de notas.
              </Typography>

              <Button
                variant="contained"
                size="small"
                onClick={handleCreateDocument}
                disabled={isCreatingDocument}
              >
                {isCreatingDocument ? "Creando..." : "Crear documento"}
              </Button>
            </Stack>
          )}

          {currentProject && hasDocument && (
            <>
              {/* Barra superior con estado y acciones */}
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  {isSaving && (
                    <CircularProgress size={16} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {isSaving
                      ? "Guardando..."
                      : lastSaved
                      ? `Guardado ${formatRelativeTime(lastSaved)}`
                      : "Sin guardar"}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<HistoryIcon />}
                    onClick={() => setIsHistoryOpen(true)}
                  >
                    Historial ({snapshots.length})
                  </Button>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleCreateSnapshot}
                    disabled={isCreatingSnapshot}
                  >
                    {isCreatingSnapshot ? "Guardando..." : "Crear snapshot"}
                  </Button>
                </Stack>
              </Stack>

              {/* Editor */}
              <Box
                ref={editorRef}
                sx={{
                  ".ql-editor": {
                    minHeight: 400,
                    maxHeight: 600,
                    overflowY: "auto",
                    fontSize: 16,
                    fontFamily: "'Inter', 'Roboto', sans-serif",
                    color: editorText,
                    backgroundColor: theme.palette.background.paper,
                    "&.ql-blank::before": {
                      color: editorMuted,
                      opacity: 0.8,
                    },
                  },
                  ".ql-container": {
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    borderColor: editorBorder,
                    backgroundColor: theme.palette.background.paper,
                  },
                  ".ql-toolbar": {
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    backgroundColor: editorToolbarBg,
                    borderColor: editorBorder,
                  },
                  ".ql-stroke": { stroke: editorMuted },
                  ".ql-fill": { fill: editorMuted },
                  ".ql-picker-label": { color: editorMuted },
                  ".ql-picker-options": {
                    backgroundColor: theme.palette.background.paper,
                    borderColor: editorBorder,
                  },
                  ".ql-toolbar button:hover .ql-stroke": { stroke: theme.palette.primary.main },
                  ".ql-toolbar button:hover .ql-fill": { fill: theme.palette.primary.main },
                  ".ql-toolbar button.ql-active .ql-stroke": { stroke: theme.palette.primary.main },
                  ".ql-toolbar button.ql-active .ql-fill": { fill: theme.palette.primary.main },
                }}
              />
            </>
          )}
        </Stack>
      </Paper>

      {/* Dialog de historial mejorado */}
      <Dialog
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Historial de versiones</Typography>
            <Typography variant="body2" color="text.secondary">
              {snapshots.length} {snapshots.length === 1 ? "versión guardada" : "versiones guardadas"}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {snapshots.length === 0 ? (
            <Stack spacing={2} alignItems="center" py={4}>
              <HistoryIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography color="text.secondary" textAlign="center">
                No hay versiones guardadas
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Crea una versión con el botón "Crear snapshot" cuando tengas cambios importantes.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {snapshots.map((snapshot, index) => (
                <Paper
                  key={snapshot.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "2px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Stack spacing={0.5} flex={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>
                          Versión {snapshots.length - index}
                        </Typography>
                        {index === 0 && (
                          <Chip label="Más reciente" size="small" color="primary" />
                        )}
                      </Stack>
                      
                      <Typography variant="body2" color="text.secondary">
                        Creada: {formatHumanDate(snapshot.created_at)}
                      </Typography>
                      
                      {snapshot.updated_at !== snapshot.created_at && (
                        <Typography variant="caption" color="text.secondary">
                          Última modificación: {formatHumanDate(snapshot.updated_at)}
                        </Typography>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Ver esta versión">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<RestoreIcon />}
                          onClick={() => handleOpenRestoreDialog(snapshot.id, snapshots.length - index)}
                        >
                          Ver
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Eliminar versión">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(snapshot.id, snapshots.length - index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsHistoryOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para cambiar versión */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, snapshotId: null, versionNumber: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <RestoreIcon color="primary" />
            <Typography variant="h6">Cambiar a versión anterior</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Typography>
              ¿Quieres cambiar a la <strong>Versión {confirmDialog.versionNumber}</strong>?
            </Typography>
            <Paper
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                borderLeft: `4px solid ${theme.palette.primary.main}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                💡 No te preocupes: tu contenido actual se guardará automáticamente antes de cambiar.
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDialog({ open: false, snapshotId: null, versionNumber: null })}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmRestore}
            startIcon={<RestoreIcon />}
          >
            Cambiar versión
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, snapshotId: null, versionNumber: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <DeleteIcon color="error" />
            <Typography variant="h6">Eliminar versión</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Typography>
              ¿Estás seguro de eliminar la <strong>Versión {deleteDialog.versionNumber}</strong>?
            </Typography>
            <Paper
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                borderLeft: `4px solid ${theme.palette.error.main}`,
              }}
            >
              <Typography variant="body2" color="error.dark">
                ⚠️ Esta acción no se puede deshacer
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, snapshotId: null, versionNumber: null })}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            startIcon={<DeleteIcon />}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default QuillEditor;
