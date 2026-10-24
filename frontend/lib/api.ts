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
  hideLowRatings: boolean;
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

export interface RatingSummary {
  average: number | null;
  total: number;
  distribution: Record<string, number>;
}

export interface PublicProfile {
  slug: string;
  tradeName: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  verified: boolean;
  createdAt: string;
  /** La empresa no muestra las reseñas de 1 y 2 estrellas (ni cuentan en la media). */
  lowRatingsHidden: boolean;
  rating: RatingSummary;
}

export interface ReviewReply {
  body: string;
  createdAt: string;
  editedAt: string | null;
}

export interface PublicReview {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string;
  experienceDate: string | null;
  verified: boolean;
  publishedAt: string;
  response: ReviewReply | null;
}

export interface ReviewForm {
  slug: string;
  tradeName: string;
  logoUrl: string | null;
  verified: boolean;
  isPublic: boolean;
}

export interface SubmitReviewPayload {
  name: string;
  email: string;
  rating: number;
  title?: string;
  body: string;
  experienceDate?: string;
  orderReference?: string;
  consent: boolean;
  website?: string;
}

export type ReviewStatus =
  | 'pending'
  | 'published'
  | 'under_review'
  | 'reported'
  | 'hidden'
  | 'rejected';

export type ModerationAction = 'publish' | 'reject' | 'hide' | 'restore' | 'unflag';

export interface ReportReason {
  code: string;
  label: string;
}

export interface ReportPayload {
  reason: string;
  comment?: string;
}

export interface AdminReview {
  id: string;
  organization: { tradeName: string; slug: string };
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  ipAddress: string | null;
  antifraud: string[];
  createdAt: string;
  publishedAt: string | null;
  response: string | null;
  reports: {
    id: string;
    reason: string | null;
    comment: string | null;
    byOrganization: boolean;
    createdAt: string;
  }[];
  history: {
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    reason: string | null;
    byModerator: boolean;
    createdAt: string;
  }[];
}

export interface AdminReviewList extends Paginated<AdminReview> {
  queue: { underReview: number; reported: number };
}

export interface TenantReview {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string;
  experienceDate: string | null;
  orderReference: string | null;
  status: ReviewStatus;
  verified: boolean;
  createdAt: string;
  publishedAt: string | null;
  response: ReviewReply | null;
  /** 1 o 2 estrellas, publicada: candidata a resolver. */
  lowRating: boolean;
  resolution: { id: string; status: ResolutionStatus; outcome: ResolutionOutcome | null } | null;
}

export interface TenantReviewList extends Paginated<TenantReview> {
  summary: { total: number; published: number; pending: number; unanswered: number; negative: number };
}

export type ResolutionStatus = 'open' | 'in_progress' | 'accepted' | 'rejected' | 'closed';
export type ResolutionOutcome = 'resolved' | 'unresolved' | 'withdrawn';
export type ResolutionSender = 'company' | 'client' | 'system';

export interface ResolutionMessage {
  id?: string;
  senderType: ResolutionSender;
  body: string;
  createdAt: string;
}

/** Hilo de una resolución, visto por la empresa. */
export interface CompanyResolution {
  id: string;
  status: ResolutionStatus;
  outcome: ResolutionOutcome | null;
  expiresAt: string;
  closedAt: string | null;
  createdAt: string;
  messages: ResolutionMessage[];
}

/** Estado completo de la resolución, visto por el cliente desde su enlace. */
export interface ClientResolution {
  company: string;
  review: {
    id: string;
    reviewerName: string;
    rating: number;
    title: string | null;
    body: string;
    publishedAt: string | null;
  };
  resolution: {
    status: ResolutionStatus;
    outcome: ResolutionOutcome | null;
    expiresAt: string;
    closedAt: string | null;
  };
  messages: ResolutionMessage[];
  permissions: { canWrite: boolean; canEditReview: boolean; canDecide: boolean };
}

export interface ClientReviewUpdatePayload {
  token: string;
  rating?: number;
  title?: string;
  body?: string;
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
  reviews: { published: number; underReview: number; reported: number };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewListParams {
  rating?: number;
  status?: string;
  sort?: 'recent' | 'oldest' | 'highest' | 'lowest';
  /** Últimos 30, 90 o 365 días. */
  period?: string;
  /** Panel: 'yes' con respuesta, 'no' sin respuesta. */
  answered?: string;
  /** Panel: 'true' solo reseñas de 1 o 2 estrellas publicadas. */
  lowRating?: 'true';
  page?: number;
  pageSize?: number;
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

// Restauración inicial de la sesión (AuthProvider hace el primer refresh). Los
// efectos de las páginas se ejecutan antes que los del proveedor, así que sin
// esta espera sus peticiones privadas salían sin token y devolvían 401.
let markSessionReady: () => void = () => undefined;
const sessionReady = new Promise<void>((resolve) => {
  markSessionReady = resolve;
});

export function sessionRestored(): void {
  markSessionReady();
}

// Enlaces de un solo uso (confirmar reseña, verificar email): la petición se
// hace una única vez por token. Si se repitiera (p. ej. el doble efecto de React
// StrictMode en desarrollo), la segunda recibiría "enlace ya usado" y se
// mostraría un error aunque la primera hubiera funcionado.
const oneTimeCalls = new Map<string, Promise<unknown>>();

function once<T>(key: string, call: () => Promise<T>): Promise<T> {
  let pending = oneTimeCalls.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = call();
    oneTimeCalls.set(key, pending);
  }
  return pending;
}

/** Rutas que no necesitan sesión (o que la crean) y no deben esperar. */
function isSessionless(path: string): boolean {
  return path.startsWith('/auth/') || path.startsWith('/public/') || path.startsWith('/invitations/');
}

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

/**
 * fetch con un error claro cuando la API no responde (servidor apagado, URL mal
 * configurada, CORS): sin esto el usuario solo veía "No se pudo iniciar sesión".
 */
async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(
      0,
      'No se puede conectar con el servidor. Comprueba tu conexión o inténtalo de nuevo en unos minutos.',
    );
  }
}

// Render (plan gratuito) suspende el backend tras un rato sin tráfico; al
// despertar tarda ~30 s y el proxy /api de Next responde 502/503/504 mientras.
const WAKING_UP = new Set([502, 503, 504]);
const WAKE_UP_ATTEMPTS = 4;
const WAKE_UP_DELAY_MS = 3000;
const WAKE_UP_MESSAGE =
  'El servidor se está iniciando (tras un rato sin uso puede tardar hasta un minuto). Inténtalo de nuevo en unos segundos.';

/**
 * Solo se reintenta lo que es seguro repetir: consultas GET y el login. Nunca
 * el refresh (rota el token: repetirlo revocaría la sesión) ni altas como el
 * registro (podrían duplicarse si la primera petición sí llegó al servidor).
 */
function retriesWhileWakingUp(path: string, method: string): boolean {
  return method === 'GET' || path === '/auth/login';
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // p. ej. la página HTML de error del proxy en un 502.
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isSessionless(path)) {
    await sessionReady;
  }
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const method = (init.method ?? 'GET').toUpperCase();
  const attempts = retriesWhileWakingUp(path, method) ? WAKE_UP_ATTEMPTS : 1;

  let response: Response | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    response = await send(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
    if (!WAKING_UP.has(response.status) || attempt === attempts) {
      break;
    }
    await wait(WAKE_UP_DELAY_MS);
  }
  const final = response as Response;

  if (WAKING_UP.has(final.status)) {
    throw new ApiError(final.status, WAKE_UP_MESSAGE);
  }

  const data = parseBody(await final.text());
  if (!final.ok) {
    throw new ApiError(final.status, extractMessage(data, final.status));
  }
  return data as T;
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  await sessionReady;
  const headers = new Headers();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await send(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
    cache: 'no-store',
  });

  if (WAKING_UP.has(response.status)) {
    throw new ApiError(response.status, WAKE_UP_MESSAGE);
  }
  const data = parseBody(await response.text());
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
    return once(`verify-email:${token}`, () =>
      request<{ verified: boolean }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    );
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

  // Reseñas (empresa)
  listReviews(params: ReviewListParams = {}): Promise<TenantReviewList> {
    return request<TenantReviewList>(`/organizations/me/reviews${buildQuery(params)}`);
  },
  respondToReview(id: string, body: string): Promise<TenantReview> {
    return request<TenantReview>(`/organizations/me/reviews/${id}/response`, {
      method: 'PUT',
      body: JSON.stringify({ body }),
    });
  },
  reportReview(id: string, payload: ReportPayload): Promise<{ status: string }> {
    return request<{ status: string }>(`/organizations/me/reviews/${id}/report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  removeReviewResponse(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/organizations/me/reviews/${id}/response`, {
      method: 'DELETE',
    });
  },
  getReviewResolution(id: string): Promise<{ resolution: CompanyResolution | null }> {
    return request<{ resolution: CompanyResolution | null }>(
      `/organizations/me/reviews/${id}/resolution`,
    );
  },
  openReviewResolution(id: string, message: string): Promise<{ id: string; status: string }> {
    return request<{ id: string; status: string }>(`/organizations/me/reviews/${id}/resolution`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  sendResolutionMessage(id: string, body: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/organizations/me/reviews/${id}/resolution/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  closeReviewResolution(id: string): Promise<{ id: string; status: string }> {
    return request<{ id: string; status: string }>(
      `/organizations/me/reviews/${id}/resolution/close`,
      { method: 'POST' },
    );
  },

  // Perfil público y reseñas (sin sesión)
  publicProfile(slug: string): Promise<PublicProfile> {
    return request<PublicProfile>(`/public/organizations/${encodeURIComponent(slug)}`);
  },
  publicReviews(slug: string, params: ReviewListParams = {}): Promise<Paginated<PublicReview>> {
    return request<Paginated<PublicReview>>(
      `/public/organizations/${encodeURIComponent(slug)}/reviews${buildQuery(params)}`,
    );
  },
  reportReasons(): Promise<{ reasons: ReportReason[] }> {
    return request<{ reasons: ReportReason[] }>('/public/report-reasons');
  },
  reportPublicReview(id: string, payload: ReportPayload): Promise<{ status: string }> {
    return request<{ status: string }>(`/public/reviews/${id}/report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  reviewForm(slug: string): Promise<ReviewForm> {
    return request<ReviewForm>(`/public/organizations/${encodeURIComponent(slug)}/review-form`);
  },
  submitReview(slug: string, payload: SubmitReviewPayload): Promise<{ status: string }> {
    return request<{ status: string }>(
      `/public/organizations/${encodeURIComponent(slug)}/reviews`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  },
  // Resolución de incidencias (cliente, enlace del correo; el token va en el cuerpo)
  clientResolution(token: string): Promise<ClientResolution> {
    return request<ClientResolution>('/public/resolutions/lookup', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  clientResolutionMessage(token: string, body: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/public/resolutions/messages', {
      method: 'POST',
      body: JSON.stringify({ token, body }),
    });
  },
  clientUpdateReview(payload: ClientReviewUpdatePayload): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/public/resolutions/review', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  clientAcceptResolution(token: string): Promise<{ status: string; outcome: string }> {
    return request<{ status: string; outcome: string }>('/public/resolutions/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  clientRejectResolution(token: string, reason?: 'no_solution' | 'other') {
    return request<{ status: string; outcome: string }>('/public/resolutions/reject', {
      method: 'POST',
      body: JSON.stringify({ token, ...(reason ? { reason } : {}) }),
    });
  },

  confirmReview(token: string): Promise<{
    status: 'published' | 'under_review';
    organization: { slug: string; tradeName: string; isPublic: boolean };
  }> {
    return once(`confirm-review:${token}`, () =>
      request('/public/reviews/confirm', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    );
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
  adminListReviews(params: ListParams = {}): Promise<AdminReviewList> {
    return request<AdminReviewList>(`/admin/reviews${buildQuery(params)}`);
  },
  adminModerateReview(
    id: string,
    action: ModerationAction,
    reason?: string,
  ): Promise<{ id: string; status: ReviewStatus }> {
    return request<{ id: string; status: ReviewStatus }>(`/admin/reviews/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
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

function buildQuery(params: ListParams | ReviewListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
