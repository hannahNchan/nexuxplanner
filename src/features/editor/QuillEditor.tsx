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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteIcon from "@mui/icons-material/Delete";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { alpha, useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBoard, fetchPrimaryBoard } from "../api/boardService";
import {
  autoSaveNote,
  createSnapshot,
  deleteSnapshot,
  fetchActiveNote,
  fetchSnapshots,
  restoreSnapshot,
  type EditorNote,
} from "../api/editorService";

type QuillEditorProps = {
  userId: string;
};

const QuillEditor = ({ userId }: QuillEditorProps) => {
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("Mi Tablero");
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

  // Inicializar Quill cuando tengamos boardId
  useEffect(() => {
    if (!editorRef.current || quillRef.current || !boardId) {
      return;
    }

    console.log("Inicializando Quill editor...");

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

    // Cargar nota activa
    void loadActiveNote();
    void loadSnapshots();

    // Auto-save cada 3 segundos
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
  }, [boardId]);

  // Cargar tablero
  const loadBoardAndNote = useCallback(async () => {
    setIsLoadingBoard(true);
    try {
      const board = await fetchPrimaryBoard(userId);

      if (!board) {
        setBoardId(null);
        return;
      }

      console.log("Board encontrado:", board.id);
      setBoardId(board.id);
    } catch (error) {
      console.error("Error cargando tablero:", error);
    } finally {
      setIsLoadingBoard(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadBoardAndNote();
  }, [loadBoardAndNote]);

  // Cargar la nota activa
  const loadActiveNote = async () => {
    if (!boardId || !quillRef.current) {
      return;
    }

    try {
      const note = await fetchActiveNote(boardId);

      if (note && note.content) {
        console.log("Nota activa encontrada");
        quillRef.current.setContents(note.content as any);
        setLastSaved(new Date(note.updated_at));
      } else {
        console.log("No hay nota activa");
      }
    } catch (error) {
      console.error("Error cargando nota:", error);
    }
  };

  // Cargar snapshots
  const loadSnapshots = async () => {
    if (!boardId) {
      return;
    }

    try {
      const allSnapshots = await fetchSnapshots(boardId);
      setSnapshots(allSnapshots);
    } catch (error) {
      console.error("Error cargando snapshots:", error);
    }
  };

  // Auto-save (actualiza la nota activa)
  const handleAutoSave = async () => {
    if (!boardId || !quillRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      const content = quillRef.current.getContents();
      await autoSaveNote(boardId, content);
      setLastSaved(new Date());
      console.log("✅ Auto-guardado");
    } catch (error) {
      console.error("Error en auto-guardado:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Crear snapshot manual
  const handleCreateSnapshot = async () => {
    if (!boardId || !quillRef.current) {
      return;
    }

    setIsCreatingSnapshot(true);
    try {
      const content = quillRef.current.getContents();
      await createSnapshot(boardId, content);
      await loadSnapshots();
      console.log("✅ Snapshot creado");
    } catch (error) {
      console.error("Error creando snapshot:", error);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Abrir diálogo de confirmación para cambiar versión
  const handleOpenRestoreDialog = (snapshotId: string, versionNumber: number) => {
    setConfirmDialog({
      open: true,
      snapshotId,
      versionNumber,
    });
  };

  // Cambiar a una versión específica
  const handleConfirmRestore = async () => {
    const { snapshotId } = confirmDialog;
    
    if (!boardId || !quillRef.current || !snapshotId) {
      return;
    }

    try {
      // Auto-guardar contenido actual antes de cambiar
      const currentContent = quillRef.current.getContents();
      await autoSaveNote(boardId, currentContent);
      
      // Cargar la versión seleccionada
      await restoreSnapshot(boardId, snapshotId);
      await loadActiveNote();
      
      setConfirmDialog({ open: false, snapshotId: null, versionNumber: null });
      setIsHistoryOpen(false);
      
      console.log("✅ Cambiado a versión anterior");
    } catch (error) {
      console.error("Error cambiando versión:", error);
    }
  };

  // Abrir diálogo de confirmación para eliminar
  const handleOpenDeleteDialog = (snapshotId: string, versionNumber: number) => {
    setDeleteDialog({
      open: true,
      snapshotId,
      versionNumber,
    });
  };

  // Eliminar snapshot confirmado
  const handleConfirmDelete = async () => {
    const { snapshotId } = deleteDialog;
    
    if (!snapshotId) {
      return;
    }

    try {
      await deleteSnapshot(snapshotId);
      await loadSnapshots();
      
      setDeleteDialog({ open: false, snapshotId: null, versionNumber: null });
      
      console.log("✅ Snapshot eliminado");
    } catch (error) {
      console.error("Error eliminando snapshot:", error);
    }
  };

  // Crear tablero
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      return;
    }

    setIsCreatingBoard(true);
    try {
      const result = await createBoard(userId, newBoardName);
      if (result && result.board) {
        setBoardId(result.board.id);
        setIsLoadingBoard(false);
      }
    } catch (error) {
      console.error("Error creando tablero:", error);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  // Formatear fecha de forma humanizada
  const formatHumanDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Hace menos de 1 minuto
    if (diffInSeconds < 60) {
      return "Hace unos segundos";
    }

    // Hace menos de 1 hora
    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? "minuto" : "minutos"}`;
    }

    // Hace menos de 24 horas
    if (diffInHours < 24) {
      return `Hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
    }

    // Hace menos de 7 días
    if (diffInDays < 7) {
      return `Hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
    }

    // Más de 7 días: mostrar fecha completa
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
    return formatHumanDate(date.toISOString()); // ✅ CORREGIDO
  };
  const editorBorder = theme.palette.divider;
  const editorToolbarBg = theme.palette.action.selected;
  const editorText = theme.palette.text.primary;
  const editorMuted = theme.palette.text.secondary;

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Editor de notas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Usa Quill para documentar tareas, acuerdos o descripciones.
        </Typography>
      </Stack>

      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Stack spacing={2}>
          {isLoadingBoard && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {!boardId && !isLoadingBoard && (
            <Stack spacing={2}>
              <Typography color="text.secondary" variant="body2">
                Necesitas vincular un tablero para usar el editor de notas.
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Button variant="outlined" size="small" onClick={loadBoardAndNote}>
                  Buscar tablero existente
                </Button>

                <Typography variant="body2" color="text.secondary">
                  o
                </Typography>

                <TextField
                  size="small"
                  label="Nombre del tablero"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  sx={{ width: 200 }}
                />

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCreateBoard}
                  disabled={isCreatingBoard || !newBoardName.trim()}
                >
                  {isCreatingBoard ? "Creando..." : "Crear tablero"}
                </Button>
              </Stack>
            </Stack>
          )}

          {boardId && (
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
