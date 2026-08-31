export type Task = {
  id: string;
  title: string;
  task_id_display?: string;
  subtitle?: string;
  description?: string;
  column_id?: string | null;
  issue_type_id?: string;
  priority_id?: string;
  story_points?: string;
  assignee_id?: string;
  epic_id?: string;
  epic_name?: string;
  epic_color?: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Column = {
  id: string;
  title: string;
  taskIds: string[];
};

export type BoardState = {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
};
