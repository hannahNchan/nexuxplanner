import { supabase } from "../../lib/supabase";
import type { Task } from "../../shared/types/board";
import type { BacklogTask } from "./backlogService";
import type { Sprint } from "../sprints/types/sprint";

export type CreateTaskCommandInput = {
  project_id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  destination: "backlog" | "scrum";
  column_id?: string | null;
  sprint_id?: string | null;
  position?: number;
  issue_type_id?: string | null;
  priority_id?: string | null;
  story_points?: string | null;
  assignee_id?: string | null;
  epic_id?: string | null;
  github_link?: string | null;
};

export type AssignTaskCommandInput = {
  project_id: string;
  task_id: string;
  assignee_id: string | null;
};

export type MoveTaskColumnCommandInput = {
  project_id: string;
  task_id: string;
  column_id: string;
  position?: number | null;
};

export type CompleteSprintTaskDisposition = {
  taskId: string;
  destination: "backlog" | "sprint";
  sprintId?: string;
};

type CommandTaskRecord = BacklogTask & {
  column_id: string | null;
};

export const createTaskCommand = async (
  input: CreateTaskCommandInput
): Promise<CommandTaskRecord> => {
  const { data, error } = await supabase
    .rpc("create_task_command", {
      p_project_id: input.project_id,
      p_title: input.title,
      p_subtitle: input.subtitle ?? null,
      p_description: input.description ?? null,
      p_destination: input.destination,
      p_column_id: input.column_id ?? null,
      p_sprint_id: input.sprint_id ?? null,
      p_position: input.position ?? 0,
      p_issue_type_id: input.issue_type_id ?? null,
      p_priority_id: input.priority_id ?? null,
      p_story_points: input.story_points ?? null,
      p_assignee_id: input.assignee_id ?? null,
      p_epic_id: input.epic_id ?? null,
      p_github_link: input.github_link ?? null,
    })
    .single();

  if (error) throw error;
  return data as CommandTaskRecord;
};

export const assignTaskCommand = async (
  input: AssignTaskCommandInput
): Promise<Task> => {
  const { data, error } = await supabase
    .rpc("assign_task_command", {
      p_project_id: input.project_id,
      p_task_id: input.task_id,
      p_assignee_id: input.assignee_id,
    })
    .single();

  if (error) throw error;
  return data as Task;
};

export const moveTaskColumnCommand = async (
  input: MoveTaskColumnCommandInput
): Promise<Task> => {
  const { data, error } = await supabase
    .rpc("move_task_column_command", {
      p_project_id: input.project_id,
      p_task_id: input.task_id,
      p_column_id: input.column_id,
      p_position: input.position ?? null,
    })
    .single();

  if (error) throw error;
  return data as Task;
};

export const completeSprintCommand = async (
  projectId: string,
  sprintId: string,
  dispositions: CompleteSprintTaskDisposition[]
): Promise<Sprint> => {
  const { data, error } = await supabase
    .rpc("complete_sprint_command", {
      p_project_id: projectId,
      p_sprint_id: sprintId,
      p_dispositions: dispositions,
    })
    .single();

  if (error) throw error;
  return data as Sprint;
};
