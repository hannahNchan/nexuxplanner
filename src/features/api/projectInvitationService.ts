import { supabase } from "../../lib/supabase";

type ProjectInvitationProject = {
  title: string;
  project_key: string;
};

type ProjectInvitationRow = {
  id: string;
  project_id: string;
  inviter_id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  projects?: ProjectInvitationProject | ProjectInvitationProject[] | null;
};

export type ProjectInvitation = {
  id: string;
  project_id: string;
  inviter_id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  project_title: string;
  project_key: string;
};

const normalizeProject = (
  project: ProjectInvitationProject | ProjectInvitationProject[] | null | undefined
) => (Array.isArray(project) ? project[0] ?? null : project ?? null);

const toProjectInvitation = (row: ProjectInvitationRow): ProjectInvitation => {
  const project = normalizeProject(row.projects);

  return {
    id: row.id,
    project_id: row.project_id,
    inviter_id: row.inviter_id,
    invitee_id: row.invitee_id,
    status: row.status,
    created_at: row.created_at,
    responded_at: row.responded_at,
    project_title: project?.title ?? "Proyecto",
    project_key: project?.project_key ?? "",
  };
};

export const createProjectInvitation = async (
  projectId: string,
  inviteeId: string
): Promise<void> => {
  const { data: currentUser, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const inviterId = currentUser.user?.id;
  if (!inviterId) {
    throw new Error("No hay sesión activa.");
  }

  const { error } = await supabase
    .from("project_invitations")
    .insert({
      project_id: projectId,
      inviter_id: inviterId,
      invitee_id: inviteeId,
    });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Este usuario ya tiene una invitación pendiente.");
    }
    if (error.code === "23514") {
      throw new Error("No puedes invitarte a ti misma al proyecto.");
    }
    throw error;
  }
};

export const fetchProjectPendingInvitations = async (
  projectId: string
): Promise<ProjectInvitation[]> => {
  const { data, error } = await supabase
    .from("project_invitations")
    .select(`
      id,
      project_id,
      inviter_id,
      invitee_id,
      status,
      created_at,
      responded_at,
      projects:project_id(title, project_key)
    `)
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProjectInvitationRow[]).map(toProjectInvitation);
};

export const fetchPendingInvitationsForUser = async (
  userId: string
): Promise<ProjectInvitation[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("project_invitations")
    .select(`
      id,
      project_id,
      inviter_id,
      invitee_id,
      status,
      created_at,
      responded_at,
      projects:project_id(title, project_key)
    `)
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProjectInvitationRow[]).map(toProjectInvitation);
};

export const acceptProjectInvitation = async (invitationId: string): Promise<string> => {
  const { data, error } = await supabase.rpc("accept_project_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) throw error;
  return data as string;
};

export const declineProjectInvitation = async (invitationId: string): Promise<string> => {
  const { data, error } = await supabase.rpc("decline_project_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) throw error;
  return data as string;
};

export const subscribeToPendingInvitations = (
  userId: string,
  onChange: () => void
) =>
  supabase
    .channel(`project-invitations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_invitations",
        filter: `invitee_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe();
