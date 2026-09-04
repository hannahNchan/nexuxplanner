import { useState, useEffect, useRef } from "react";
import {
  createRoadmapTaskForEpic,
  fetchEpics,
  moveTaskToEpic,
  updateEpic,
  updateTaskPlannedDates,
  type EpicWithDetails,
  type RoadmapTask,
} from "../../../features/api/epicService";
import {
  createDependency,
  createTaskDependency,
  deleteDependency,
  deleteTaskDependency,
  fetchDependencies,
  fetchTaskDependencies,
  type EpicDependency,
  type TaskDependency,
} from "../../../features/api/dependencyService";
import {
  DEFAULT_ROADMAP_SETTINGS,
  fetchRoadmapSettings,
  upsertRoadmapSettings,
} from "../../../features/api/roadmapSettingsService";
import { logError } from "../../../shared/utils/errorHandling";

export const useRoadmap = (userId: string, projectId: string | null, canEditProject = true) => {
  const [epics, setEpics] = useState<EpicWithDetails[]>([]);
  const [dependencies, setDependencies] = useState<EpicDependency[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
  const [settings, setSettings] = useState(DEFAULT_ROADMAP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const loadRequestRef = useRef(0);

  const loadData = async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    if (!projectId) {
      setEpics([]);
      setDependencies([]);
      setTaskDependencies([]);
      setSettings(DEFAULT_ROADMAP_SETTINGS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [epicsData, roadmapSettings] = await Promise.all([
        fetchEpics(userId, projectId),
        fetchRoadmapSettings(userId, projectId),
      ]);

      if (loadRequestRef.current !== requestId) return;

      setEpics(epicsData);
      setSettings(roadmapSettings);

      const epicIds = epicsData.map(e => e.id);
      const taskIds = epicsData.flatMap((epic) => epic.connected_tasks?.map((task) => task.id) ?? []);

      try {
        const [depsData, taskDepsData] = await Promise.all([
          fetchDependencies(epicIds),
          fetchTaskDependencies(taskIds),
        ]);

        if (loadRequestRef.current !== requestId) return;

        setDependencies(depsData);
        setTaskDependencies(taskDepsData);
      } catch (dependencyError) {
        if (loadRequestRef.current !== requestId) return;

        logError("roadmap.loadDependencies", dependencyError);
        setDependencies([]);
        setTaskDependencies([]);
      }
    } catch (error) {
      if (loadRequestRef.current !== requestId) return;

      logError("roadmap.loadData", error);
      setEpics([]);
      setDependencies([]);
      setTaskDependencies([]);
      setSettings(DEFAULT_ROADMAP_SETTINGS);
    } finally {
      if (loadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId, projectId]);

  const updateEpicDates = async (epicId: string, startDate: string, endDate: string) => {
    if (!projectId) return;
    if (!canEditProject) return;

    setEpics((prevEpics) =>
      prevEpics.map((epic) =>
        epic.id === epicId
          ? { ...epic, start_date: startDate, end_date: endDate }
          : epic
      )
    );

    await updateEpic(projectId, epicId, { start_date: startDate, end_date: endDate });
  };

  const updateTaskDates = async (taskId: string, startDate: string, endDate: string) => {
    if (!projectId) return;
    if (!canEditProject) return;

    setEpics((prevEpics) =>
      prevEpics.map((epic) => ({
        ...epic,
        connected_tasks: epic.connected_tasks?.map((task) =>
          task.id === taskId
            ? { ...task, planned_start_date: startDate, planned_end_date: endDate }
            : task
        ),
      }))
    );

    await updateTaskPlannedDates(projectId, taskId, startDate, endDate);
  };

  const moveTaskBetweenEpics = async (taskId: string, targetEpicId: string) => {
    if (!projectId) return;
    if (!canEditProject) return;

    let taskToMove: RoadmapTask | null = null;

    setEpics((prevEpics) => {
      const withoutTask = prevEpics.map((epic) => {
        const task = epic.connected_tasks?.find((item) => item.id === taskId);
        if (task) {
          taskToMove = task as typeof taskToMove;
        }

        return {
          ...epic,
          connected_tasks: epic.connected_tasks?.filter((item) => item.id !== taskId) ?? [],
        };
      });

      if (!taskToMove) return prevEpics;

      return withoutTask.map((epic) =>
        epic.id === targetEpicId
          ? {
              ...epic,
              connected_tasks: [...(epic.connected_tasks ?? []), taskToMove!],
            }
          : epic
      );
    });

    await moveTaskToEpic(projectId, taskId, targetEpicId);
  };

  const createTaskUnderEpic = async (epicId: string, title: string) => {
    if (!projectId) return;
    if (!canEditProject) return;

    const createdTask = await createRoadmapTaskForEpic(projectId, epicId, title);

    setEpics((prevEpics) =>
      prevEpics.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              connected_tasks: [...(epic.connected_tasks ?? []), createdTask],
            }
          : epic
      )
    );
  };

  const addDependency = async (epicId: string, dependsOnEpicId: string, dependencyType: string = "finish-to-start") => {
    if (!canEditProject) return;
    const exists = dependencies.some(
      d => d.epic_id === epicId && d.depends_on_epic_id === dependsOnEpicId
    );
    
    if (exists) {
      return;
    }

    const newDep = await createDependency(epicId, dependsOnEpicId, dependencyType);
    setDependencies(prev => [...prev, newDep]);
  };

  const removeDependency = async (dependencyId: string) => {
    if (!projectId) return;
    if (!canEditProject) return;

    await deleteDependency(projectId, dependencyId);
    setDependencies(prev => prev.filter(d => d.id !== dependencyId));
  };

  const addTaskDependency = async (
    taskId: string,
    dependsOnTaskId: string,
    dependencyType: string = "finish-to-start"
  ) => {
    if (!canEditProject) return;
    const exists = taskDependencies.some(
      (dependency) =>
        dependency.task_id === taskId &&
        dependency.depends_on_task_id === dependsOnTaskId
    );

    if (exists) {
      return;
    }

    const newDependency = await createTaskDependency(taskId, dependsOnTaskId, dependencyType);
    setTaskDependencies((prev) => [...prev, newDependency]);
  };

  const removeTaskDependency = async (dependencyId: string) => {
    if (!projectId) return;
    if (!canEditProject) return;

    await deleteTaskDependency(projectId, dependencyId);
    setTaskDependencies((prev) => prev.filter((dependency) => dependency.id !== dependencyId));
  };

  const updateSettings = async (nextSettings: Partial<typeof DEFAULT_ROADMAP_SETTINGS>) => {
    const optimisticSettings = {
      ...settings,
      ...nextSettings,
    };

    setSettings(optimisticSettings);

    if (!projectId) return;
    if (!canEditProject) {
      setSettings(settings);
      return;
    }

    try {
      const savedSettings = await upsertRoadmapSettings(userId, projectId, optimisticSettings);
      setSettings(savedSettings);
    } catch (error) {
      logError("roadmap.updateSettings", error);
      setSettings(settings);
    }
  };

  return {
    epics,
    dependencies,
    taskDependencies,
    settings,
    loading,
    updateEpicDates,
    updateTaskDates,
    moveTaskBetweenEpics,
    createTaskUnderEpic,
    addDependency,
    removeDependency,
    addTaskDependency,
    removeTaskDependency,
    updateSettings,
    refetch: loadData,
  };
};
