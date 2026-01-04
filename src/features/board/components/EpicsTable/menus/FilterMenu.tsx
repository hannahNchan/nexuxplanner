import {
  Box,
  Button,
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";

type FilterMenuProps = {
  anchorEl: HTMLElement | null;
  filters: {
    projects: string[];
    phases: string[];
    efforts: string[];
  };
  projects: Array<{ id: string; title: string }>;
  phases: Array<{ id: string; name: string }>;
  pointValues: Array<{ id: string; value: string }>;
  onClose: () => void;
  onFilterChange: (filters: { projects: string[]; phases: string[]; efforts: string[] }) => void;
};

export const FilterMenu = ({
  anchorEl,
  filters,
  projects,
  phases,
  pointValues,
  onClose,
  onFilterChange,
}: FilterMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 320,
          maxHeight: 500,
          borderRadius: 2,
          mt: 1,
        },
      }}
    >
      <MenuItem disabled>
        <Typography variant="subtitle2" fontWeight={700}>
          Filtros
        </Typography>
      </MenuItem>
      <Divider />

      {/* Filtro por Proyecto */}
      <MenuItem>
        <Stack spacing={1} width="100%">
          <Typography variant="body2" fontWeight={600} color="primary">
            Por Proyecto
          </Typography>
          {projects.map((project) => (
            <Box key={project.id} display="flex" alignItems="center">
              <Checkbox
                size="small"
                checked={filters.projects.includes(project.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFilterChange({
                      ...filters,
                      projects: [...filters.projects, project.id],
                    });
                  } else {
                    onFilterChange({
                      ...filters,
                      projects: filters.projects.filter((id) => id !== project.id),
                    });
                  }
                }}
              />
              <ListItemText primary={project.title} />
            </Box>
          ))}
        </Stack>
      </MenuItem>

      <Divider />

      {/* Filtro por Fase */}
      <MenuItem>
        <Stack spacing={1} width="100%">
          <Typography variant="body2" fontWeight={600} color="primary">
            Por Fase
          </Typography>
          {phases.map((phase) => (
            <Box key={phase.id} display="flex" alignItems="center">
              <Checkbox
                size="small"
                checked={filters.phases.includes(phase.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFilterChange({
                      ...filters,
                      phases: [...filters.phases, phase.id],
                    });
                  } else {
                    onFilterChange({
                      ...filters,
                      phases: filters.phases.filter((id) => id !== phase.id),
                    });
                  }
                }}
              />
              <ListItemText primary={phase.name} />
            </Box>
          ))}
        </Stack>
      </MenuItem>

      <Divider />

      {/* Filtro por Esfuerzo */}
      <MenuItem>
        <Stack spacing={1} width="100%">
          <Typography variant="body2" fontWeight={600} color="primary">
            Por Esfuerzo
          </Typography>
          {pointValues.map((point) => (
            <Box key={point.id} display="flex" alignItems="center">
              <Checkbox
                size="small"
                checked={filters.efforts.includes(point.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFilterChange({
                      ...filters,
                      efforts: [...filters.efforts, point.value],
                    });
                  } else {
                    onFilterChange({
                      ...filters,
                      efforts: filters.efforts.filter((v) => v !== point.value),
                    });
                  }
                }}
              />
              <ListItemText primary={point.value} />
            </Box>
          ))}
        </Stack>
      </MenuItem>

      <Divider />

      <MenuItem>
        <Button
          fullWidth
          size="small"
          onClick={() => onFilterChange({ phases: [], efforts: [], projects: [] })}
          sx={{ borderRadius: 1.5 }}
        >
          Limpiar filtros
        </Button>
      </MenuItem>
    </Menu>
  );
};