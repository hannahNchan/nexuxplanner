import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import WarningIcon from "@mui/icons-material/Warning";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import type { IssueType, Priority, PointValue } from "../../api/catalogService";

type TaskEditorModalProps = {
  open: boolean;
  task: {
    id: string;
    title: string;
    description?: string;
    column_id: string;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
  } | null;
  columns: Array<{ id: string; title: string }>;
  issueTypes: IssueType[];
  priorities: Priority[];
  pointValues: PointValue[];
  onClose: () => void;
  onSave: (taskId: string, updates: {
    title: string;
    description: string;
    column_id: string;
    issue_type_id: string | null;
    priority_id: string | null;
    story_points: string | null;
  }) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
};

const TaskEditorModal = ({
  open,
  task,
  columns,
  issueTypes,
  priorities,
  pointValues,
  onClose,
  onSave,
  onDelete,
}: TaskEditorModalProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState("");
  const [issueTypeId, setIssueTypeId] = useState<string>("");
  const [priorityId, setPriorityId] = useState<string>("");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Diálogo de confirmación para eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Inicializar Quill DESPUÉS de que el DOM esté listo
  useEffect(() => {
    if (!open || !task) {
      return;
    }

    // SOLUCIÓN: Esperar a que el DOM se renderice completamente
    const timer = setTimeout(() => {
      if (!editorRef.current) {
        console.error("❌ editorRef.current sigue siendo null después del timeout");
        return;
      }

      if (quillRef.current) {
        console.log("⏭️ Quill ya existe");
        return;
      }

      console.log("🚀 Inicializando Quill para tarea:", task.id);

      try {
        const toolbarOptions = [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "link"],
          ["blockquote", "code-block"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["clean"],
        ];

        const quill = new Quill(editorRef.current, {
          theme: "snow",
          modules: {
            toolbar: toolbarOptions,
          },
          placeholder: "Escribe la descripción de la tarea...",
        });

        quillRef.current = quill;

        // Cargar descripción
        if (task.description) {
          quill.setText(task.description);
        }

        console.log("✅ Quill inicializado correctamente");
      } catch (error) {
        console.error("💥 Error al inicializar Quill:", error);
      }
    }, 0); // Esperar al siguiente ciclo del event loop

    return () => {
      clearTimeout(timer);
      if (quillRef.current) {
        quillRef.current.off("text-change");
      }
    };
  }, [open, task]);

  // Cargar datos de la tarea
  useEffect(() => {
    if (!task) {
      return;
    }

    setTitle(task.title);
    setColumnId(task.column_id);
    setIssueTypeId(task.issue_type_id || "");
    setPriorityId(task.priority_id || "");
    setStoryPoints(task.story_points || "");
  }, [task]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!open) {
      setTitle("");
      setColumnId("");
      setIssueTypeId("");
      setPriorityId("");
      setStoryPoints("");
      if (quillRef.current) {
        quillRef.current = null;
      }
    }
  }, [open]);

  const handleSave = async () => {
    if (!task) {
      return;
    }

    let description = "";
    if (quillRef.current) {
      description = quillRef.current.getText().trim();
    }

    setIsSaving(true);
    try {
      await onSave(task.id, {
        title: title.trim() || "Sin título",
        description,
        column_id: columnId,
        issue_type_id: issueTypeId || null,
        priority_id: priorityId || null,
        story_points: storyPoints || null,
      });
      onClose();
    } catch (error) {
      console.error("Error guardando tarea:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!task) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(task.id);
      setDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error("Error eliminando tarea:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: "85vh",
            maxHeight: "90vh",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={handleOpenDeleteDialog}
              disabled={!task}
            >
              Eliminar
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSaving || !task}
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </Stack>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Título */}
            <TextField
              fullWidth
              variant="outlined"
              label="Título de la tarea"
              placeholder="Escribe el título..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              InputProps={{
                sx: {
                  fontSize: 20,
                  fontWeight: 600,
                },
              }}
            />

            {/* Fila 1: Tipo de Issue y Prioridad */}
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Issue</InputLabel>
                <Select
                  value={issueTypeId}
                  label="Tipo de Issue"
                  onChange={(e) => setIssueTypeId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Sin asignar</em>
                  </MenuItem>
                  {issueTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{type.icon}</span>
                        <span>{type.name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={priorityId}
                  label="Prioridad"
                  onChange={(e) => setPriorityId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Sin asignar</em>
                  </MenuItem>
                  {priorities.map((priority) => (
                    <MenuItem key={priority.id} value={priority.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: priority.color || "#ccc",
                          }}
                        />
                        <span>{priority.name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Fila 2: Estado y Story Points */}
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={columnId}
                  label="Estado"
                  onChange={(e) => setColumnId(e.target.value)}
                >
                  {columns.map((column) => (
                    <MenuItem key={column.id} value={column.id}>
                      {column.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Story Points</InputLabel>
                <Select
                  value={storyPoints}
                  label="Story Points"
                  onChange={(e) => setStoryPoints(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Sin estimar</em>
                  </MenuItem>
                  {pointValues.map((point) => (
                    <MenuItem key={point.id} value={point.value}>
                      {point.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Descripción con Quill */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Descripción
              </Typography>
              <Box
                ref={editorRef}
                sx={{
                  ".ql-editor": {
                    minHeight: 250,
                    maxHeight: 400,
                    overflowY: "auto",
                    fontSize: 16,
                    fontFamily: "'Inter', 'Roboto', sans-serif",
                  },
                  ".ql-container": {
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    borderColor: "#e2e8f0",
                  },
                  ".ql-toolbar": {
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    backgroundColor: "#f8fafc",
                    borderColor: "#e2e8f0",
                  },
                  ".ql-stroke": { stroke: "#475569" },
                  ".ql-fill": { fill: "#475569" },
                  ".ql-picker-label": { color: "#475569" },
                  ".ql-toolbar button:hover .ql-stroke": { stroke: "#4f46e5" },
                  ".ql-toolbar button:hover .ql-fill": { fill: "#4f46e5" },
                  ".ql-toolbar button.ql-active .ql-stroke": { stroke: "#4f46e5" },
                  ".ql-toolbar button.ql-active .ql-fill": { fill: "#4f46e5" },
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningIcon color="error" />
            <Typography variant="h6">Eliminar tarea</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Typography>
              ¿Estás seguro de eliminar la tarea <strong>"{task?.title}"</strong>?
            </Typography>
            <Paper
              sx={{
                p: 2,
                backgroundColor: "#fef2f2",
                borderLeft: "4px solid #ef4444",
              }}
            >
              <Typography variant="body2" color="error.dark">
                ⚠️ Esta acción no se puede deshacer
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            startIcon={<DeleteIcon />}
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskEditorModal;