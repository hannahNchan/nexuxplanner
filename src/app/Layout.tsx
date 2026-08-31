import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
  List,
  ListItemButton,
  Badge,
  Button,
  Stack,
  Alert,
  Avatar,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FlagIcon from "@mui/icons-material/Flag";
import ListAltIcon from "@mui/icons-material/ListAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TimelineIcon from "@mui/icons-material/Timeline";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import BusinessIcon from "@mui/icons-material/Business";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  createDebouncedRealtimeCallback,
  createRealtimeChannelName,
  removeRealtimeChannel,
} from "../shared/realtime/realtimeChannels";
import { THEME_LABELS, useThemeMode, type ThemeMode } from "./ThemeContext";
import { nexusDensity, nexusRadii } from "./visualTokens";
import { useState, useEffect, useRef, useCallback } from "react";
import ProjectSelector from "../features/projects/components/ProjectSelector";
import OrganizationSettingsModal from "../features/organizations/components/OrganizationSettingsModal";
import UserAvatar from "../shared/ui/UserAvatar";
import {
  acceptProjectInvitation,
  declineProjectInvitation,
  fetchPendingInvitationsForUser,
  type ProjectInvitation,
} from "../features/api/projectInvitationService";
import {
  fetchUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "../features/api/notificationService";
import { getErrorMessage, logError } from "../shared/utils/errorHandling";
import {
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
  fetchPendingOrganizationInvitationsForUser,
  fetchUserOrganizations,
  type OrganizationInvitation,
} from "../features/api/organizationService";
import { useProject } from "../shared/contexts/ProjectContext";

const SIDEBAR_MIN_WIDTH = nexusDensity.sidebar.collapsed;
const SIDEBAR_DEFAULT_WIDTH = nexusDensity.sidebar.default;
const SIDEBAR_MAX_WIDTH = nexusDensity.sidebar.max;

const NAV_ITEMS = [
  { label: "Tablero", path: "/tablero", icon: <DashboardIcon /> },
  { label: "Epicas", path: "/epicas", icon: <FlagIcon /> },
  { label: "Backlog", path: "/backlog", icon: <ListAltIcon /> },
  { label: "Roadmap", path: "/roadmap", icon: <TimelineIcon /> },
  { label: "Editor", path: "/editor", icon: <DescriptionIcon /> },
];

type LayoutProps = {
  providerAvatarUrl?: string | null;
};

const Layout = ({ providerAvatarUrl = null }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, setThemeMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [themeAnchorEl, setThemeAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [organizationAnchorEl, setOrganizationAnchorEl] = useState<null | HTMLElement>(null);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [pendingOrganizationInvitations, setPendingOrganizationInvitations] = useState<OrganizationInvitation[]>([]);
  const [taskNotifications, setTaskNotifications] = useState<UserNotification[]>([]);
  const [invitationActionId, setInvitationActionId] = useState<string | null>(null);
  const [notificationActionId, setNotificationActionId] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [organizationSettingsOpen, setOrganizationSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeNotificationChannelRef = useRef<RealtimeChannel | null>(null);
  const {
    organizations,
    setOrganizations,
    activeOrganization,
    setActiveOrganization,
    updateActiveOrganization,
    setCurrentProject,
  } = useProject();
  const open = Boolean(anchorEl);
  const notificationsOpen = Boolean(notificationAnchorEl);
  const organizationMenuOpen = Boolean(organizationAnchorEl);
  const isRoadmapRoute = location.pathname.startsWith("/roadmap");
  const notificationCount =
    pendingInvitations.length + pendingOrganizationInvitations.length + taskNotifications.length;

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

  const loadOrganizations = useCallback(async () => {
    if (!userId) {
      setOrganizations([]);
      setActiveOrganization(null);
      return;
    }

    try {
      const userOrganizations = await fetchUserOrganizations(userId);
      setOrganizations(userOrganizations);

      if (userOrganizations.length === 0) {
        setActiveOrganization(null);
        return;
      }

      const savedOrganizationId = localStorage.getItem("active-organization-id");
      const savedOrganization = userOrganizations.find(
        (organization) => organization.id === savedOrganizationId
      );
      const currentStillAvailable = activeOrganization
        ? userOrganizations.find((organization) => organization.id === activeOrganization.id)
        : null;

      if (currentStillAvailable) {
        if (
          currentStillAvailable.role !== activeOrganization?.role ||
          currentStillAvailable.name !== activeOrganization?.name ||
          currentStillAvailable.logo_url !== activeOrganization?.logo_url ||
          currentStillAvailable.updated_at !== activeOrganization?.updated_at
        ) {
          updateActiveOrganization(currentStillAvailable);
        }
      } else {
        setActiveOrganization(savedOrganization ?? userOrganizations[0]);
      }
    } catch (error) {
      logError("layout.loadOrganizations", error);
      setOrganizations([]);
      setActiveOrganization(null);
    }
  }, [userId, activeOrganization, setActiveOrganization, setOrganizations, updateActiveOrganization]);

  useEffect(() => {
    void loadOrganizations();

    const handleProjectsChanged = () => {
      void loadOrganizations();
    };

    window.addEventListener("nexusplanner:projects-changed", handleProjectsChanged);
    return () => {
      window.removeEventListener("nexusplanner:projects-changed", handleProjectsChanged);
    };
  }, [loadOrganizations]);

  const loadPendingInvitations = useCallback(async () => {
    if (!userId) {
      setPendingInvitations([]);
      return;
    }

    try {
      const invitations = await fetchPendingInvitationsForUser(userId);
      setPendingInvitations(invitations);
      setNotificationError("");
    } catch (error) {
      logError("layout.loadInvitations", error);
      setNotificationError(getErrorMessage(error, "No se pudieron cargar las invitaciones."));
    }
  }, [userId]);

  const loadPendingOrganizationInvitations = useCallback(async () => {
    if (!userId) {
      setPendingOrganizationInvitations([]);
      return;
    }

    try {
      const invitations = await fetchPendingOrganizationInvitationsForUser(userId);
      setPendingOrganizationInvitations(invitations);
      setNotificationError("");
    } catch (error) {
      logError("layout.loadOrganizationInvitations", error);
      setNotificationError(getErrorMessage(error, "No se pudieron cargar las invitaciones de organización."));
    }
  }, [userId]);

  const loadTaskNotifications = useCallback(async () => {
    if (!userId) {
      setTaskNotifications([]);
      return;
    }

    try {
      const notifications = await fetchUnreadNotifications(userId);
      setTaskNotifications(notifications);
      setNotificationError("");
    } catch (error) {
      logError("layout.loadTaskNotifications", error);
      setNotificationError(getErrorMessage(error, "No se pudieron cargar las notificaciones."));
    }
  }, [userId]);

  useEffect(() => {
    void loadPendingInvitations();
    void loadPendingOrganizationInvitations();
    void loadTaskNotifications();

    if (!userId) {
      return;
    }

    const reloadProjectInvitations = createDebouncedRealtimeCallback(() => {
      void loadPendingInvitations();
    });
    const reloadOrganizationInvitations = createDebouncedRealtimeCallback(() => {
      void loadPendingOrganizationInvitations();
    });
    const reloadTaskNotifications = createDebouncedRealtimeCallback(() => {
      void loadTaskNotifications();
    });

    const subscriptionDelay = window.setTimeout(() => {
      const channel = supabase
        .channel(createRealtimeChannelName({
          scope: "user",
          scopeId: userId,
          topic: "activity",
        }))
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_invitations",
            filter: `invitee_id=eq.${userId}`,
          },
          reloadProjectInvitations.run
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "organization_invitations",
            filter: `invitee_id=eq.${userId}`,
          },
          reloadOrganizationInvitations.run
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${userId}`,
          },
          reloadTaskNotifications.run
        )
        .subscribe();

      activeNotificationChannelRef.current = channel;
    }, 1200);

    return () => {
      window.clearTimeout(subscriptionDelay);
      reloadProjectInvitations.cancel();
      reloadOrganizationInvitations.cancel();
      reloadTaskNotifications.cancel();
      if (activeNotificationChannelRef.current) {
        removeRealtimeChannel(activeNotificationChannelRef.current);
        activeNotificationChannelRef.current = null;
      }
    };
  }, [userId, loadPendingInvitations, loadPendingOrganizationInvitations, loadTaskNotifications]);

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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeAnchorEl(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeAnchorEl(null);
  };

  const handleThemeSelect = (themeMode: ThemeMode) => {
    setThemeMode(themeMode);
    handleThemeMenuClose();
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleOrganizationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOrganizationAnchorEl(event.currentTarget);
  };

  const handleOrganizationMenuClose = () => {
    setOrganizationAnchorEl(null);
  };

  const handleOrganizationSelect = (organizationId: string) => {
    const organization = organizations.find((item) => item.id === organizationId);
    if (!organization) return;

    setActiveOrganization(organization);
    setCurrentProject(null);
    handleOrganizationMenuClose();
    handleMenuClose();
  };

  const handleOpenOrganizationSettings = () => {
    setOrganizationSettingsOpen(true);
    handleOrganizationMenuClose();
    handleMenuClose();
  };

  const handleOrganizationUpdated = (organization: typeof activeOrganization) => {
    if (!organization) return;

    updateActiveOrganization(organization);
    window.dispatchEvent(new Event("nexusplanner:projects-changed"));
  };

  const handleOrganizationDeleted = (organizationId: string) => {
    const nextOrganizations = organizations.filter((organization) => organization.id !== organizationId);
    setOrganizations(nextOrganizations);
    setCurrentProject(null);
    setActiveOrganization(nextOrganizations[0] ?? null);
    window.dispatchEvent(new Event("nexusplanner:projects-changed"));
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    setInvitationActionId(invitationId);
    setNotificationError("");

    try {
      await acceptProjectInvitation(invitationId);
      await loadPendingInvitations();
      window.dispatchEvent(new Event("nexusplanner:projects-changed"));
    } catch (error) {
      logError("layout.acceptInvitation", error);
      setNotificationError(getErrorMessage(error, "No se pudo aceptar la invitación."));
    } finally {
      setInvitationActionId(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setInvitationActionId(invitationId);
    setNotificationError("");

    try {
      await declineProjectInvitation(invitationId);
      await loadPendingInvitations();
    } catch (error) {
      logError("layout.declineInvitation", error);
      setNotificationError(getErrorMessage(error, "No se pudo rechazar la invitación."));
    } finally {
      setInvitationActionId(null);
    }
  };

  const handleAcceptOrganizationInvitation = async (invitationId: string) => {
    setInvitationActionId(invitationId);
    setNotificationError("");

    try {
      await acceptOrganizationInvitation(invitationId);
      await loadPendingOrganizationInvitations();
      await loadOrganizations();
      window.dispatchEvent(new Event("nexusplanner:projects-changed"));
    } catch (error) {
      logError("layout.acceptOrganizationInvitation", error);
      setNotificationError(getErrorMessage(error, "No se pudo aceptar la invitación."));
    } finally {
      setInvitationActionId(null);
    }
  };

  const handleDeclineOrganizationInvitation = async (invitationId: string) => {
    setInvitationActionId(invitationId);
    setNotificationError("");

    try {
      await declineOrganizationInvitation(invitationId);
      await loadPendingOrganizationInvitations();
    } catch (error) {
      logError("layout.declineOrganizationInvitation", error);
      setNotificationError(getErrorMessage(error, "No se pudo rechazar la invitación."));
    } finally {
      setInvitationActionId(null);
    }
  };

  const handleReadNotification = async (notificationId: string) => {
    setNotificationActionId(notificationId);
    setNotificationError("");

    try {
      await markNotificationRead(notificationId);
      await loadTaskNotifications();
    } catch (error) {
      logError("layout.readNotification", error);
      setNotificationError(getErrorMessage(error, "No se pudo marcar la notificación como leída."));
    } finally {
      setNotificationActionId(null);
    }
  };

  const handleReadAllNotifications = async () => {
    if (!userId || taskNotifications.length === 0) return;

    setNotificationActionId("__all__");
    setNotificationError("");

    const previousNotifications = taskNotifications;
    setTaskNotifications([]);

    try {
      await markAllNotificationsRead(userId);
      await loadTaskNotifications();
    } catch (error) {
      setTaskNotifications(previousNotifications);
      logError("layout.readAllNotifications", error);
      setNotificationError(getErrorMessage(error, "No se pudieron borrar las notificaciones."));
    } finally {
      setNotificationActionId(null);
    }
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "100vw", overflow: "hidden" }}>
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            minHeight: nexusDensity.topbarHeight,
            px: 2.25,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <img
              src="/uploads/biglogo_3x.webp"
              alt="Logo"
              style={{ height: 36, width: "auto", display: "block" }}
            />
          </Box>

          {/* Theme menu */}
          <Tooltip title="Elegir tema">
            <IconButton
              onClick={handleThemeMenuOpen}
              color="inherit"
              sx={{ mr: 2 }}
              aria-controls={themeAnchorEl ? "theme-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={themeAnchorEl ? "true" : undefined}
            >
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={themeAnchorEl}
            id="theme-menu"
            open={Boolean(themeAnchorEl)}
            onClose={handleThemeMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 3,
              sx: { mt: 1, minWidth: 190 },
            }}
          >
            {(["light", "dark", "solarized"] as ThemeMode[]).map((themeMode) => (
              <MenuItem key={themeMode} selected={mode === themeMode} onClick={() => handleThemeSelect(themeMode)}>
                <ListItemIcon>
                  {mode === themeMode ? <CheckIcon fontSize="small" /> : null}
                </ListItemIcon>
                <ListItemText>{THEME_LABELS[themeMode]}</ListItemText>
              </MenuItem>
            ))}
          </Menu>

          <Tooltip title="Notificaciones">
            <IconButton
              onClick={handleNotificationMenuOpen}
              color="inherit"
              sx={{ mr: 1 }}
              aria-controls={notificationsOpen ? "notification-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={notificationsOpen ? "true" : undefined}
            >
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notificationAnchorEl}
            id="notification-menu"
            open={notificationsOpen}
            onClose={handleNotificationMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 3,
              sx: { mt: 1, width: 360, maxWidth: "calc(100vw - 32px)" },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Notificaciones
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Invitaciones y tickets asignados
                  </Typography>
                </Box>
                {taskNotifications.length > 0 ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleReadAllNotifications}
                    disabled={notificationActionId === "__all__"}
                    sx={{ mt: -0.5, flexShrink: 0, fontWeight: 800, textTransform: "none" }}
                  >
                    Borrar todo
                  </Button>
                ) : null}
              </Stack>
            </Box>
            <Divider />
            {notificationError ? (
              <Box sx={{ p: 1.5 }}>
                <Alert severity="error">{notificationError}</Alert>
              </Box>
            ) : null}
            {notificationCount === 0 ? (
              <Box sx={{ px: 2, py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No tienes notificaciones pendientes.
                </Typography>
              </Box>
            ) : (
              <>
                {taskNotifications.map((notification) => (
                  <Box key={notification.id} sx={{ px: 2, py: 1.5 }}>
                    <Stack spacing={1}>
                      <Typography variant="body2" fontWeight={700}>
                        {notification.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          onClick={() => handleReadNotification(notification.id)}
                          disabled={notificationActionId === notification.id}
                        >
                          Marcar leída
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                {taskNotifications.length > 0 && pendingOrganizationInvitations.length > 0 ? <Divider /> : null}
                {pendingOrganizationInvitations.map((invitation) => (
                  <Box key={invitation.id} sx={{ px: 2, py: 1.5 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar
                          src={invitation.organization_logo_url ?? undefined}
                          variant="rounded"
                          sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800 }}
                        >
                          {invitation.organization_name.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700}>
                            Invitación a organización
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {invitation.organization_name}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          onClick={() => handleDeclineOrganizationInvitation(invitation.id)}
                          disabled={invitationActionId === invitation.id}
                        >
                          Rechazar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleAcceptOrganizationInvitation(invitation.id)}
                          disabled={invitationActionId === invitation.id}
                        >
                          Aceptar
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                {pendingOrganizationInvitations.length > 0 && pendingInvitations.length > 0 ? <Divider /> : null}
                {pendingInvitations.map((invitation) => (
                  <Box key={invitation.id} sx={{ px: 2, py: 1.5 }}>
                    <Stack spacing={1}>
                      <Typography variant="body2" fontWeight={700}>
                        Tienes una invitación pendiente al proyecto {invitation.project_title}
                      </Typography>
                      {invitation.project_key ? (
                        <Typography variant="caption" color="text.secondary">
                          {invitation.project_key}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          onClick={() => handleDeclineInvitation(invitation.id)}
                          disabled={invitationActionId === invitation.id}
                        >
                          Rechazar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          disabled={invitationActionId === invitation.id}
                        >
                          Aceptar
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </>
            )}
          </Menu>

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
              fallbackAvatarUrl={providerAvatarUrl}
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
                fallbackAvatarUrl={providerAvatarUrl}
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
            {activeOrganization ? (
              <MenuItem onClick={handleOpenOrganizationSettings}>
                <ListItemIcon>
                  <BusinessIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Ajustes de organización</ListItemText>
              </MenuItem>
            ) : null}
            {organizations.length > 1 ? (
              <MenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  handleOrganizationMenuOpen(event);
                }}
              >
                <ListItemIcon>
                  <BusinessIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Cambiar organización</ListItemText>
              </MenuItem>
            ) : null}
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Cerrar sesión</ListItemText>
            </MenuItem>
          </Menu>
          <Menu
            anchorEl={organizationAnchorEl}
            id="organization-menu"
            open={organizationMenuOpen}
            onClose={handleOrganizationMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "left", vertical: "top" }}
            PaperProps={{
              elevation: 3,
              sx: { minWidth: 240 },
            }}
          >
            {organizations.map((organization) => (
              <MenuItem
                key={organization.id}
                selected={organization.id === activeOrganization?.id}
                onClick={() => handleOrganizationSelect(organization.id)}
              >
                <ListItemIcon>
                  <Avatar
                    src={organization.logo_url ?? undefined}
                    variant="rounded"
                    sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 800 }}
                  >
                    {organization.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                </ListItemIcon>
                <ListItemText>{organization.name}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* Main content area with sidebar */}
      <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0, minWidth: 0, maxWidth: "100vw", overflow: "hidden" }}>
        {/* Sidebar */}
        <Drawer
          ref={sidebarRef}
          variant="permanent"
          sx={{
            width: currentWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: currentWidth,
              height: "100%",
              boxSizing: "border-box",
              position: "relative",
              borderRight: 1,
              borderColor: "divider",
              transition: sidebarOpen ? "none" : "width 0.2s",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            },
          }}
        >
          {/* Toggle button */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? "space-between" : "center",
              gap: 1,
              p: 1.25,
              borderBottom: 1,
              borderColor: "divider",
              minHeight: nexusDensity.topbarHeight,
            }}
          >
            {sidebarOpen ? (
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, pl: 0.5 }}>
                <Avatar
                  src={activeOrganization?.logo_url ?? undefined}
                  variant="rounded"
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: 13,
                    fontWeight: 900,
                    bgcolor: "primary.main",
                  }}
                >
                  {(activeOrganization?.name ?? "NP").slice(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={900} noWrap>
                    {activeOrganization?.name ?? "Organización"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    Software project
                  </Typography>
                </Box>
              </Stack>
            ) : null}
            <Stack direction="row" spacing={0.25} alignItems="center">
              {sidebarOpen && activeOrganization ? (
                <Tooltip title="Ajustes de organización">
                  <IconButton onClick={handleOpenOrganizationSettings} size="small">
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <IconButton onClick={toggleSidebar} size="small">
                {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            </Stack>
          </Box>

          {/* Sidebar content */}
          <List
            sx={{
              px: 1,
              py: 1.5,
              flexGrow: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              {NAV_ITEMS.map((item) => {
                const selected = location.pathname.startsWith(item.path);

                return (
                  <Tooltip key={item.path} title={sidebarOpen ? "" : item.label} placement="right">
                    <ListItemButton
                      selected={selected}
                      onClick={() => navigate(item.path)}
                      sx={{
                        minHeight: nexusDensity.navItemHeight,
                        justifyContent: sidebarOpen ? "initial" : "center",
                        px: sidebarOpen ? 1.25 : 0,
                        borderRadius: `${nexusRadii.md}px`,
                        color: selected ? "primary.main" : "text.secondary",
                        "&.Mui-selected": {
                          bgcolor: "action.selected",
                          color: "primary.main",
                          "&:hover": {
                            bgcolor: "action.selected",
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: sidebarOpen ? 34 : 0,
                          color: "inherit",
                          justifyContent: "center",
                          "& .MuiSvgIcon-root": {
                            fontSize: 20,
                          },
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {sidebarOpen ? (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontWeight: selected ? 800 : 650, fontSize: 14 }}
                        />
                      ) : null}
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            {userId && <ProjectSelector userId={userId} collapsed={!sidebarOpen} />}
          </List>

          <Box
            component="footer"
            sx={{
              flexShrink: 0,
              px: sidebarOpen ? 2 : 0.5,
              py: 2,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "hidden",
            }}
          >
            {sidebarOpen && (
              <Typography variant="body2" color="text.secondary" align="center" noWrap>
                Nexux Planner © 2025
              </Typography>
            )}
          </Box>

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
        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            width: 0,
            maxWidth: `calc(100vw - ${currentWidth}px)`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Contenido de la página */}
          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0,
              minWidth: 0,
              maxWidth: "100%",
              overflow: isRoadmapRoute ? "hidden" : "auto",
              bgcolor: "background.default",
              pt: isRoadmapRoute ? 2 : 4,
              pb: isRoadmapRoute ? 2 : 4,
              boxSizing: "border-box",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
      <OrganizationSettingsModal
        open={organizationSettingsOpen}
        organization={activeOrganization}
        currentUserId={userId}
        onClose={() => setOrganizationSettingsOpen(false)}
        onOrganizationUpdated={handleOrganizationUpdated}
        onOrganizationDeleted={handleOrganizationDeleted}
      />
    </Box>
  );
};

export default Layout;
