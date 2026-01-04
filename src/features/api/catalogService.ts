import { supabase } from "../../lib/supabase";

export type IssueType = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
};

export type Priority = {
  id: string;
  name: string;
  level: number;
  color: string | null;
  position: number;
};

export type EpicPhase = {
  id: string;
  name: string;
  color: string | null;
  position: number;
};

export type PointSystem = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
};

export type PointValue = {
  id: string;
  system_id: string;
  value: string;
  numeric_value: number | null;
  position: number;
};

export const fetchIssueTypes = async (): Promise<IssueType[]> => {
  const { data, error } = await supabase
    .from("issue_types")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const createIssueType = async (
  name: string,
  icon: string | null,
  color: string | null,
  position: number
): Promise<IssueType> => {
  const { data, error } = await supabase
    .from("issue_types")
    .insert({ name, icon, color, position })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateIssueType = async (
  id: string,
  updates: {
    name?: string;
    icon?: string | null;
    color?: string | null;
    position?: number;
  }
): Promise<IssueType> => {
  const { data, error } = await supabase
    .from("issue_types")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteIssueType = async (id: string): Promise<void> => {
  const { error } = await supabase.from("issue_types").delete().eq("id", id);
  if (error) throw error;
};

export const reorderIssueTypes = async (
  items: Array<{ id: string; position: number }>
): Promise<void> => {
  const updates = items.map((item) =>
    supabase.from("issue_types").update({ position: item.position }).eq("id", item.id)
  );

  await Promise.all(updates);
};

export const fetchPriorities = async (): Promise<Priority[]> => {
  const { data, error } = await supabase
    .from("priorities")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const createPriority = async (
  name: string,
  level: number,
  color: string | null,
  position: number
): Promise<Priority> => {
  const { data, error } = await supabase
    .from("priorities")
    .insert({ name, level, color, position })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePriority = async (
  id: string,
  updates: {
    name?: string;
    level?: number;
    color?: string | null;
    position?: number;
  }
): Promise<Priority> => {
  const { data, error } = await supabase
    .from("priorities")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePriority = async (id: string): Promise<void> => {
  const { error } = await supabase.from("priorities").delete().eq("id", id);
  if (error) throw error;
};

export const reorderPriorities = async (
  items: Array<{ id: string; position: number }>
): Promise<void> => {
  const updates = items.map((item) =>
    supabase.from("priorities").update({ position: item.position }).eq("id", item.id)
  );

  await Promise.all(updates);
};

export const fetchEpicPhases = async (): Promise<EpicPhase[]> => {
  const { data, error } = await supabase
    .from("epic_phases")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const createEpicPhase = async (
  name: string,
  color: string | null,
  position: number
): Promise<EpicPhase> => {
  const { data, error } = await supabase
    .from("epic_phases")
    .insert({ name, color, position })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEpicPhase = async (
  id: string,
  updates: {
    name?: string;
    color?: string | null;
    position?: number;
  }
): Promise<EpicPhase> => {
  const { data, error } = await supabase
    .from("epic_phases")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEpicPhase = async (id: string): Promise<void> => {
  const { error } = await supabase.from("epic_phases").delete().eq("id", id);
  if (error) throw error;
};

export const reorderEpicPhases = async (
  items: Array<{ id: string; position: number }>
): Promise<void> => {
  const updates = items.map((item) =>
    supabase.from("epic_phases").update({ position: item.position }).eq("id", item.id)
  );

  await Promise.all(updates);
};

export const fetchDefaultPointSystem = async (): Promise<PointSystem | null> => {
  const { data, error } = await supabase
    .from("point_systems")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const fetchPointValues = async (systemId: string): Promise<PointValue[]> => {
  const { data, error } = await supabase
    .from("point_values")
    .select("*")
    .eq("system_id", systemId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const createPointValue = async (
  systemId: string,
  value: string,
  numericValue: number | null,
  position: number
): Promise<PointValue> => {
  const { data, error } = await supabase
    .from("point_values")
    .insert({
      system_id: systemId,
      value,
      numeric_value: numericValue,
      position,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePointValue = async (
  id: string,
  updates: {
    value?: string;
    numeric_value?: number | null;
    position?: number;
  }
): Promise<PointValue> => {
  const { data, error } = await supabase
    .from("point_values")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePointValue = async (id: string): Promise<void> => {
  const { error } = await supabase.from("point_values").delete().eq("id", id);
  if (error) throw error;
};

export const reorderPointValues = async (
  items: Array<{ id: string; position: number }>
): Promise<void> => {
  const updates = items.map((item) =>
    supabase.from("point_values").update({ position: item.position }).eq("id", item.id)
  );

  await Promise.all(updates);
};