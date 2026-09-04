import { supabase } from "../../lib/supabase";

export type SprintReportType = "sprint_summary";

export type SprintReportTaskSnapshot = {
  id: string;
  title: string;
  task_id_display: string | null;
  story_points: string | null;
  story_points_number: number;
  assignee_id: string | null;
  epic_id: string | null;
  epic_name: string | null;
  epic_color: string | null;
  priority_id: string | null;
  priority_name: string | null;
  priority_color: string | null;
  column_id: string | null;
  column_name: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type SprintReportSnapshot = {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
  };
  totals_by_status: Record<string, { tasks: number; story_points: number }>;
  tasks: SprintReportTaskSnapshot[];
  dispositions: Array<Record<string, unknown>>;
};

export type SprintReport = {
  id: string;
  organization_id: string;
  project_id: string;
  sprint_id: string;
  report_type: SprintReportType;
  generated_by: string | null;
  sprint_name: string;
  sprint_goal: string | null;
  sprint_status: string;
  sprint_start_date: string | null;
  sprint_end_date: string | null;
  closed_at: string | null;
  total_tasks: number;
  completed_tasks: number;
  incomplete_tasks: number;
  total_story_points: number;
  completed_story_points: number;
  incomplete_story_points: number;
  completion_rate: number;
  story_point_completion_rate: number;
  snapshot: SprintReportSnapshot;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

const toNumber = (value: unknown): number =>
  typeof value === "number" ? value : Number(value ?? 0);

const mapSprintReport = (row: Record<string, unknown>): SprintReport => ({
  id: String(row.id),
  organization_id: String(row.organization_id),
  project_id: String(row.project_id),
  sprint_id: String(row.sprint_id),
  report_type: row.report_type as SprintReportType,
  generated_by: row.generated_by ? String(row.generated_by) : null,
  sprint_name: String(row.sprint_name),
  sprint_goal: row.sprint_goal ? String(row.sprint_goal) : null,
  sprint_status: String(row.sprint_status),
  sprint_start_date: row.sprint_start_date ? String(row.sprint_start_date) : null,
  sprint_end_date: row.sprint_end_date ? String(row.sprint_end_date) : null,
  closed_at: row.closed_at ? String(row.closed_at) : null,
  total_tasks: toNumber(row.total_tasks),
  completed_tasks: toNumber(row.completed_tasks),
  incomplete_tasks: toNumber(row.incomplete_tasks),
  total_story_points: toNumber(row.total_story_points),
  completed_story_points: toNumber(row.completed_story_points),
  incomplete_story_points: toNumber(row.incomplete_story_points),
  completion_rate: toNumber(row.completion_rate),
  story_point_completion_rate: toNumber(row.story_point_completion_rate),
  snapshot: row.snapshot as SprintReportSnapshot,
  generated_at: String(row.generated_at),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const fetchProjectSprintReports = async (projectId: string): Promise<SprintReport[]> => {
  const { data, error } = await supabase
    .from("sprint_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapSprintReport(row as Record<string, unknown>));
};

export const fetchSprintReport = async (
  projectId: string,
  sprintId: string
): Promise<SprintReport | null> => {
  const { data, error } = await supabase
    .from("sprint_reports")
    .select("*")
    .eq("project_id", projectId)
    .eq("sprint_id", sprintId)
    .eq("report_type", "sprint_summary")
    .maybeSingle();

  if (error) throw error;
  return data ? mapSprintReport(data as Record<string, unknown>) : null;
};
