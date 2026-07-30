import { supabase } from "../../lib/supabase";
import type {
  Organization,
  OrganizationMemberWithProfile,
} from "./organizationService";
import type {
  ProjectMemberWithProfile,
  ProjectWithTags,
} from "./projectService";

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type CreateProjectCommandInput = {
  title: string;
  description?: string | null;
  project_key: string;
  organization_id: string;
  tags?: string[];
  visibility?: ProjectWithTags["visibility"];
};

export const createOrganizationCommand = async (
  name: string,
  logoUrl?: string | null
): Promise<Organization> => {
  const { data, error } = await supabase
    .rpc("create_organization_command", {
      p_name: name,
      p_logo_url: logoUrl ?? null,
    })
    .single();

  if (error) throw error;
  return data as Organization;
};

export const createProjectCommand = async (
  input: CreateProjectCommandInput
): Promise<ProjectWithTags> => {
  const { data, error } = await supabase
    .rpc("create_project_command", {
      p_title: input.title,
      p_description: input.description ?? null,
      p_project_key: input.project_key,
      p_organization_id: input.organization_id,
      p_tags: input.tags ?? [],
      p_visibility: input.visibility ?? "organization",
    })
    .single();

  if (error) throw error;
  return data as ProjectWithTags;
};

export const createOrganizationInvitationCommand = async (
  organizationId: string,
  email: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("create_organization_invitation_command", {
    p_organization_id: organizationId,
    p_email: email,
  });

  if (error) throw error;
  return data as string;
};

export const createOrganizationInvitationForUserCommand = async (
  organizationId: string,
  inviteeId: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("create_organization_invitation_for_user_command", {
    p_organization_id: organizationId,
    p_invitee_id: inviteeId,
  });

  if (error) throw error;
  return data as string;
};

export const acceptOrganizationInvitationCommand = async (
  invitationId: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("accept_organization_invitation_command", {
    p_invitation_id: invitationId,
  });

  if (error) throw error;
  return data as string;
};

export const declineOrganizationInvitationCommand = async (
  invitationId: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("decline_organization_invitation_command", {
    p_invitation_id: invitationId,
  });

  if (error) throw error;
  return data as string;
};

export const updateOrganizationMemberRoleCommand = async (
  organizationId: string,
  memberId: string,
  role: OrganizationMemberWithProfile["role"]
): Promise<void> => {
  const { error } = await supabase
    .rpc("update_organization_member_role_command", {
      p_organization_id: organizationId,
      p_member_id: memberId,
      p_role: role,
    })
    .single();

  if (error) throw error;
};

export const removeOrganizationMemberCommand = async (
  organizationId: string,
  memberId: string
): Promise<void> => {
  const { error } = await supabase.rpc("remove_organization_member_command", {
    p_organization_id: organizationId,
    p_member_id: memberId,
  });

  if (error) throw error;
};

export const addProjectMemberCommand = async (
  projectId: string,
  userId: string,
  role = "member"
): Promise<ProjectMemberWithProfile> => {
  const { data, error } = await supabase
    .rpc("add_project_member_command", {
      p_project_id: projectId,
      p_user_id: userId,
      p_role: role,
    })
    .single();

  if (error) throw error;

  const member = data as ProjectMemberRow;
  return {
    id: member.id,
    user_id: member.user_id,
    role: member.role,
    created_at: member.created_at,
    user_profiles: {
      full_name: null,
      avatar_url: null,
    },
  };
};

export const removeProjectMemberCommand = async (
  projectId: string,
  memberId: string
): Promise<void> => {
  const { error } = await supabase.rpc("remove_project_member_command", {
    p_project_id: projectId,
    p_member_id: memberId,
  });

  if (error) throw error;
};

export const createProjectInvitationCommand = async (
  projectId: string,
  inviteeId: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("create_project_invitation_command", {
    p_project_id: projectId,
    p_invitee_id: inviteeId,
  });

  if (error) throw error;
  return data as string;
};

export const acceptProjectInvitationCommand = async (
  invitationId: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("accept_project_invitation_command", {
    p_invitation_id: invitationId,
  });

  if (error) throw error;
  return data as string;
};

export const declineProjectInvitationCommand = async (
  invitationId: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("decline_project_invitation_command", {
    p_invitation_id: invitationId,
  });

  if (error) throw error;
  return data as string;
};
