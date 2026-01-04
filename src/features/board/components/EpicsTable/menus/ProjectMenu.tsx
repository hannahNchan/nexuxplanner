import { Chip, Divider, Menu, MenuItem, Stack, Typography } from "@mui/material";

type ProjectMenuProps = {
  anchorEl: HTMLElement | null;
  editingProject: string | null;
  projects: Array<{ id: string; title: string; tags: string[] }>;
  onClose: () => void;
  onProjectChange: (epicId: string, projectId: string) => void;
};

export const ProjectMenu = ({
  anchorEl,
  editingProject,
  projects,
  onClose,
  onProjectChange,
}: ProjectMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl) && editingProject !== null}
      onClose={onClose}
      PaperProps={{
        sx: { borderRadius: 2, mt: 1, minWidth: 250 },
      }}
    >
      <MenuItem
        onClick={() => {
          if (editingProject) {
            onProjectChange(editingProject, "");
          }
          onClose();
        }}
      >
        <em>Sin proyecto</em>
      </MenuItem>
      <Divider />
      {projects.map((project) => (
        <MenuItem
          key={project.id}
          onClick={() => {
            if (editingProject) {
              onProjectChange(editingProject, project.id);
            }
            onClose();
          }}
        >
          <Stack spacing={0.5} width="100%">
            <Typography fontWeight={500}>{project.title}</Typography>
            {project.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {project.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.65rem", height: 18 }}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </MenuItem>
      ))}
    </Menu>
  );
};