import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Divider,
  Stack,
  Typography,
  CircularProgress,
  Collapse,
  List,
  Box,
  Menu,
  MenuItem,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ExploreIcon from "@mui/icons-material/Explore";
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsIcon from '@mui/icons-material/Settings';
import { useState, useEffect } from "react";
import { useProjects } from "../hooks/useProjects";
import CreateProjectModal from "./CreateProjectModal";
import ExploreProjectsModal from "./ExploreProjectsModal";
import ProjectSettingsModal from "./ProjectSettingsModal";
import type { ProjectWithTags } from "../../api/projectService";
import { useProject } from "../../../shared/contexts/ProjectContext";

type ProjectSelectorProps = {
  userId: string;
  collapsed: boolean;
};

const ProjectSelector = ({ userId, collapsed }: ProjectSelectorProps) => {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithTags | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const { currentProject, setCurrentProject, updateCurrentProject } = useProject();

  const { 
    projects,
    loading, 
    createProject, 
    updateProject,
    searchProjects, 
    refetch 
  } = useProjects(userId);

  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    if (!loading && projects.length > 0 && !currentProject) {
      setCurrentProject(projects[0]);
    }
  }, [projects, loading, currentProject, setCurrentProject]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (collapsed) {
      setAnchorEl(event.currentTarget);
    } else {
      setExpanded(!expanded);
    }
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSearchQuery("");
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
    setExpanded(false);
    setSearchQuery("");
    handleCloseMenu();
  };

  const handleEditProject = (project: ProjectWithTags) => {
    setEditingProject(project);
    setCreateModalOpen(true);
  };

  const handleSaveProject = async (
    title: string,
    description: string,
    tags: string[],
    projectKey: string,
    projectId?: string
  ) => {
    if (projectId) {
      await updateProject(projectId, { 
        title, 
        description, 
        tags,
        project_key: projectKey,
      });
    } else {
      const newProject = await createProject(title, description, tags, projectKey);
      setCurrentProject(newProject);
    }
  };

  const filteredProjects = searchQuery ? searchProjects(searchQuery) : projects;

  const projectsList = (
    <>
      {loading ? (
        <Stack direction="row" spacing={2} alignItems="center" width="100%" sx={{ p: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Cargando proyectos...</Typography>
        </Stack>
      ) : filteredProjects.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          {searchQuery ? "No se encontraron proyectos" : "No tienes proyectos"}
        </Typography>
      ) : (
        filteredProjects.map((project) => (
          <ListItemButton
            key={project.id}
            onClick={() => handleProjectSelect(project.id)}
            selected={project.id === currentProject?.id}
            sx={{ pl: collapsed ? 2 : 4 }}
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={500} noWrap>
                    {project.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "primary.main",
                      bgcolor: "action.selected",
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 0.5,
                    }}
                  >
                    {project.project_key}
                  </Typography>
                </Stack>
              }
              secondary={project.description}
              secondaryTypographyProps={{ noWrap: true }}
            />
          </ListItemButton>
        ))
      )}
    </>
  );

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
              {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </>
          )}
        </ListItemButton>
      </ListItem>

      {collapsed ? (
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleCloseMenu}
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

          {projectsList}

          <Divider />

          <MenuItem
            onClick={() => {
              handleCloseMenu();
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
              handleCloseMenu();
              setExploreModalOpen(true);
            }}
          >
            <ListItemIcon>
              <ExploreIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Explorar todo" />
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              setSettingsModalOpen(true);
            }}
            disabled={!currentProject}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Project settings" />
          </MenuItem>
        </Menu>
      ) : (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ bgcolor: "action.hover", py: 1 }}>
            <Box sx={{ px: 2, pb: 1 }}>
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
              />
            </Box>

            <Divider />

            <List disablePadding sx={{ maxHeight: 300, overflow: "auto" }}>
              {projectsList}
            </List>

            <Divider />

            <List disablePadding>
              <ListItemButton
                onClick={() => {
                  setExpanded(false);
                  setCreateModalOpen(true);
                }}
                sx={{ pl: 4 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Crear nuevo proyecto" />
              </ListItemButton>

              <ListItemButton
                onClick={() => {
                  setExpanded(false);
                  setExploreModalOpen(true);
                }}
                sx={{ pl: 4 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ExploreIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Explorar todo" />
              </ListItemButton>

              <ListItemButton
                onClick={() => {
                  setExpanded(false);
                  setSettingsModalOpen(true);
                }}
                sx={{ pl: 4 }}
                disabled={!currentProject}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Project settings" />
              </ListItemButton>
            </List>
          </Box>
        </Collapse>
      )}

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
      
      <ProjectSettingsModal
        open={settingsModalOpen}
        projectName={currentProject?.title || ""}
        projectId={currentProject?.id || ""}
        allowBoardTaskCreation={currentProject?.allow_board_task_creation ?? false}
        onClose={() => setSettingsModalOpen(false)}
        onUpdateAllowBoardTaskCreation={async (projectId: string, value: boolean) => {
          await updateProject(projectId, {
            allow_board_task_creation: value,
          });
          
          updateCurrentProject({
            allow_board_task_creation: value,
          });
        }}
      />
    </>
  );
};

export default ProjectSelector;