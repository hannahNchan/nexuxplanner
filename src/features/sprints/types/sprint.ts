export type SprintStatus = 'future' | 'active' | 'closed';

export type Sprint = {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SprintWithStats = Sprint & {
  total_tasks: number;
  completed_tasks: number;
  total_story_points: number;
  completed_story_points: number;
};

export type CreateSprintData = {
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
};