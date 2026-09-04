import { supabase } from "../../lib/supabase";

export type AutomationActionType =
  | "notify_project_owners"
  | "notify_actor"
  | "enqueue_email"
  | "enqueue_webhook";

export type AutomationConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_empty"
  | "empty";

export type AutomationCondition = {
  type: "field";
  field: string;
  operator: AutomationConditionOperator;
  value?: string;
};

export type AutomationAction = {
  type: AutomationActionType;
  title?: string;
  message?: string;
};

export type AutomationRule = {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_event: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
};

export type AutomationRun = {
  id: string;
  rule_id: string;
  organization_id: string;
  project_id: string;
  activity_event_id: string | null;
  status: "pending" | "succeeded" | "failed" | "partial";
  event_type: string;
  actions_attempted: number;
  actions_succeeded: number;
  actions_failed: number;
  result: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AutomationRuleInput = {
  organization_id: string;
  project_id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  trigger_event: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

const normalizeRule = (rule: AutomationRule): AutomationRule => ({
  ...rule,
  conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
  actions: Array.isArray(rule.actions) ? rule.actions : [],
});

export const fetchAutomationRules = async (
  projectId: string
): Promise<AutomationRule[]> => {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as AutomationRule[]).map(normalizeRule);
};

export const fetchAutomationRuns = async (
  projectId: string,
  ruleId?: string | null
): Promise<AutomationRun[]> => {
  let query = supabase
    .from("automation_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (ruleId) {
    query = query.eq("rule_id", ruleId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AutomationRun[];
};

export const createAutomationRule = async (
  input: AutomationRuleInput
): Promise<AutomationRule> => {
  const { data, error } = await supabase
    .from("automation_rules")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeRule(data as AutomationRule);
};

export const updateAutomationRule = async (
  ruleId: string,
  input: Partial<AutomationRuleInput>
): Promise<AutomationRule> => {
  const { data, error } = await supabase
    .from("automation_rules")
    .update(input)
    .eq("id", ruleId)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeRule(data as AutomationRule);
};

export const deleteAutomationRule = async (ruleId: string): Promise<void> => {
  const { error } = await supabase.from("automation_rules").delete().eq("id", ruleId);
  if (error) throw error;
};
