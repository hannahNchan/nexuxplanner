export type Task = {
  id: string;
  title: string;
  description?: string;
  issue_type_id?: string;
  priority_id?: string;
  story_points?: string;
  assignee_id?: string;
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