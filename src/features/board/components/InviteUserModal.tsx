import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState, useEffect } from "react";
import UserAvatar from "../../../shared/ui/UserAvatar";
import {
  fetchCurrentUserOption,
  fetchProjectMembers,
  removeProjectMember,
  addProjectMember,
  type ProjectMemberWithProfile,
} from "../../api/projectService";
import {
  fetchOrganizationMembers,
  type OrganizationMemberWithProfile,
} from "../../api/organizationService";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";
import { useProject } from "../../../shared/contexts/ProjectContext";

type InviteUserModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
};

const InviteUserModal = ({ open, onClose, projectId }: InviteUserModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMemberWithProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeOrganization } = useProject();

  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await fetchCurrentUserOption();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (open) {
      void loadMembers();
      void loadOrganizationMembers();
    }
  }, [open, projectId, activeOrganization?.id]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProjectMembers(projectId);
      setMembers(data);
    } catch (err) {
      logError("inviteUsers.loadMembers", err);
      setError(getErrorMessage(err, "No se pudieron cargar los miembros."));
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizationMembers = async () => {
    if (!activeOrganization) {
      setOrganizationMembers([]);
      return;
    }

    try {
      const data = await fetchOrganizationMembers(activeOrganization.id);
      setOrganizationMembers(data);
    } catch (err) {
      logError("inviteUsers.loadOrganizationMembers", err);
      setError(getErrorMessage(err, "No se pudieron cargar los miembros de la organización."));
    }
  };

  const handleAddProjectMember = async (userId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await addProjectMember(projectId, userId);
      setSearchQuery("");
      await loadMembers();
    } catch (err) {
      logError("inviteUsers.addProjectMember", err);
      setError(getErrorMessage(err, "Error al agregar colaborador"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeProjectMember(projectId, memberId);
      await loadMembers();
    } catch (err) {
      logError("inviteUsers.removeMember", err);
      setError(getErrorMessage(err, "Error al eliminar miembro"));
    }
  };

  const memberUserIds = members.map(m => m.user_id);
  
  const availableUsers = organizationMembers.filter(member => {
    const matchesSearch = searchQuery 
      ? member.user_profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const isNotCurrentUser = member.user_id !== currentUserId;
    const isNotMember = !memberUserIds.includes(member.user_id);
    
    return matchesSearch && isNotCurrentUser && isNotMember;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Colaboradores del proyecto</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            fullWidth
            size="small"
            placeholder="Buscar usuario por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSubmitting}
          />

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Miembros de {activeOrganization?.name ?? "la organización"} disponibles ({availableUsers.length})
            </Typography>
            {availableUsers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={2}>
                No hay miembros disponibles para agregar. Primero invita personas a la organización.
              </Typography>
            ) : (
              <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
                {availableUsers.map((member) => (
                  <ListItem
                    key={member.user_id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAddProjectMember(member.user_id)}
                        disabled={isSubmitting}
                      >
                        Agregar
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <UserAvatar userId={member.user_id} size={32} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.user_profiles.full_name || "Sin nombre"}
                      secondary={`Rol en organización: ${member.role}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              Miembros del proyecto ({members.length})
            </Typography>

            {isLoading ? (
              <Stack alignItems="center" py={2}>
                <CircularProgress size={24} />
              </Stack>
            ) : members.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={2}>
                No hay miembros invitados
              </Typography>
            ) : (
              <List>
                {members.map((member) => (
                  <ListItem
                    key={member.id ?? member.user_id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => member.id && handleRemove(member.id)}
                        size="small"
                        disabled={!member.id}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <UserAvatar userId={member.user_id} size={40} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.user_profiles?.full_name || "Sin nombre"}
                      secondary={member.role}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteUserModal;
