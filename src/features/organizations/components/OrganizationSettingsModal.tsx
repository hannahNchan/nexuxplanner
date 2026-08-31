import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  createOrganizationInvitationByEmail,
  deleteOrganization,
  fetchOrganizationMembers,
  fetchOrganizationPendingInvitations,
  removeOrganizationMember,
  updateOrganization,
  updateOrganizationMemberRole,
  uploadOrganizationLogo,
  type Organization,
  type OrganizationInvitation,
  type OrganizationMemberWithProfile,
} from "../../api/organizationService";
import OrganizationLogoCropDialog from "../../../shared/ui/OrganizationLogoCropDialog";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";

type OrganizationSettingsModalProps = {
  open: boolean;
  organization: Organization | null;
  currentUserId: string;
  onClose: () => void;
  onOrganizationUpdated: (organization: Organization) => void;
  onOrganizationDeleted: (organizationId: string) => void;
};

const OrganizationSettingsModal = ({
  open,
  organization,
  currentUserId,
  onClose,
  onOrganizationUpdated,
  onOrganizationDeleted,
}: OrganizationSettingsModalProps) => {
  const theme = useTheme();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState<OrganizationMemberWithProfile[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<OrganizationInvitation[]>([]);
  const [logoCropSourceFile, setLogoCropSourceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const currentMembership = members.find((member) => member.user_id === currentUserId);
  const canManageOrganization =
    organization?.role === "owner" ||
    organization?.role === "admin" ||
    currentMembership?.role === "owner" ||
    currentMembership?.role === "admin";
  const canDeleteOrganization = organization?.role === "owner" || currentMembership?.role === "owner";

  const loadOrganizationAccess = async () => {
    if (!organization) {
      setMembers([]);
      setPendingInvitations([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const [nextMembers, nextInvitations] = await Promise.all([
        fetchOrganizationMembers(organization.id),
        fetchOrganizationPendingInvitations(organization.id),
      ]);
      setMembers(nextMembers);
      setPendingInvitations(nextInvitations);
    } catch (err) {
      logError("organizationSettings.loadAccess", err);
      setError(getErrorMessage(err, "No se pudieron cargar los accesos de la organización."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !organization) return;

    setName(organization.name);
    setInviteEmail("");
    setError("");
    setDeleteConfirmation("");
    setDeleteDialogOpen(false);
    void loadOrganizationAccess();
  }, [open, organization?.id]);

  const handleSaveName = async () => {
    if (!organization || !name.trim()) {
      setError("El nombre de la organización es obligatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const updatedOrganization = await updateOrganization(organization.id, { name });
      onOrganizationUpdated({ ...updatedOrganization, role: organization.role });
    } catch (err) {
      logError("organizationSettings.saveName", err);
      setError(getErrorMessage(err, "No se pudo actualizar la organización."));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("El logo debe pesar menos de 2MB.");
      return;
    }

    setError("");
    setLogoCropSourceFile(file);
    event.target.value = "";
  };

  const handleLogoCrop = async (croppedFile: File) => {
    if (!organization) return;

    try {
      setSaving(true);
      setError("");
      const logoUrl = await uploadOrganizationLogo(organization.id, croppedFile);
      onOrganizationUpdated({
        ...organization,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      });
      setLogoCropSourceFile(null);
    } catch (err) {
      logError("organizationSettings.uploadLogo", err);
      setError(getErrorMessage(err, "No se pudo subir el logo."));
    } finally {
      setSaving(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleInvite = async () => {
    if (!organization) return;

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError("Escribe el correo de la persona que quieres invitar.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createOrganizationInvitationByEmail(organization.id, email);
      setInviteEmail("");
      await loadOrganizationAccess();
    } catch (err) {
      logError("organizationSettings.invite", err);
      setError(getErrorMessage(err, "No se pudo enviar la invitación."));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    role: OrganizationMemberWithProfile["role"]
  ) => {
    try {
      setSaving(true);
      setError("");
      await updateOrganizationMemberRole(memberId, role);
      await loadOrganizationAccess();
    } catch (err) {
      logError("organizationSettings.updateRole", err);
      setError(getErrorMessage(err, "No se pudo actualizar el rol."));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMemberWithProfile) => {
    try {
      setSaving(true);
      setError("");
      await removeOrganizationMember(member.id);
      await loadOrganizationAccess();
    } catch (err) {
      logError("organizationSettings.removeMember", err);
      setError(getErrorMessage(err, "No se pudo quitar al miembro."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization || deleteConfirmation !== organization.name) return;

    try {
      setSaving(true);
      setError("");
      const deletedOrganizationId = await deleteOrganization(organization.id);
      setDeleteDialogOpen(false);
      onOrganizationDeleted(deletedOrganizationId);
      onClose();
    } catch (err) {
      logError("organizationSettings.deleteOrganization", err);
      setError(getErrorMessage(err, "No se pudo eliminar la organización."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Configuración de la Organización
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {organization?.name ?? "Organización"}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {!organization ? (
            <Alert severity="info">Selecciona una organización para administrar sus ajustes.</Alert>
          ) : (
            <Stack spacing={3}>
              {error ? <Alert severity="error">{error}</Alert> : null}

              <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: "divider" }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Identidad
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Controla el nombre y logo que aparecen en el sidebar.
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                    <Avatar
                      src={organization.logo_url ?? undefined}
                      variant="rounded"
                      sx={{ width: 64, height: 64, fontSize: 20, fontWeight: 900 }}
                    >
                      {organization.name.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <TextField
                      label="Nombre de la organización"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={!canManageOrganization || saving}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                      disabled={!canManageOrganization || saving}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Logo
                    </Button>
                    <Button
                      variant="contained"
                      disabled={!canManageOrganization || saving || !name.trim() || name.trim() === organization.name}
                      onClick={handleSaveName}
                    >
                      Guardar
                    </Button>
                    <input ref={logoInputRef} hidden type="file" accept="image/*" onChange={handleLogoSelect} />
                  </Stack>
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                }}
              >
                <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                  Roles de la organización
                </Typography>
                <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5, color: "text.secondary" }}>
                  <Typography component="li" variant="body2">
                    <strong>Owner:</strong> controla la organización completa y puede eliminarla.
                  </Typography>
                  <Typography component="li" variant="body2">
                    <strong>Admin:</strong> invita miembros, cambia roles y administra accesos, pero no elimina la organización.
                  </Typography>
                  <Typography component="li" variant="body2">
                    <strong>Member:</strong> ve proyectos visibles y puede recibir asignaciones; no administra accesos.
                  </Typography>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: "divider" }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Miembros
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Invita usuarios por correo y controla qué rol tienen dentro de la organización.
                    </Typography>
                  </Box>

                  {canManageOrganization ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <TextField
                        label="Correo del usuario"
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="persona@empresa.com"
                        disabled={saving}
                        sx={{ flex: 1 }}
                      />
                      <Button variant="outlined" disabled={saving || !inviteEmail.trim()} onClick={handleInvite}>
                        Enviar invitación
                      </Button>
                    </Stack>
                  ) : (
                    <Alert severity="info" variant="outlined">
                      Solo owner/admin pueden invitar, cambiar roles o quitar miembros.
                    </Alert>
                  )}

                  {loading ? (
                    <Stack alignItems="center" py={4}>
                      <CircularProgress size={24} />
                    </Stack>
                  ) : (
                    <Stack spacing={1}>
                      {members.map((member) => (
                        <Paper
                          key={member.id}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            border: 1,
                            borderColor: "divider",
                          }}
                        >
                          <Avatar src={member.user_profiles.avatar_url ?? undefined} sx={{ width: 36, height: 36 }}>
                            {(member.user_profiles.full_name ?? "U").slice(0, 1)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={800} noWrap>
                              {member.user_profiles.full_name ?? "Usuario sin perfil"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Miembro de la organización
                            </Typography>
                          </Box>
                          <TextField
                            select
                            size="small"
                            label="Rol"
                            value={member.role}
                            disabled={!canManageOrganization || member.role === "owner" || saving}
                            onChange={(event) =>
                              void handleRoleChange(
                                member.id,
                                event.target.value as OrganizationMemberWithProfile["role"]
                              )
                            }
                            sx={{ width: 150 }}
                          >
                            <MenuItem value="owner">owner</MenuItem>
                            <MenuItem value="admin">admin</MenuItem>
                            <MenuItem value="member">member</MenuItem>
                          </TextField>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canManageOrganization || member.role === "owner" || saving}
                            onClick={() => void handleRemoveMember(member)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Invitaciones pendientes
                    </Typography>
                    {pendingInvitations.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay invitaciones pendientes.
                      </Typography>
                    ) : (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {pendingInvitations.map((invitation) => (
                          <Paper key={invitation.id} elevation={0} sx={{ p: 1.25, border: 1, borderColor: "divider" }}>
                            <Typography variant="body2" fontWeight={700}>
                              Invitación pendiente
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Creada {new Date(invitation.created_at).toLocaleDateString()}
                            </Typography>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: "error.light" }}>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle1" fontWeight={800} color="error">
                    Zona de peligro
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Eliminar la organización borra sus proyectos, tareas, épicas, sprints, notas, automatizaciones y reportes asociados.
                  </Typography>
                  <Box>
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      disabled={!canDeleteOrganization || saving}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Eliminar organización
                    </Button>
                  </Box>
                  {!canDeleteOrganization ? (
                    <Typography variant="caption" color="text.secondary">
                      Solo el owner puede eliminar la organización.
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Eliminar organización</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              Esta acción no se puede deshacer. Escribe el nombre exacto de la organización para confirmar.
            </Alert>
            <TextField
              label={`Escribe: ${organization?.name ?? ""}`}
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoFocus
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving || deleteConfirmation !== organization?.name}
            onClick={handleDeleteOrganization}
          >
            Eliminar definitivamente
          </Button>
        </DialogActions>
      </Dialog>

      <OrganizationLogoCropDialog
        open={Boolean(logoCropSourceFile)}
        file={logoCropSourceFile}
        title="Recortar logo de organización"
        onCancel={() => setLogoCropSourceFile(null)}
        onCrop={(file) => void handleLogoCrop(file)}
      />
    </>
  );
};

export default OrganizationSettingsModal;
