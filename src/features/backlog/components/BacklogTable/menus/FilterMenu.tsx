import {
  Menu,
  MenuItem,
  ListItemText,
  Checkbox,
  Divider,
  Typography,
  Stack,
  Button,
} from "@mui/material";
import type { ProjectWithTags } from "../../../../api/projectService";
import type { Priority } from "../../../../api/catalogService";

type FilterMenuProps = {
  anchorEl: HTMLElement | null;
  filters: {
    projects: string[];
    priorities: string[];
    hasEpic: boolean | null;
    hasGithubLink: boolean | null;
  };
  projects: ProjectWithTags[];
  priorities: Priority[];
  onClose: () => void;
  onFilterChange: (filters: any) => void;
};

export const FilterMenu = ({
  anchorEl,
  filters,
  projects,
  priorities,
  onClose,
  onFilterChange,
}: FilterMenuProps) => {
  const handleToggleProject = (projectId: string) => {
    const newProjects = filters.projects.includes(projectId)
      ? filters.projects.filter((id) => id !== projectId)
      : [...filters.projects, projectId];
    onFilterChange({ ...filters, projects: newProjects });
  };

  const handleTogglePriority = (priorityId: string) => {
    const newPriorities = filters.priorities.includes(priorityId)
      ? filters.priorities.filter((id) => id !== priorityId)
      : [...filters.priorities, priorityId];
    onFilterChange({ ...filters, priorities: newPriorities });
  };

  const handleClearAll = () => {
    onFilterChange({
      projects: [],
      priorities: [],
      hasEpic: null,
      hasGithubLink: null,
    });
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
          Filtros
        </Typography>
        <Button size="small" onClick={handleClearAll}>
          Limpiar
        </Button>
      </Stack>

      <Divider />

      {/* Filtro por Proyecto */}
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: "block" }}>
        POR PROYECTO
      </Typography>
      {projects.map((project) => (
        <MenuItem key={project.id} onClick={() => handleToggleProject(project.id)}>
          <Checkbox checked={filters.projects.includes(project.id)} size="small" />
          <ListItemText primary={project.title} />
        </MenuItem>
      ))}

      <Divider />

      {/* Filtro por Prioridad */}
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: "block" }}>
        POR PRIORIDAD
      </Typography>
      {priorities.map((priority) => (
        <MenuItem key={priority.id} onClick={() => handleTogglePriority(priority.id)}>
          <Checkbox checked={filters.priorities.includes(priority.id)} size="small" />
          <ListItemText primary={priority.name} />
        </MenuItem>
      ))}

      <Divider />

      {/* Filtro por Épica */}
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: "block" }}>
        OTROS
      </Typography>
      <MenuItem
        onClick={() =>
          onFilterChange({
            ...filters,
            hasEpic: filters.hasEpic === true ? null : true,
          })
        }
      >
        <Checkbox checked={filters.hasEpic === true} size="small" />
        <ListItemText primary="Tiene épica asignada" />
      </MenuItem>

      <MenuItem
        onClick={() =>
          onFilterChange({
            ...filters,
            hasGithubLink: filters.hasGithubLink === true ? null : true,
          })
        }
      >
        <Checkbox checked={filters.hasGithubLink === true} size="small" />
        <ListItemText primary="Tiene enlace GitHub" />
      </MenuItem>
    </Menu>
  );
};