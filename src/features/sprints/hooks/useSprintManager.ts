import { useState, useEffect } from "react";
import {
  fetchSprints,
  fetchActiveSprint,
  createSprint as createSprintApi,
  deleteSprint as deleteSprintApi,
  startSprint as startSprintApi,
  closeSprint as closeSprintApi,
  closeSprintWithTaskDisposition as closeSprintWithTaskDispositionApi,
  fetchSprintTasks,
  type SprintTaskDisposition,
} from "../../api/sprintService";
import { logError } from "../../../shared/utils/errorHandling";
import type { Sprint } from "../types/sprint";
import type { SprintTask } from "../components/SprintTasksTable";

const SPRINTS_CHANGED_EVENT = "nexus:sprints-changed";

const notifySprintsChanged = () => {
  window.dispatchEvent(new CustomEvent(SPRINTS_CHANGED_EVENT));
};

export const useSprintManager = (projectId: string | null) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>([]);
  const [sprintTasksById, setSprintTasksById] = useState<Record<string, SprintTask[]>>({});
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const loadSprints = async () => {
    if (!projectId) {
      setSprints([]);
      setActiveSprint(null);
      setSprintTasks([]);
      setSprintTasksById({});
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [allSprints, active] = await Promise.all([
        fetchSprints(projectId),
        fetchActiveSprint(projectId),
      ]);

      setSprints(allSprints);
      setActiveSprint(active);

      const taskEntries = await Promise.all(
        allSprints.map(async (sprint) => {
          const tasks = await fetchSprintTasks(projectId, sprint.id);
          return [sprint.id, tasks] as const;
        })
      );
      const tasksBySprint = Object.fromEntries(taskEntries);
      const targetSprint = active || allSprints.find((s) => s.status === "future");

      setSprintTasksById(tasksBySprint);
      setSprintTasks(targetSprint ? tasksBySprint[targetSprint.id] ?? [] : []);

      setLastUpdate(Date.now());
    } catch (err) {
      logError("sprints.load", err);
      setError("Error al cargar los sprints");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSprints();
  }, [projectId]);

  useEffect(() => {
    const handleSprintsChanged = () => {
      void loadSprints();
    };

    window.addEventListener(SPRINTS_CHANGED_EVENT, handleSprintsChanged);
    return () => window.removeEventListener(SPRINTS_CHANGED_EVENT, handleSprintsChanged);
  }, [projectId]);

  const createSprint = async (data: {
    name: string;
    goal: string;
    start_date: string;
    end_date: string | null;
  }) => {
    if (!projectId) {
      throw new Error("No hay proyecto seleccionado");
    }

    const newSprint = await createSprintApi(projectId, data);
    setSprints((prev) => [newSprint, ...prev]);
    setLastUpdate(Date.now());
    notifySprintsChanged();
    return newSprint;
  };

  const startSprint = async (sprintId: string) => {
    if (!projectId) {
      throw new Error("No hay proyecto seleccionado");
    }

    const updated = await startSprintApi(projectId, sprintId);
    setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)));
    setActiveSprint(updated);
    setLastUpdate(Date.now());
    notifySprintsChanged();
    return updated;
  };

  const closeSprint = async (sprintId: string) => {
    if (!projectId) {
      throw new Error("No hay proyecto seleccionado");
    }

    const updated = await closeSprintApi(projectId, sprintId);
    setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)));
    setActiveSprint(null);
    setLastUpdate(Date.now());
    notifySprintsChanged();
    return updated;
  };

  const closeSprintWithTaskDisposition = async (
    sprintId: string,
    dispositions: SprintTaskDisposition[]
  ) => {
    if (!projectId) {
      throw new Error("No hay proyecto seleccionado");
    }

    const updated = await closeSprintWithTaskDispositionApi(projectId, sprintId, dispositions);
    setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)));
    setActiveSprint(null);
    setLastUpdate(Date.now());
    notifySprintsChanged();
    return updated;
  };

  const deleteSprint = async (sprintId: string) => {
    if (!projectId) {
      throw new Error("No hay proyecto seleccionado");
    }

    await deleteSprintApi(projectId, sprintId);
    setSprints((prev) => prev.filter((s) => s.id !== sprintId));
    setLastUpdate(Date.now());
    notifySprintsChanged();
  };

  const canCreateSprint = (taskCount: number) => {
    return taskCount > 0;
  };

  return {
    sprints,
    activeSprint,
    sprintTasks,
    sprintTasksById,
    isLoading,
    error,
    lastUpdate,
    createSprint,
    startSprint,
    closeSprint,
    closeSprintWithTaskDisposition,
    deleteSprint,
    canCreateSprint,
    reload: loadSprints,
  };
};
