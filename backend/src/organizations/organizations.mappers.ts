import * as ROLES from '../common/roles';

// Representaciones públicas de organizaciones, miembros e invitaciones,
// compartidas por el ámbito empresa (tenant) y el de plataforma (super admin).

export function membershipRole(membership: {
  isOwner: boolean;
  role: { baseRole: string | null };
}): string {
  return ROLES.effectiveRole(membership.role.baseRole, membership.isOwner);
}

export function toOrganizationDetail(org: {
  id: string; publicId: string; tradeName: string; legalName: string | null; slug: string;
  taxId: string | null; description: string | null; logoUrl: string | null; coverUrl: string | null;
  website: string | null;
  email: string | null; phone: string | null; locale: string; billingCurrency: string;
  status: string; verificationStatus: string; isActive: boolean; isPublic: boolean;
  allowContact: boolean; createdAt: Date; verifiedAt: Date | null;
}) {
  return {
    id: org.id,
    publicId: org.publicId,
    tradeName: org.tradeName,
    legalName: org.legalName,
    slug: org.slug,
    taxId: org.taxId,
    description: org.description,
    logoUrl: org.logoUrl,
    coverUrl: org.coverUrl,
    website: org.website,
    email: org.email,
    phone: org.phone,
    locale: org.locale,
    billingCurrency: org.billingCurrency,
    status: org.status,
    verificationStatus: org.verificationStatus,
    isActive: org.isActive,
    isPublic: org.isPublic,
    allowContact: org.allowContact,
    createdAt: org.createdAt,
    verifiedAt: org.verifiedAt,
  };
}

export function toOrganizationSummary(org: {
  id: string; publicId: string; tradeName: string; slug: string; status: string;
  verificationStatus: string; isActive: boolean; createdAt: Date;
}) {
  return {
    id: org.id,
    publicId: org.publicId,
    tradeName: org.tradeName,
    slug: org.slug,
    status: org.status,
    verificationStatus: org.verificationStatus,
    isActive: org.isActive,
    createdAt: org.createdAt,
  };
}

export function toMember(membership: {
  id: string; userId: string; isOwner: boolean; isActive: boolean; joinedAt: Date;
  user: { id: string; email: string; username: string; firstName: string | null; lastName: string | null; isVerified: boolean; isActive: boolean };
  role: { name: string; baseRole: string | null };
}) {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    email: membership.user.email,
    username: membership.user.username,
    firstName: membership.user.firstName,
    lastName: membership.user.lastName,
    isVerified: membership.user.isVerified,
    isActive: membership.isActive && membership.user.isActive,
    isOwner: membership.isOwner,
    role: membershipRole(membership),
    roleName: membership.role.name,
    joinedAt: membership.joinedAt,
  };
}

export function toInvitation(invitation: {
  id: string; email: string; role: string; firstName: string | null; lastName: string | null;
  expiresAt: Date; createdAt: Date;
}) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}
