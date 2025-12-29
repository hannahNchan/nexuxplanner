import { supabase } from "../../lib/supabase";

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
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
};

const createDefaultColumns = async (projectId: string): Promise<void> => {
  const defaultColumns = [
    { project_id: projectId, name: "Por hacer", position: 0 },
    { project_id: projectId, name: "En progreso", position: 1 },
    { project_id: projectId, name: "En revisión", position: 2 },
    { project_id: projectId, name: "Hecho", position: 3 },
  ];

  const { data: columns, error } = await supabase
    .from("columns")
    .insert(defaultColumns)
    .select("id, position");

  if (error) throw error;

  const columnIds = (columns ?? [])
    .sort((a, b) => a.position - b.position)
    .map((c) => c.id);

  await supabase
    .from("column_order")
    .upsert(
      {
        project_id: projectId,
        column_ids: columnIds,
      },
      {
        onConflict: "project_id",
      }
    );
};

export const fetchProjects = async (userId: string): Promise<ProjectWithTags[]> => {
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (projectsError) throw projectsError;

  if (!projects || projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((p) => p.id);

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

  return projects.map((project) => ({
    ...project,
    tags: tagsByProject[project.id] || [],
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
  data: { title: string; description?: string; tags?: string[] }
): Promise<ProjectWithTags> => {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description || null,
    })
    .select()
    .single();

  if (projectError) throw projectError;

  if (data.tags && data.tags.length > 0) {
    const tagRecords = data.tags.map((tag) => ({
      project_id: project.id,
      tag,
    }));

    const { error: tagsError } = await supabase
      .from("project_tags")
      .insert(tagRecords);

    if (tagsError) throw tagsError;
  }

  await createDefaultColumns(project.id);

  return {
    ...project,
    tags: data.tags || [],
  };
};

export const updateProject = async (
  projectId: string,
  updates: { title?: string; description?: string; tags?: string[] }
): Promise<void> => {
  if (updates.title !== undefined || updates.description !== undefined) {
    const { error: projectError } = await supabase
      .from("projects")
      .update({
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        updated_at: new Date().toISOString(),
      })
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
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
};

export const searchProjects = async (userId: string, query: string): Promise<ProjectWithTags[]> => {
  const projects = await fetchProjects(userId);

  if (!query.trim()) return projects;

  const lowerQuery = query.toLowerCase();
  return projects.filter(
    (project) =>
      project.title.toLowerCase().includes(lowerQuery) ||
      project.description?.toLowerCase().includes(lowerQuery) ||
      project.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
};

export const linkEpicToProject = async (
  epicId: string,
  projectId: string | null
): Promise<void> => {
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