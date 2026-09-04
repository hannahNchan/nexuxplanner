import { TextField, InputAdornment, Stack, AvatarGroup, IconButton, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import UserAvatar from "../../../shared/ui/UserAvatar";
import InviteUserModal from "./InviteUserModal";
import { fetchProjectMembers } from "../../api/projectService";
import { logError } from "../../../shared/utils/errorHandling";
import BoardLayoutSwitcher from "./views/BoardLayoutSwitcher";
import type { BoardViewMode } from "./views/boardViewTypes";

type BoardToolbarProps = {
  tasks: Record<string, { assignee_id?: string }>;
  onSearchChange: (query: string) => void;
  projectId: string;
  onAddColumn: () => void;
  viewMode: BoardViewMode;
  onViewModeChange: (viewMode: BoardViewMode) => void;
  readOnly?: boolean;
};

const BoardToolbar = ({
  onSearchChange,
  projectId,
  onAddColumn,
  viewMode,
  onViewModeChange,
  readOnly = false,
}: BoardToolbarProps) => {
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
        logError("boardToolbar.loadMembers", err);
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
        justifyContent="space-between"
        sx={{
          bgcolor: "background.paper",
          p: 2
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
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
            sx={{ width: changeInput, maxWidth: "min(600px, 55vw)", transition: "width 0.3s" }}
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

          <IconButton
            size="small"
            sx={{ ml: 1 }}
            onClick={() => setIsInviteModalOpen(true)}
            disabled={readOnly}
          >
            <PersonAddIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          <BoardLayoutSwitcher value={viewMode} onChange={onViewModeChange} />
          <Button
            variant="outlined"
            size="small"
            onClick={onAddColumn}
            startIcon={<AddIcon fontSize="small" />}
            disabled={readOnly}
            sx={{
              flexShrink: 0,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Añadir columna
          </Button>
        </Stack>
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
