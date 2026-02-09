import * as React from "react";
import {
  Stack,
  Typography,
  Chip,
  IconButton,
  Button,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import LinkIcon from "@mui/icons-material/Link";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useBoardManager } from "../hooks/useBoardManager";
import { useTheme } from "@mui/material/styles";

interface BoardInfoProps {
  userId: string;
}

const BoardInfo: React.FC<BoardInfoProps> = ({ userId }) => {
  const { displaySprint, errorMessage } = useBoardManager(userId);
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={1}
    >
      <Chip
        icon={<AccessTimeIcon />}
        label="3 days remaining"
        size="small"
        sx={{
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
          fontWeight: 500,
        }}
      />
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton size="small">
          <StarBorderIcon fontSize="small" />
        </IconButton>
        <IconButton size="small">
          <GroupAddIcon fontSize="small" />
        </IconButton>
        <IconButton size="small">
          <LinkIcon fontSize="small" />
        </IconButton>
      </Stack>
      {errorMessage && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {errorMessage}
        </Typography>
      )}
      {displaySprint && (
        <Chip
          label={
            displaySprint.status === "active"
              ? "SPRINT ACTIVO"
              : "SPRINT FUTURO"
          }
          color={displaySprint.status === "active" ? "success" : "warning"}
          size="small"
          sx={{ fontWeight: 600, borderRadius: "4px" }}
        />
      )}
      <Button
        variant="contained"
        size="small"
        sx={{
          textTransform: "none",
          fontWeight: 600,
        }}
      >
        Completar sprint
      </Button>
      <IconButton size="small">
        <MoreHorizIcon />
      </IconButton>
    </Stack>
  );
};

export default BoardInfo;
