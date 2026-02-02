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

type Filters = {
  phases: string[];
  efforts: string[];
  projects: string[];
};

export const useEpicsTable = (userId: string) => {
  const { currentProject } = useProject();

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
  const [taskOptions, setTaskOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [taskSearchText, setTaskSearchText] = useState("");

  // Estado de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [epicToDelete, setEpicToDelete] = useState<string | null>(null);

  // Cargar datos iniciales
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [epicsData, phasesData, pointSystem, projectsData] = await Promise.all([
        fetchEpics(userId, currentProject?.id ?? null),
        fetchEpicPhases(),
        fetchDefaultPointSystem(),
        fetchProjects(userId),
      ]);

      setEpics(epicsData);
      setPhases(phasesData);
      setProjects(projectsData);

      if (pointSystem) {
        const points = await fetchPointValues(pointSystem.id);
        setPointValues(points);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId, currentProject]);

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
      };
    });

    setRows(mappedRows);
  }, [epics, projects, hiddenEpics, searchText, filters, sortColumn, sortOrder]);

  useEffect(() => {
    if (taskSearchOpen !== null) {
      searchTasks(currentProject?.id ?? null, taskSearchText).then(setTaskOptions);
    }
  }, [taskSearchText, taskSearchOpen, userId, currentProject]);

  const handleAddEpic = async () => {
    try {
      const newEpic = await createEpic(userId, {
        name: "Nueva épica",
        project_id: currentProject?.id ?? null,
      });

      const epicWithDetails: EpicWithDetails = {
        ...newEpic,
        phase_name: undefined,
        phase_color: undefined,
        connected_tasks: [],
      };

      setEpics((prev) => [epicWithDetails, ...prev]);
    } catch (error) {
      console.error("Error creando épica:", error);
    }
  };

  const handleColorChange = async (epicId: string, color: string | null) => {
    console.log("🎨 Cambiando color de épica:", epicId, "a color:", color);
    
    try {
      const result = await updateEpic(epicId, { color });
      console.log("🎨 Resultado de updateEpic:", result);

      // ✅ Actualizar solo el estado local
      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId ? { ...epic, color } : epic
        )
      );
      
      console.log("🎨 Estado local actualizado");
    } catch (error) {
      console.error("Error actualizando color:", error);
    }
  };

  const handleNameChange = async (epicId: string, newName: string) => {
    try {
      await updateEpic(epicId, { name: newName });

      setEpics((prev) =>
        prev.map((epic) => (epic.id === epicId ? { ...epic, name: newName } : epic))
      );
    } catch (error) {
      console.error("Error actualizando nombre:", error);
    }
  };

  const handlePhaseChange = async (epicId: string, phaseId: string) => {
    try {
      await updateEpic(epicId, { phase_id: phaseId || null });

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
      console.error("Error actualizando fase:", error);
    }
  };

  const handleEffortChange = async (epicId: string, effort: string) => {
    try {
      await updateEpic(epicId, { estimated_effort: effort || null });

      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId ? { ...epic, estimated_effort: effort || null } : epic
        )
      );
    } catch (error) {
      console.error("Error actualizando esfuerzo:", error);
    }
  };

  const handleProjectChange = async (epicId: string, projectId: string) => {
    try {
      await linkEpicToProject(epicId, projectId || null);

      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId ? { ...epic, project_id: projectId || null } : epic
        )
      );
    } catch (error) {
      console.error("Error actualizando proyecto:", error);
    }
  };

  const handleConnectTask = async (epicId: string, taskId: string) => {
    try {
      await connectTaskToEpic(epicId, taskId);

      const task = taskOptions.find((t) => t.id === taskId);
      if (task) {
        setEpics((prev) =>
          prev.map((epic) =>
            epic.id === epicId
              ? {
                  ...epic,
                  connected_tasks: [...(epic.connected_tasks || []), task],
                }
              : epic
          )
        );
      }
    } catch (error) {
      console.error("Error conectando tarea:", error);
    }
  };

  const handleDisconnectTask = async (epicId: string, taskId: string) => {
    try {
      await disconnectTaskFromEpic(epicId, taskId);

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
      console.error("Error desconectando tarea:", error);
    }
  };

  const handleDeleteEpic = (epicId: string) => {
    setEpicToDelete(epicId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEpic = async () => {
    if (!epicToDelete) return;

    try {
      await deleteEpic(epicToDelete);

      setEpics((prev) => prev.filter((epic) => epic.id !== epicToDelete));
      setDeleteDialogOpen(false);
      setEpicToDelete(null);
    } catch (error) {
      console.error("Error eliminando épica:", error);
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
    deleteDialogOpen,
    epicToDelete,
    editingColor,
    colorMenuAnchor,

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

    // Handlers
    handleAddEpic,
    handleNameChange,
    handlePhaseChange,
    handleEffortChange,
    handleProjectChange,
    handleConnectTask,
    handleDisconnectTask,
    handleDeleteEpic,
    confirmDeleteEpic,
  };
};