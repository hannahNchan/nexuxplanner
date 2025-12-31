import { useState, useEffect, useMemo } from "react";
import type { GridRowsProp } from "@mui/x-data-grid";
import {
  fetchBacklogTasks,
  createBacklogTask,
  updateBacklogTask,
  deleteBacklogTask,
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

type SortColumn = "title" | "assignee" | "priority" | "story_points" | "epic" | "task_id" | "created_at";
type SortOrder = "asc" | "desc";

export const useBacklogTable = (userId: string) => {
  const { currentProject } = useProject();
  
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
  const [selectedBacklogTask, setSelectedBacklogTask] = useState<{
    id: string;
    title: string;
    description?: string;
    column_id: string | null;
    issue_type_id?: string | null;
    priority_id?: string | null;
    story_points?: string | null;
    assignee_id?: string | null;
  } | null>(null);

  // Catalogs for modal
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [tasksData, projectsData, prioritiesData, pointSystem] = await Promise.all([
        fetchBacklogTasks(userId, currentProject?.id),
        fetchProjects(userId),
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
      console.error("Error loading backlog:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId, currentProject]);

  // Load catalogs for modal
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [types, pointSystem] = await Promise.all([
          fetchIssueTypes(),
          fetchDefaultPointSystem(),
        ]);

        setIssueTypes(types);

        if (pointSystem) {
          const points = await fetchPointValues(pointSystem.id);
          setPointValues(points);
        }

        setCatalogsLoaded(true);
      } catch (error) {
        console.error("Error cargando catálogos:", error);
      }
    };

    void loadCatalogs();
  }, []);

  // HANDLERS
  const handleAddTask = async () => {
    if (!currentProject) return;
    
    const newTask = await createBacklogTask(userId, currentProject.id, {
      title: "Nueva tarea",
    });
    
    setTasks((prev) => [newTask, ...prev]);
    
    // Abrir modal automáticamente
    setSelectedBacklogTask({
      id: newTask.id,
      title: newTask.title,
      description: newTask.description ?? undefined,
      column_id: null,
      issue_type_id: newTask.issue_type_id ?? null,
      priority_id: newTask.priority_id ?? null,
      story_points: newTask.story_points ?? null,
      assignee_id: newTask.assignee_id ?? null,
    });
    setIsTaskModalOpen(true);
  };

  const handleTitleChange = async (taskId: string, newTitle: string) => {
    await updateBacklogTask(taskId, { title: newTitle });
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, title: newTitle } : task
      )
    );
  };

  const handlePriorityChange = async (taskId: string, priorityId: string | null) => {
    const priority = priorities.find((p) => p.id === priorityId);
    await updateBacklogTask(taskId, { priority_id: priorityId });
    
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              priority_id: priorityId,
              priority_name: priority?.name,
              priority_color: priority?.color,
            }
          : task
      )
    );
  };

  const handleEffortChange = async (taskId: string, effort: string | null) => {
    await updateBacklogTask(taskId, { story_points: effort });
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, story_points: effort } : task
      )
    );
  };

  const handleEpicChange = async (taskId: string, epicId: string | null) => {
    await updateBacklogTask(taskId, { epic_id: epicId });
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, epic_id: epicId } : task
      )
    );
  };

  const handleAssigneeChange = async (taskId: string, assigneeId: string | null) => {
    await updateBacklogTask(taskId, { assignee_id: assigneeId });
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, assignee_id: assigneeId } : task
      )
    );
  };

  const handleGithubLinkChange = async (taskId: string, githubLink: string) => {
    await updateBacklogTask(taskId, { github_link: githubLink });
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, github_link: githubLink } : task
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    await deleteBacklogTask(taskToDelete);
    setTasks((prev) => prev.filter((task) => task.id !== taskToDelete));
    
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  // Guardar desde modal completo
  const handleSaveTaskFromModal = async (
    taskId: string,
    updates: {
      title: string;
      description: string;
      destination: "backlog" | "scrum";
      column_id: string | null;
      issue_type_id: string | null;
      priority_id: string | null;
      story_points: string | null;
      assignee_id: string | null;
    }
  ) => {
    // Si cambió a scrum, eliminar del backlog local
    if (updates.destination === "scrum") {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      
      // Actualizar en BD
      await updateBacklogTask(taskId, {
        title: updates.title,
        description: updates.description,
        assignee_id: updates.assignee_id,
        priority_id: updates.priority_id,
        story_points: updates.story_points,
      });
      
      return;
    }

    // Si sigue en backlog, actualizar
    await updateBacklogTask(taskId, {
      title: updates.title,
      description: updates.description,
      assignee_id: updates.assignee_id,
      priority_id: updates.priority_id,
      story_points: updates.story_points,
    });
    
    // Actualizar estado local
    const priority = priorities.find((p) => p.id === updates.priority_id);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title: updates.title,
              description: updates.description ?? null,
              assignee_id: updates.assignee_id,
              priority_id: updates.priority_id,
              priority_name: priority?.name,
              priority_color: priority?.color,
              story_points: updates.story_points,
            }
          : task
      )
    );
  };

  // Filtering and sorting logic
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => !hiddenTasks.includes(task.id));

    // Search
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(lower) ||
          task.task_id_display?.toLowerCase().includes(lower) ||
          task.epic_name?.toLowerCase().includes(lower)
      );
    }

    // Filters
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

    // Sort
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
    issueTypes,
    catalogsLoaded,
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
    setSelectedBacklogTask,
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
  };
};