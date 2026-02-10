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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState, useEffect } from "react";
import UserAvatar from "../../../shared/ui/UserAvatar";
import { supabase } from "../../../lib/supabase";
import { addProjectMember, fetchProjectMembers, removeProjectMember, fetchAllUsers } from "../../api/projectService";

type InviteUserModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

type User = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

const InviteUserModal = ({ open, onClose, projectId }: InviteUserModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (open) {
      loadMembers();
      loadUsers();
    }
  }, [open, projectId]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProjectMembers(projectId);
      setMembers(data);
    } catch (err) {
      console.error("Error cargando miembros:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
  };

  const handleInvite = async (userId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await addProjectMember(projectId, userId);
      setSearchQuery("");
      await loadMembers();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al invitar usuario");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeProjectMember(memberId);
      await loadMembers();
    } catch (err) {
      console.error("Error eliminando miembro:", err);
    }
  };

  const memberUserIds = members.map(m => m.user_id);
  
  const availableUsers = users.filter(user => {
    const matchesSearch = searchQuery 
      ? user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const isNotCurrentUser = user.id !== currentUserId;
    const isNotMember = !memberUserIds.includes(user.id);
    
    return matchesSearch && isNotCurrentUser && isNotMember;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invitar usuarios al proyecto</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar usuario por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            error={!!error}
            helperText={error}
            disabled={isSubmitting}
          />

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Usuarios disponibles ({availableUsers.length}):
            </Typography>
            {availableUsers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={2}>
                No hay usuarios disponibles para invitar
              </Typography>
            ) : (
              <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
                {availableUsers.map((user) => (
                  <ListItem
                    key={user.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleInvite(user.id)}
                        disabled={isSubmitting}
                      >
                        Invitar
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <UserAvatar userId={user.id} size={32} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.full_name || "Sin nombre"}
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
                    key={member.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemove(member.id)}
                        size="small"
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