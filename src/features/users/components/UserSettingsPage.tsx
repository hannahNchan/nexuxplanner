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
  Divider,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTheme } from "@mui/material/styles";
import { logError } from "../../../shared/utils/errorHandling";
import {
  createOrganizationInvitation,
  createOrganization,
  fetchOrganizationMembers,
  fetchOrganizationPendingInvitations,
  type OrganizationInvitation,
  type OrganizationMemberWithProfile,
  uploadOrganizationLogo,
} from "../../api/organizationService";
import { useProject } from "../../../shared/contexts/ProjectContext";
import { fetchAllUsers } from "../../api/projectService";
import OrganizationLogoCropDialog from "../../../shared/ui/OrganizationLogoCropDialog";

type UserSettingsPageProps = {
  userId: string;
  userEmail: string;
  providerAvatarUrl?: string | null;
};

const UserSettingsPage = ({
  userId,
  userEmail,
  providerAvatarUrl = null,
}: UserSettingsPageProps) => {
  const theme = useTheme();
  const { profile, loading, error, updateProfile, updateAvatar, deleteAvatar } = useUserProfile(userId);
  const { organizations, setOrganizations, activeOrganization, setActiveOrganization } = useProject();
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [organization, setOrganization] = useState(profile?.organization || "");
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [newOrganizationLogo, setNewOrganizationLogo] = useState<File | null>(null);
  const [organizationLogoCropSourceFile, setOrganizationLogoCropSourceFile] = useState<File | null>(null);
  const [organizationInviteSearch, setOrganizationInviteSearch] = useState("");
  const [allUsers, setAllUsers] = useState<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>([]);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMemberWithProfile[]>([]);
  const [pendingOrganizationInvitations, setPendingOrganizationInvitations] = useState<OrganizationInvitation[]>([]);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const organizationLogoInputRef = useRef<HTMLInputElement>(null);
  const displayedAvatarUrl = profile?.avatar_url || providerAvatarUrl || undefined;

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setJobTitle(profile.job_title || "");
      setOrganization(profile.organization || "");
      setSkills(profile.skills || []);
    }
  }, [profile]);

  const loadOrganizationAccess = async () => {
    if (!activeOrganization) {
      setOrganizationMembers([]);
      setPendingOrganizationInvitations([]);
      return;
    }

    try {
      const [users, members, invitations] = await Promise.all([
        fetchAllUsers(),
        fetchOrganizationMembers(activeOrganization.id),
        fetchOrganizationPendingInvitations(activeOrganization.id),
      ]);
      setAllUsers(users);
      setOrganizationMembers(members);
      setPendingOrganizationInvitations(invitations);
    } catch (err) {
      logError("userSettings.loadOrganizationAccess", err);
      setErrorMessage("No se pudieron cargar los accesos de la organización");
    }
  };

  useEffect(() => {
    void loadOrganizationAccess();
  }, [activeOrganization?.id]);

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
      logError("userSettings.updateAvatar", err);
      setErrorMessage("Error al subir el avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setRemovingAvatar(true);
      await deleteAvatar();
      setSuccessMessage("Foto de perfil quitada correctamente");
    } catch (err) {
      logError("userSettings.removeAvatar", err);
      setErrorMessage("Error al quitar la foto");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleOrganizationLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Selecciona una imagen válida para el logo");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("El logo debe pesar menos de 2MB");
      return;
    }

    setErrorMessage("");
    setOrganizationLogoCropSourceFile(file);
    event.target.value = "";
  };

  const handleOrganizationLogoCrop = (croppedFile: File) => {
    setNewOrganizationLogo(croppedFile);
    setOrganizationLogoCropSourceFile(null);
    setErrorMessage("");
  };

  const handleCreateOrganization = async () => {
    if (!newOrganizationName.trim()) {
      setErrorMessage("Escribe el nombre de la organización");
      return;
    }

    try {
      setCreatingOrganization(true);
      let organization = await createOrganization(userId, newOrganizationName);

      if (newOrganizationLogo) {
        const logoUrl = await uploadOrganizationLogo(organization.id, newOrganizationLogo);
        organization = {
          ...organization,
          logo_url: logoUrl,
        };
      }

      setOrganizations([...organizations, organization]);
      setActiveOrganization(organization);
      setNewOrganizationName("");
      setNewOrganizationLogo(null);
      setOrganizationLogoCropSourceFile(null);
      setSuccessMessage("Organización creada correctamente");
      window.dispatchEvent(new Event("nexusplanner:projects-changed"));
    } catch (err) {
      logError("userSettings.createOrganization", err);
      setErrorMessage("No se pudo crear la organización");
    } finally {
      setCreatingOrganization(false);
    }
  };

  const handleInviteToOrganization = async (inviteeId: string) => {
    if (!activeOrganization) return;

    try {
      setInvitingUserId(inviteeId);
      await createOrganizationInvitation(activeOrganization.id, inviteeId);
      setOrganizationInviteSearch("");
      await loadOrganizationAccess();
      setSuccessMessage("Invitación enviada correctamente");
    } catch (err) {
      logError("userSettings.inviteOrganizationMember", err);
      setErrorMessage("No se pudo enviar la invitación");
    } finally {
      setInvitingUserId(null);
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
      logError("userSettings.saveProfile", err);
      setErrorMessage("Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const organizationMemberIds = organizationMembers.map((member) => member.user_id);
  const canManageActiveOrganization =
    activeOrganization?.role === "owner" || activeOrganization?.role === "admin";
  const pendingOrganizationInviteeIds = pendingOrganizationInvitations.map(
    (invitation) => invitation.invitee_id
  );
  const availableOrganizationInvitees = allUsers.filter((user) => {
    const query = organizationInviteSearch.trim().toLowerCase();
    const matchesSearch = query ? user.full_name?.toLowerCase().includes(query) : true;

    return (
      matchesSearch &&
      user.id !== userId &&
      !organizationMemberIds.includes(user.id) &&
      !pendingOrganizationInviteeIds.includes(user.id)
    );
  });

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
                  src={displayedAvatarUrl}
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: "3rem",
                    bgcolor: "primary.main",
                  }}
                >
                  {!displayedAvatarUrl && userEmail.charAt(0).toUpperCase()}
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
                    <CircularProgress size={40} sx={{ color: theme.palette.common.white }} />
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
                  disabled={uploadingAvatar || removingAvatar}
                >
                  Cambiar foto
                </Button>
                {profile?.avatar_url ? (
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar || removingAvatar}
                  >
                    {removingAvatar ? "Quitando..." : "Quitar foto"}
                  </Button>
                ) : null}
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
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Organizaciones
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crea empresas o espacios de trabajo separados para agrupar proyectos.
              </Typography>
            </Box>

            {organizations.length > 0 ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {organizations.map((item) => (
                  <Chip key={item.id} label={item.name} avatar={<Avatar src={item.logo_url ?? undefined}>{item.name[0]}</Avatar>} />
                ))}
              </Stack>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Nueva organización"
                value={newOrganizationName}
                onChange={(event) => setNewOrganizationName(event.target.value)}
                placeholder="Ej: Lufthansa"
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={() => organizationLogoInputRef.current?.click()}
              >
                Logo
              </Button>
              <input
                ref={organizationLogoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleOrganizationLogoChange}
              />
              <Button
                variant="contained"
                onClick={handleCreateOrganization}
                disabled={creatingOrganization || !newOrganizationName.trim()}
              >
                {creatingOrganization ? "Creando..." : "Crear organización"}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Sube cualquier imagen y recortala en el cuadro para crear el logo.
            </Typography>

            {activeOrganization ? (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Acceso a {activeOrganization.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Invita personas a la organización. Al aceptar, podrán ver proyectos visibles de la organización.
                  </Typography>
                </Box>

                {canManageActiveOrganization ? (
                  <>
                    <TextField
                      label="Buscar usuario registrado"
                      value={organizationInviteSearch}
                      onChange={(event) => setOrganizationInviteSearch(event.target.value)}
                      placeholder="Escribe el nombre del usuario"
                      fullWidth
                    />

                    {organizationInviteSearch.trim() ? (
                      <Stack spacing={1}>
                        {availableOrganizationInvitees.slice(0, 5).map((user) => (
                          <Stack
                            key={user.id}
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}
                          >
                            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                              <Avatar src={user.avatar_url ?? undefined} sx={{ width: 32, height: 32 }}>
                                {(user.full_name ?? "U").slice(0, 1)}
                              </Avatar>
                              <Typography variant="body2" fontWeight={650} noWrap>
                                {user.full_name ?? "Usuario sin nombre"}
                              </Typography>
                            </Stack>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleInviteToOrganization(user.id)}
                              disabled={invitingUserId === user.id}
                            >
                              Invitar
                            </Button>
                          </Stack>
                        ))}
                        {availableOrganizationInvitees.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No hay usuarios disponibles con ese nombre.
                          </Typography>
                        ) : null}
                      </Stack>
                    ) : null}
                  </>
                ) : (
                  <Alert severity="info" variant="outlined">
                    Solo owner/admin pueden invitar personas a la organización.
                  </Alert>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {organizationMembers.map((member) => (
                    <Chip
                      key={member.id}
                      avatar={<Avatar src={member.user_profiles.avatar_url ?? undefined}>{member.user_profiles.full_name?.[0] ?? "U"}</Avatar>}
                      label={`${member.user_profiles.full_name ?? "Usuario"} · ${member.role}`}
                    />
                  ))}
                </Stack>

                {pendingOrganizationInvitations.length > 0 ? (
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      Invitaciones pendientes
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {pendingOrganizationInvitations.map((invitation) => {
                        const user = allUsers.find((item) => item.id === invitation.invitee_id);
                        return (
                          <Chip
                            key={invitation.id}
                            color="warning"
                            label={`${user?.full_name ?? "Usuario invitado"} · pendiente`}
                          />
                        );
                      })}
                    </Stack>
                  </Stack>
                ) : null}
              </>
            ) : null}
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

      <OrganizationLogoCropDialog
        open={Boolean(organizationLogoCropSourceFile)}
        file={organizationLogoCropSourceFile}
        title="Recortar logo de organizacion"
        onCancel={() => setOrganizationLogoCropSourceFile(null)}
        onCrop={handleOrganizationLogoCrop}
      />

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
