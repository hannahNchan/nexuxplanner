import { createContext, useContext, useState, type ReactNode } from "react";
import type { ProjectWithTags } from "../../features/api/projectService";

type ProjectContextType = {
  currentProject: ProjectWithTags | null;
  setCurrentProject: (project: ProjectWithTags | null) => void;
  updateCurrentProject: (updates: Partial<ProjectWithTags>) => void; // ✅ NUEVO
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [currentProject, setCurrentProject] = useState<ProjectWithTags | null>(null);

  const updateCurrentProject = (updates: Partial<ProjectWithTags>) => {
    if (currentProject) {
      setCurrentProject({
        ...currentProject,
        ...updates,
      });
    }
  };

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject, updateCurrentProject }}>
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