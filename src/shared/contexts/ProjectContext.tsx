import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ProjectWithTags } from "../../features/api/projectService";
import type { Organization } from "../../features/api/organizationService";

type ProjectContextType = {
  currentProject: ProjectWithTags | null;
  setCurrentProject: (project: ProjectWithTags | null) => void;
  updateCurrentProject: (updates: Partial<ProjectWithTags>) => void;
  organizations: Organization[];
  setOrganizations: (organizations: Organization[]) => void;
  activeOrganization: Organization | null;
  setActiveOrganization: (organization: Organization | null) => void;
  updateActiveOrganization: (updates: Partial<Organization>) => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [currentProject, setCurrentProject] = useState<ProjectWithTags | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null);

  const setActiveOrganization = useCallback((organization: Organization | null) => {
    setActiveOrganizationState(organization);
    setCurrentProject(null);

    if (organization) {
      localStorage.setItem("active-organization-id", organization.id);
    } else {
      localStorage.removeItem("active-organization-id");
    }
  }, []);

  const updateCurrentProject = useCallback((updates: Partial<ProjectWithTags>) => {
    setCurrentProject((project) => (project ? { ...project, ...updates } : project));
  }, []);

  const updateActiveOrganization = useCallback((updates: Partial<Organization>) => {
    setActiveOrganizationState((organization) => {
      if (!organization) return organization;

      const nextOrganization = {
        ...organization,
        ...updates,
      };

      setOrganizations((currentOrganizations) =>
        currentOrganizations.map((item) =>
          item.id === nextOrganization.id ? nextOrganization : item
        )
      );

      return nextOrganization;
    });
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        updateCurrentProject,
        organizations,
        setOrganizations,
        activeOrganization,
        setActiveOrganization,
        updateActiveOrganization,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
};
