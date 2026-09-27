import * as React from "react";
import {
  Stack,
  Typography,
  Chip,
  IconButton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import LinkIcon from "@mui/icons-material/Link";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import type { BoardManager } from "../hooks/useBoardManager";
import { useTheme } from "@mui/material/styles";
import { getSprintDaysRemaining } from "../../sprints/utils/sprintDates";
import type { SprintStatus } from "../../sprints/types/sprint";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";
import { CompleteSprintDialog } from "../../sprints";
import type { SprintTaskDisposition } from "../../api/sprintService";

interface BoardInfoProps {
  board: BoardManager;
}

const BoardInfo: React.FC<BoardInfoProps> = ({ board }) => {
  const { displaySprint, errorMessage, sprintManager } = board;
  const theme = useTheme();
  const canCompleteSprint =
    displaySprint?.status === "active" &&
    (board.boardView?.capabilities.canCompleteSprint ?? false);
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
        alignItems="center"
        spacing={1}
        flexWrap="wrap"
        justifyContent="flex-end"
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={board.boardView?.effectiveScope ?? "kanban"}
          disabled={board.isScopeChanging}
          onChange={(_, nextScope: "kanban" | "sprint" | null) => {
            if (nextScope) {
              void board.handleScopeChange(nextScope).catch(() => undefined);
            }
          }}
          sx={{
            bgcolor: "background.paper",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: "hidden",
            "& .MuiToggleButton-root": {
              minHeight: 32,
              px: 1.25,
              py: 0.5,
              gap: 0.75,
              border: 0,
              borderRadius: 0,
              textTransform: "none",
              fontWeight: 700,
            },
          }}
        >
          {board.boardView?.availableScopes.map((scope) => (
            <ToggleButton key={scope.id} value={scope.id} disabled={!scope.available}>
              {scope.id === "kanban" ? (
                <ViewKanbanIcon fontSize="small" />
              ) : (
                <TrackChangesIcon fontSize="small" />
              )}
              <Tooltip title={scope.id === "kanban" ? "Flujo continuo" : scope.label}>
                <span>{scope.id === "kanban" ? "Kanban" : "Sprint"}</span>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {board.boardView?.capabilities.showSprintCountdown ? (
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
        ) : null}
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
        {displaySprint ? (
          <Chip
            label={statusLabelByStatus[displaySprint.status]}
            color={displaySprint.status === "active" ? "success" : "default"}
            size="small"
            sx={{ fontWeight: 600, borderRadius: "4px" }}
          />
        ) : null}
        {displaySprint ? (
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
        ) : null}
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
