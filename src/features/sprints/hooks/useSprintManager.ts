import { useState, useEffect } from "react";
import {
  fetchSprints,
  fetchActiveSprint,
  createSprint as createSprintApi,
  deleteSprint as deleteSprintApi,
  startSprint as startSprintApi,
  closeSprint as closeSprintApi,
  fetchSprintTasks,
} from "../../api/sprintService";
import type { Sprint } from "../types/sprint";

export const useSprintManager = (projectId: string | null) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintTasks, setSprintTasks] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now()); // ✅ NUEVO timestamp

  // Cargar sprints
  const loadSprints = async () => {
    if (!projectId) {
      setSprints([]);
      setActiveSprint(null);
      setSprintTasks([]);
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

      const targetSprint = active || allSprints.find((s) => s.status === "future");
      if (targetSprint) {
        const tasks = await fetchSprintTasks(targetSprint.id);
        setSprintTasks(tasks);
      } else {
        setSprintTasks([]);
      }

      setLastUpdate(Date.now()); // ✅ Actualizar timestamp
    } catch (err) {
      console.error("Error loading sprints:", err);
      setError("Error al cargar los sprints");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSprints();
  }, [projectId]);

  // Crear sprint
  const createSprint = async (data: {
    name: string;
    goal: string;
    start_date: string;
    end_date: string;
  }) => {
    if (!projectId) {
      throw new Error("No hay proyecto seleccionado");
    }

    const newSprint = await createSprintApi(projectId, data);
    setSprints((prev) => [newSprint, ...prev]);
    setLastUpdate(Date.now()); // ✅ Actualizar timestamp
    return newSprint;
  };

  // Iniciar sprint
  const startSprint = async (sprintId: string) => {
    const updated = await startSprintApi(sprintId);
    setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)));
    setActiveSprint(updated);
    setLastUpdate(Date.now()); // ✅ Actualizar timestamp
    return updated;
  };

  // Cerrar sprint
  const closeSprint = async (sprintId: string) => {
    const updated = await closeSprintApi(sprintId);
    setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)));
    setActiveSprint(null);
    setLastUpdate(Date.now()); // ✅ Actualizar timestamp
    return updated;
  };

  // Eliminar sprint
  const deleteSprint = async (sprintId: string) => {
    await deleteSprintApi(sprintId);
    setSprints((prev) => prev.filter((s) => s.id !== sprintId));
    setLastUpdate(Date.now()); // ✅ Actualizar timestamp
  };

  // Verificar si puede crear sprint
  const canCreateSprint = (taskCount: number) => {
    return taskCount > 0;
  };

  return {
    sprints,
    activeSprint,
    sprintTasks,
    isLoading,
    error,
    lastUpdate, // ✅ NUEVO: exportar timestamp
    createSprint,
    startSprint,
    closeSprint,
    deleteSprint,
    canCreateSprint,
    reload: loadSprints,
  };
};