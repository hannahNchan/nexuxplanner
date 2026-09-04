import { useState, useEffect, useMemo } from "react";
import type { GridRowsProp } from "@mui/x-data-grid";
import type { DropResult } from "@hello-pangea/dnd";
import {
  fetchBacklogTasks,
  assignBacklogTaskToSprint,
  createBacklogTask,
  updateBacklogTask,
  deleteBacklogTask,
  fetchFirstProjectColumnId,
  fetchProjectEpicName,
  type BacklogTaskWithDetails,
} from "../../api/backlogService";
import { fetchProjects, type ProjectWithTags } from "../../api/projectService";
import { fetchPriorities, type Priority } from "../../api/catalogService";
import {
  fetchIssueTypes,
  fetchDefaultPointSystem,
  fetchPointValues,
  type IssueType,
  type PointValue,
} from "../../api/catalogService";
import { useProject } from "../../../shared/contexts/ProjectContext";
import { useSprintManager } from "../../sprints/hooks/useSprintManager";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";

type SortColumn = "title" | "assignee" | "priority" | "story_points" | "epic" | "task_id" | "created_at";
type SortOrder = "asc" | "desc";

const isEpicIssueTypeName = (name?: string | null) =>
  name?.trim().toLowerCase() === "epic";

const BACKLOG_DRAFT_TASK_ID = "__draft_backlog_task__";

export const useBacklogTable = (userId: string) => {
  const { currentProject, activeOrganization } = useProject();
  const canEditProject = currentProject?.can_edit ?? true;
  const sprintManager = useSprintManager(currentProject?.id || null);
  
  const [tasks, setTasks] = useState<BacklogTaskWithDetails[]>([]);
  const [projects, setProjects] = useState<ProjectWithTags[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<{
    projects: string[];
    priorities: string[];
    hasEpic: boolean | null;
    hasGithubLink: boolean | null;
  }>({
    projects: [],
    priorities: [],
    hasEpic: null,
    hasGithubLink: null,
  });
  
  // Sort
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Hidden tasks
  const [hiddenTasks, setHiddenTasks] = useState<string[]>([]);
  
  // Menu anchors
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [hideAnchor, setHideAnchor] = useState<HTMLElement | null>(null);
  const [priorityMenuAnchor, setPriorityMenuAnchor] = useState<HTMLElement | null>(null);
  const [effortMenuAnchor, setEffortMenuAnchor] = useState<HTMLElement | null>(null);
  const [epicMenuAnchor, setEpicMenuAnchor] = useState<HTMLElement | null>(null);
  const [assigneeMenuAnchor, setAssigneeMenuAnchor] = useState<HTMLElement | null>(null);
  
  // Editing states
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editingEffort, setEditingEffort] = useState<string | null>(null);
  const [editingEpic, setEditingEpic] = useState<string | null>(null);
  const [editingAssignee, setEditingAssignee] = useState<string | null>(null);
  const [editingGithubLink, setEditingGithubLink] = useState<string | null>(null);
  
  // Delete dialog & task modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskEditorPresentation, setTaskEditorPresentation] = useState<"drawer" | "modal">("modal");
  const [selectedBacklogTask, setSelectedBacklogTask] = useState<{
    id: string;
    project_id?: string | null;
    title: string;
    subtitle?: string | null;
    description?: string;
    column_id: string | null;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    assignee_id?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
  } | null>(null);

  // Catalogs for modal
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  // Sprint modal
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [firstColumnId, setFirstColumnId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    severity: "error" | "info" | "success" | "warning";
    message: string;
  } | null>(null);

  const showNotification = (
    severity: "error" | "info" | "success" | "warning",
    message: string
  ) => {
    setNotification({ severity, message });
  };

  const showError = (context: string, error: unknown, fallback: string) => {
    logError(context, error);
    showNotification("error", getErrorMessage(error, fallback));
  };

  // Load first column for sprint assignment
  useEffect(() => {
    const fetchFirstColumn = async () => {
      if (!currentProject) return;

      const columnId = await fetchFirstProjectColumnId(currentProject.id);
      setFirstColumnId(columnId);
    };

    void fetchFirstColumn();
  }, [currentProject]);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [tasksData, projectsData, prioritiesData, pointSystem] = await Promise.all([
        fetchBacklogTasks(userId, currentProject?.id),
        fetchProjects(userId, activeOrganization?.id),
        fetchPriorities(),
        fetchDefaultPointSystem(),
      ]);
      
      setTasks(tasksData);
      setProjects(projectsData);
      setPriorities(prioritiesData);
      
      if (pointSystem) {
        const points = await fetchPointValues(pointSystem.id);
        setPointValues(points);
      }
    } catch (error) {
      showError("backlog.loadData", error, "No se pudo cargar el Backlog.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId, currentProject, activeOrganization?.id]);

  // Load catalogs for modal
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [types, prioritiesList, pointSystem] = await Promise.all([
          fetchIssueTypes(),
          fetchPriorities(),
          fetchDefaultPointSystem(),
        ]);

        setIssueTypes(types);

        if (pointSystem) {
          const points = await fetchPointValues(pointSystem.id);
          setPriorities(prioritiesList);
          setPointValues(points);
        }

        setCatalogsLoaded(true);
      } catch (error) {
        showError("backlog.loadCatalogs", error, "No se pudieron cargar los catálogos.");
      }
    };

    void loadCatalogs();
  }, []);

  // HANDLERS
  const handleAddTask = async () => {
    if (!currentProject) return;
    if (!canEditProject) {
      showNotification("info", "Solo puedes crear tareas en proyectos donde eres colaborador.");
      return;
    }

    setSelectedBacklogTask({
      id: BACKLOG_DRAFT_TASK_ID,
      project_id: currentProject.id,
      title: "Nueva tarea",
      subtitle: "",
      description: "",
      column_id: null,
      issue_type_id: null,
      priority_id: null,
      story_points: null,
      assignee_id: null,
      planned_start_date: null,
      planned_end_date: null,
    });
    setTaskEditorPresentation("modal");
    setIsTaskModalOpen(true);
  };

  const handleTitleChange = async (taskId: string, newTitle: string) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateBacklogTask(currentProject.id, taskId, { title: newTitle });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, title: newTitle } : task
        )
      );
    } catch (error) {
      showError("backlog.updateTitle", error, "No se pudo actualizar el título.");
    }
  };

  const handlePriorityChange = async (taskId: string, priorityId: string | null) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    const priority = priorities.find((p) => p.id === priorityId);
    try {
      await updateBacklogTask(currentProject.id, taskId, { priority_id: priorityId });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? ({
                ...task,
                priority_id: priorityId,
                priority_name: priority?.name,
                priority_color: priority?.color,
              } as BacklogTaskWithDetails)
            : task
        )
      );
    } catch (error) {
      showError("backlog.updatePriority", error, "No se pudo actualizar la prioridad.");
    }
  };

  const handleEffortChange = async (taskId: string, effort: string | null) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateBacklogTask(currentProject.id, taskId, { story_points: effort });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, story_points: effort } : task
        )
      );
    } catch (error) {
      showError("backlog.updateEffort", error, "No se pudo actualizar el esfuerzo.");
    }
  };

  const handleEpicChange = async (taskId: string, epicId: string | null) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    let epicName: string | undefined = undefined;
    
    if (epicId) {
      epicName = await fetchProjectEpicName(currentProject.id, epicId);
    }
    
    try {
      await updateBacklogTask(currentProject.id, taskId, { epic_id: epicId });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                epic_id: epicId,
                epic_name: epicName
              }
            : task
        )
      );
    } catch (error) {
      showError("backlog.updateEpic", error, "No se pudo cambiar la épica.");
    }
  };

  const handleAssigneeChange = async (taskId: string, assigneeId: string | null) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateBacklogTask(currentProject.id, taskId, { assignee_id: assigneeId });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, assignee_id: assigneeId } : task
        )
      );
    } catch (error) {
      showError("backlog.updateAssignee", error, "No se pudo cambiar el responsable.");
    }
  };

  const handleGithubLinkChange = async (taskId: string, githubLink: string) => {
    if (!currentProject) return;
    if (!canEditProject) return;

    try {
      await updateBacklogTask(currentProject.id, taskId, { github_link: githubLink });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, github_link: githubLink } : task
        )
      );
    } catch (error) {
      showError("backlog.updateGithubLink", error, "No se pudo guardar el enlace de GitHub.");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!canEditProject) {
      showNotification("info", "Solo puedes eliminar tareas en proyectos donde eres colaborador.");
      return;
    }
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!currentProject || !taskToDelete) return;
    if (!canEditProject) return;
    
    try {
      await deleteBacklogTask(currentProject.id, taskToDelete);
      setTasks((prev) => prev.filter((task) => task.id !== taskToDelete));

      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      showError("backlog.deleteTask", error, "No se pudo eliminar la tarea.");
    }
  };

  const handleSaveTaskFromModal = async (
    taskId: string,
    updates: {
      title: string;
      subtitle: string;
      description: string;
      destination: "backlog" | "scrum";
      column_id: string | null;
      issue_type_id: string | null;
      priority_id: string | null;
      story_points: string | null;
      assignee_id: string | null;
      planned_start_date: string | null;
      planned_end_date: string | null;
    }
  ) => {
    if (!currentProject) return;
    if (!canEditProject) {
      showNotification("info", "Solo puedes editar tareas en proyectos donde eres colaborador.");
      return;
    }

    try {
      if (taskId === BACKLOG_DRAFT_TASK_ID) {
        const newTask = await createBacklogTask(userId, currentProject.id, {
          title: updates.title,
          subtitle: updates.subtitle,
          description: updates.description,
          assignee_id: updates.assignee_id,
          priority_id: updates.priority_id,
          story_points: updates.story_points,
          issue_type_id: updates.issue_type_id,
          planned_start_date: updates.planned_start_date,
          planned_end_date: updates.planned_end_date,
        });

        if (updates.destination === "backlog") {
          const priority = priorities.find((p) => p.id === updates.priority_id);
          setTasks((prev) => [
            {
              ...newTask,
              priority_name: priority?.name,
              priority_color: priority?.color,
            } as BacklogTaskWithDetails,
            ...prev,
          ]);
        }

        return;
      }

      await updateBacklogTask(currentProject.id, taskId, {
        title: updates.title,
        subtitle: updates.subtitle,
        description: updates.description,
        assignee_id: updates.assignee_id,
        priority_id: updates.priority_id,
        story_points: updates.story_points,
        planned_start_date: updates.planned_start_date,
        planned_end_date: updates.planned_end_date,
      });

      if (updates.destination === "scrum") {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        return;
      }

      const priority = priorities.find((p) => p.id === updates.priority_id);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? ({
                ...task,
                title: updates.title,
                subtitle: updates.subtitle,
                description: updates.description ?? null,
                assignee_id: updates.assignee_id,
                priority_id: updates.priority_id,
                priority_name: priority?.name,
                priority_color: priority?.color,
                story_points: updates.story_points,
                planned_start_date: updates.planned_start_date,
                planned_end_date: updates.planned_end_date,
              } as BacklogTaskWithDetails)
            : task
        )
      );
    } catch (error) {
      showError("backlog.saveTaskModal", error, "No se pudo guardar la tarea.");
      throw error;
    }
  };

  // Sprint handlers
  const handleCreateSprint = async (data: {
    name: string;
    goal: string;
    start_date: string;
    end_date: string | null;
  }) => {
    if (!canEditProject) {
      showNotification("info", "Solo puedes crear sprints en proyectos donde eres colaborador.");
      return;
    }
    try {
      await sprintManager.createSprint(data);
      setIsSprintModalOpen(false);
    } catch (error) {
      showError("backlog.createSprint", error, "No se pudo crear el sprint.");
      throw error;
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (destination.droppableId.startsWith("sprint-")) {
      if (!currentProject) return;
      if (!canEditProject) {
        showNotification("info", "Solo puedes planificar tareas en proyectos donde eres colaborador.");
        return;
      }

      const sprintId = destination.droppableId.replace("sprint-", "");
      const taskId = draggableId;
      const backlogTask = tasks.find((task) => task.id === taskId);
      const issueType = issueTypes.find((type) => type.id === backlogTask?.issue_type_id);

      if (isEpicIssueTypeName(issueType?.name)) {
        showNotification(
          "warning",
          "Las épicas no se asignan directamente a un sprint. Crea o asigna tareas dentro de la épica."
        );
        return;
      }

      if (!firstColumnId) {
        showNotification("error", "No se encontró una columna TO DO en el proyecto.");
        return;
      }

      try {
        await assignBacklogTaskToSprint(currentProject.id, taskId, sprintId, firstColumnId);

        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        await sprintManager.reload();
      } catch (error) {
        showError("backlog.assignTaskToSprint", error, "No se pudo asignar la tarea al sprint.");
      }
    }
  };

  // Filtering and sorting logic
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => !hiddenTasks.includes(task.id));

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(lower) ||
          task.task_id_display?.toLowerCase().includes(lower) ||
          task.epic_name?.toLowerCase().includes(lower)
      );
    }

    if (filters.projects.length > 0) {
      result = result.filter((task) =>
        task.project_id ? filters.projects.includes(task.project_id) : false
      );
    }

    if (filters.priorities.length > 0) {
      result = result.filter((task) =>
        task.priority_id ? filters.priorities.includes(task.priority_id) : false
      );
    }

    if (filters.hasEpic !== null) {
      result = result.filter((task) =>
        filters.hasEpic ? task.epic_id !== null : task.epic_id === null
      );
    }

    if (filters.hasGithubLink !== null) {
      result = result.filter((task) =>
        filters.hasGithubLink ? task.github_link !== null && task.github_link !== "" : task.github_link === null || task.github_link === ""
      );
    }

    result.sort((a, b) => {
      let compareResult = 0;

      switch (sortColumn) {
        case "title":
          compareResult = a.title.localeCompare(b.title);
          break;
        case "assignee":
          compareResult = (a.assignee_name || "").localeCompare(b.assignee_name || "");
          break;
        case "priority":
          compareResult = (a.priority_name || "").localeCompare(b.priority_name || "");
          break;
        case "story_points":
          compareResult = (a.story_points || "").localeCompare(b.story_points || "");
          break;
        case "epic":
          compareResult = (a.epic_name || "").localeCompare(b.epic_name || "");
          break;
        case "task_id":
          compareResult = (a.task_id_display || "").localeCompare(b.task_id_display || "");
          break;
        case "created_at":
          compareResult = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === "asc" ? compareResult : -compareResult;
    });

    return result;
  }, [tasks, hiddenTasks, searchText, filters, sortColumn, sortOrder]);

  const rows: GridRowsProp = filteredTasks.map((task) => ({
    id: task.id,
    title: task.title,
    assignee: task.assignee_name || "Sin asignar",
    assignee_id: task.assignee_id,
    priority: task.priority_name || "Sin prioridad",
    priority_id: task.priority_id,
    priority_color: task.priority_color,
    task_id: task.task_id_display || "-",
    story_points: task.story_points || "-",
    epic: task.epic_name || "Sin épica",
    epic_id: task.epic_id,
    github_link: task.github_link || "",
  }));

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.projects.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.hasEpic !== null) count++;
    if (filters.hasGithubLink !== null) count++;
    return count;
  }, [filters]);

  return {
    tasks,
    setTasks,
    projects,
    priorities,
    pointValues,
    isLoading,
    searchText,
    searchOpen,
    filters,
    sortColumn,
    sortOrder,
    hiddenTasks,
    rows,
    activeFiltersCount,
    filterAnchor,
    sortAnchor,
    hideAnchor,
    priorityMenuAnchor,
    effortMenuAnchor,
    epicMenuAnchor,
    assigneeMenuAnchor,
    editingTitle,
    editingPriority,
    editingEffort,
    editingEpic,
    editingAssignee,
    editingGithubLink,
    deleteDialogOpen,
    taskToDelete,
    isTaskModalOpen,
    selectedBacklogTask,
    taskEditorPresentation,
    issueTypes,
    catalogsLoaded,
    sprintManager,
    notification,
    isSprintModalOpen,
    setSearchText,
    setSearchOpen,
    setFilters,
    setSortColumn,
    setSortOrder,
    setHiddenTasks,
    setFilterAnchor,
    setSortAnchor,
    setHideAnchor,
    setPriorityMenuAnchor,
    setEffortMenuAnchor,
    setEpicMenuAnchor,
    setAssigneeMenuAnchor,
    setEditingTitle,
    setEditingPriority,
    setEditingEffort,
    setEditingEpic,
    setEditingAssignee,
    setEditingGithubLink,
    setDeleteDialogOpen,
    setTaskToDelete,
    setIsTaskModalOpen,
    setTaskEditorPresentation,
    setSelectedBacklogTask,
    setNotification,
    setIsSprintModalOpen,
    showError,
    handleAddTask,
    handleTitleChange,
    handlePriorityChange,
    handleEffortChange,
    handleEpicChange,
    handleAssigneeChange,
    handleGithubLinkChange,
    handleDeleteTask,
    confirmDeleteTask,
    handleSaveTaskFromModal,
    handleCreateSprint,
    handleDragEnd,
  };
};
