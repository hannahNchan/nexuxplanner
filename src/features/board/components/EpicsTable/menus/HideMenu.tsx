import {
  Button,
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";

type HideMenuProps = {
  anchorEl: HTMLElement | null;
  hiddenEpics: string[];
  epics: Array<{ id: string; name: string }>;
  onClose: () => void;
  onHiddenEpicsChange: (ids: string[]) => void;
};

export const HideMenu = ({
  anchorEl,
  hiddenEpics,
  epics,
  onClose,
  onHiddenEpicsChange,
}: HideMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        sx: { width: 320, maxHeight: 400, borderRadius: 2, mt: 1 },
      }}
    >
      <MenuItem disabled>
        <Typography variant="subtitle2" fontWeight={700}>
          Ocultar épicas
        </Typography>
      </MenuItem>
      <Divider />

      {epics.map((epic) => (
        <MenuItem key={epic.id}>
          <Checkbox
            checked={hiddenEpics.includes(epic.id)}
            onChange={(e) => {
              if (e.target.checked) {
                onHiddenEpicsChange([...hiddenEpics, epic.id]);
              } else {
                onHiddenEpicsChange(hiddenEpics.filter((id) => id !== epic.id));
              }
            }}
          />
          <ListItemText primary={epic.name} />
        </MenuItem>
      ))}

      {hiddenEpics.length > 0 && (
        <>
          <Divider />
          <MenuItem>
            <Button
              fullWidth
              size="small"
              onClick={() => onHiddenEpicsChange([])}
              sx={{ borderRadius: 1.5 }}
            >
              Mostrar todas
            </Button>
          </MenuItem>
        </>
      )}
    </Menu>
  );
};