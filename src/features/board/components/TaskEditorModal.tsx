import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import WarningIcon from "@mui/icons-material/Warning";
import PersonIcon from "@mui/icons-material/Person";
import ListAltIcon from "@mui/icons-material/ListAlt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import type { IssueType, Priority, PointValue } from "../../api/catalogService";

type TaskEditorModalProps = {
  open: boolean;
  task: {
    id: string;
    title: string;
    description?: string;
    column_id: string | null; // ✨ Ahora nullable
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    assignee_id?: string | null;
  } | null;
  columns: Array<{ id: string; title: string }>;
  issueTypes: IssueType[];
  priorities: Priority[];
  pointValues: PointValue[];
  currentUserId: string;
  defaultDestination?: "backlog" | "scrum"; // ✨ NUEVO
  disableDestinationSelector?: boolean; // ✨ NUEVO
  onClose: () => void;
  onSave: (taskId: string, updates: {
    title: string;
    description: string;
    destination: "backlog" | "scrum"; // ✨ NUEVO
    column_id: string | null; // ✨ Ahora nullable
    issue_type_id: string | null;
    priority_id: string | null;
    story_points: string | null;
    assignee_id: string | null;
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
  currentUserId,
  defaultDestination = "scrum", // ✨ NUEVO
  disableDestinationSelector = false, // ✨ NUEVO
  onClose,
  onSave,
  onDelete,
}: TaskEditorModalProps) => {
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState<"backlog" | "scrum">(defaultDestination); // ✨ NUEVO
  const [columnId, setColumnId] = useState<string>("");
  const [issueTypeId, setIssueTypeId] = useState<string>("");
  const [priorityId, setPriorityId] = useState<string>("");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!open || !task) {
      return;
    }

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

        if (task.description) {
          quill.setText(task.description);
        }

        console.log("✅ Quill inicializado correctamente");
      } catch (error) {
        console.error("💥 Error al inicializar Quill:", error);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (quillRef.current) {
        quillRef.current.off("text-change");
      }
    };
  }, [open, task]);

  useEffect(() => {
    if (!task) {
      return;
    }

    setTitle(task.title);
    
    // ✨ NUEVO: Determinar destino basado en column_id
    if (task.column_id) {
      setDestination("scrum");
      setColumnId(task.column_id);
    } else {
      setDestination("backlog");
      setColumnId(columns[0]?.id || ""); // Default a primera columna si existe
    }
    
    setIssueTypeId(task.issue_type_id || "");
    setPriorityId(task.priority_id || "");
    setStoryPoints(task.story_points || "");
    setAssigneeId(task.assignee_id || "");
  }, [task, columns]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDestination(defaultDestination);
      setColumnId("");
      setIssueTypeId("");
      setPriorityId("");
      setStoryPoints("");
      setAssigneeId("");
      if (quillRef.current) {
        quillRef.current = null;
      }
    }
  }, [open, defaultDestination]);

  const handleSave = async () => {
    if (!task) {
      return;
    }

    // ✨ VALIDACIÓN: Si va a Scrum, debe tener columna
    if (destination === "scrum" && !columnId) {
      alert("Selecciona una columna para el Tablero Scrum");
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
        destination, // ✨ NUEVO
        column_id: destination === "scrum" ? columnId : null, // ✨ NULL si es backlog
        issue_type_id: issueTypeId || null,
        priority_id: priorityId || null,
        story_points: storyPoints || null,
        assignee_id: assigneeId || null,
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

  const handleToggleAssignment = () => {
    if (assigneeId === currentUserId) {
      setAssigneeId("");
    } else {
      setAssigneeId(currentUserId);
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

            {/* ✨ NUEVO: Selector de Destino */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <FormControl fullWidth disabled={disableDestinationSelector}>
                <InputLabel>Destino de la tarea</InputLabel>
                <Select
                  value={destination}
                  label="Destino de la tarea"
                  onChange={(e) => setDestination(e.target.value as "backlog" | "scrum")}
                >
                  <MenuItem value="backlog">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ListAltIcon fontSize="small" />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Backlog
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tareas pendientes sin asignar al tablero
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="scrum">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <DashboardIcon fontSize="small" />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Tablero Scrum
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tareas activas en columnas del tablero
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>

              {disableDestinationSelector && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Esta tarea se creará en el Backlog. Muévela al Tablero Scrum cuando esté lista.
                </Alert>
              )}
            </Paper>

            {/* Asignación al usuario */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: assigneeId === currentUserId ? "action.selected" : "action.hover",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={assigneeId === currentUserId}
                    onChange={handleToggleAssignment}
                    icon={<PersonIcon />}
                    checkedIcon={<PersonIcon />}
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {assigneeId === currentUserId ? "Asignada a ti" : "Asignarme esta tarea"}
                    </Typography>
                    {assigneeId === currentUserId && (
                      <Chip 
                        label="Asignada" 
                        size="small" 
                        color="primary" 
                        icon={<PersonIcon />}
                      />
                    )}
                  </Stack>
                }
              />
            </Box>

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

            <Stack direction="row" spacing={2}>
              {/* ✨ MODIFICADO: Solo mostrar selector de columna si destino es "scrum" */}
              <FormControl fullWidth disabled={destination === "backlog"}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={columnId}
                  label="Estado"
                  onChange={(e) => setColumnId(e.target.value)}
                >
                  {destination === "backlog" ? (
                    <MenuItem value="">
                      <em>No aplica para Backlog</em>
                    </MenuItem>
                  ) : (
                    columns.map((column) => (
                      <MenuItem key={column.id} value={column.id}>
                        {column.title}
                      </MenuItem>
                    ))
                  )}
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