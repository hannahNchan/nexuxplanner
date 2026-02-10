import { TextField, InputAdornment, Stack, AvatarGroup, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useState, useEffect } from "react";
import UserAvatar from "../../../shared/ui/UserAvatar";
import InviteUserModal from "./InviteUserModal";
import { fetchProjectMembers } from "../../api/projectService";

type BoardToolbarProps = {
  tasks: Record<string, { assignee_id?: string }>;
  onSearchChange: (query: string) => void;
  projectId: string;
};

const BoardToolbar = ({ onSearchChange, projectId }: BoardToolbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [changeInput, setChangeInput] = useState(250);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const members = await fetchProjectMembers(projectId);
        setMemberUserIds(members.map(m => m.user_id));
      } catch (err) {
        console.error("Error cargando miembros:", err);
      }
    };

    if (projectId) {
      loadMembers();
    }
  }, [projectId]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 3 || value.length === 0) {
      onSearchChange(value);
    }
  };

  const onHandleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.blur();
    setChangeInput(200);
  };

  return (
    <>
      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="center"
        sx={{
          bgcolor: "background.paper",
          p: 2
        }}
      >
        <TextField
          size="small"
          placeholder="Buscar cualquier cosa ..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setChangeInput(600)}
          onBlur={(e) => onHandleBlur(e)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: changeInput, transition: "width 0.3s" }}
        />

        <AvatarGroup max={6} sx={{ ml: 2 }}>
          {memberUserIds.map((userId) => (
            <UserAvatar
              key={userId}
              userId={userId}
              size={32}
              showTooltip={true}
            />
          ))}
        </AvatarGroup>

        <IconButton size="small" sx={{ ml: 1 }} onClick={() => setIsInviteModalOpen(true)}>
          <PersonAddIcon fontSize="small" />
        </IconButton>
      </Stack>

      <InviteUserModal
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={projectId}
      />
    </>
  );
};

export default BoardToolbar;