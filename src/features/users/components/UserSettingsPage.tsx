import {
  Container,
  Stack,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

type UserSettingsPageProps = {
  userId: string;
  userEmail: string;
};

const UserSettingsPage = ({ userId, userEmail }: UserSettingsPageProps) => {
  const { profile, loading, error, updateProfile, updateAvatar } = useUserProfile(userId);
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [organization, setOrganization] = useState(profile?.organization || "");
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // ✅ NUEVO

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setJobTitle(profile.job_title || "");
      setOrganization(profile.organization || "");
      setSkills(profile.skills || []);
    }
  }, [profile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Por favor selecciona una imagen válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("La imagen debe ser menor a 5MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      await updateAvatar(file);
      setSuccessMessage("Avatar actualizado correctamente");
    } catch (err) {
      console.error("Error:", err);
      setErrorMessage("Error al subir el avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({
        full_name: fullName.trim() || null,
        job_title: jobTitle.trim() || null,
        organization: organization.trim() || null,
        skills,
      });
      setSuccessMessage("Perfil actualizado correctamente");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("Error:", err);
      setErrorMessage("Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress />
          <Typography color="text.secondary">Cargando perfil...</Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Ajustes de Usuario
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configura tu información personal y preferencias
          </Typography>
        </Box>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider" }}>
          <Stack spacing={3}>
            <Typography variant="h6" fontWeight={600}>
              Foto de Perfil
            </Typography>

            <Stack direction="row" spacing={3} alignItems="center">
              <Box position="relative">
                <Avatar
                  src={profile?.avatar_url || undefined}
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: "3rem",
                    bgcolor: "primary.main",
                  }}
                >
                  {!profile?.avatar_url && (userEmail.charAt(0).toUpperCase())}
                </Avatar>
                
                {uploadingAvatar && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor="rgba(0,0,0,0.5)"
                    borderRadius="50%"
                  >
                    <CircularProgress size={40} sx={{ color: "white" }} />
                  </Box>
                )}
              </Box>

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Sube una foto de perfil. Formato: JPG, PNG. Tamaño máximo: 5MB.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                >
                  Cambiar foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider" }}>
          <Stack spacing={3}>
            <Typography variant="h6" fontWeight={600}>
              Información Personal
            </Typography>

            <TextField
              label="Correo electrónico"
              value={userEmail}
              disabled
              fullWidth
              helperText="El correo no se puede cambiar"
            />

            <TextField
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
              placeholder="Ej: Juan Pérez"
            />

            <TextField
              label="Puesto de trabajo"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              fullWidth
              placeholder="Ej: Product Manager"
            />

            <TextField
              label="Organización"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              fullWidth
              placeholder="Ej: Mi Empresa S.A."
            />
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider" }}>
          <Stack spacing={3}>
            <Typography variant="h6" fontWeight={600}>
              Habilidades
            </Typography>

            {skills.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {skills.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onDelete={() => handleRemoveSkill(skill)}
                    deleteIcon={<CloseIcon />}
                  />
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Agregar habilidad"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddSkill();
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddSkill}
                disabled={!newSkill.trim()}
              >
                Agregar
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage("")} sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={4000}
        onClose={() => setErrorMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="error" onClose={() => setErrorMessage("")} sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserSettingsPage;