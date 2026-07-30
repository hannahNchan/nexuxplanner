import { supabase } from "../../lib/supabase";
import {
  acceptOrganizationInvitationCommand,
  createOrganizationCommand,
  createOrganizationInvitationForUserCommand,
  createOrganizationInvitationCommand,
  declineOrganizationInvitationCommand,
  removeOrganizationMemberCommand,
  updateOrganizationMemberRoleCommand,
} from "./workspaceCommandService";

export type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  role?: "owner" | "admin" | "member";
};

export type OrganizationMemberWithProfile = {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
  user_profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

type OrganizationInvitationOrganization = {
  name: string;
  logo_url: string | null;
};

type OrganizationInvitationRow = {
  id: string;
  organization_id: string;
  inviter_id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  organizations?: OrganizationInvitationOrganization | OrganizationInvitationOrganization[] | null;
};

export type OrganizationInvitation = {
  id: string;
  organization_id: string;
  inviter_id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  organization_name: string;
  organization_logo_url: string | null;
};

type OrganizationMemberRow = {
  role: NonNullable<Organization["role"]>;
  organizations: Organization | Organization[] | null;
};

const normalizeOrganization = (
  organization:
    | OrganizationInvitationOrganization
    | OrganizationInvitationOrganization[]
    | null
    | undefined
) => (Array.isArray(organization) ? organization[0] ?? null : organization ?? null);

const toOrganizationInvitation = (
  row: OrganizationInvitationRow
): OrganizationInvitation => {
  const organization = normalizeOrganization(row.organizations);

  return {
    id: row.id,
    organization_id: row.organization_id,
    inviter_id: row.inviter_id,
    invitee_id: row.invitee_id,
    status: row.status,
    created_at: row.created_at,
    responded_at: row.responded_at,
    organization_name: organization?.name ?? "Organización",
    organization_logo_url: organization?.logo_url ?? null,
  };
};

export const fetchUserOrganizations = async (userId: string): Promise<Organization[]> => {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      organizations (
        id,
        name,
        logo_url,
        created_by,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as OrganizationMemberRow[]).reduce<Organization[]>(
    (acc, membership) => {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;

      if (!organization) return acc;

      acc.push({
        ...organization,
        role: membership.role,
      });

      return acc;
    },
    []
  );
};

export const createOrganization = async (
  _userId: string,
  name: string
): Promise<Organization> => {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("El nombre de la organización es obligatorio.");
  }

  return createOrganizationCommand(normalizedName);
};

export const updateOrganization = async (
  organizationId: string,
  updates: { name?: string; logo_url?: string | null }
): Promise<Organization> => {
  const updatePayload = {
    ...(updates.name !== undefined && { name: updates.name.trim() }),
    ...(updates.logo_url !== undefined && { logo_url: updates.logo_url }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("organizations")
    .update(updatePayload)
    .eq("id", organizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const uploadOrganizationLogo = async (
  organizationId: string,
  file: File
): Promise<string> => {
  const fileExt = file.name.split(".").pop() ?? "png";
  const filePath = `organization-logos/${organizationId}/logo.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("project-assets").getPublicUrl(filePath);
  await updateOrganization(organizationId, { logo_url: data.publicUrl });

  return data.publicUrl;
};

export const fetchOrganizationMembers = async (
  organizationId: string
): Promise<OrganizationMemberWithProfile[]> => {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const members = data ?? [];
  const userIds = members.map((member) => member.user_id);
  const { data: profiles, error: profileError } = userIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds)
    : { data: [], error: null };

  if (profileError) throw profileError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return members.map((member) => {
    const profile = profilesById.get(member.user_id);

    return {
      ...member,
      role: member.role as OrganizationMemberWithProfile["role"],
      user_profiles: {
        full_name: profile?.full_name ?? "Usuario sin perfil",
        avatar_url: profile?.avatar_url ?? null,
      },
    };
  });
};

export const updateOrganizationMemberRole = async (
  memberId: string,
  role: OrganizationMemberWithProfile["role"]
): Promise<void> => {
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("id", memberId)
    .single();

  if (error) throw error;

  await updateOrganizationMemberRoleCommand(member.organization_id, memberId, role);
};

export const removeOrganizationMember = async (memberId: string): Promise<void> => {
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("id", memberId)
    .single();

  if (error) throw error;

  await removeOrganizationMemberCommand(member.organization_id, memberId);
};

export const createOrganizationInvitation = async (
  organizationId: string,
  inviteeId: string
): Promise<void> => {
  await createOrganizationInvitationForUserCommand(organizationId, inviteeId);
};

export const createOrganizationInvitationByEmail = async (
  organizationId: string,
  email: string
): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("El correo es obligatorio.");
  }

  await createOrganizationInvitationCommand(organizationId, normalizedEmail);
};

export const fetchOrganizationPendingInvitations = async (
  organizationId: string
): Promise<OrganizationInvitation[]> => {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      `
      id,
      organization_id,
      inviter_id,
      invitee_id,
      status,
      created_at,
      responded_at,
      organizations:organization_id(name, logo_url)
    `
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as OrganizationInvitationRow[]).map(toOrganizationInvitation);
};

export const fetchPendingOrganizationInvitationsForUser = async (
  userId: string
): Promise<OrganizationInvitation[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      `
      id,
      organization_id,
      inviter_id,
      invitee_id,
      status,
      created_at,
      responded_at,
      organizations:organization_id(name, logo_url)
    `
    )
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as OrganizationInvitationRow[]).map(toOrganizationInvitation);
};

export const acceptOrganizationInvitation = async (
  invitationId: string
): Promise<string> => {
  return acceptOrganizationInvitationCommand(invitationId);
};

export const declineOrganizationInvitation = async (
  invitationId: string
): Promise<string> => {
  return declineOrganizationInvitationCommand(invitationId);
};
