import { TextField, InputAdornment, Stack, AvatarGroup, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import UserAvatar from "../../../shared/ui/UserAvatar";
import { useState, useMemo } from "react";

type BoardToolbarProps = {
  tasks: Record<string, { assignee_id?: string }>;
  onSearchChange: (query: string) => void;
};

const BoardToolbar = ({ tasks, onSearchChange }: BoardToolbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [changeInput, setChangeInput] = useState(200);

  const uniqueUserIds = useMemo(() => {
    const userIds = Object.values(tasks)
      .map(task => task.assignee_id)
      .filter((id): id is string => Boolean(id));
    
    return Array.from(new Set(userIds));
  }, [tasks]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 3 || value.length === 0) {
      onSearchChange(value);
    }
  };

  const onHandleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.blur();
    setChangeInput(200);
  }

  return (
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
        {uniqueUserIds.map((userId) => (
          <UserAvatar
            key={userId}
            userId={userId}
            size={32}
            showTooltip={true}
          />
        ))}
      </AvatarGroup>

      <IconButton size="small" sx={{ ml: 1 }}>
        <PersonAddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
};

export default BoardToolbar;