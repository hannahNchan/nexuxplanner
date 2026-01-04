import { useState, useEffect, useCallback } from "react";
import {
  fetchIssueTypes,
  fetchPriorities,
  fetchEpicPhases,
  fetchDefaultPointSystem,
  fetchPointValues,
  createIssueType,
  updateIssueType,
  deleteIssueType,
  reorderIssueTypes,
  createPriority,
  updatePriority,
  deletePriority,
  reorderPriorities,
  createEpicPhase,
  updateEpicPhase,
  deleteEpicPhase,
  reorderEpicPhases,
  createPointValue,
  updatePointValue,
  deletePointValue,
  reorderPointValues,
  type IssueType,
  type Priority,
  type EpicPhase,
  type PointValue,
} from "../../api/catalogService";

export const useProjectCatalogs = () => {
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [epicPhases, setEpicPhases] = useState<EpicPhase[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [pointSystemId, setPointSystemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCatalogs = useCallback(async () => {
    try {
      setLoading(true);
      const [types, prioritiesList, phases, pointSystem] = await Promise.all([
        fetchIssueTypes(),
        fetchPriorities(),
        fetchEpicPhases(),
        fetchDefaultPointSystem(),
      ]);

      setIssueTypes(types);
      setPriorities(prioritiesList);
      setEpicPhases(phases);

      if (pointSystem) {
        setPointSystemId(pointSystem.id);
        const points = await fetchPointValues(pointSystem.id);
        setPointValues(points);
      }
    } catch (error) {
      console.error("Error loading catalogs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  const addIssueType = async (name: string, icon: string | null, color: string | null) => {
    const position = issueTypes.length;
    const newType = await createIssueType(name, icon, color, position);
    setIssueTypes([...issueTypes, newType]);
  };

  const editIssueType = async (
    id: string,
    updates: { name?: string; icon?: string | null; color?: string | null }
  ) => {
    const updated = await updateIssueType(id, updates);
    setIssueTypes(issueTypes.map((t) => (t.id === id ? updated : t)));
  };

  const removeIssueType = async (id: string) => {
    await deleteIssueType(id);
    setIssueTypes(issueTypes.filter((t) => t.id !== id));
  };

  const reorderIssueTypesList = async (reorderedTypes: IssueType[]) => {
    const updates = reorderedTypes.map((type, index) => ({
      id: type.id,
      position: index,
    }));
    await reorderIssueTypes(updates);
    setIssueTypes(reorderedTypes);
  };

  const addPriority = async (name: string, level: number, color: string | null) => {
    const position = priorities.length;
    const newPriority = await createPriority(name, level, color, position);
    setPriorities([...priorities, newPriority]);
  };

  const editPriority = async (
    id: string,
    updates: { name?: string; level?: number; color?: string | null }
  ) => {
    const updated = await updatePriority(id, updates);
    setPriorities(priorities.map((p) => (p.id === id ? updated : p)));
  };

  const removePriority = async (id: string) => {
    await deletePriority(id);
    setPriorities(priorities.filter((p) => p.id !== id));
  };

  const reorderPrioritiesList = async (reorderedPriorities: Priority[]) => {
    const updates = reorderedPriorities.map((priority, index) => ({
      id: priority.id,
      position: index,
    }));
    await reorderPriorities(updates);
    setPriorities(reorderedPriorities);
  };

  const addEpicPhase = async (name: string, color: string | null) => {
    const position = epicPhases.length;
    const newPhase = await createEpicPhase(name, color, position);
    setEpicPhases([...epicPhases, newPhase]);
  };

  const editEpicPhase = async (id: string, updates: { name?: string; color?: string | null }) => {
    const updated = await updateEpicPhase(id, updates);
    setEpicPhases(epicPhases.map((p) => (p.id === id ? updated : p)));
  };

  const removeEpicPhase = async (id: string) => {
    await deleteEpicPhase(id);
    setEpicPhases(epicPhases.filter((p) => p.id !== id));
  };

  const reorderEpicPhasesList = async (reorderedPhases: EpicPhase[]) => {
    const updates = reorderedPhases.map((phase, index) => ({
      id: phase.id,
      position: index,
    }));
    await reorderEpicPhases(updates);
    setEpicPhases(reorderedPhases);
  };

  const addPointValue = async (value: string, numericValue: number | null) => {
    if (!pointSystemId) return;
    const position = pointValues.length;
    const newPoint = await createPointValue(pointSystemId, value, numericValue, position);
    setPointValues([...pointValues, newPoint]);
  };

  const editPointValue = async (
    id: string,
    updates: { value?: string; numeric_value?: number | null }
  ) => {
    const updated = await updatePointValue(id, updates);
    setPointValues(pointValues.map((p) => (p.id === id ? updated : p)));
  };

  const removePointValue = async (id: string) => {
    await deletePointValue(id);
    setPointValues(pointValues.filter((p) => p.id !== id));
  };

  const reorderPointValuesList = async (reorderedPoints: PointValue[]) => {
    const updates = reorderedPoints.map((point, index) => ({
      id: point.id,
      position: index,
    }));
    await reorderPointValues(updates);
    setPointValues(reorderedPoints);
  };

  return {
    loading,
    issueTypes,
    priorities,
    epicPhases,
    pointValues,
    addIssueType,
    editIssueType,
    removeIssueType,
    reorderIssueTypesList,
    addPriority,
    editPriority,
    removePriority,
    reorderPrioritiesList,
    addEpicPhase,
    editEpicPhase,
    removeEpicPhase,
    reorderEpicPhasesList,
    addPointValue,
    editPointValue,
    removePointValue,
    reorderPointValuesList,
    refetch: loadCatalogs,
  };
};