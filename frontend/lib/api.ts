export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface Organization {
  id: string;
  publicId: string;
  tradeName: string;
  slug: string;
  status: string;
  verificationStatus: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  isVerified: boolean;
  isSuperAdmin?: boolean;
  isFivertenStaff?: boolean;
}

export interface OrganizationDetail {
  id: string;
  publicId: string;
  tradeName: string;
  legalName: string | null;
  slug: string;
  taxId: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  coverUrl: string | null;
  locale: string;
  billingCurrency: string;
  status: string;
  verificationStatus: string;
  isActive: boolean;
  isPublic: boolean;
  allowContact: boolean;
  createdAt: string;
  verifiedAt: string | null;
}

export interface Member {
  membershipId: string;
  userId: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  isVerified: boolean;
  isActive: boolean;
  isOwner: boolean;
  role: string | null;
  roleName: string;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationPreview {
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  organization: { tradeName: string };
  expiresAt: string;
  hasAccount: boolean;
}

export interface AdminOrganizationSummary {
  id: string;
  publicId: string;
  tradeName: string;
  slug: string;
  status: string;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
  members: number;
}

export interface AdminOrganizationDetail extends OrganizationDetail {
  members: Member[];
  invitations: Invitation[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isVerified: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  organization: { id: string; tradeName: string } | null;
  role: string | null;
}

export interface PlatformStats {
  organizations: { total: number; active: number; verified: number; pending: number };
  users: { total: number; active: number; admins: number };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AuthResponse {
  accessToken: string | null;
  refreshToken?: string | null;
  refreshExpiresAt?: string | null;
  requiresEmailVerification?: boolean;
  user: User;
  organization: Organization | null;
  role: string | null;
}

export interface MeResponse {
  user: User & { emailVerified: boolean };
  organization: Organization | null;
  role: string | null;
}

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  platform: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  current: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  taxId?: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(data, response.status));
  }
  return data as T;
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const headers = new Headers();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
    cache: 'no-store',
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(data, response.status));
  }
  return data as T;
}

function extractMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (Array.isArray(message)) {
      return message.join('. ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return `Error inesperado (HTTP ${status})`;
}

export const api = {
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login(payload: LoginPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  refresh(): Promise<AuthResponse> {
    // Un solo refresh en vuelo: el refresh token rota en cada uso y dos
    // peticiones simultáneas con el mismo token se tratan como reutilización
    // (revocan la sesión). Ocurre p. ej. con el doble efecto de React StrictMode.
    refreshInFlight ??= request<AuthResponse>('/auth/refresh', { method: 'POST' }).finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  },
  logout(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' });
  },
  me(): Promise<MeResponse> {
    return request<MeResponse>('/auth/me');
  },
  verifyEmail(token: string): Promise<{ verified: boolean }> {
    return request<{ verified: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  requestEmailVerification(): Promise<{ sent: boolean; alreadyVerified: boolean }> {
    return request<{ sent: boolean; alreadyVerified: boolean }>('/auth/verify-email/request', {
      method: 'POST',
    });
  },
  forgotPassword(email: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
  listSessions(): Promise<{ sessions: SessionInfo[] }> {
    return request<{ sessions: SessionInfo[] }>('/auth/sessions');
  },
  revokeSession(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/auth/sessions/${id}`, { method: 'DELETE' });
  },
  logoutAll(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/auth/logout-all', { method: 'POST' });
  },

  // Ámbito empresa (tenant)
  getMyOrganization(): Promise<OrganizationDetail> {
    return request<OrganizationDetail>('/organizations/me');
  },
  updateMyOrganization(payload: Partial<OrganizationDetail>): Promise<OrganizationDetail> {
    return request<OrganizationDetail>('/organizations/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  uploadOrganizationCover(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return requestForm<{ url: string }>('/media/organization-cover', formData);
  },
  listMembers(): Promise<{ members: Member[] }> {
    return request<{ members: Member[] }>('/organizations/me/members');
  },
  listInvitations(): Promise<{ invitations: Invitation[] }> {
    return request<{ invitations: Invitation[] }>('/organizations/me/invitations');
  },
  inviteMember(payload: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }): Promise<Invitation> {
    return request<Invitation>('/organizations/me/invitations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  revokeInvitation(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/organizations/me/invitations/${id}`, {
      method: 'DELETE',
    });
  },

  // Invitado (enlace del correo)
  previewInvitation(token: string): Promise<InvitationPreview> {
    return request<InvitationPreview>('/invitations/preview', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  acceptInvitation(payload: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ email: string }> {
    return request<{ email: string }>('/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  acceptInvitationAsUser(token: string): Promise<Member> {
    return request<Member>('/invitations/accept-existing', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  updateMember(
    membershipId: string,
    payload: { role?: string; isActive?: boolean },
  ): Promise<Member> {
    return request<Member>(`/organizations/me/members/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  removeMember(membershipId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/organizations/me/members/${membershipId}`, {
      method: 'DELETE',
    });
  },

  // Ámbito plataforma (administrador general)
  adminStats(): Promise<PlatformStats> {
    return request<PlatformStats>('/admin/stats');
  },
  adminListOrganizations(
    params: ListParams = {},
  ): Promise<Paginated<AdminOrganizationSummary>> {
    return request<Paginated<AdminOrganizationSummary>>(
      `/admin/organizations${buildQuery(params)}`,
    );
  },
  adminCreateOrganization(payload: {
    tradeName: string;
    legalName?: string;
    taxId?: string;
    email?: string;
    phone?: string;
    website?: string;
    description?: string;
    ownerEmail?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
  }): Promise<OrganizationDetail & { ownerInvitationSent: boolean }> {
    return request<OrganizationDetail & { ownerInvitationSent: boolean }>('/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminGetOrganization(id: string): Promise<AdminOrganizationDetail> {
    return request<AdminOrganizationDetail>(`/admin/organizations/${id}`);
  },
  adminUpdateOrganization(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<OrganizationDetail> {
    return request<OrganizationDetail>(`/admin/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminListUsers(params: ListParams = {}): Promise<Paginated<AdminUser>> {
    return request<Paginated<AdminUser>>(`/admin/users${buildQuery(params)}`);
  },
  adminUpdateUser(
    id: string,
    payload: { isActive?: boolean; isVerified?: boolean; isSuperAdmin?: boolean },
  ): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

function buildQuery(params: ListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
