import {
  Box,
  Button,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
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
import ListAltIcon from "@mui/icons-material/ListAlt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ImageIcon from "@mui/icons-material/Image";
import { useEffect, useMemo, useRef, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import type { IssueType, Priority, PointValue } from "../../api/catalogService";
import IconRenderer from "../../../shared/ui/IconRenderer";
import UserAvatar from "../../../shared/ui/UserAvatar";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";
import TaskDeleteDialog from "./TaskEditor/TaskDeleteDialog";
import TaskDescriptionEditor, { type TaskDescriptionEditorHandle } from "./TaskEditor/TaskDescriptionEditor";
import { useTaskProjectMembers } from "./TaskEditor/useTaskProjectMembers";

type TaskEditorModalProps = {
  open: boolean;
  task: {
    id: string;
    project_id?: string | null;
    title: string;
    subtitle?: string;
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

const isEpicIssueType = (type?: IssueType | null) =>
  type?.name.trim().toLowerCase() === "epic";

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
  const descriptionEditorRef = useRef<TaskDescriptionEditorHandle | null>(null);

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
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const projectMembers = useTaskProjectMembers(open, task, columns, currentUserId);
  const taskIssueTypes = useMemo(
    () => issueTypes.filter((type) => !isEpicIssueType(type)),
    [issueTypes]
  );

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
    
    const currentIssueType = issueTypes.find((type) => type.id === task.issue_type_id);
    setIssueTypeId(isEpicIssueType(currentIssueType) ? "" : task.issue_type_id || "");
    setPriorityId(task.priority_id || "");
    setStoryPoints(task.story_points || "");
    setAssigneeId(task.assignee_id || "");
  }, [task, columns, issueTypes]);

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
      setErrorMessage("");
    }
  }, [open, defaultDestination]);

  const handleSave = async () => {
    if (!task) {
      return;
    }

    if (destination === "scrum" && !columnId) {
      setErrorMessage("Selecciona una columna para el Tablero Scrum.");
      return;
    }

    setErrorMessage("");
    const description = descriptionEditorRef.current?.getHTML() ?? "";

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
      logError("taskEditor.save", error);
      setErrorMessage(getErrorMessage(error, "No se pudo guardar la tarea."));
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
      logError("taskEditor.delete", error);
      setErrorMessage(getErrorMessage(error, "No se pudo eliminar la tarea."));
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
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

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
                  {taskIssueTypes.map((type) => (
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
                            backgroundColor: priority.color || theme.palette.action.disabledBackground,
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

            <TaskDescriptionEditor
              ref={descriptionEditorRef}
              open={open}
              initialDescription={task?.description ?? ""}
              onError={setErrorMessage}
              onUploadingChange={setIsUploadingImage}
            />
          </Stack>
        </DialogContent>
      </Dialog>

      <TaskDeleteDialog
        open={deleteDialogOpen}
        taskTitle={task?.title}
        isDeleting={isDeleting}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default TaskEditorModal;
