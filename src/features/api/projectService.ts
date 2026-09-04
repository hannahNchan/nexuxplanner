import { supabase } from "../../lib/supabase";
import { logError } from "../../shared/utils/errorHandling";
import {
  addProjectMemberCommand,
  createProjectCommand,
  removeProjectMemberCommand,
} from "./workspaceCommandService";

export type Project = {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  project_key: string;
  task_sequence: number;
  epic_sequence: number;
  allow_board_task_creation: boolean;
  visibility: "organization" | "private";
  banner_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTag = {
  id: string;
  project_id: string;
  tag: string;
  created_at: string;
};

export type ProjectWithTags = Project & {
  tags: string[];
  current_user_project_role?: string | null;
  can_edit?: boolean;
};

export type ProjectMemberWithProfile = {
  id?: string;
  user_id: string;
  role?: string;
  created_at?: string;
  user_profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

export type CurrentUserOption = {
  id: string;
  email: string;
};

type CreateProjectRpcResult = Project & {
  tags?: string[];
};

export const fetchProjects = async (
  userId: string,
  organizationId?: string | null
): Promise<ProjectWithTags[]> => {
  void userId;

  let projectsQuery = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (organizationId) {
    projectsQuery = projectsQuery.eq("organization_id", organizationId);
  }

  const { data: projects, error: projectsError } = await projectsQuery;

  if (projectsError) throw projectsError;

  const projectIds = (projects ?? []).map((project) => project.id);

  if (projectIds.length === 0) {
    return [];
  }

  const { data: tags, error: tagsError } = await supabase
    .from("project_tags")
    .select("*")
    .in("project_id", projectIds);

  if (tagsError) throw tagsError;

  const tagsByProject = (tags ?? []).reduce<Record<string, string[]>>((acc, tag) => {
    if (!acc[tag.project_id]) {
      acc[tag.project_id] = [];
    }
    acc[tag.project_id].push(tag.tag);
    return acc;
  }, {});

  const { data: currentUserMemberships, error: currentUserMembershipsError } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("user_id", userId)
    .in("project_id", projectIds);

  if (currentUserMembershipsError) throw currentUserMembershipsError;

  const membershipByProject = new Map(
    (currentUserMemberships ?? []).map((membership) => [membership.project_id, membership.role])
  );

  return projects.map((project) => ({
    ...project,
    tags: tagsByProject[project.id] || [],
    current_user_project_role: membershipByProject.get(project.id) ?? null,
    can_edit: membershipByProject.has(project.id),
  }));
};

export const fetchProjectById = async (projectId: string): Promise<ProjectWithTags | null> => {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError) throw projectError;
  if (!project) return null;

  const { data: tags } = await supabase
    .from("project_tags")
    .select("tag")
    .eq("project_id", projectId);

  return {
    ...project,
    tags: (tags ?? []).map((t) => t.tag),
  };
};

export const createProject = async (
  userId: string,
  data: { 
    title: string; 
    description?: string; 
    tags?: string[];
    project_key: string;
    organization_id: string;
    visibility?: Project["visibility"];
  }
): Promise<ProjectWithTags> => {
  void userId;

  if (!data.project_key || data.project_key.trim().length === 0) {
    throw new Error("Las siglas del proyecto son obligatorias");
  }

  if (!/^[A-Z0-9]{2,10}$/.test(data.project_key)) {
    throw new Error("Las siglas deben tener entre 2 y 10 caracteres (solo mayúsculas y números)");
  }

  const project = await createProjectCommand({
    title: data.title,
    description: data.description || null,
    project_key: data.project_key.toUpperCase(),
    organization_id: data.organization_id,
    tags: data.tags || [],
    visibility: data.visibility ?? "organization",
  }) as CreateProjectRpcResult;

  return {
    ...project,
    tags: project.tags || [],
  };
};

export const updateProject = async (
  projectId: string,
  updates: { 
    title?: string; 
    description?: string; 
    tags?: string[];
    project_key?: string;
    allow_board_task_creation?: boolean;
    visibility?: Project["visibility"];
  }
): Promise<void> => {
  if (updates.project_key !== undefined) {
    const { count: taskCount, error: taskCountError } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (taskCountError) throw taskCountError;

    const { count: epicCount, error: epicCountError } = await supabase
      .from("epics")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (epicCountError) throw epicCountError;

    if ((taskCount ?? 0) > 0 || (epicCount ?? 0) > 0) {
      throw new Error("No se pueden cambiar las siglas de un proyecto que ya tiene tareas o épicas");
    }

    const { data: existingProject, error: checkError } = await supabase
      .from("projects")
      .select("id")
      .eq("project_key", updates.project_key)
      .neq("id", projectId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingProject) {
      throw new Error(`Las siglas "${updates.project_key}" ya están en uso por otro proyecto`);
    }
  }

  if (
    updates.title !== undefined ||
    updates.description !== undefined ||
    updates.project_key !== undefined ||
    updates.allow_board_task_creation !== undefined ||
    updates.visibility !== undefined
  ) {
    const updateData = {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.project_key !== undefined && { project_key: updates.project_key.toUpperCase() }),
      ...(updates.allow_board_task_creation !== undefined && { allow_board_task_creation: updates.allow_board_task_creation }),
      ...(updates.visibility !== undefined && { visibility: updates.visibility }),
      updated_at: new Date().toISOString(),
    };

    const { error: projectError } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId);

    if (projectError) throw projectError;
  }

  if (updates.tags !== undefined) {
    const { error: deleteError } = await supabase
      .from("project_tags")
      .delete()
      .eq("project_id", projectId);

    if (deleteError) throw deleteError;

    if (updates.tags.length > 0) {
      const tagRecords = updates.tags.map((tag) => ({
        project_id: projectId,
        tag,
      }));

      const { error: insertError } = await supabase
        .from("project_tags")
        .insert(tagRecords);

      if (insertError) throw insertError;
    }
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .select("id");

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("No se pudo eliminar el proyecto. Verifica que exista y que tengas permisos.");
  }
};

export const searchProjects = async (
  userId: string,
  query: string,
  organizationId?: string | null
): Promise<ProjectWithTags[]> => {
  const projects = await fetchProjects(userId, organizationId);

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

export const linkEpicToProject = async (
  epicId: string,
  projectId: string | null
): Promise<void> => {
  const { count: connectedTaskCount, error: taskCountError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("epic_id", epicId);

  if (taskCountError) throw taskCountError;

  if ((connectedTaskCount ?? 0) > 0) {
    throw new Error("No se puede mover una épica con tareas conectadas a otro proyecto.");
  }

  const { error } = await supabase
    .from("epics")
    .update({ project_id: projectId })
    .eq("id", epicId);

  if (error) throw error;
};

export const fetchProjectEpics = async (projectId: string) => {
  const { data, error } = await supabase
    .from("epics")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;
  return data ?? [];
};

export const isProjectEmpty = async (projectId: string): Promise<boolean> => {
  const { data: epics, error } = await supabase
    .from("epics")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  if (error) throw error;

  return !epics || epics.length === 0;
};

export const getProjectEpicsCount = async (projectId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("epics")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) throw error;
  return count || 0;
};

export const addProjectMember = async (
  projectId: string,
  userId: string,
  role = "member"
): Promise<void> => {
  await addProjectMemberCommand(projectId, userId, role);
};

export const fetchCurrentUserOption = async (
  fallbackUserId = ""
): Promise<CurrentUserOption | null> => {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  const userId = data.user?.id ?? fallbackUserId;

  if (!userId) return null;

  return {
    id: userId,
    email: data.user?.email ?? "Usuario",
  };
};

export const fetchCurrentUserMemberFallback = async (
  fallbackUserId = ""
): Promise<ProjectMemberWithProfile[]> => {
  const currentUser = await fetchCurrentUserOption(fallbackUserId);

  if (!currentUser) return [];

  return [
    {
      user_id: currentUser.id,
      user_profiles: {
        full_name: currentUser.email,
        avatar_url: null,
      },
    },
  ];
};

export const fetchProjectMembers = async (projectId: string): Promise<ProjectMemberWithProfile[]> => {
  const { data, error } = await supabase
    .from("project_members")
    .select(`
      id,
      user_id,
      role,
      created_at
    `)
    .eq("project_id", projectId);

  if (error) throw error;

  const { data: currentUser } = await supabase.auth.getUser();

  const membersWithProfiles = await Promise.all(
    (data || []).map(async (member) => {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("full_name, avatar_url")
        .eq("id", member.user_id)
        .maybeSingle();

      if (profileError) {
        logError("projects.loadMemberProfile", profileError);
      }

      const isCurrentUser = currentUser.user?.id === member.user_id;
      const fallbackName = isCurrentUser ? currentUser.user?.email ?? "Tú" : "Usuario sin perfil";

      return {
        ...member,
        user_profiles: profile || { full_name: fallbackName, avatar_url: null },
      };
    })
  );

  return membersWithProfiles;
};

export const removeProjectMember = async (projectId: string, memberId: string): Promise<void> => {
  await removeProjectMemberCommand(projectId, memberId);
};

export const fetchAllUsers = async () => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, avatar_url")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const uploadProjectBanner = async (projectId: string, file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${projectId}/banner.${fileExt}`;
  const filePath = `project-banners/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("project-assets")
    .getPublicUrl(filePath);

  await supabase
    .from("projects")
    .update({ 
      banner_url: data.publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);

  return data.publicUrl;
};

export const removeProjectBanner = async (projectId: string): Promise<void> => {
  const { data: project } = await supabase
    .from("projects")
    .select("banner_url")
    .eq("id", projectId)
    .single();

  if (project?.banner_url) {
    const url = new URL(project.banner_url);
    const pathParts = url.pathname.split('/');
    const bucket = pathParts[1];
    const filePath = pathParts.slice(2).join('/');

    await supabase.storage
      .from(bucket)
      .remove([filePath]);
  }

  await supabase
    .from("projects")
    .update({ 
      banner_url: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);
};
