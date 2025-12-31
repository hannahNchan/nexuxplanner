import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Chip,
  Box,
  Grid,
  Alert,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useMemo, useEffect } from "react";
import {
  getEmojiForTag,
  getColorForTag,
  isValidTag,
} from "../../../shared/utils/tagHelpers";
import type { ProjectWithTags } from "../../api/projectService";

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (
    title: string,
    description: string,
    tags: string[],
    projectKey: string,
    projectId?: string
  ) => Promise<void>;
  editingProject?: ProjectWithTags | null;
};

const CreateProjectModal = ({
  open,
  onClose,
  onSave,
  editingProject = null,
}: CreateProjectModalProps) => {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const isEditing = !!editingProject;

  // Cargar datos del proyecto en modo edición
  useEffect(() => {
    if (editingProject) {
      setTitle(editingProject.title);
      setDescription(editingProject.description || "");
      setProjectKey(editingProject.project_key || "");
      setTags(editingProject.tags || []);
    } else {
      setTitle("");
      setDescription("");
      setProjectKey("");
      setTags([]);
    }
    setCurrentTagInput("");
    setError(null);
    setKeyError(null);
  }, [editingProject, open]);

  // Auto-generar sugerencia de siglas basada en el título
  const suggestedKey = useMemo(() => {
    if (!title || projectKey) return "";

    const words = title
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return "";

    if (words.length > 1) {
      return words
        .map((w) => w[0])
        .join("")
        .slice(0, 5);
    }

    return words[0].slice(0, 5);
  }, [title, projectKey]);

  // Validar siglas del proyecto
  const validateProjectKey = (key: string): boolean => {
    if (!key) {
      setKeyError("Las siglas son obligatorias");
      return false;
    }

    if (key.length < 2 || key.length > 10) {
      setKeyError("Debe tener entre 2 y 10 caracteres");
      return false;
    }

    if (!/^[A-Z0-9]+$/.test(key)) {
      setKeyError("Solo letras mayúsculas y números");
      return false;
    }

    setKeyError(null);
    return true;
  };

  // Memoizar los tags
  const memoizedTags = useMemo(() => {
    return tags.map((tag) => ({
      text: tag,
      emoji: getEmojiForTag(tag),
      color: getColorForTag(tag),
    }));
  }, [tags]);

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setProjectKey("");
    setTags([]);
    setCurrentTagInput("");
    setError(null);
    setKeyError(null);
    onClose();
  };

  const handleProjectKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setProjectKey(value);
    validateProjectKey(value);
  };

  const handleUseSuggestion = () => {
    setProjectKey(suggestedKey);
    validateProjectKey(suggestedKey);
  };

  const handleAddTag = (tagText: string) => {
    const trimmedTag = tagText.trim();
    if (isValidTag(trimmedTag, tags)) {
      setTags([...tags, trimmedTag]);
      setCurrentTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value.endsWith(" ")) {
      const tagText = value.slice(0, -1);
      if (tagText.trim()) {
        handleAddTag(tagText);
      }
    } else {
      setCurrentTagInput(value);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentTagInput.trim()) {
      e.preventDefault();
      handleAddTag(currentTagInput);
    } else if (e.key === "Backspace" && !currentTagInput && tags.length > 0) {
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("El nombre del proyecto es obligatorio");
      return;
    }

    if (!validateProjectKey(projectKey)) {
      return;
    }

    if (title.trim().length > 100) {
      setError("El nombre es demasiado largo (máximo 100 caracteres)");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(
        title.trim(),
        description.trim(),
        tags,
        projectKey.trim(),
        editingProject?.id
      );
      handleClose();
    } catch (err) {
      console.error("Error guardando proyecto:", err);
      setError("No se pudo guardar el proyecto. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      {/* Título mejorado */}
      <DialogTitle
        sx={{
          pb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            {isEditing ? (
              <EditIcon sx={{ fontSize: 28, color: "primary.main" }} />
            ) : (
              <AddIcon sx={{ fontSize: 28, color: "primary.main" }} />
            )}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {isEditing ? "Editar proyecto" : "Crear nuevo proyecto"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Los proyectos te ayudan a organizar épicas y tareas relacionadas
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        <Grid container spacing={0}>
          {/* Columna Izquierda - Información Básica */}
          <Grid item xs={12} md={5.5}>
            <Box sx={{ pr: { xs: 0, md: 3 } }}>
              <Typography
                variant="overline"
                fontWeight={700}
                color="primary"
                sx={{ mb: 2, display: "block" }}
              >
                Información básica
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  autoFocus
                  fullWidth
                  label="Nombre del proyecto"
                  placeholder="Ej: Piano Learning Platform"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={!!error}
                  helperText={error || `${title.length}/100 caracteres`}
                  inputProps={{
                    maxLength: 100,
                  }}
                />

                <TextField
                  fullWidth
                  label="Siglas del proyecto"
                  placeholder="Ej: PIANOLRN"
                  value={projectKey}
                  onChange={handleProjectKeyChange}
                  error={!!keyError}
                  helperText={
                    keyError || (
                      <span>
                        El ID del proyecto son las siglas que antecederan a una tarea, seguido de un guión y el numero consecutivo de la tarea <br /> <strong>{projectKey || "XXX"}-1</strong>,{" "}
                        <strong>{projectKey || "XXX"}-2</strong>...
                      </span>
                    )
                  }
                  inputProps={{
                    maxLength: 10,
                    style: {
                      textTransform: "uppercase",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      fontSize: "1.1rem",
                    },
                  }}
                />

                {suggestedKey && !projectKey && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleUseSuggestion}
                    sx={{
                      textTransform: "none",
                      alignSelf: "flex-start",
                    }}
                  >
                    Usar sugerencia:{" "}
                    <strong style={{ marginLeft: 4 }}>{suggestedKey}</strong>
                  </Button>
                )}

                {projectKey && (
                  <Alert
                    severity="info"
                    sx={{
                      fontSize: "0.875rem",
                      "& .MuiAlert-message": {
                        width: "100%",
                      },
                    }}
                  >
                    Las tareas tendrán IDs como:
                    <br />
                    <Box
                      sx={{ mt: 0.5, fontFamily: "monospace", fontWeight: 600 }}
                    >
                      {projectKey}-1, {projectKey}-2, {projectKey}-3...
                    </Box>
                  </Alert>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Divider Vertical */}
          <Grid
            item
            xs={12}
            md={1}
            sx={{
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
            }}
          >
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: alpha(theme.palette.primary.main, 0.2),
                borderWidth: 1,
              }}
            />
          </Grid>

          {/* Divider Horizontal (solo móvil) */}
          <Grid
            item
            xs={12}
            sx={{ display: { xs: "block", md: "none" }, my: 3 }}
          >
            <Divider
              sx={{
                borderColor: alpha(theme.palette.primary.main, 0.2),
                borderWidth: 1,
              }}
            />
          </Grid>

          {/* Columna Derecha - Detalles Adicionales */}
          <Grid item xs={12} md={5.5}>
            <Box sx={{ pl: { xs: 0, md: 3 } }}>
              <Typography
                variant="overline"
                fontWeight={700}
                color="primary"
                sx={{ mb: 2, display: "block" }}
              >
                Detalles adicionales
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Descripción (opcional)"
                  placeholder="Describe el propósito del proyecto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={4}
                  inputProps={{
                    maxLength: 500,
                  }}
                  helperText={`${description.length}/500 caracteres`}
                />

                <Box>
                  <TextField
                    fullWidth
                    label="Tags (opcional)"
                    placeholder="Escribe y presiona espacio"
                    value={currentTagInput}
                    onChange={handleTagInputChange}
                    onKeyDown={handleTagKeyDown}
                    helperText="Presiona espacio o Enter para crear un tag"
                  />
                  {memoizedTags.length > 0 && (
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      gap={1}
                      mt={2}
                    >
                      {memoizedTags.map((tag) => (
                        <Chip
                          key={tag.text}
                          label={`${tag.emoji} ${tag.text}`}
                          onDelete={() => handleRemoveTag(tag.text)}
                          deleteIcon={<CloseIcon />}
                          size="small"
                          sx={{
                            bgcolor: tag.color,
                            color: "#fff",
                            fontWeight: 600,
                            border: `2px solid ${tag.color}`,
                            "& .MuiChip-deleteIcon": {
                              color: "#fff",
                              fontSize: "1rem",
                              "&:hover": {
                                color: "rgba(255, 255, 255, 0.8)",
                              },
                            },
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      {/* Footer mejorado */}
      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Button
          onClick={handleClose}
          disabled={isSaving}
          sx={{
            borderRadius: 2,
            px: 3,
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={
            isSaving || !title.trim() || !projectKey.trim() || !!keyError
          }
          startIcon={isEditing ? <EditIcon /> : <AddIcon />}
          sx={{
            borderRadius: 2,
            px: 3,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            "&:hover": {
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
          }}
        >
          {isSaving
            ? isEditing
              ? "Guardando..."
              : "Creando..."
            : isEditing
            ? "Guardar cambios"
            : "Crear proyecto"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProjectModal;
