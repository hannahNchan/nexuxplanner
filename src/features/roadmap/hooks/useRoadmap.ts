import { useState, useEffect } from "react";
import { fetchEpics, updateEpic, type EpicWithDetails } from "../../../features/api/epicService";
import { fetchDependencies, createDependency, deleteDependency, type EpicDependency } from "../../../features/api/dependencyService";

export const useRoadmap = (userId: string, projectId: string | null) => {
  const [epics, setEpics] = useState<EpicWithDetails[]>([]);
  const [dependencies, setDependencies] = useState<EpicDependency[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const epicsData = await fetchEpics(userId, projectId);
      setEpics(epicsData);

      const epicIds = epicsData.map(e => e.id);
      const depsData = await fetchDependencies(epicIds);
      setDependencies(depsData);
    } catch (error) {
      setEpics([]);
      setDependencies([]);
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

  return {
    epics,
    dependencies,
    loading,
    updateEpicDates,
    addDependency,
    removeDependency,
    refetch: loadData,
  };
};