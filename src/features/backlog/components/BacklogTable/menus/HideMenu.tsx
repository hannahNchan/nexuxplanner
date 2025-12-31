import { Menu, MenuItem, ListItemText, Checkbox, Typography, Button, Stack, Divider } from "@mui/material";
import type { BacklogTaskWithDetails } from "../../../../api/backlogService";

type HideMenuProps = {
  anchorEl: HTMLElement | null;
  hiddenTasks: string[];
  tasks: BacklogTaskWithDetails[];
  onClose: () => void;
  onHiddenTasksChange: (hiddenTasks: string[]) => void;
};

export const HideMenu = ({
  anchorEl,
  hiddenTasks,
  tasks,
  onClose,
  onHiddenTasksChange,
}: HideMenuProps) => {
  const handleToggle = (taskId: string) => {
    const newHidden = hiddenTasks.includes(taskId)
      ? hiddenTasks.filter((id) => id !== taskId)
      : [...hiddenTasks, taskId];
    onHiddenTasksChange(newHidden);
  };

  const handleShowAll = () => {
    onHiddenTasksChange([]);
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{ sx: { minWidth: 300, maxHeight: 500 } }}
    >
      <Stack px={2} py={1} direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" fontWeight={700}>
          Ocultar Tareas
        </Typography>
        {hiddenTasks.length > 0 && (
          <Button size="small" onClick={handleShowAll}>
            Mostrar todas
          </Button>
        )}
      </Stack>

      <Divider />

      {tasks.length === 0 ? (
        <MenuItem disabled>
          <ListItemText primary="No hay tareas" />
        </MenuItem>
      ) : (
        tasks.map((task) => (
          <MenuItem key={task.id} onClick={() => handleToggle(task.id)}>
            <Checkbox checked={hiddenTasks.includes(task.id)} size="small" />
            <ListItemText
              primary={task.title}
              secondary={task.task_id_display || "Sin ID"}
              primaryTypographyProps={{ noWrap: true }}
            />
          </MenuItem>
        ))
      )}
    </Menu>
  );
};