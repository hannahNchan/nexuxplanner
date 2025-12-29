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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useMemo, useEffect } from "react";
import { getEmojiForTag, getColorForTag, isValidTag } from "../../../shared/utils/tagHelpers";
import type { ProjectWithTags } from "../../api/projectService";

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (
    title: string,
    description: string,
    tags: string[],
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingProject;

  // Cargar datos del proyecto en modo edición
  useEffect(() => {
    if (editingProject) {
      setTitle(editingProject.title);
      setDescription(editingProject.description || "");
      setTags(editingProject.tags || []);
    } else {
      setTitle("");
      setDescription("");
      setTags([]);
    }
    setCurrentTagInput("");
    setError(null);
  }, [editingProject, open]);

  // Memoizar los tags para que no cambien cuando otros campos se actualicen
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
    setTags([]);
    setCurrentTagInput("");
    setError(null);
    onClose();
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

    // Si termina en espacio, crear el tag
    if (value.endsWith(" ")) {
      const tagText = value.slice(0, -1); // Remover el espacio
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
      // Si está vacío y presiona backspace, eliminar el último tag
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("El nombre del proyecto es obligatorio");
      return;
    }

    if (title.trim().length > 100) {
      setError("El nombre es demasiado largo (máximo 100 caracteres)");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(title.trim(), description.trim(), tags, editingProject?.id);
      handleClose();
    } catch (err) {
      console.error("Error guardando proyecto:", err);
      setError("No se pudo guardar el proyecto. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          {isEditing ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
          <Typography variant="h6">
            {isEditing ? "Editar proyecto" : "Crear nuevo proyecto"}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} pt={1}>
          <Typography variant="body2" color="text.secondary">
            Los proyectos te ayudan a organizar épicas y tareas relacionadas.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label="Nombre del proyecto"
            placeholder="Ej: Rediseño de la app móvil"
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
            label="Descripción (opcional)"
            placeholder="Describe brevemente el propósito del proyecto..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            inputProps={{
              maxLength: 500,
            }}
            helperText={`${description.length}/500 caracteres`}
          />

          <Box>
            <TextField
              fullWidth
              label="Tags (opcional)"
              placeholder="Escribe y presiona espacio o Enter"
              value={currentTagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagKeyDown}
              helperText="Presiona espacio o Enter para crear un tag"
            />
            {memoizedTags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mt={2}>
                {memoizedTags.map((tag) => (
                  <Chip
                    key={tag.text}
                    label={`${tag.emoji} ${tag.text}`}
                    onDelete={() => handleRemoveTag(tag.text)}
                    deleteIcon={<CloseIcon />}
                    sx={{
                      bgcolor: tag.color,
                      color: "#fff",
                      fontWeight: 600,
                      border: `2px solid ${tag.color}`,
                      "& .MuiChip-deleteIcon": {
                        color: "#fff",
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
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          startIcon={isEditing ? <EditIcon /> : <AddIcon />}
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