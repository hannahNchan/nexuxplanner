import { Menu, MenuItem, ListItemText, CircularProgress } from "@mui/material";
import { useState, useEffect } from "react";
import { fetchEpics } from "../../../../api/epicService";
import type { Epic } from "../../../../api/epicService";
import { logError } from "../../../../../shared/utils/errorHandling";

type EpicMenuProps = {
  anchorEl: HTMLElement | null;
  editingEpic: string | null;
  projectId: string | null;
  userId: string;
  onClose: () => void;
  onEpicChange: (taskId: string, epicId: string | null) => void;
};

export const EpicMenu = ({
  anchorEl,
  editingEpic,
  projectId,
  userId,
  onClose,
  onEpicChange,
}: EpicMenuProps) => {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (anchorEl && projectId) {
      setLoading(true);
      fetchEpics(userId, projectId)
        .then((data) => setEpics(data))
        .catch((error) => logError("backlog.epicMenu.load", error))
        .finally(() => setLoading(false));
    }
  }, [anchorEl, projectId, userId]);

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{ sx: { minWidth: 250, maxHeight: 400 } }}
    >
      <MenuItem
        onClick={() => {
          if (editingEpic) {
            onEpicChange(editingEpic, null);
          }
          onClose();
        }}
      >
        <ListItemText primary="Sin épica" secondary="No asociada" />
      </MenuItem>

      {loading ? (
        <MenuItem disabled>
          <CircularProgress size={20} sx={{ mr: 2 }} />
          <ListItemText primary="Cargando épicas..." />
        </MenuItem>
      ) : epics.length === 0 ? (
        <MenuItem disabled>
          <ListItemText primary="No hay épicas" secondary="Crea épicas primero" />
        </MenuItem>
      ) : (
        epics.map((epic) => (
          <MenuItem
            key={epic.id}
            onClick={() => {
              if (editingEpic) {
                onEpicChange(editingEpic, epic.id);
              }
              onClose();
            }}
          >
            <ListItemText
              primary={epic.name}
              secondary={epic.epic_id_display || "Sin ID"}
            />
          </MenuItem>
        ))
      )}
    </Menu>
  );
};
