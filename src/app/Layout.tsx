import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Stack,
  Typography,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Button,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FlagIcon from "@mui/icons-material/Flag";
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import { supabase } from "../lib/supabase";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    if (location.pathname.startsWith("/tablero")) return 0;
    if (location.pathname.startsWith("/epicas")) return 1;
    if (location.pathname.startsWith("/editor")) return 2;
    return 0;
  };

  const handleTabChange = (_: any, newValue: number) => {
    const routes = ["/tablero", "/epicas", "/editor"];
    navigate(routes[newValue]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: "primary.main" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Nexux Planner
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ textTransform: "none" }}
          >
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>

      {/* Navegación con Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="xl">
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

      {/* Footer opcional */}
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
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            Nexux Planner © 2025
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;