import { Box, Divider, Menu, MenuItem, Stack, Typography } from "@mui/material";

type PhaseMenuProps = {
  anchorEl: HTMLElement | null;
  editingPhase: string | null;
  phases: Array<{ id: string; name: string; color: string | null }>;
  onClose: () => void;
  onPhaseChange: (epicId: string, phaseId: string) => void;
};

export const PhaseMenu = ({
  anchorEl,
  editingPhase,
  phases,
  onClose,
  onPhaseChange,
}: PhaseMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl) && editingPhase !== null}
      onClose={onClose}
      PaperProps={{
        sx: { borderRadius: 2, mt: 1 },
      }}
    >
      <MenuItem
        onClick={() => {
          if (editingPhase) {
            onPhaseChange(editingPhase, "");
          }
          onClose();
        }}
      >
        <em>Sin fase</em>
      </MenuItem>
      {phases.map((phase) => (
        <MenuItem
          key={phase.id}
          onClick={() => {
            if (editingPhase) {
              onPhaseChange(editingPhase, phase.id);
            }
            onClose();
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: phase.color || "#ccc",
              }}
            />
            <Typography>{phase.name}</Typography>
          </Stack>
        </MenuItem>
      ))}
    </Menu>
  );
};