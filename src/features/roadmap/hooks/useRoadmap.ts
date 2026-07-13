import { useState, useEffect } from "react";
import {
  createRoadmapTaskForEpic,
  fetchEpics,
  moveTaskToEpic,
  updateEpic,
  updateTaskPlannedDates,
  type EpicWithDetails,
  type RoadmapTask,
} from "../../../features/api/epicService";
import { fetchDependencies, createDependency, deleteDependency, type EpicDependency } from "../../../features/api/dependencyService";
import {
  DEFAULT_ROADMAP_SETTINGS,
  fetchRoadmapSettings,
  upsertRoadmapSettings,
} from "../../../features/api/roadmapSettingsService";

export const useRoadmap = (userId: string, projectId: string | null) => {
  const [epics, setEpics] = useState<EpicWithDetails[]>([]);
  const [dependencies, setDependencies] = useState<EpicDependency[]>([]);
  const [settings, setSettings] = useState(DEFAULT_ROADMAP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [epicsData, roadmapSettings] = await Promise.all([
        fetchEpics(userId, projectId),
        fetchRoadmapSettings(userId, projectId),
      ]);

      setEpics(epicsData);
      setSettings(roadmapSettings);

      const epicIds = epicsData.map(e => e.id);
      const depsData = await fetchDependencies(epicIds);
      setDependencies(depsData);
    } catch (error) {
      setEpics([]);
      setDependencies([]);
      setSettings(DEFAULT_ROADMAP_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId, projectId]);

  const updateEpicDates = async (epicId: string, startDate: string, endDate: string) => {
    setEpics((prevEpics) =>
      prevEpics.map((epic) =>
        epic.id === epicId
          ? { ...epic, start_date: startDate, end_date: endDate }
          : epic
      )
    );

    await updateEpic(epicId, { start_date: startDate, end_date: endDate });
  };

  const updateTaskDates = async (taskId: string, startDate: string, endDate: string) => {
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

    await updateTaskPlannedDates(taskId, startDate, endDate);
  };

  const moveTaskBetweenEpics = async (taskId: string, targetEpicId: string) => {
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

    await moveTaskToEpic(taskId, targetEpicId);
  };

  const createTaskUnderEpic = async (epicId: string, title: string) => {
    if (!projectId) return;

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
    const exists = dependencies.some(
      d => d.epic_id === epicId && d.depends_on_epic_id === dependsOnEpicId
    );
    
    if (exists) {
      return;
    }

    try {
      const newDep = await createDependency(epicId, dependsOnEpicId, dependencyType);
      setDependencies(prev => [...prev, newDep]);
    } catch (error) {
      console.error("Error creating dependency:", error);
    }
  };

  const removeDependency = async (dependencyId: string) => {
    await deleteDependency(dependencyId);
    setDependencies(prev => prev.filter(d => d.id !== dependencyId));
  };

  const updateSettings = async (nextSettings: Partial<typeof DEFAULT_ROADMAP_SETTINGS>) => {
    const optimisticSettings = {
      ...settings,
      ...nextSettings,
    };

    setSettings(optimisticSettings);

    if (!projectId) return;

    try {
      const savedSettings = await upsertRoadmapSettings(userId, projectId, optimisticSettings);
      setSettings(savedSettings);
    } catch (error) {
      console.error("Error updating roadmap settings:", error);
      setSettings(settings);
    }
  };

  return {
    epics,
    dependencies,
    settings,
    loading,
    updateEpicDates,
    updateTaskDates,
    moveTaskBetweenEpics,
    createTaskUnderEpic,
    addDependency,
    removeDependency,
    updateSettings,
    refetch: loadData,
  };
};
