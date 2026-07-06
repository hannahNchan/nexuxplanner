import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  Stack,
  IconButton,
  Paper,
  Chip,
  Button,
  TextField,
  CircularProgress,
  FormControlLabel,
  Switch,
  Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ClearIcon from "@mui/icons-material/Clear";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useState, useEffect, useRef } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useProjectCatalogs } from "../hooks/useProjectCatalogs";
import IconPicker from "../../../shared/ui/IconPicker";
import ColorPicker from "../../../shared/ui/ColorPicker";
import { uploadProjectBanner, removeProjectBanner, fetchProjectById } from "../../../features/api/projectService";
import type { IssueType, Priority, EpicPhase } from "../../../features/api/catalogService";

type ProjectSettingsModalProps = {
  open: boolean;
  projectName: string;
  projectId: string;
  allowBoardTaskCreation: boolean;
  onClose: () => void;
  onUpdateAllowBoardTaskCreation: (projectId: string, value: boolean) => Promise<void>;
};

type Section = "general" | "tasks" | "epics";

const ProjectSettingsModal = ({ 
  open, 
  projectName,
  projectId,
  allowBoardTaskCreation: initialAllowBoardTaskCreation,
  onClose,
  onUpdateAllowBoardTaskCreation,
}: ProjectSettingsModalProps) => {
  const theme = useTheme();
  const [selectedSection, setSelectedSection] = useState<Section>("general");
  const catalogs = useProjectCatalogs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string>("");
  const [projectData, setProjectData] = useState<any>(null);

  const [editingIssueTypes, setEditingIssueTypes] = useState<Record<string, Partial<IssueType>>>({});
  const [editingPriorities, setEditingPriorities] = useState<Record<string, Partial<Priority>>>({});
  const [editingPhases, setEditingPhases] = useState<Record<string, Partial<EpicPhase>>>({});
  const [newPointValue, setNewPointValue] = useState("");
  const [allowBoardTaskCreation, setAllowBoardTaskCreation] = useState(initialAllowBoardTaskCreation);

  useEffect(() => {
    if (open) {
      setAllowBoardTaskCreation(initialAllowBoardTaskCreation);
      void catalogs.refetch();
      void loadProjectData();
    }
  }, [open, initialAllowBoardTaskCreation]);

  const loadProjectData = async () => {
    try {
      const project = await fetchProjectById(projectId);
      if (project) {
        setProjectData(project);
        setCurrentBannerUrl(project.banner_url || "");
        setPreviewUrl("");
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Error cargando datos del proyecto:", error);
    }
  };

  const handleToggleBoardTaskCreation = async (checked: boolean) => {
    setAllowBoardTaskCreation(checked);
    try {
      await onUpdateAllowBoardTaskCreation(projectId, checked);
    } catch (error) {
      console.error("Error actualizando configuración:", error);
      setAllowBoardTaskCreation(!checked);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      console.error("El archivo es demasiado grande. Máximo 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      console.error("El archivo debe ser una imagen");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadBanner = async () => {
    if (!selectedFile) return;

    setUploadingBanner(true);
    try {
      const bannerUrl = await uploadProjectBanner(projectId, selectedFile);
      setCurrentBannerUrl(bannerUrl);
      setPreviewUrl("");
      setSelectedFile(null);
      console.log("Banner subido exitosamente:", bannerUrl);
    } catch (error) {
      console.error("Error subiendo el banner:", error);
    } finally {
      setUploadingBanner(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveBanner = async () => {
    if (!currentBannerUrl) return;

    setUploadingBanner(true);
    try {
      await removeProjectBanner(projectId);
      setCurrentBannerUrl("");
      console.log("Banner eliminado exitosamente");
    } catch (error) {
      console.error("Error eliminando el banner:", error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const renderGeneralSettings = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Banner del Proyecto
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Personaliza tu proyecto con una imagen de banner
        </Typography>

        <Box sx={{ mt: 3 }}>
          {(currentBannerUrl || previewUrl) ? (
            <Box sx={{ position: "relative" }}>
              <Box
                component="img"
                src={previewUrl || currentBannerUrl}
                alt="Banner del proyecto"
                sx={{
                  width: "100%",
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
              {currentBannerUrl && !previewUrl && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleRemoveBanner}
                  disabled={uploadingBanner}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "background.paper",
                    "&:hover": {
                      bgcolor: "error.light",
                      color: "error.contrastText",
                    },
                  }}
                >
                  <ClearIcon />
                </IconButton>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                width: "100%",
                height: 200,
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadFileIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="body1" fontWeight={600} gutterBottom>
                Haz clic para subir banner
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos: JPG, PNG, GIF. Máximo 5MB
              </Typography>
            </Box>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {selectedFile && (
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                onClick={handleClearSelection}
                disabled={uploadingBanner}
                startIcon={<ClearIcon />}
              >
                Limpiar
              </Button>
              <Button
                variant="contained"
                onClick={handleUploadBanner}
                disabled={uploadingBanner}
                startIcon={uploadingBanner ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              >
                {uploadingBanner ? "Subiendo..." : "Subir imagen"}
              </Button>
            </Stack>
          )}

          {!selectedFile && !currentBannerUrl && (
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              sx={{ mt: 3 }}
              startIcon={<UploadFileIcon />}
            >
              Examinar
            </Button>
          )}
        </Box>
      </Box>
    </Stack>
  );

  const handleIssueTypeChange = (id: string, field: keyof IssueType, value: string) => {
    setEditingIssueTypes((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSaveIssueType = async (id: string) => {
    const updates = editingIssueTypes[id];
    if (updates) {
      await catalogs.editIssueType(id, updates);
      setEditingIssueTypes((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePriorityChange = (id: string, field: keyof Priority, value: string | number) => {
    setEditingPriorities((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSavePriority = async (id: string) => {
    const updates = editingPriorities[id];
    if (updates) {
      await catalogs.editPriority(id, updates);
      setEditingPriorities((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePhaseChange = (id: string, field: keyof EpicPhase, value: string) => {
    setEditingPhases((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSavePhase = async (id: string) => {
    const updates = editingPhases[id];
    if (updates) {
      await catalogs.editEpicPhase(id, updates);
      setEditingPhases((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleAddIssueType = async () => {
    await catalogs.addIssueType("Nuevo tipo", "circle", "#3B82F6");
  };

  const handleAddPriority = async () => {
    await catalogs.addPriority("Nueva prioridad", catalogs.priorities.length + 1, "#64748B");
  };

  const handleAddPhase = async () => {
    await catalogs.addEpicPhase("Nueva fase", "#64748B");
  };

  const handleAddPointValue = async () => {
    if (!newPointValue.trim()) return;
    const numericValue = parseInt(newPointValue, 10);
    await catalogs.addPointValue(newPointValue, isNaN(numericValue) ? null : numericValue);
    setNewPointValue("");
  };

  const handleIssueTypesDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(catalogs.issueTypes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    await catalogs.reorderIssueTypesList(items);
  };

  const handlePrioritiesDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(catalogs.priorities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    await catalogs.reorderPrioritiesList(items);
  };

  const handlePhasesDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(catalogs.epicPhases);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    await catalogs.reorderEpicPhasesList(items);
  };

  const renderTasksSettings = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Creación de Tareas
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Controla dónde se pueden crear nuevas tareas
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={allowBoardTaskCreation}
                onChange={(e) => handleToggleBoardTaskCreation(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  Permitir crear tareas desde el Tablero Scrum
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {allowBoardTaskCreation
                    ? "Las tareas se pueden crear directamente en cada columna del tablero"
                    : "Las tareas solo se pueden crear desde el Backlog"}
                </Typography>
              </Box>
            }
          />
        </Paper>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Tipos de Issue
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configura los tipos de tareas disponibles en el proyecto
        </Typography>

        <DragDropContext onDragEnd={handleIssueTypesDragEnd}>
          <Droppable droppableId="issue-types">
            {(provided) => (
              <Stack spacing={1} sx={{ mt: 2 }} {...provided.droppableProps} ref={provided.innerRef}>
                {catalogs.issueTypes.map((type, index) => {
                  const editing = editingIssueTypes[type.id];
                  const currentName = editing?.name ?? type.name;
                  const currentIcon = editing?.icon ?? type.icon;
                  const currentColor = editing?.color ?? type.color;

                  return (
                    <Draggable key={type.id} draggableId={type.id} index={index}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            bgcolor: snapshot.isDragging ? "action.hover" : "background.paper",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box {...provided.dragHandleProps}>
                            <DragIndicatorIcon sx={{ color: "text.disabled", cursor: "grab" }} />
                          </Box>

                          <TextField
                            size="small"
                            value={currentName}
                            onChange={(e) => handleIssueTypeChange(type.id, "name", e.target.value)}
                            onBlur={() => handleSaveIssueType(type.id)}
                            sx={{ flex: 1 }}
                          />

                          <IconPicker
                            value={currentIcon}
                            color={currentColor}
                            onChange={(icon) => {
                              handleIssueTypeChange(type.id, "icon", icon);
                              handleSaveIssueType(type.id);
                            }}
                          />

                          <ColorPicker
                            value={currentColor}
                            onChange={(color) => {
                              handleIssueTypeChange(type.id, "color", color);
                              handleSaveIssueType(type.id);
                            }}
                          />

                          <IconButton size="small" color="error" onClick={() => catalogs.removeIssueType(type.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Paper>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>

        <Button startIcon={<AddIcon />} sx={{ mt: 2 }} variant="outlined" onClick={handleAddIssueType}>
          Agregar tipo de issue
        </Button>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Prioridades
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define los niveles de prioridad para las tareas
        </Typography>

        <DragDropContext onDragEnd={handlePrioritiesDragEnd}>
          <Droppable droppableId="priorities">
            {(provided) => (
              <Stack spacing={1} sx={{ mt: 2 }} {...provided.droppableProps} ref={provided.innerRef}>
                {catalogs.priorities.map((priority, index) => {
                  const editing = editingPriorities[priority.id];
                  const currentName = editing?.name ?? priority.name;
                  const currentColor = editing?.color ?? priority.color;

                  return (
                    <Draggable key={priority.id} draggableId={priority.id} index={index}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            bgcolor: snapshot.isDragging ? "action.hover" : "background.paper",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box {...provided.dragHandleProps}>
                            <DragIndicatorIcon sx={{ color: "text.disabled", cursor: "grab" }} />
                          </Box>

                          <TextField
                            size="small"
                            value={currentName}
                            onChange={(e) => handlePriorityChange(priority.id, "name", e.target.value)}
                            onBlur={() => handleSavePriority(priority.id)}
                            sx={{ flex: 1 }}
                          />

                          <ColorPicker
                            value={currentColor}
                            onChange={(color) => {
                              handlePriorityChange(priority.id, "color", color);
                              handleSavePriority(priority.id);
                            }}
                          />

                          <IconButton size="small" color="error" onClick={() => catalogs.removePriority(priority.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Paper>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>

        <Button startIcon={<AddIcon />} sx={{ mt: 2 }} variant="outlined" onClick={handleAddPriority}>
          Agregar prioridad
        </Button>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Story Points
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Sistema de estimación para tareas (Fibonacci por defecto)
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
          {catalogs.pointValues.map((point) => (
            <Chip
              key={point.id}
              label={point.value}
              onDelete={() => catalogs.removePointValue(point.id)}
              sx={{
                fontSize: 16,
                fontWeight: 600,
                height: 36,
              }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField
            size="small"
            placeholder="Nuevo valor"
            value={newPointValue}
            onChange={(e) => setNewPointValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                void handleAddPointValue();
              }
            }}
            sx={{ width: 150 }}
          />
          <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddPointValue}>
            Agregar
          </Button>
        </Stack>
      </Box>
    </Stack>
  );

  const renderEpicsSettings = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Fases de Épica
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define las fases del ciclo de vida de una épica
        </Typography>

        <DragDropContext onDragEnd={handlePhasesDragEnd}>
          <Droppable droppableId="epic-phases">
            {(provided) => (
              <Stack spacing={1} sx={{ mt: 2 }} {...provided.droppableProps} ref={provided.innerRef}>
                {catalogs.epicPhases.map((phase, index) => {
                  const editing = editingPhases[phase.id];
                  const currentName = editing?.name ?? phase.name;
                  const currentColor = editing?.color ?? phase.color;

                  return (
                    <Draggable key={phase.id} draggableId={phase.id} index={index}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            bgcolor: snapshot.isDragging ? "action.hover" : "background.paper",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box {...provided.dragHandleProps}>
                            <DragIndicatorIcon sx={{ color: "text.disabled", cursor: "grab" }} />
                          </Box>

                          <TextField
                            size="small"
                            value={currentName}
                            onChange={(e) => handlePhaseChange(phase.id, "name", e.target.value)}
                            onBlur={() => handleSavePhase(phase.id)}
                            sx={{ flex: 1 }}
                          />

                          <ColorPicker
                            value={currentColor}
                            onChange={(color) => {
                              handlePhaseChange(phase.id, "color", color);
                              handleSavePhase(phase.id);
                            }}
                          />

                          <IconButton size="small" color="error" onClick={() => catalogs.removeEpicPhase(phase.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Paper>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>

        <Button startIcon={<AddIcon />} sx={{ mt: 2 }} variant="outlined" onClick={handleAddPhase}>
          Agregar fase
        </Button>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Prefijo de Épica
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configura el formato de ID para las épicas (ej: EPIC-001, EPIC-002)
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="Prefijo"
          defaultValue="EPIC"
          helperText="Las épicas se numerarán automáticamente: EPIC-001, EPIC-002, etc."
          sx={{ mt: 2, maxWidth: 300 }}
        />
      </Box>
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: "90vh",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Configuración del Proyecto
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {projectName}
            </Typography>
          </Box>

          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", height: "100%" }}>
        <Box
          sx={{
            width: 240,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <List disablePadding>
            <ListItemButton
              selected={selectedSection === "general"}
              onClick={() => setSelectedSection("general")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="General"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "general" ? 600 : 400,
                }}
              />
            </ListItemButton>

            <ListItemButton
              selected={selectedSection === "tasks"}
              onClick={() => setSelectedSection("tasks")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="Tareas"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "tasks" ? 600 : 400,
                }}
              />
            </ListItemButton>

            <ListItemButton
              selected={selectedSection === "epics"}
              onClick={() => setSelectedSection("epics")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="Épicas"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "epics" ? 600 : 400,
                }}
              />
            </ListItemButton>
          </List>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 4,
            overflow: "auto",
          }}
        >
          {catalogs.loading ? (
            <Stack alignItems="center" justifyContent="center" height="100%">
              <CircularProgress />
            </Stack>
          ) : (
            <>
              {selectedSection === "general" && renderGeneralSettings()}
              {selectedSection === "tasks" && renderTasksSettings()}
              {selectedSection === "epics" && renderEpicsSettings()}
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectSettingsModal;
