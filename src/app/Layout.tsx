import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
  List,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FlagIcon from "@mui/icons-material/Flag";
import ListAltIcon from "@mui/icons-material/ListAlt"; // ✨ NUEVO - Icono para Backlog
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TimelineIcon from "@mui/icons-material/Timeline";
import SettingsIcon from "@mui/icons-material/Settings";
import { supabase } from "../lib/supabase";
import { useThemeMode } from "./ThemeContext";
import { useState, useEffect, useRef } from "react";
import ProjectSelector from "../features/projects/components/ProjectSelector";
import UserAvatar from "../shared/ui/UserAvatar";
import { useBoardManager } from "../features/board/hooks/useBoardManager";

const SIDEBAR_MIN_WIDTH = 60;
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 400;

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const open = Boolean(anchorEl);
  const { currentProject } = useBoardManager(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email || "");
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const getCurrentTab = () => {
    if (location.pathname.startsWith("/tablero")) return 0;
    if (location.pathname.startsWith("/epicas")) return 1;
    if (location.pathname.startsWith("/backlog")) return 2;
    if (location.pathname.startsWith("/roadmap")) return 3;
    if (location.pathname.startsWith("/editor")) return 4;
    return 0;
  };

  const handleTabChange = (_: any, newValue: number) => {
    const routes = ["/tablero", "/epicas", "/backlog", "/roadmap", "/editor"];
    navigate(routes[newValue]);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const currentWidth = sidebarOpen ? sidebarWidth : SIDEBAR_MIN_WIDTH;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            {/* {currentProject?.title} */}
            Nexus Planner
          </Typography>

          {/* Toggle Dark/Light Mode */}
          <Tooltip title={mode === "dark" ? "Modo claro" : "Modo oscuro"}>
            <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 2 }}>
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          {/* Avatar con menú */}
          <Tooltip title="Cuenta">
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{ ml: 1 }}
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
            <UserAvatar 
              userId={userId}
              userEmail={userEmail}
              size={36}
              showTooltip={false}
            />
            </IconButton>
          </Tooltip>

          {/* Menú desplegable */}
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                minWidth: 220,
                "& .MuiAvatar-root": {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1.5,
                },
              },
            }}
          >
            <MenuItem disabled sx={{ opacity: 1 }}>
              <ListItemIcon>
              <UserAvatar 
                userId={userId}
                userEmail={userEmail}
                size={36}
                showTooltip={false}
              />
              </ListItemIcon>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {userEmail}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleMenuClose(); navigate("/ajustes"); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Ajustes de usuario</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Cerrar sesión</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main content area with sidebar */}
      <Box sx={{ display: "flex", flexGrow: 1 }}>
        {/* Sidebar */}
        <Drawer
          ref={sidebarRef}
          variant="permanent"
          sx={{
            width: currentWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: currentWidth,
              boxSizing: "border-box",
              position: "relative",
              borderRight: 1,
              borderColor: "divider",
              transition: sidebarOpen ? "none" : "width 0.2s",
              overflowX: "hidden",
            },
          }}
        >
          {/* Toggle button */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? "flex-end" : "center",
              p: 1,
              borderBottom: 1,
              borderColor: "divider",
              minHeight: 65,
            }}
          >
            <IconButton onClick={toggleSidebar} size="small">
              {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Box>

          {/* Sidebar content */}
          <List sx={{ pt: 2 }}>
            {userId && <ProjectSelector userId={userId} collapsed={!sidebarOpen} />}
          </List>

          {/* Resize handle */}
          {sidebarOpen && (
            <Box
              onMouseDown={handleResizeStart}
              sx={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 4,
                cursor: "col-resize",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "primary.main",
                },
                transition: "background-color 0.2s",
              }}
            />
          )}
        </Drawer>

        {/* Main content */}
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          {/* Navegación con Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            <Container maxWidth={false}>
              <Tabs
                value={getCurrentTab()}
                onChange={handleTabChange}
                aria-label="navegación principal"
              >
                <Tab
                  icon={<DashboardIcon />}
                  iconPosition="start"
                  label="Tablero"
                  sx={{ textTransform: "none", minHeight: 64 }}
                />
                <Tab
                  icon={<FlagIcon />}
                  iconPosition="start"
                  label="Épicas"
                  sx={{ textTransform: "none", minHeight: 64 }}
                />
                <Tab
                  icon={<ListAltIcon />}
                  iconPosition="start"
                  label="Backlog"
                  sx={{ textTransform: "none", minHeight: 64 }}
                />
                <Tab
                  icon={<TimelineIcon />}
                  iconPosition="start"
                  label="Roadmap"
                  sx={{ textTransform: "none", minHeight: 64 }}
                />
                <Tab
                  icon={<DescriptionIcon />}
                  iconPosition="start"
                  label="Editor"
                  sx={{ textTransform: "none", minHeight: 64 }}
                />
              </Tabs>
            </Container>
          </Box>

          {/* Contenido de la página */}
          <Box sx={{ flexGrow: 1, bgcolor: "background.default", py: 4 }}>
            <Outlet />
          </Box>

          {/* Footer */}
          <Box
            component="footer"
            sx={{
              py: 3,
              px: 2,
              mt: "auto",
              bgcolor: "background.paper",
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Container maxWidth={false}>
              <Typography variant="body2" color="text.secondary" align="center">
                Nexux Planner © 2025
              </Typography>
            </Container>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;