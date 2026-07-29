import {
  Box,
  Button,
  Divider,
  Dialog,
  DialogContent,
  Drawer,
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
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ListAltIcon from "@mui/icons-material/ListAlt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ImageIcon from "@mui/icons-material/Image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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
  presentation?: "drawer" | "modal";
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
  presentation = "drawer",
  onClose,
  onSave,
  onDelete,
}: TaskEditorModalProps) => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));
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

  if (presentation === "modal") {
    return (
      <>
        <Dialog
          open={open}
          onClose={onClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              minHeight: "78vh",
              maxHeight: "90vh",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Tooltip title="Cerrar">
                <IconButton onClick={onClose} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={800}>
                  Crear tarea
                </Typography>
                <Typography variant="subtitle1" fontWeight={900} noWrap>
                  {title || "Nueva tarea"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1}>
              {isUploadingImage ? (
                <Chip icon={<ImageIcon />} label="Subiendo imagen..." size="small" color="info" />
              ) : null}

              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={isSaving || !task || isUploadingImage}
              >
                {isSaving ? "Guardando..." : "Crear"}
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
                    fontWeight: 700,
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
              />

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={2}>
                  <FormControl fullWidth disabled={disableDestinationSelector}>
                    <InputLabel>Destino</InputLabel>
                    <Select
                      value={destination}
                      label="Destino"
                      onChange={(e) => setDestination(e.target.value as "backlog" | "scrum")}
                    >
                      <MenuItem value="backlog">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ListAltIcon fontSize="small" />
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              Backlog
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Pendiente de planificación
                            </Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="scrum">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DashboardIcon fontSize="small" />
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              Tablero Scrum
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Trabajo activo
                            </Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {disableDestinationSelector ? (
                    <Alert severity="info" variant="outlined">
                      Esta tarea se creará en el Backlog. Planifícala en un sprint cuando esté lista.
                    </Alert>
                  ) : null}
                </Stack>
              </Paper>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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
                          {member.user_id === currentUserId ? (
                            <Chip label="Tú" size="small" color="primary" />
                          ) : null}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

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
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={issueTypeId}
                    label="Tipo"
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

                <FormControl fullWidth>
                  <InputLabel>Story points</InputLabel>
                  <Select
                    value={storyPoints}
                    label="Story points"
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
  }

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: {
              xs: "100vw",
              md: "min(1120px, calc(100vw - 72px))",
            },
            maxWidth: "100vw",
            height: "100vh",
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: { xs: 2, md: 3 },
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Tooltip title="Cerrar">
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>
                {destination === "backlog" ? "Backlog" : "Tablero Scrum"}
              </Typography>
              <Typography variant="subtitle1" fontWeight={900} noWrap>
                {task ? title || task.title : "Editar tarea"}
              </Typography>
            </Box>
          </Stack>

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

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 340px" },
              gap: { xs: 2, md: 3 },
              p: { xs: 2, md: 3 },
              alignItems: "start",
            }}
          >
            <Stack spacing={2.5} sx={{ minWidth: 0 }}>
              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Escribe el título..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontSize: { xs: 24, md: 30 },
                        fontWeight: 900,
                        lineHeight: 1.15,
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Añade un breve resumen..."
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontSize: 16,
                        color: "text.secondary",
                      },
                    }}
                  />
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={900}>
                      Descripción
                    </Typography>
                    {isUploadingImage ? (
                      <Chip
                        icon={<ImageIcon />}
                        label="Subiendo imagen"
                        size="small"
                        color="info"
                      />
                    ) : null}
                  </Stack>

                  <TaskDescriptionEditor
                    ref={descriptionEditorRef}
                    open={open}
                    initialDescription={task?.description ?? ""}
                    onError={setErrorMessage}
                    onUploadingChange={setIsUploadingImage}
                  />
                </Stack>
              </Paper>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                position: { md: "sticky" },
                top: { md: 24 },
                p: 2,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: "background.paper",
              }}
            >
              <Stack spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight={900}>
                    Propiedades
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ajusta estado, asignación y estimación sin perder de vista la descripción.
                  </Typography>
                </Stack>

                <Divider />

                <FormControl fullWidth size={isCompact ? "medium" : "small"} disabled={disableDestinationSelector}>
                  <InputLabel>Destino</InputLabel>
                  <Select
                    value={destination}
                    label="Destino"
                    onChange={(e) => setDestination(e.target.value as "backlog" | "scrum")}
                  >
                    <MenuItem value="backlog">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ListAltIcon fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            Backlog
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pendiente de planificación
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="scrum">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <DashboardIcon fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            Tablero Scrum
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Trabajo activo
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>

                {disableDestinationSelector ? (
                  <Alert severity="info" variant="outlined">
                    Esta tarea vive en el Backlog hasta que la planifiques en un sprint.
                  </Alert>
                ) : null}

                <FormControl fullWidth size={isCompact ? "medium" : "small"}>
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

                <FormControl fullWidth size={isCompact ? "medium" : "small"}>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={columnId}
                    label="Estado"
                    disabled={destination === "backlog"}
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

                <Divider />

                <FormControl fullWidth size={isCompact ? "medium" : "small"}>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={issueTypeId}
                    label="Tipo"
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

                <FormControl fullWidth size={isCompact ? "medium" : "small"}>
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

                <FormControl fullWidth size={isCompact ? "medium" : "small"}>
                  <InputLabel>Story points</InputLabel>
                  <Select
                    value={storyPoints}
                    label="Story points"
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

                <Divider />

                <Button
                  variant="text"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleOpenDeleteDialog}
                  disabled={!task}
                  sx={{
                    justifyContent: "flex-start",
                    fontWeight: 800,
                  }}
                >
                  Eliminar tarea
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Drawer>

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
