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
import { getSprintDaysRemaining } from "../../sprints/utils/sprintDates";
import type { SprintStatus } from "../../sprints/types/sprint";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";
import { CompleteSprintDialog } from "../../sprints";
import type { SprintTaskDisposition } from "../../api/sprintService";

interface BoardInfoProps {
  userId: string;
}

const BoardInfo: React.FC<BoardInfoProps> = ({ userId }) => {
  const board = useBoardManager(userId);
  const { displaySprint, errorMessage, sprintManager } = board;
  const theme = useTheme();
  const canCompleteSprint = displaySprint?.status === "active";
  const [completeError, setCompleteError] = React.useState<string | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = React.useState(false);

  const daysRemaining = displaySprint
    ? getSprintDaysRemaining(displaySprint.start_date, displaySprint.end_date)
    : null;

  const remainingLabel = (() => {
    if (!displaySprint) return "Sin sprint activo";
    if (daysRemaining === null) return "Sin fecha de cierre";
    if (daysRemaining === 0) return "Finaliza hoy";
    if (daysRemaining > 0) return `${daysRemaining} días restantes`;
    return `${Math.abs(daysRemaining)} días vencido`;
  })();

  const statusLabelByStatus: Record<SprintStatus, string> = {
    future: "SPRINT PLANIFICADO",
    active: "SPRINT ACTIVO",
    closed: "SPRINT CERRADO",
  };

  const handleCompleteSprint = async (sprintId: string, dispositions: SprintTaskDisposition[]) => {
    if (!displaySprint || !canCompleteSprint) return;

    setCompleteError(null);
    try {
      await sprintManager.closeSprintWithTaskDisposition(sprintId, dispositions);
    } catch (error) {
      logError("board.completeSprint", error);
      setCompleteError(getErrorMessage(error, "No se pudo completar el sprint."));
      throw error;
    }
  };

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Chip
          icon={<AccessTimeIcon />}
          label={remainingLabel}
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
        {(errorMessage || completeError) && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {errorMessage || completeError}
          </Typography>
        )}
        {displaySprint && (
          <Chip
            label={statusLabelByStatus[displaySprint.status]}
            color={displaySprint.status === "active" ? "success" : "default"}
            size="small"
            sx={{ fontWeight: 600, borderRadius: "4px" }}
          />
        )}
        <Button
          variant="contained"
          size="small"
          disabled={!canCompleteSprint}
          onClick={() => setIsCompleteDialogOpen(true)}
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

      <CompleteSprintDialog
        open={isCompleteDialogOpen}
        projectId={board.currentProject?.id ?? null}
        sprint={displaySprint}
        futureSprints={sprintManager.sprints.filter((sprint) => sprint.status === "future")}
        onClose={() => setIsCompleteDialogOpen(false)}
        onCreateSprint={sprintManager.createSprint}
        onCompleteSprint={handleCompleteSprint}
      />
    </>
  );
};

export default BoardInfo;
