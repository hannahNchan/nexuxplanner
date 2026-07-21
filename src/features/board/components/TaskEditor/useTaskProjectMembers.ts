import { useEffect, useState } from "react";
import {
  fetchCurrentUserMemberFallback,
  fetchProjectMembers,
  type ProjectMemberWithProfile,
} from "../../../api/projectService";
import { fetchColumnProjectId } from "../../../api/boardService";
import { logError } from "../../../../shared/utils/errorHandling";

type TaskMemberSource = {
  project_id?: string | null;
  column_id: string | null;
} | null;

export const useTaskProjectMembers = (
  open: boolean,
  task: TaskMemberSource,
  columns: Array<{ id: string; title: string }>,
  currentUserId: string
) => {
  const [projectMembers, setProjectMembers] = useState<ProjectMemberWithProfile[]>([]);

  useEffect(() => {
    const loadProjectMembers = async () => {
      if (!open || !task) return;

      let projectId = task.project_id || null;
      const columnId = task.column_id || columns[0]?.id;

      if (!projectId && columnId) {
        projectId = await fetchColumnProjectId(columnId);
      }

      try {
        if (projectId) {
          setProjectMembers(await fetchProjectMembers(projectId));
        } else {
          setProjectMembers(await fetchCurrentUserMemberFallback(currentUserId));
        }
      } catch (error) {
        logError("taskEditor.loadMembers", error);
        setProjectMembers(await fetchCurrentUserMemberFallback(currentUserId));
      }
    };

    void loadProjectMembers();
  }, [open, task, columns, currentUserId]);

  return projectMembers;
};
