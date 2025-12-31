import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Divider,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ExploreIcon from "@mui/icons-material/Explore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState, useEffect } from "react";
import { useProjects } from "../hooks/useProjects";
import CreateProjectModal from "./CreateProjectModal";
import ExploreProjectsModal from "./ExploreProjectsModal";
import type { ProjectWithTags } from "../../api/projectService";
import { useProject } from "../../../shared/contexts/ProjectContext";

type ProjectSelectorProps = {
  userId: string;
  collapsed: boolean;
};

const ProjectSelector = ({ userId, collapsed }: ProjectSelectorProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithTags | null>(null);

  const { currentProject, setCurrentProject } = useProject();

  const { 
    projects,
    loading, 
    createProject, 
    updateProject,
    searchProjects, 
    refetch 
  } = useProjects(userId);

  const open = Boolean(anchorEl);

  // Auto-seleccionar el primer proyecto al cargar
  useEffect(() => {
    if (!loading && projects.length > 0 && !currentProject) {
      setCurrentProject(projects[0]);
    }
  }, [projects, loading, currentProject, setCurrentProject]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery("");
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
    handleClose();
  };

  const handleEditProject = (project: ProjectWithTags) => {
    setEditingProject(project);
    setCreateModalOpen(true);
  };

  // ✨ ACTUALIZADO: Ahora recibe y pasa project_key
  const handleSaveProject = async (
    title: string,
    description: string,
    tags: string[],
    projectKey: string, // ✨ NUEVO
    projectId?: string
  ) => {
    if (projectId) {
      // Editar proyecto existente
      await updateProject(projectId, { 
        title, 
        description, 
        tags,
        project_key: projectKey, // ✨ NUEVO
      });
    } else {
      // Crear nuevo proyecto
      const newProject = await createProject(
        title, 
        description, 
        tags,
        projectKey // ✨ NUEVO
      );
      setCurrentProject(newProject);
    }
  };

  const filteredProjects = searchQuery ? searchProjects(searchQuery) : projects;

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton onClick={handleClick}>
          <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, justifyContent: "center" }}>
            <FolderIcon />
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText
                primary={currentProject?.title || "Seleccionar proyecto"}
                primaryTypographyProps={{
                  noWrap: true,
                  fontWeight: currentProject ? 600 : 400,
                }}
              />
              <KeyboardArrowDownIcon />
            </>
          )}
        </ListItemButton>
      </ListItem>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 },
        }}
      >
        <MenuItem disableRipple sx={{ "&:hover": { bgcolor: "transparent" } }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar proyectos"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </MenuItem>

        <Divider />

        {loading ? (
          <MenuItem disabled>
            <Stack direction="row" spacing={2} alignItems="center" width="100%">
              <CircularProgress size={20} />
              <Typography variant="body2">Cargando proyectos...</Typography>
            </Stack>
          </MenuItem>
        ) : filteredProjects.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? "No se encontraron proyectos" : "No tienes proyectos"}
            </Typography>
          </MenuItem>
        ) : (
          filteredProjects.map((project) => (
            <MenuItem
              key={project.id}
              onClick={() => handleProjectSelect(project.id)}
              selected={project.id === currentProject?.id}
            >
              <Stack spacing={0.5} width="100%">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={500} noWrap>
                    {project.title}
                  </Typography>
                  {/* ✨ NUEVO: Mostrar siglas del proyecto */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "primary.main",
                      bgcolor: (theme) => theme.palette.action.selected,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 0.5,
                    }}
                  >
                    {project.project_key}
                  </Typography>
                </Stack>
                {project.description && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {project.description}
                  </Typography>
                )}
              </Stack>
            </MenuItem>
          ))
        )}

        <Divider />

        <MenuItem
          onClick={() => {
            handleClose();
            setCreateModalOpen(true);
          }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Crear nuevo proyecto" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            setExploreModalOpen(true);
          }}
        >
          <ListItemIcon>
            <ExploreIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Explorar todo" />
        </MenuItem>
      </Menu>

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        editingProject={editingProject}
      />

      <ExploreProjectsModal
        open={exploreModalOpen}
        onClose={() => setExploreModalOpen(false)}
        projects={projects}
        loading={loading}
        onSelectProject={setCurrentProject}
        onEditProject={handleEditProject}
        onRefresh={refetch}
      />
    </>
  );
};

export default ProjectSelector;