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
  Chip,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import WarningIcon from "@mui/icons-material/Warning";
import ListAltIcon from "@mui/icons-material/ListAlt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ImageIcon from "@mui/icons-material/Image";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import type { IssueType, Priority, PointValue } from "../../api/catalogService";
import IconRenderer from "../../../shared/ui/IconRenderer";
import { fetchProjectMembers } from "../../api/projectService";
import { uploadImageToStorage } from "../../../lib/imageUpload";
import { supabase } from "../../../lib/supabase";
import UserAvatar from "../../../shared/ui/UserAvatar";

type TaskEditorModalProps = {
  open: boolean;
  task: {
    id: string;
    title: string;
    subtitle?: string; // ✅ NUEVO
    description?: string;
    column_id: string | null;
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
  defaultDestination?: "backlog" | "scrum";
  disableDestinationSelector?: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: {
    title: string;
    subtitle: string;
    description: string;
    destination: "backlog" | "scrum";
    column_id: string | null;
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
  defaultDestination = "scrum",
  disableDestinationSelector = false,
  onClose,
  onSave,
  onDelete,
}: TaskEditorModalProps) => {
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [destination, setDestination] = useState<"backlog" | "scrum">(defaultDestination);
  const [columnId, setColumnId] = useState<string>("");
  const [issueTypeId, setIssueTypeId] = useState<string>("");
  const [priorityId, setPriorityId] = useState<string>("");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [projectMembers, setProjectMembers] = useState<Array<{ user_id: string; user_profiles: { full_name: string | null; avatar_url: string | null } }>>([]);
  const [, setProjectId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!open || !task) {
      return;
    }

    const timer = setTimeout(() => {
      if (!editorRef.current) {
        console.error("❌ editorRef.current sigue siendo null");
        return;
      }

      if (quillRef.current) {
        console.log("⏭️ Quill ya existe");
        return;
      }

      try {
        const toolbarOptions = [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "link"],
          ["blockquote", "code-block"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["image"],
          ["clean"],
        ];

        const quill = new Quill(editorRef.current, {
          theme: "snow",
          modules: {
            toolbar: {
              container: toolbarOptions,
              handlers: {
                image: imageHandler,
              },
            },
          },
          placeholder: "Escribe la descripción de la tarea...",
        });

        quillRef.current = quill;

        if (task.description) {
          quill.root.innerHTML = task.description;
        }

        quill.root.addEventListener("paste", handlePaste, true);

        console.log("✅ Quill inicializado con soporte de imágenes");
      } catch (error) {
        console.error("💥 Error al inicializar Quill:", error);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (quillRef.current) {
        quillRef.current.root.removeEventListener("paste", handlePaste, true);
        quillRef.current.off("text-change");
      }
    };
  }, [open, task]);

  useEffect(() => {
    const loadProjectMembers = async () => {
      if (!open || !task) return;

      const { data: column } = await supabase
        .from("columns")
        .select("project_id")
        .eq("id", task.column_id || columns[0]?.id)
        .single();

      if (column) {
        setProjectId(column.project_id);
        const members = await fetchProjectMembers(column.project_id);
        setProjectMembers(members);
      }
    };

    loadProjectMembers();
  }, [open, task, columns]);

  const handlePaste = async (e: ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    console.log("📋 Datos del portapapeles:", clipboardData);

    const items = clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const file = items[i].getAsFile();
        if (file) {
          await insertImageFromFile(file);
        }
        return;
      }
    }
  };

  const imageHandler = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await insertImageFromFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const insertImageFromFile = async (file: File) => {
    if (!quillRef.current) return;

    try {
      setIsUploadingImage(true);
      const imageUrl = await uploadImageToStorage(file);
      
      const range = quillRef.current.getSelection(true);
      quillRef.current.insertEmbed(range.index, "image", imageUrl);
      quillRef.current.setSelection(range.index + 1, 0);
      
      console.log("✅ Imagen subida:", imageUrl);
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      alert("Error al subir la imagen");
    } finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    if (!task) {
      return;
    }

    setTitle(task.title);
    setSubtitle(task.subtitle || "");
    
    if (task.column_id) {
      setDestination("scrum");
      setColumnId(task.column_id);
    } else {
      setDestination("backlog");
      setColumnId(columns[0]?.id || "");
    }
    
    setIssueTypeId(task.issue_type_id || "");
    setPriorityId(task.priority_id || "");
    setStoryPoints(task.story_points || "");
    setAssigneeId(task.assignee_id || "");
  }, [task, columns]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setSubtitle("");
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

    if (destination === "scrum" && !columnId) {
      alert("Selecciona una columna para el Tablero Scrum");
      return;
    }

    let description = "";
    if (quillRef.current) {
      description = quillRef.current.root.innerHTML;
    }

    setIsSaving(true);
    try {
      await onSave(task.id, {
        title: title.trim() || "Sin título",
        subtitle: subtitle.trim(),
        description,
        destination,
        column_id: destination === "scrum" ? columnId : null,
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

  // const handleToggleAssignment = () => {
  //   if (assigneeId === currentUserId) {
  //     setAssigneeId("");
  //   } else {
  //     setAssigneeId(currentUserId);
  //   }
  // };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

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
            {isUploadingImage && (
              <Chip
                icon={<ImageIcon />}
                label="Subiendo imagen..."
                size="small"
                color="info"
              />
            )}
            
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
              disabled={isSaving || !task || isUploadingImage}
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

            <TextField
              fullWidth
              variant="outlined"
              label="Subtítulo (opcional)"
              placeholder="Añade un breve resumen..."
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              InputProps={{
                sx: {
                  fontSize: 16,
                },
              }}
            />

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

<FormControl fullWidth>
  <InputLabel>Asignado a</InputLabel>
  <Select
    value={assigneeId}
    label="Asignado a"
    onChange={(e) => setAssigneeId(e.target.value)}
  >
    <MenuItem value="">
      <em>Sin asignar</em>
    </MenuItem>
    {projectMembers.map((member) => (
      <MenuItem key={member.user_id} value={member.user_id}>
        <Stack direction="row" spacing={1} alignItems="center">
          <UserAvatar userId={member.user_id} size={24} />
          <span>{member.user_profiles?.full_name || "Sin nombre"}</span>
          {member.user_id === currentUserId && (
            <Chip label="Tú" size="small" color="primary" />
          )}
        </Stack>
      </MenuItem>
    ))}
  </Select>
</FormControl>

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
                        <IconRenderer icon={type.icon} />
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
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Descripción
                </Typography>
                <Chip
                  icon={<ImageIcon />}
                  label="Soporta imágenes"
                  size="small"
                  variant="outlined"
                />
              </Stack>
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