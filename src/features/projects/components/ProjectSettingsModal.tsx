import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  Stack,
  IconButton,
  Paper,
  Chip,
  Button,
  TextField,
  CircularProgress,
  FormControlLabel,
  Switch,
  Avatar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ClearIcon from "@mui/icons-material/Clear";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import BoltIcon from "@mui/icons-material/Bolt";
import RuleIcon from "@mui/icons-material/Rule";
import HistoryIcon from "@mui/icons-material/History";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import EmailIcon from "@mui/icons-material/Email";
import LinkIcon from "@mui/icons-material/Link";
import { useState, useEffect, useRef } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useProjectCatalogs } from "../hooks/useProjectCatalogs";
import IconPicker from "../../../shared/ui/IconPicker";
import ColorPicker from "../../../shared/ui/ColorPicker";
import { uploadProjectBanner, removeProjectBanner, fetchProjectById } from "../../../features/api/projectService";
import {
  uploadOrganizationLogo,
  updateOrganization,
  fetchOrganizationMembers,
  fetchOrganizationPendingInvitations,
  createOrganizationInvitationByEmail,
  updateOrganizationMemberRole,
  removeOrganizationMember,
  type Organization,
  type OrganizationInvitation,
  type OrganizationMemberWithProfile,
} from "../../../features/api/organizationService";
import {
  createAutomationRule,
  deleteAutomationRule,
  fetchAutomationRules,
  fetchAutomationRuns,
  updateAutomationRule,
  type AutomationAction,
  type AutomationActionType,
  type AutomationCondition,
  type AutomationConditionOperator,
  type AutomationRule,
  type AutomationRun,
} from "../../../features/api/automationService";
import type { IssueType, Priority, EpicPhase } from "../../../features/api/catalogService";
import { logError } from "../../../shared/utils/errorHandling";
import OrganizationLogoCropDialog from "../../../shared/ui/OrganizationLogoCropDialog";

type ProjectSettingsModalProps = {
  open: boolean;
  projectName: string;
  projectId: string;
  allowBoardTaskCreation: boolean;
  onClose: () => void;
  onUpdateAllowBoardTaskCreation: (projectId: string, value: boolean) => Promise<void>;
  organization?: Organization | null;
  onOrganizationUpdated?: (organization: Organization) => void;
  projectVisibility: "organization" | "private";
  onUpdateProjectVisibility: (projectId: string, value: "organization" | "private") => Promise<void>;
};

type Section = "general" | "organization" | "tasks" | "epics" | "automations";

const automationTriggerOptions = [
  {
    value: "task.created",
    label: "Tarea creada",
    helper: "Cuando una tarea nueva entra al proyecto.",
  },
  {
    value: "task.assigned",
    label: "Tarea asignada",
    helper: "Cuando cambia el responsable de un ticket.",
  },
  {
    value: "task.moved",
    label: "Estado o columna cambió",
    helper: "Cuando una tarea se mueve en el tablero.",
  },
  {
    value: "sprint.completed",
    label: "Sprint completado",
    helper: "Cuando se cierra un sprint con el command backend.",
  },
  {
    value: "project.member_added",
    label: "Miembro agregado",
    helper: "Cuando alguien obtiene acceso al proyecto.",
  },
] as const;

const automationConditionFields = [
  { value: "task_id_display", label: "ID del ticket" },
  { value: "title", label: "Título" },
  { value: "destination", label: "Destino" },
  { value: "column_id", label: "Columna destino" },
  { value: "previous_column_id", label: "Columna anterior" },
  { value: "assignee_id", label: "Responsable" },
  { value: "is_unassigned", label: "Sin asignar" },
  { value: "issue_type_id", label: "Tipo de tarea" },
  { value: "priority_id", label: "Prioridad" },
  { value: "story_points", label: "Story points" },
  { value: "event_type", label: "Tipo de evento" },
] as const;

const automationOperatorOptions: Array<{ value: AutomationConditionOperator; label: string }> = [
  { value: "equals", label: "es igual a" },
  { value: "not_equals", label: "no es igual a" },
  { value: "contains", label: "contiene" },
  { value: "not_empty", label: "tiene valor" },
  { value: "empty", label: "está vacío" },
];

const automationActionOptions: Array<{
  value: AutomationActionType;
  label: string;
  helper: string;
  icon: JSX.Element;
}> = [
  {
    value: "notify_project_owners",
    label: "Notificar owners",
    helper: "Crea una notificación interna para los owners del proyecto.",
    icon: <NotificationsActiveIcon fontSize="small" />,
  },
  {
    value: "notify_actor",
    label: "Notificar actor",
    helper: "Crea una notificación interna para quien disparó el evento.",
    icon: <NotificationsActiveIcon fontSize="small" />,
  },
  {
    value: "enqueue_email",
    label: "Encolar email",
    helper: "Deja un job listo para el worker de emails.",
    icon: <EmailIcon fontSize="small" />,
  },
  {
    value: "enqueue_webhook",
    label: "Encolar webhook",
    helper: "Deja un job listo para una integración externa futura.",
    icon: <LinkIcon fontSize="small" />,
  },
];

type AutomationDraft = {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger_event: string;
  conditionEnabled: boolean;
  conditionField: string;
  conditionOperator: AutomationConditionOperator;
  conditionValue: string;
  actionType: AutomationActionType;
  actionTitle: string;
  actionMessage: string;
};

const createEmptyAutomationDraft = (): AutomationDraft => ({
  name: "Nueva automatización",
  description: "",
  enabled: true,
  trigger_event: "task.moved",
  conditionEnabled: false,
  conditionField: "task_id_display",
  conditionOperator: "contains",
  conditionValue: "",
  actionType: "notify_project_owners",
  actionTitle: "Automatización ejecutada",
  actionMessage: "Una regla del proyecto se ejecutó correctamente.",
});

const toAutomationDraft = (rule: AutomationRule): AutomationDraft => {
  const firstCondition = rule.conditions[0];
  const firstAction = rule.actions[0];

  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? "",
    enabled: rule.enabled,
    trigger_event: rule.trigger_event,
    conditionEnabled: Boolean(firstCondition),
    conditionField: firstCondition?.field ?? "task_id_display",
    conditionOperator: firstCondition?.operator ?? "contains",
    conditionValue: firstCondition?.value ?? "",
    actionType: firstAction?.type ?? "notify_project_owners",
    actionTitle: firstAction?.title ?? "Automatización ejecutada",
    actionMessage: firstAction?.message ?? "Una regla del proyecto se ejecutó correctamente.",
  };
};

const ProjectSettingsModal = ({ 
  open, 
  projectName,
  projectId,
  allowBoardTaskCreation: initialAllowBoardTaskCreation,
  onClose,
  onUpdateAllowBoardTaskCreation,
  organization = null,
  onOrganizationUpdated,
  projectVisibility,
  onUpdateProjectVisibility,
}: ProjectSettingsModalProps) => {
  const theme = useTheme();
  const [selectedSection, setSelectedSection] = useState<Section>("general");
  const catalogs = useProjectCatalogs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string>("");
  const [organizationName, setOrganizationName] = useState(organization?.name ?? "");
  const [visibility, setVisibility] = useState<"organization" | "private">(projectVisibility);
  const [logoError, setLogoError] = useState("");
  const [logoCropSourceFile, setLogoCropSourceFile] = useState<File | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMemberWithProfile[]>([]);
  const [pendingOrganizationInvitations, setPendingOrganizationInvitations] = useState<OrganizationInvitation[]>([]);
  const [organizationInviteEmail, setOrganizationInviteEmail] = useState("");
  const [organizationAccessError, setOrganizationAccessError] = useState("");
  const [loadingOrganizationAccess, setLoadingOrganizationAccess] = useState(false);
  const [savingOrganizationAccess, setSavingOrganizationAccess] = useState(false);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>([]);
  const [automationDraft, setAutomationDraft] = useState<AutomationDraft>(createEmptyAutomationDraft);
  const [automationError, setAutomationError] = useState("");
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);

  const [editingIssueTypes, setEditingIssueTypes] = useState<Record<string, Partial<IssueType>>>({});
  const [editingPriorities, setEditingPriorities] = useState<Record<string, Partial<Priority>>>({});
  const [editingPhases, setEditingPhases] = useState<Record<string, Partial<EpicPhase>>>({});
  const [newPointValue, setNewPointValue] = useState("");
  const [allowBoardTaskCreation, setAllowBoardTaskCreation] = useState(initialAllowBoardTaskCreation);

  useEffect(() => {
    if (open) {
      setAllowBoardTaskCreation(initialAllowBoardTaskCreation);
      setOrganizationName(organization?.name ?? "");
      setVisibility(projectVisibility);
      setLogoError("");
      setLogoCropSourceFile(null);
      setOrganizationAccessError("");
      setOrganizationInviteEmail("");
      setAutomationError("");
      void catalogs.refetch();
      void loadProjectData();
      void loadOrganizationAccess();
      void loadAutomations();
    }
  }, [open, initialAllowBoardTaskCreation, organization?.id, organization?.name, projectVisibility]);

  const canManageOrganization =
    organization?.role === "owner" || organization?.role === "admin";

  const loadProjectData = async () => {
    try {
      const project = await fetchProjectById(projectId);
      if (project) {
        setCurrentBannerUrl(project.banner_url || "");
        setPreviewUrl("");
        setSelectedFile(null);
      }
    } catch (error) {
      logError("projectSettings.loadProject", error);
    }
  };

  const loadAutomations = async (ruleId?: string | null) => {
    setLoadingAutomations(true);
    try {
      const [rules, runs] = await Promise.all([
        fetchAutomationRules(projectId),
        fetchAutomationRuns(projectId, ruleId),
      ]);
      setAutomationRules(rules);
      setAutomationRuns(runs);

      if (rules.length === 0) {
        setAutomationDraft(createEmptyAutomationDraft());
        return;
      }

      const selectedRule =
        rules.find((rule) => rule.id === (ruleId ?? automationDraft.id)) ?? rules[0];
      setAutomationDraft(toAutomationDraft(selectedRule));
    } catch (error) {
      logError("projectSettings.loadAutomations", error);
      setAutomationError("No se pudieron cargar las automatizaciones.");
    } finally {
      setLoadingAutomations(false);
    }
  };

  const handleSelectAutomationRule = async (rule: AutomationRule) => {
    setAutomationError("");
    setAutomationDraft(toAutomationDraft(rule));
    try {
      const runs = await fetchAutomationRuns(projectId, rule.id);
      setAutomationRuns(runs);
    } catch (error) {
      logError("projectSettings.loadAutomationRuns", error);
    }
  };

  const handleNewAutomationRule = () => {
    setAutomationError("");
    setAutomationDraft(createEmptyAutomationDraft());
    setAutomationRuns([]);
  };

  const buildAutomationCondition = (): AutomationCondition[] => {
    if (!automationDraft.conditionEnabled) {
      return [];
    }

    return [
      {
        type: "field",
        field: automationDraft.conditionField,
        operator: automationDraft.conditionOperator,
        value: automationDraft.conditionValue,
      },
    ];
  };

  const buildAutomationAction = (): AutomationAction[] => [
    {
      type: automationDraft.actionType,
      title: automationDraft.actionTitle,
      message: automationDraft.actionMessage,
    },
  ];

  const handleSaveAutomationRule = async () => {
    if (!organization?.id) {
      setAutomationError("El proyecto necesita una organización activa para usar automatizaciones.");
      return;
    }

    if (!automationDraft.name.trim()) {
      setAutomationError("Ponle un nombre a la automatización.");
      return;
    }

    setSavingAutomation(true);
    setAutomationError("");
    try {
      const payload = {
        organization_id: organization.id,
        project_id: projectId,
        name: automationDraft.name.trim(),
        description: automationDraft.description.trim() || null,
        enabled: automationDraft.enabled,
        trigger_event: automationDraft.trigger_event,
        conditions: buildAutomationCondition(),
        actions: buildAutomationAction(),
      };

      const savedRule = automationDraft.id
        ? await updateAutomationRule(automationDraft.id, payload)
        : await createAutomationRule(payload);

      await loadAutomations(savedRule.id);
    } catch (error) {
      logError("projectSettings.saveAutomation", error);
      setAutomationError("No se pudo guardar la automatización.");
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleDeleteAutomationRule = async () => {
    if (!automationDraft.id) return;

    setSavingAutomation(true);
    setAutomationError("");
    try {
      await deleteAutomationRule(automationDraft.id);
      await loadAutomations();
    } catch (error) {
      logError("projectSettings.deleteAutomation", error);
      setAutomationError("No se pudo eliminar la automatización.");
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleToggleBoardTaskCreation = async (checked: boolean) => {
    setAllowBoardTaskCreation(checked);
    try {
      await onUpdateAllowBoardTaskCreation(projectId, checked);
    } catch (error) {
      logError("projectSettings.updateBoardTaskCreation", error);
      setAllowBoardTaskCreation(!checked);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleOrganizationLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization) return;

    if (!file.type.startsWith("image/")) {
      setLogoError("Selecciona una imagen válida.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("El logo debe pesar menos de 2MB.");
      return;
    }

    setLogoError("");
    setLogoCropSourceFile(file);
    event.target.value = "";
  };

  const handleOrganizationLogoCrop = async (croppedFile: File) => {
    if (!organization) return;

    try {
      setUploadingLogo(true);
      setLogoError("");
      const logoUrl = await uploadOrganizationLogo(organization.id, croppedFile);
      onOrganizationUpdated?.({
        ...organization,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      });
      setLogoCropSourceFile(null);
    } catch (error) {
      logError("projectSettings.uploadOrganizationLogo", error);
      setLogoError(error instanceof Error ? error.message : "No se pudo subir el logo.");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleOrganizationNameSave = async () => {
    if (!organization || !organizationName.trim()) return;

    try {
      const updatedOrganization = await updateOrganization(organization.id, {
        name: organizationName,
      });
      onOrganizationUpdated?.({
        ...updatedOrganization,
        role: organization.role,
      });
    } catch (error) {
      logError("projectSettings.updateOrganizationName", error);
      setLogoError("No se pudo actualizar la organización.");
    }
  };

  const handleProjectVisibilityChange = async (nextVisibility: "organization" | "private") => {
    setVisibility(nextVisibility);
    try {
      await onUpdateProjectVisibility(projectId, nextVisibility);
    } catch (error) {
      logError("projectSettings.updateVisibility", error);
      setVisibility(projectVisibility);
      setLogoError("No se pudo actualizar la visibilidad del proyecto.");
    }
  };

  const loadOrganizationAccess = async () => {
    if (!organization) {
      setOrganizationMembers([]);
      setPendingOrganizationInvitations([]);
      return;
    }

    try {
      setLoadingOrganizationAccess(true);
      setOrganizationAccessError("");
      const [members, invitations] = await Promise.all([
        fetchOrganizationMembers(organization.id),
        fetchOrganizationPendingInvitations(organization.id),
      ]);
      setOrganizationMembers(members);
      setPendingOrganizationInvitations(invitations);
    } catch (error) {
      logError("projectSettings.loadOrganizationAccess", error);
      setOrganizationAccessError("No se pudieron cargar los miembros de la organización.");
    } finally {
      setLoadingOrganizationAccess(false);
    }
  };

  const handleInviteOrganizationMember = async () => {
    if (!organization) return;

    const email = organizationInviteEmail.trim().toLowerCase();
    if (!email) {
      setOrganizationAccessError("Escribe el correo de la persona que quieres invitar.");
      return;
    }

    try {
      setSavingOrganizationAccess(true);
      setOrganizationAccessError("");
      await createOrganizationInvitationByEmail(organization.id, email);
      setOrganizationInviteEmail("");
      await loadOrganizationAccess();
    } catch (error) {
      logError("projectSettings.inviteOrganizationMember", error);
      setOrganizationAccessError(error instanceof Error ? error.message : "No se pudo enviar la invitación.");
    } finally {
      setSavingOrganizationAccess(false);
    }
  };

  const handleOrganizationMemberRoleChange = async (
    memberId: string,
    role: OrganizationMemberWithProfile["role"]
  ) => {
    try {
      setSavingOrganizationAccess(true);
      setOrganizationAccessError("");
      await updateOrganizationMemberRole(memberId, role);
      await loadOrganizationAccess();
    } catch (error) {
      logError("projectSettings.updateOrganizationMemberRole", error);
      setOrganizationAccessError("No se pudo actualizar el rol del miembro.");
    } finally {
      setSavingOrganizationAccess(false);
    }
  };

  const handleRemoveOrganizationMember = async (member: OrganizationMemberWithProfile) => {
    try {
      setSavingOrganizationAccess(true);
      setOrganizationAccessError("");
      await removeOrganizationMember(member.id);
      await loadOrganizationAccess();
    } catch (error) {
      logError("projectSettings.removeOrganizationMember", error);
      setOrganizationAccessError("No se pudo quitar al miembro de la organización.");
    } finally {
      setSavingOrganizationAccess(false);
    }
  };

  const handleUploadBanner = async () => {
    if (!selectedFile) return;

    setUploadingBanner(true);
    try {
      const bannerUrl = await uploadProjectBanner(projectId, selectedFile);
      setCurrentBannerUrl(bannerUrl);
      setPreviewUrl("");
      setSelectedFile(null);
    } catch (error) {
      logError("projectSettings.uploadBanner", error);
    } finally {
      setUploadingBanner(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveBanner = async () => {
    if (!currentBannerUrl) return;

    setUploadingBanner(true);
    try {
      await removeProjectBanner(projectId);
      setCurrentBannerUrl("");
    } catch (error) {
      logError("projectSettings.removeBanner", error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const renderAutomationSettings = () => {
    const selectedTrigger = automationTriggerOptions.find(
      (option) => option.value === automationDraft.trigger_event
    );
    const selectedAction = automationActionOptions.find(
      (option) => option.value === automationDraft.actionType
    );
    const canManageAutomations = canManageOrganization;

    return (
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <BoltIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>
                Automatizaciones premium
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Configura reglas server-side: evento, condiciones y acciones ejecutadas por Supabase.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewAutomationRule}
            disabled={savingAutomation}
          >
            Nueva regla
          </Button>
        </Stack>

        {automationError ? <Alert severity="error">{automationError}</Alert> : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "360px minmax(0, 1fr)" },
            gap: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Reglas del proyecto
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {automationRules.length} reglas configuradas
              </Typography>
            </Box>

            {loadingAutomations ? (
              <Stack alignItems="center" sx={{ py: 5 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : automationRules.length === 0 ? (
              <Box sx={{ p: 2.5 }}>
                <Typography variant="body2" fontWeight={700}>
                  No hay automatizaciones.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Crea una regla para ejecutar acciones cuando ocurran eventos del proyecto.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {automationRules.map((rule) => (
                  <ListItemButton
                    key={rule.id}
                    selected={automationDraft.id === rule.id}
                    onClick={() => void handleSelectAutomationRule(rule)}
                    sx={{
                      alignItems: "flex-start",
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      "&.Mui-selected": {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={800} noWrap>
                            {rule.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={rule.enabled ? "Activa" : "Pausada"}
                            color={rule.enabled ? "success" : "default"}
                            variant="outlined"
                            sx={{ height: 22 }}
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Cuando: {automationTriggerOptions.find((option) => option.value === rule.trigger_event)?.label ?? rule.trigger_event}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Entonces: {rule.actions.map((action) => automationActionOptions.find((option) => option.value === action.type)?.label ?? action.type).join(", ")}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>

          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <RuleIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={900}>
                      Constructor de regla
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Similar a Jira/monday: Cuando, Si, Entonces.
                    </Typography>
                  </Box>
                </Stack>
                <FormControlLabel
                  control={
                    <Switch
                      checked={automationDraft.enabled}
                      onChange={(event) =>
                        setAutomationDraft((draft) => ({
                          ...draft,
                          enabled: event.target.checked,
                        }))
                      }
                    />
                  }
                  label={automationDraft.enabled ? "Activa" : "Pausada"}
                />
              </Stack>

              <Stack spacing={2} sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Nombre de la regla"
                    value={automationDraft.name}
                    onChange={(event) =>
                      setAutomationDraft((draft) => ({ ...draft, name: event.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Descripción"
                    value={automationDraft.description}
                    onChange={(event) =>
                      setAutomationDraft((draft) => ({ ...draft, description: event.target.value }))
                    }
                    fullWidth
                  />
                </Stack>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.035),
                    borderRadius: 1,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Chip label="1" size="small" color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={900}>
                        Cuando
                      </Typography>
                      <TextField
                        select
                        label="Evento"
                        value={automationDraft.trigger_event}
                        onChange={(event) =>
                          setAutomationDraft((draft) => ({
                            ...draft,
                            trigger_event: event.target.value,
                          }))
                        }
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        {automationTriggerOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                        {selectedTrigger?.helper}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "background.default",
                    borderRadius: 1,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Chip label="2" size="small" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={900}>
                          Si
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Opcional: limita cuándo se ejecuta la regla.
                        </Typography>
                      </Box>
                      <Switch
                        checked={automationDraft.conditionEnabled}
                        onChange={(event) =>
                          setAutomationDraft((draft) => ({
                            ...draft,
                            conditionEnabled: event.target.checked,
                          }))
                        }
                      />
                    </Stack>

                    {automationDraft.conditionEnabled ? (
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField
                          select
                          label="Campo"
                          value={automationDraft.conditionField}
                          onChange={(event) =>
                            setAutomationDraft((draft) => ({
                              ...draft,
                              conditionField: event.target.value,
                            }))
                          }
                          fullWidth
                        >
                          {automationConditionFields.map((field) => (
                            <MenuItem key={field.value} value={field.value}>
                              {field.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          select
                          label="Operador"
                          value={automationDraft.conditionOperator}
                          onChange={(event) =>
                            setAutomationDraft((draft) => ({
                              ...draft,
                              conditionOperator: event.target.value as AutomationConditionOperator,
                            }))
                          }
                          fullWidth
                        >
                          {automationOperatorOptions.map((operator) => (
                            <MenuItem key={operator.value} value={operator.value}>
                              {operator.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          label="Valor"
                          value={automationDraft.conditionValue}
                          disabled={["empty", "not_empty"].includes(automationDraft.conditionOperator)}
                          onChange={(event) =>
                            setAutomationDraft((draft) => ({
                              ...draft,
                              conditionValue: event.target.value,
                            }))
                          }
                          fullWidth
                        />
                      </Stack>
                    ) : (
                      <Alert severity="info" variant="outlined">
                        Sin condición: la regla se ejecuta cada vez que ocurra el evento.
                      </Alert>
                    )}
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
                    bgcolor: alpha(theme.palette.success.main, 0.035),
                    borderRadius: 1,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Chip label="3" size="small" color="success" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={900}>
                        Entonces
                      </Typography>
                      <TextField
                        select
                        label="Acción"
                        value={automationDraft.actionType}
                        onChange={(event) =>
                          setAutomationDraft((draft) => ({
                            ...draft,
                            actionType: event.target.value as AutomationActionType,
                          }))
                        }
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        {automationActionOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {option.icon}
                              <span>{option.label}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </TextField>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                        {selectedAction?.helper}
                      </Typography>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
                        <TextField
                          label="Título de notificación/job"
                          value={automationDraft.actionTitle}
                          onChange={(event) =>
                            setAutomationDraft((draft) => ({
                              ...draft,
                              actionTitle: event.target.value,
                            }))
                          }
                          fullWidth
                        />
                        <TextField
                          label="Mensaje"
                          value={automationDraft.actionMessage}
                          onChange={(event) =>
                            setAutomationDraft((draft) => ({
                              ...draft,
                              actionMessage: event.target.value,
                            }))
                          }
                          fullWidth
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Button
                    color="error"
                    variant="text"
                    startIcon={<DeleteIcon />}
                    onClick={() => void handleDeleteAutomationRule()}
                    disabled={!automationDraft.id || savingAutomation}
                  >
                    Eliminar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={savingAutomation ? <CircularProgress size={18} /> : <BoltIcon />}
                    onClick={() => void handleSaveAutomationRule()}
                    disabled={savingAutomation || !canManageAutomations}
                  >
                    {automationDraft.id ? "Guardar regla" : "Crear regla"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                bgcolor: "background.paper",
                overflow: "hidden",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1.5 }}>
                <HistoryIcon color="action" />
                <Box>
                  <Typography variant="subtitle2" fontWeight={900}>
                    Últimas ejecuciones
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Historial creado por el evaluador server-side.
                  </Typography>
                </Box>
              </Stack>
              <Divider />
              {automationRuns.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay ejecuciones para esta regla.
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {automationRuns.map((run) => (
                    <ListItemButton key={run.id} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="small"
                              label={run.status}
                              color={run.status === "succeeded" ? "success" : run.status === "partial" ? "warning" : "error"}
                              variant="outlined"
                            />
                            <Typography variant="body2" fontWeight={800}>
                              {run.event_type}
                            </Typography>
                          </Stack>
                        }
                        secondary={`Acciones: ${run.actions_succeeded}/${run.actions_attempted} · ${new Date(run.created_at).toLocaleString()}`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Paper>
          </Stack>
        </Box>
      </Stack>
    );
  };

  const renderGeneralSettings = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Banner del Proyecto
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Personaliza tu proyecto con una imagen de banner
        </Typography>

        <Box sx={{ mt: 3 }}>
          {(currentBannerUrl || previewUrl) ? (
            <Box sx={{ position: "relative" }}>
              <Box
                component="img"
                src={previewUrl || currentBannerUrl}
                alt="Banner del proyecto"
                sx={{
                  width: "100%",
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
              {currentBannerUrl && !previewUrl && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleRemoveBanner}
                  disabled={uploadingBanner}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "background.paper",
                    "&:hover": {
                      bgcolor: "error.light",
                      color: "error.contrastText",
                    },
                  }}
                >
                  <ClearIcon />
                </IconButton>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                width: "100%",
                height: 200,
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadFileIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="body1" fontWeight={600} gutterBottom>
                Haz clic para subir banner
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos: JPG, PNG, GIF. Máximo 5MB
              </Typography>
            </Box>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {selectedFile && (
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                onClick={handleClearSelection}
                disabled={uploadingBanner}
                startIcon={<ClearIcon />}
              >
                Limpiar
              </Button>
              <Button
                variant="contained"
                onClick={handleUploadBanner}
                disabled={uploadingBanner}
                startIcon={uploadingBanner ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              >
                {uploadingBanner ? "Subiendo..." : "Subir imagen"}
              </Button>
            </Stack>
          )}

          {!selectedFile && !currentBannerUrl && (
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              sx={{ mt: 3 }}
              startIcon={<UploadFileIcon />}
            >
              Examinar
            </Button>
          )}
        </Box>
      </Box>
      <Divider />
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Acceso del Proyecto
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define si el proyecto aparece para toda la organización o solo para colaboradores agregados.
        </Typography>

        <ToggleButtonGroup
          exclusive
          value={visibility}
          onChange={(_, nextVisibility) => {
            if (nextVisibility) {
              void handleProjectVisibilityChange(nextVisibility);
            }
          }}
          size="small"
        >
          <ToggleButton value="organization">
            Visible para la organización
          </ToggleButton>
          <ToggleButton value="private">
            Privado
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {visibility === "organization"
            ? "Los miembros de la organización pueden ver el proyecto, pero solo colaboradores del proyecto pueden modificarlo."
            : "Solo colaboradores agregados al proyecto pueden ver y abrir este proyecto."}
        </Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Logo de la Organización
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Este logo aparece en el sidebar junto al nombre de la empresa.
        </Typography>

        {logoError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {logoError}
          </Alert>
        ) : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
          <Avatar
            src={organization?.logo_url ?? undefined}
            variant="rounded"
            sx={{
              width: 72,
              height: 72,
              fontSize: 20,
              fontWeight: 900,
              bgcolor: "primary.main",
            }}
          >
            {(organization?.name ?? "OR").slice(0, 2).toUpperCase()}
          </Avatar>
          <Stack spacing={1.5} sx={{ flex: 1 }}>
            <TextField
              label="Nombre de la organización"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              onBlur={handleOrganizationNameSave}
              disabled={!organization}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={uploadingLogo ? <CircularProgress size={18} /> : <UploadFileIcon />}
                onClick={() => logoInputRef.current?.click()}
                disabled={!organization || uploadingLogo}
              >
                {uploadingLogo ? "Subiendo..." : "Subir logo"}
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleOrganizationLogoSelect}
                style={{ display: "none" }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Sube cualquier imagen y recortala en el cuadro para crear el logo. Si no hay logo, se mostrarán las iniciales.
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );

  const renderOrganizationSettings = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Miembros de la Organización
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Administra quién pertenece a {organization?.name ?? "la organización"}. Los miembros pueden ver proyectos visibles de la organización; para editar un proyecto también deben agregarse como colaboradores del proyecto.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.default",
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} gutterBottom>
            Roles de la organización
          </Typography>
          <Stack
            component="ul"
            spacing={0.75}
            sx={{ m: 0, pl: 2.5, color: "text.secondary" }}
          >
            <Typography component="li" variant="body2">
              <strong>Owner:</strong> administra la organización completa, cambia roles, quita miembros, edita logo/nombre y controla proyectos. No se puede quitar desde esta pantalla.
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Admin:</strong> invita miembros, cambia roles entre admin/member, quita miembros y administra accesos de proyectos. No puede modificar ni quitar al owner.
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Member:</strong> ve proyectos visibles de la organización y puede recibir asignaciones. No puede invitar usuarios, cambiar roles ni editar ajustes de organización.
            </Typography>
          </Stack>
        </Paper>

        {organizationAccessError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {organizationAccessError}
          </Alert>
        ) : null}

        {canManageOrganization ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
            <TextField
              label="Correo del usuario"
              type="email"
              value={organizationInviteEmail}
              onChange={(event) => setOrganizationInviteEmail(event.target.value)}
              placeholder="persona@empresa.com"
              disabled={savingOrganizationAccess}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              onClick={handleInviteOrganizationMember}
              disabled={savingOrganizationAccess || !organizationInviteEmail.trim()}
            >
              {savingOrganizationAccess ? "Enviando..." : "Enviar invitación"}
            </Button>
          </Stack>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
            Solo owner/admin pueden invitar, cambiar roles o quitar miembros.
          </Alert>
        )}

        {loadingOrganizationAccess ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <Stack spacing={1}>
            {organizationMembers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay miembros en esta organización.
              </Typography>
            ) : (
              organizationMembers.map((member) => (
                <Paper
                  key={member.id}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "background.paper",
                  }}
                >
                  <Avatar src={member.user_profiles.avatar_url ?? undefined} sx={{ width: 36, height: 36 }}>
                    {(member.user_profiles.full_name ?? "U").slice(0, 1)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {member.user_profiles.full_name ?? "Usuario sin perfil"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Miembro de la organización
                    </Typography>
                  </Box>
                  <TextField
                    select
                    size="small"
                    label="Rol"
                    value={member.role}
                    disabled={!canManageOrganization || member.role === "owner" || savingOrganizationAccess}
                    onChange={(event) =>
                      void handleOrganizationMemberRoleChange(
                        member.id,
                        event.target.value as OrganizationMemberWithProfile["role"]
                      )
                    }
                    sx={{ width: 150 }}
                  >
                    <MenuItem value="owner">owner</MenuItem>
                    <MenuItem value="admin">admin</MenuItem>
                    <MenuItem value="member">member</MenuItem>
                  </TextField>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={!canManageOrganization || member.role === "owner" || savingOrganizationAccess}
                    onClick={() => void handleRemoveOrganizationMember(member)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))
            )}
          </Stack>
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Invitaciones pendientes
        </Typography>
        {pendingOrganizationInvitations.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay invitaciones pendientes.
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {pendingOrganizationInvitations.map((invitation) => (
              <Chip
                key={invitation.id}
                color="warning"
                label={`${invitation.invitee_id.slice(0, 8)} · pendiente`}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );

  const handleIssueTypeChange = (id: string, field: keyof IssueType, value: string) => {
    setEditingIssueTypes((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSaveIssueType = async (id: string) => {
    const updates = editingIssueTypes[id];
    if (updates) {
      await catalogs.editIssueType(id, updates);
      setEditingIssueTypes((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePriorityChange = (id: string, field: keyof Priority, value: string | number) => {
    setEditingPriorities((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSavePriority = async (id: string) => {
    const updates = editingPriorities[id];
    if (updates) {
      await catalogs.editPriority(id, updates);
      setEditingPriorities((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePhaseChange = (id: string, field: keyof EpicPhase, value: string) => {
    setEditingPhases((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSavePhase = async (id: string) => {
    const updates = editingPhases[id];
    if (updates) {
      await catalogs.editEpicPhase(id, updates);
      setEditingPhases((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleAddIssueType = async () => {
    await catalogs.addIssueType("Nuevo tipo", "circle", "#3B82F6");
  };

  const handleAddPriority = async () => {
    await catalogs.addPriority("Nueva prioridad", catalogs.priorities.length + 1, "#64748B");
  };

  const handleAddPhase = async () => {
    await catalogs.addEpicPhase("Nueva fase", "#64748B");
  };

  const handleAddPointValue = async () => {
    if (!newPointValue.trim()) return;
    const numericValue = parseInt(newPointValue, 10);
    await catalogs.addPointValue(newPointValue, isNaN(numericValue) ? null : numericValue);
    setNewPointValue("");
  };

  const handleIssueTypesDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(catalogs.issueTypes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    await catalogs.reorderIssueTypesList(items);
  };

  const handlePrioritiesDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(catalogs.priorities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    await catalogs.reorderPrioritiesList(items);
  };

  const handlePhasesDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(catalogs.epicPhases);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    await catalogs.reorderEpicPhasesList(items);
  };

  const renderTasksSettings = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Creación de Tareas
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Controla dónde se pueden crear nuevas tareas
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={allowBoardTaskCreation}
                onChange={(e) => handleToggleBoardTaskCreation(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  Permitir crear tareas desde el Tablero Scrum
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {allowBoardTaskCreation
                    ? "Las tareas se pueden crear directamente en cada columna del tablero"
                    : "Las tareas solo se pueden crear desde el Backlog"}
                </Typography>
              </Box>
            }
          />
        </Paper>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Tipos de Issue
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configura los tipos de tareas disponibles en el proyecto
        </Typography>

        <DragDropContext onDragEnd={handleIssueTypesDragEnd}>
          <Droppable droppableId="issue-types">
            {(provided) => (
              <Stack spacing={1} sx={{ mt: 2 }} {...provided.droppableProps} ref={provided.innerRef}>
                {catalogs.issueTypes.map((type, index) => {
                  const editing = editingIssueTypes[type.id];
                  const currentName = editing?.name ?? type.name;
                  const currentIcon = editing?.icon ?? type.icon;
                  const currentColor = editing?.color ?? type.color;

                  return (
                    <Draggable key={type.id} draggableId={type.id} index={index}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            bgcolor: snapshot.isDragging ? "action.hover" : "background.paper",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box {...provided.dragHandleProps}>
                            <DragIndicatorIcon sx={{ color: "text.disabled", cursor: "grab" }} />
                          </Box>

                          <TextField
                            size="small"
                            value={currentName}
                            onChange={(e) => handleIssueTypeChange(type.id, "name", e.target.value)}
                            onBlur={() => handleSaveIssueType(type.id)}
                            sx={{ flex: 1 }}
                          />

                          <IconPicker
                            value={currentIcon}
                            color={currentColor}
                            onChange={(icon) => {
                              handleIssueTypeChange(type.id, "icon", icon);
                              handleSaveIssueType(type.id);
                            }}
                          />

                          <ColorPicker
                            value={currentColor}
                            onChange={(color) => {
                              handleIssueTypeChange(type.id, "color", color);
                              handleSaveIssueType(type.id);
                            }}
                          />

                          <IconButton size="small" color="error" onClick={() => catalogs.removeIssueType(type.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Paper>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>

        <Button startIcon={<AddIcon />} sx={{ mt: 2 }} variant="outlined" onClick={handleAddIssueType}>
          Agregar tipo de issue
        </Button>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Prioridades
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define los niveles de prioridad para las tareas
        </Typography>

        <DragDropContext onDragEnd={handlePrioritiesDragEnd}>
          <Droppable droppableId="priorities">
            {(provided) => (
              <Stack spacing={1} sx={{ mt: 2 }} {...provided.droppableProps} ref={provided.innerRef}>
                {catalogs.priorities.map((priority, index) => {
                  const editing = editingPriorities[priority.id];
                  const currentName = editing?.name ?? priority.name;
                  const currentColor = editing?.color ?? priority.color;

                  return (
                    <Draggable key={priority.id} draggableId={priority.id} index={index}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            bgcolor: snapshot.isDragging ? "action.hover" : "background.paper",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box {...provided.dragHandleProps}>
                            <DragIndicatorIcon sx={{ color: "text.disabled", cursor: "grab" }} />
                          </Box>

                          <TextField
                            size="small"
                            value={currentName}
                            onChange={(e) => handlePriorityChange(priority.id, "name", e.target.value)}
                            onBlur={() => handleSavePriority(priority.id)}
                            sx={{ flex: 1 }}
                          />

                          <ColorPicker
                            value={currentColor}
                            onChange={(color) => {
                              handlePriorityChange(priority.id, "color", color);
                              handleSavePriority(priority.id);
                            }}
                          />

                          <IconButton size="small" color="error" onClick={() => catalogs.removePriority(priority.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Paper>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>

        <Button startIcon={<AddIcon />} sx={{ mt: 2 }} variant="outlined" onClick={handleAddPriority}>
          Agregar prioridad
        </Button>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Story Points
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Sistema de estimación para tareas (Fibonacci por defecto)
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
          {catalogs.pointValues.map((point) => (
            <Chip
              key={point.id}
              label={point.value}
              onDelete={() => catalogs.removePointValue(point.id)}
              sx={{
                fontSize: 16,
                fontWeight: 600,
                height: 36,
              }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField
            size="small"
            placeholder="Nuevo valor"
            value={newPointValue}
            onChange={(e) => setNewPointValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                void handleAddPointValue();
              }
            }}
            sx={{ width: 150 }}
          />
          <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddPointValue}>
            Agregar
          </Button>
        </Stack>
      </Box>
    </Stack>
  );

  const renderEpicsSettings = () => (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Fases de Épica
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define las fases del ciclo de vida de una épica
        </Typography>

        <DragDropContext onDragEnd={handlePhasesDragEnd}>
          <Droppable droppableId="epic-phases">
            {(provided) => (
              <Stack spacing={1} sx={{ mt: 2 }} {...provided.droppableProps} ref={provided.innerRef}>
                {catalogs.epicPhases.map((phase, index) => {
                  const editing = editingPhases[phase.id];
                  const currentName = editing?.name ?? phase.name;
                  const currentColor = editing?.color ?? phase.color;

                  return (
                    <Draggable key={phase.id} draggableId={phase.id} index={index}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            bgcolor: snapshot.isDragging ? "action.hover" : "background.paper",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box {...provided.dragHandleProps}>
                            <DragIndicatorIcon sx={{ color: "text.disabled", cursor: "grab" }} />
                          </Box>

                          <TextField
                            size="small"
                            value={currentName}
                            onChange={(e) => handlePhaseChange(phase.id, "name", e.target.value)}
                            onBlur={() => handleSavePhase(phase.id)}
                            sx={{ flex: 1 }}
                          />

                          <ColorPicker
                            value={currentColor}
                            onChange={(color) => {
                              handlePhaseChange(phase.id, "color", color);
                              handleSavePhase(phase.id);
                            }}
                          />

                          <IconButton size="small" color="error" onClick={() => catalogs.removeEpicPhase(phase.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Paper>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>

        <Button startIcon={<AddIcon />} sx={{ mt: 2 }} variant="outlined" onClick={handleAddPhase}>
          Agregar fase
        </Button>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Prefijo de Épica
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configura el formato de ID para las épicas (ej: EPIC-001, EPIC-002)
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="Prefijo"
          defaultValue="EPIC"
          helperText="Las épicas se numerarán automáticamente: EPIC-001, EPIC-002, etc."
          sx={{ mt: 2, maxWidth: 300 }}
        />
      </Box>
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: "90vh",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Configuración del Proyecto
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {projectName}
            </Typography>
          </Box>

          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", height: "100%" }}>
        <Box
          sx={{
            width: 240,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <List disablePadding>
            <ListItemButton
              selected={selectedSection === "general"}
              onClick={() => setSelectedSection("general")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="General"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "general" ? 600 : 400,
                }}
              />
            </ListItemButton>

            <ListItemButton
              selected={selectedSection === "organization"}
              onClick={() => setSelectedSection("organization")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="Organización"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "organization" ? 600 : 400,
                }}
              />
            </ListItemButton>

            <ListItemButton
              selected={selectedSection === "tasks"}
              onClick={() => setSelectedSection("tasks")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="Tareas"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "tasks" ? 600 : 400,
                }}
              />
            </ListItemButton>

            <ListItemButton
              selected={selectedSection === "epics"}
              onClick={() => setSelectedSection("epics")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="Épicas"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "epics" ? 600 : 400,
                }}
              />
            </ListItemButton>

            <ListItemButton
              selected={selectedSection === "automations"}
              onClick={() => setSelectedSection("automations")}
              sx={{
                py: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              <ListItemText
                primary="Automatizaciones"
                primaryTypographyProps={{
                  fontWeight: selectedSection === "automations" ? 600 : 400,
                }}
              />
            </ListItemButton>
          </List>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 4,
            overflow: "auto",
          }}
        >
          {catalogs.loading ? (
            <Stack alignItems="center" justifyContent="center" height="100%">
              <CircularProgress />
            </Stack>
          ) : (
            <>
              {selectedSection === "general" && renderGeneralSettings()}
              {selectedSection === "organization" && renderOrganizationSettings()}
              {selectedSection === "tasks" && renderTasksSettings()}
              {selectedSection === "epics" && renderEpicsSettings()}
              {selectedSection === "automations" && renderAutomationSettings()}
            </>
          )}
        </Box>
      </DialogContent>
      <OrganizationLogoCropDialog
        open={Boolean(logoCropSourceFile)}
        file={logoCropSourceFile}
        title="Recortar logo de organizacion"
        onCancel={() => setLogoCropSourceFile(null)}
        onCrop={(file) => void handleOrganizationLogoCrop(file)}
      />
    </Dialog>
  );
};

export default ProjectSettingsModal;
