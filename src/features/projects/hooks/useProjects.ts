import { useState, useEffect } from "react";
import type { ProjectWithTags } from "../../api/projectService";
import * as projectService from "../../api/projectService";
import { logError } from "../../../shared/utils/errorHandling";

export const useProjects = (userId: string, organizationId?: string | null) => {
  const [projects, setProjects] = useState<ProjectWithTags[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const projectsData = await projectService.fetchProjects(userId, organizationId);
      setProjects(projectsData);

      if (!currentProject && projectsData.length > 0) {
        setCurrentProject(projectsData[0]);
      } else if (currentProject && organizationId && currentProject.organization_id !== organizationId) {
        setCurrentProject(projectsData[0] ?? null);
      }
    } catch (err) {
      logError("projects.fetch", err);
      setError("No se pudieron cargar los proyectos");
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (
    projectId: string,
    updates: { 
      title?: string; 
      description?: string; 
      tags?: string[];
      project_key?: string;
      allow_board_task_creation?: boolean;
      visibility?: ProjectWithTags["visibility"];
    }
  ) => {
    try {
      await projectService.updateProject(projectId, updates);
      await fetchProjects();
    } catch (err) {
      logError("projects.update", err);
      throw err;
    }
  };

  const createProject = async (
    title: string, 
    description: string, 
    tags: string[],
    projectKey: string,
    targetOrganizationId: string,
    visibility: ProjectWithTags["visibility"] = "organization"
  ) => {
    try {
      const newProject = await projectService.createProject(userId, {
        title,
        description,
        tags,
        project_key: projectKey,
        organization_id: targetOrganizationId,
        visibility,
      });
      await fetchProjects();
      setCurrentProject(newProject);
      return newProject;
    } catch (err) {
      logError("projects.create", err);
      throw err;
    }
  };

  const searchProjects = (query: string): ProjectWithTags[] => {
    if (!query.trim()) return projects;

    const lowerQuery = query.toLowerCase();
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(lowerQuery) ||
        project.description?.toLowerCase().includes(lowerQuery) ||
        project.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        project.project_key.toLowerCase().includes(lowerQuery)
    );
  };

  useEffect(() => {
    void fetchProjects();
  }, [userId, organizationId]);

  return {
    projects,
    currentProject,
    setCurrentProject,
    loading,
    error,
    createProject,
    updateProject,
    searchProjects,
    refetch: fetchProjects,
  };
};
