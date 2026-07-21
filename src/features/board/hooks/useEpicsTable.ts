import { useState, useEffect } from "react";
import {
  fetchEpics,
  fetchEpicPhases,
  createEpic,
  updateEpic,
  deleteEpic,
  connectTaskToEpic,
  disconnectTaskFromEpic,
  searchTasks,
  type EpicWithDetails,
  type EpicPhase,
  type TaskSearchOption,
} from "../../api/epicService";
import {
  fetchDefaultPointSystem,
  fetchPointValues,
  type PointValue,
} from "../../api/catalogService";
import {
  fetchProjects,
  linkEpicToProject,
  type ProjectWithTags,
} from "../../api/projectService";
import { useProject } from "../../../shared/contexts/ProjectContext";
import type { GridRowsProp } from "@mui/x-data-grid";
import { getErrorMessage, logError, type NotificationSeverity } from "../../../shared/utils/errorHandling";

type Filters = {
  phases: string[];
  efforts: string[];
  projects: string[];
};

export const useEpicsTable = (userId: string) => {
  const { currentProject, activeOrganization } = useProject();
  const canEditProject = currentProject?.can_edit ?? true;

  // Estado principal
  const [epics, setEpics] = useState<EpicWithDetails[]>([]);
  const [phases, setPhases] = useState<EpicPhase[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [projects, setProjects] = useState<ProjectWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado de tabla y filtros
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<Filters>({
    phases: [],
    efforts: [],
    projects: [],
  });
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [hiddenEpics, setHiddenEpics] = useState<string[]>([]);

  // Estado de menús
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [hideAnchor, setHideAnchor] = useState<HTMLElement | null>(null);
  const [colorMenuAnchor, setColorMenuAnchor] = useState<HTMLElement | null>(null);
  const [phaseMenuAnchor, setPhaseMenuAnchor] = useState<HTMLElement | null>(null);
  const [effortMenuAnchor, setEffortMenuAnchor] = useState<HTMLElement | null>(null);
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<HTMLElement | null>(null);

  // Estado de edición
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingEffort, setEditingEffort] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);

  // Estado de tareas
  const [taskSearchOpen, setTaskSearchOpen] = useState<string | null>(null);
  const [taskOptions, setTaskOptions] = useState<TaskSearchOption[]>([]);
  const [taskSearchText, setTaskSearchText] = useState("");
  const [isTaskSearchLoading, setIsTaskSearchLoading] = useState(false);

  // Estado de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [epicToDelete, setEpicToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    severity: NotificationSeverity;
    message: string;
  } | null>(null);

  const showError = (context: string, error: unknown, fallback: string) => {
    logError(context, error);
    setNotification({
      severity: "error",
      message: getErrorMessage(error, fallback),
    });
  };

  // Cargar datos iniciales
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [epicsData, phasesData, pointSystem, projectsData] = await Promise.all([
        fetchEpics(userId, currentProject?.id ?? null),
        fetchEpicPhases(),
        fetchDefaultPointSystem(),
        fetchProjects(userId, activeOrganization?.id),
      ]);

      setEpics(epicsData);
      setPhases(phasesData);
      setProjects(projectsData);

      if (pointSystem) {
        const points = await fetchPointValues(pointSystem.id);
        setPointValues(points);
      }
    } catch (error) {
      showError("epics.loadData", error, "No se pudieron cargar las épicas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId, currentProject, activeOrganization?.id]);

  useEffect(() => {
    let processedEpics = epics.filter((epic) => !hiddenEpics.includes(epic.id));

    if (searchText) {
      processedEpics = processedEpics.filter(
        (epic) =>
          epic.name.toLowerCase().includes(searchText.toLowerCase()) ||
          epic.epic_id_display?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filters.phases.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.phases.includes(epic.phase_id || "")
      );
    }

    if (filters.efforts.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.efforts.includes(epic.estimated_effort || "")
      );
    }

    if (filters.projects.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.projects.includes(epic.project_id || "")
      );
    }

    processedEpics.sort((a, b) => {
      let aValue: string = "";
      let bValue: string = "";

      switch (sortColumn) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "phase":
          aValue = a.phase_name || "";
          bValue = b.phase_name || "";
          break;
        case "effort":
          aValue = a.estimated_effort || "";
          bValue = b.estimated_effort || "";
          break;
        case "project": {
          const projectA = projects.find((p) => p.id === a.project_id);
          const projectB = projects.find((p) => p.id === b.project_id);
          aValue = projectA?.title || "";
          bValue = projectB?.title || "";
          break;
        }
        case "epicId":
          aValue = a.epic_id_display || "";
          bValue = b.epic_id_display || "";
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const mappedRows = processedEpics.map((epic) => {
      const project = projects.find((p) => p.id === epic.project_id);

      return {
        id: epic.id,
        name: epic.name,
        color: epic.color || "#3B82F6",
        owner: "Usuario",
        phase_id: epic.phase_id,
        phase: epic.phase_name || "Sin fase",
        phaseColor: epic.phase_color,
        project_id: epic.project_id,
        project: project?.title || "Sin proyecto",
        projectTags: project?.tags || [],
        connectedTasks: epic.connected_tasks || [],
        estimatedEffort: epic.estimated_effort || "",
        epicId: epic.epic_id_display || "-",
        startDate: epic.start_date,
        endDate: epic.end_date,
      };
    });

    setRows(mappedRows);
  }, [epics, projects, hiddenEpics, searchText, filters, sortColumn, sortOrder]);

  useEffect(() => {
    let isActive = true;

    if (taskSearchOpen === null) {
      setTaskOptions([]);
      setIsTaskSearchLoading(false);
      return;
    }

    setIsTaskSearchLoading(true);
    searchTasks(currentProject?.id ?? null, taskSearchText)
      .then((tasks) => {
        if (isActive) {
          setTaskOptions(tasks);
        }
      })
      .catch((error) => {
        showError("epics.searchTasks", error, "No se pudieron buscar tareas.");
        if (isActive) {
          setTaskOptions([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsTaskSearchLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [taskSearchText, taskSearchOpen, userId, currentProject]);

  const handleAddEpic = async () => {
    if (!currentProject) return;
    if (!canEditProject) {
      setNotification({
        severity: "info",
        message: "Solo puedes crear épicas en proyectos donde eres colaborador.",
      });
      return;
    }

    try {
      const newEpic = await createEpic(userId, {
        name: "Nueva épica",
        project_id: currentProject.id,
      });

      const epicWithDetails: EpicWithDetails = {
        ...newEpic,
        phase_name: undefined,
        phase_color: undefined,
        connected_tasks: [],
      };

      setEpics((prev) => [epicWithDetails, ...prev]);
    } catch (error) {
      showError("epics.create", error, "No se pudo crear la épica.");
    }
  };

  const handleColorChange = async (epicId: string, color: string | null) => {
    if (!currentProject) return;
    if (!canEditProject) return;
    
    try {
      await updateEpic(currentProject.id, epicId, { color });

      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId ? { ...epic, color } : epic
        )
      );
    } catch (error) {
      showError("epics.updateColor", error, "No se pudo actualizar el color.");
    }
  };

  const handleNameChange = async (epicId: string, newName: string) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateEpic(currentProject.id, epicId, { name: newName });

      setEpics((prev) =>
        prev.map((epic) => (epic.id === epicId ? { ...epic, name: newName } : epic))
      );
    } catch (error) {
      showError("epics.updateName", error, "No se pudo actualizar el nombre.");
    }
  };

  const handlePhaseChange = async (epicId: string, phaseId: string) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateEpic(currentProject.id, epicId, { phase_id: phaseId || null });

      const phase = phases.find((p) => p.id === phaseId);
      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId
            ? {
                ...epic,
                phase_id: phaseId || null,
                phase_name: phase?.name,
                phase_color: phase?.color ?? undefined,
              }
            : epic
        )
      );
    } catch (error) {
      showError("epics.updatePhase", error, "No se pudo actualizar la fase.");
    }
  };

  const handleEffortChange = async (epicId: string, effort: string) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateEpic(currentProject.id, epicId, { estimated_effort: effort || null });

      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId ? { ...epic, estimated_effort: effort || null } : epic
        )
      );
    } catch (error) {
      showError("epics.updateEffort", error, "No se pudo actualizar el esfuerzo.");
    }
  };

  const handleEpicDateChange = async (
    epicId: string,
    field: "start_date" | "end_date",
    value: string | null
  ) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateEpic(currentProject.id, epicId, { [field]: value });

      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId
            ? {
                ...epic,
                [field]: value,
              }
            : epic
        )
      );
    } catch (error) {
      showError("epics.updateDate", error, "No se pudo actualizar la fecha de la épica.");
    }
  };

  const handleProjectChange = async (epicId: string, projectId: string) => {
    if (!canEditProject) return;
    try {
      await linkEpicToProject(epicId, projectId || null);

      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId ? { ...epic, project_id: projectId || null } : epic
        )
      );
    } catch (error) {
      showError("epics.updateProject", error, "No se pudo cambiar el proyecto de la épica.");
    }
  };

  const handleConnectTask = async (epicId: string, taskId: string) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await connectTaskToEpic(currentProject.id, epicId, taskId);

      const task = taskOptions.find((t) => t.id === taskId);
      if (task) {
        setEpics((prev) =>
          prev.map((epic) =>
            epic.id === epicId
              ? {
                  ...epic,
                  connected_tasks: [
                    ...(epic.connected_tasks || []),
                    {
                      ...task,
                      project_id: currentProject?.id ?? null,
                      column_id: null,
                      column_name: null,
                      sprint_id: null,
                      sprint_name: null,
                      sprint_start_date: null,
                      sprint_end_date: null,
                      task_id_display: null,
                      issue_type_id: null,
                      priority_id: null,
                      story_points: null,
                      assignee_id: null,
                      planned_start_date: null,
                      planned_end_date: null,
                    },
                  ],
                }
              : epic
          )
        );
      }
    } catch (error) {
      showError("epics.connectTask", error, "No se pudo conectar la tarea.");
    }
  };

  const handleDisconnectTask = async (epicId: string, taskId: string) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await disconnectTaskFromEpic(currentProject.id, epicId, taskId);

      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId
            ? {
                ...epic,
                connected_tasks: (epic.connected_tasks || []).filter((t) => t.id !== taskId),
              }
            : epic
        )
      );
    } catch (error) {
      showError("epics.disconnectTask", error, "No se pudo desconectar la tarea.");
    }
  };

  const handleDeleteEpic = (epicId: string) => {
    if (!canEditProject) return;
    setEpicToDelete(epicId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEpic = async () => {
    if (!currentProject || !epicToDelete) return;
    if (!canEditProject) return;

    try {
      await deleteEpic(currentProject.id, epicToDelete);

      setEpics((prev) => prev.filter((epic) => epic.id !== epicToDelete));
      setDeleteDialogOpen(false);
      setEpicToDelete(null);
    } catch (error) {
      showError("epics.delete", error, "No se pudo eliminar la épica.");
    }
  };

  const activeFiltersCount =
    filters.phases.length + filters.efforts.length + filters.projects.length;

  return {
    // Estado
    epics,
    phases,
    pointValues,
    projects,
    isLoading,
    rows,
    searchOpen,
    searchText,
    filters,
    sortColumn,
    sortOrder,
    hiddenEpics,
    filterAnchor,
    sortAnchor,
    hideAnchor,
    phaseMenuAnchor,
    effortMenuAnchor,
    projectMenuAnchor,
    editingName,
    editingPhase,
    editingEffort,
    editingProject,
    taskSearchOpen,
    taskOptions,
    taskSearchText,
    isTaskSearchLoading,
    deleteDialogOpen,
    epicToDelete,
    editingColor,
    colorMenuAnchor,
    notification,

    activeFiltersCount,

    // Setters
    setEditingColor,
    setColorMenuAnchor,
    handleColorChange,
    setSearchOpen,
    setSearchText,
    setFilters,
    setSortColumn,
    setSortOrder,
    setHiddenEpics,
    setFilterAnchor,
    setSortAnchor,
    setHideAnchor,
    setPhaseMenuAnchor,
    setEffortMenuAnchor,
    setProjectMenuAnchor,
    setEditingName,
    setEditingPhase,
    setEditingEffort,
    setEditingProject,
    setTaskSearchOpen,
    setTaskSearchText,
    setTaskOptions,
    setDeleteDialogOpen,
    setEpicToDelete,
    setNotification,

    // Handlers
    handleAddEpic,
    handleNameChange,
    handlePhaseChange,
    handleEffortChange,
    handleEpicDateChange,
    handleProjectChange,
    handleConnectTask,
    handleDisconnectTask,
    handleDeleteEpic,
    confirmDeleteEpic,
  };
};
