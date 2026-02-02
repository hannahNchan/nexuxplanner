import { supabase } from "../../lib/supabase";

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  project_key: string;
  task_sequence: number;
  epic_sequence: number;
  allow_board_task_creation: boolean;
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
  data: { 
    title: string; 
    description?: string; 
    tags?: string[];
    project_key: string;
  }
): Promise<ProjectWithTags> => {
  if (!data.project_key || data.project_key.trim().length === 0) {
    throw new Error("Las siglas del proyecto son obligatorias");
  }

  if (!/^[A-Z0-9]{2,10}$/.test(data.project_key)) {
    throw new Error("Las siglas deben tener entre 2 y 10 caracteres (solo mayúsculas y números)");
  }

  const { data: existingProject, error: checkError } = await supabase
    .from("projects")
    .select("id, project_key")
    .eq("project_key", data.project_key)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existingProject) {
    throw new Error(`Las siglas "${data.project_key}" ya están en uso por otro proyecto`);
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description || null,
      project_key: data.project_key.toUpperCase(),
      task_sequence: 0,
      epic_sequence: 0,
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

  let columnsExist = false;
  let attempts = 0;
  const maxAttempts = 5;

  while (!columnsExist && attempts < maxAttempts) {
    attempts++;
    
    const { data: columns, error } = await supabase
      .from("columns")
      .select("id")
      .eq("project_id", project.id);

    if (!error && columns && columns.length >= 4) {
      columnsExist = true;
      console.log(`✅ Columnas verificadas en intento ${attempts}`);
    } else {
      console.log(`⏳ Intento ${attempts}: Esperando columnas... (encontradas: ${columns?.length || 0})`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  if (!columnsExist) {
    console.error("⚠️ Advertencia: No se pudieron verificar las columnas, pero continuando...");
  }

  return {
    ...project,
    tags: data.tags || [],
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
  }
): Promise<void> => {
  console.log("🔧 updateProject called with:", { projectId, updates });
  
  if (updates.project_key !== undefined) {
    const { data: columns, error: columnsError } = await supabase
      .from("columns")
      .select("id")
      .eq("project_id", projectId);

    if (columnsError) throw columnsError;

    const columnIds = (columns ?? []).map((c) => c.id);

    let taskCount = 0;
    if (columnIds.length > 0) {
      const { count, error: taskCountError } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .in("column_id", columnIds);

      if (taskCountError) throw taskCountError;
      taskCount = count ?? 0;
    }

    const { count: epicCount, error: epicCountError } = await supabase
      .from("epics")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (epicCountError) throw epicCountError;

    if (taskCount > 0 || (epicCount ?? 0) > 0) {
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

  // ✅ CRÍTICO: Agregar allow_board_task_creation a la condición
  if (updates.title !== undefined || updates.description !== undefined || updates.project_key !== undefined || updates.allow_board_task_creation !== undefined) {
    console.log("🔧 Entrando al bloque de actualización");
    
    const updateData = {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.project_key !== undefined && { project_key: updates.project_key.toUpperCase() }),
      ...(updates.allow_board_task_creation !== undefined && { allow_board_task_creation: updates.allow_board_task_creation }),
      updated_at: new Date().toISOString(),
    };

    console.log("🔧 Datos a actualizar en BD:", updateData);

    const { error: projectError } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId);

    console.log("🔧 Error de Supabase:", projectError);

    if (projectError) throw projectError;
    
    console.log("🔧 ✅ Actualización exitosa en BD");
  } else {
    console.log("🔧 ⚠️ No se entró al bloque de actualización - ninguna condición cumplida");
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
      project.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      project.project_key.toLowerCase().includes(lowerQuery)
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