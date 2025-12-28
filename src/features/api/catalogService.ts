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

/**
 * Obtiene todos los tipos de issue
 */
export const fetchIssueTypes = async (): Promise<IssueType[]> => {
  const { data, error } = await supabase
    .from("issue_types")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/**
 * Obtiene todas las prioridades
 */
export const fetchPriorities = async (): Promise<Priority[]> => {
  const { data, error } = await supabase
    .from("priorities")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/**
 * Obtiene el sistema de puntos por defecto
 */
export const fetchDefaultPointSystem = async (): Promise<PointSystem | null> => {
  const { data, error } = await supabase
    .from("point_systems")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Obtiene los valores de puntos para un sistema específico
 */
export const fetchPointValues = async (systemId: string): Promise<PointValue[]> => {
  const { data, error } = await supabase
    .from("point_values")
    .select("*")
    .eq("system_id", systemId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
};