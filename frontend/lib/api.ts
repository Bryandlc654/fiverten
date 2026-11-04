export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

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
  /** Verificación en dos pasos (TOTP). */
  mfaEnabled?: boolean;
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
  /** Aviso de cada reseña nueva de 3 a 5 estrellas (app y correo). */
  notifyNewReviews: boolean;
  /** Aviso destacado de las reseñas de 1 y 2 estrellas. */
  notifyNegativeReviews: boolean;
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
  /** La empresa no muestra las reseñas de 1 y 2 estrellas (siguen en la media). */
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
  /** Token del enlace personalizado de solicitud (?rt=...). */
  requestToken?: string;
}

export type ReviewRequestStatus = 'sent' | 'opened' | 'completed';

export interface ReviewRequestSummary {
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  status: ReviewRequestStatus;
  sentAt: string;
  openedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  reviewId: string | null;
  expired: boolean;
  createdAt: string;
}

export interface ReviewRequestList extends Paginated<ReviewRequestSummary> {
  stats: { sent: number; opened: number; completed: number; conversion: number };
}

export interface ReviewRequestLookup {
  reviewerName: string;
  reviewerEmail: string;
  completed: boolean;
  expired: boolean;
  expiresAt: string;
  organization: { tradeName: string; slug: string; logoUrl: string | null };
}

export interface CreateReviewRequestPayload {
  name: string;
  email: string;
}

export type ReviewStatus =
  'pending' | 'published' | 'under_review' | 'reported' | 'hidden' | 'rejected';

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
  /** Caso de evidencias (reseñas de 1 o 2 estrellas). */
  case: { id: string; status: CaseStatus } | null;
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
  summary: {
    total: number;
    published: number;
    pending: number;
    unanswered: number;
    negative: number;
  };
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

/**
 * Caso de evidencias de una reseña de 1 o 2 estrellas: el admin pide pruebas al
 * cliente, si son válidas notifica a la empresa, y decide (rechazar, publicar o
 * retirar por acuerdo de las tres partes).
 */
export type CaseStatus =
  | 'awaiting_admin'
  | 'evidence_requested'
  | 'evidence_submitted'
  | 'company_notified'
  | 'company_responded'
  | 'closed';
export type CaseOutcome = 'rejected' | 'published' | 'withdrawn';
export type CaseSender = 'admin' | 'client' | 'company' | 'system';

export interface CaseFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface CaseMessage {
  id: string;
  senderType: CaseSender;
  body: string;
  createdAt: string;
  files: CaseFile[];
}

interface CaseReview {
  reviewerName: string;
  rating: number;
  title: string | null;
}

export interface AdminCaseSummary {
  id: string;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  needsAdmin: boolean;
  clientAgreed: boolean;
  companyAgreed: boolean;
  organization: { tradeName: string; slug: string };
  review: CaseReview;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCaseList extends Paginated<AdminCaseSummary> {
  queue: { needsAdmin: number; active: number };
}

export interface AdminCase extends AdminCaseSummary {
  decisionReason: string | null;
  companyNotifiedAt: string | null;
  closedAt: string | null;
  review: CaseReview & {
    id: string;
    reviewerEmail: string;
    body: string;
    experienceDate: string | null;
    orderReference: string | null;
    createdAt: string;
    antifraud: string[];
  };
  messages: CaseMessage[];
}

export type CaseDecision = 'reject' | 'publish' | 'withdraw';

export interface CompanyCaseSummary {
  id: string;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  clientAgreed: boolean;
  companyAgreed: boolean;
  review: CaseReview;
  createdAt: string;
  updatedAt: string;
}

/** Caso visto por la empresa (sin el correo del cliente). */
export interface CompanyCase {
  id: string;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  decisionReason: string | null;
  review: CaseReview & {
    body: string;
    experienceDate: string | null;
    orderReference: string | null;
    createdAt: string;
  };
  agreements: { client: boolean; company: boolean };
  messages: CaseMessage[];
  permissions: { canWrite: boolean; canAgree: boolean };
}

/** Caso visto por el cliente desde el enlace del correo. */
export interface ClientCase {
  company: string;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  decisionReason: string | null;
  review: CaseReview & { body: string; createdAt: string };
  agreements: { client: boolean; company: boolean };
  messages: CaseMessage[];
  permissions: { canWrite: boolean; canAgree: boolean };
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

/** Estadísticas de reputación del panel de la empresa. */
export interface OrganizationStats {
  rating: RatingSummary;
  /** Reseñas publicadas en los últimos 30/90/365 días y en los 30 anteriores. */
  periods: { last30: number; previous30: number; last90: number; last365: number };
  /** Un punto por mes (YYYY-MM), del más antiguo al actual. */
  monthly: { month: string; count: number; average: number | null }[];
  responses: {
    published: number;
    answered: number;
    /** 0-1, o null sin reseñas publicadas. */
    rate: number | null;
    averageHours: number | null;
  };
  requests: {
    pendingConfirmation: number;
    underReview: number;
    resolutions: {
      open: number;
      resolved: number;
      unresolved: number;
      total: number;
      resolutionRate: number | null;
    };
    cases: {
      open: number;
      published: number;
      rejected: number;
      withdrawn: number;
      total: number;
      resolutionRate: number | null;
    };
  };
}

export type NotificationType = 'new_review' | 'negative_review';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationList extends Paginated<AppNotification> {
  unread: number;
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
  /** La cuenta tiene 2FA: hay que resolver el reto antes de tener sesión. */
  mfaRequired?: boolean;
  mfaToken?: string | null;
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
// Rutas de /auth que sí necesitan la sesión restaurada (token de acceso).
const AUTHENTICATED_AUTH_PATHS = [
  '/auth/me',
  '/auth/sessions',
  '/auth/logout-all',
  '/auth/password/change',
  '/auth/verify-email/request',
  '/auth/mfa/setup',
  '/auth/mfa/enable',
  '/auth/mfa/disable',
];

function isSessionless(path: string): boolean {
  if (AUTHENTICATED_AUTH_PATHS.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  return (
    path.startsWith('/auth/') || path.startsWith('/public/') || path.startsWith('/invitations/')
  );
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
  if (!isSessionless(path)) {
    await sessionReady;
  }
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

/** Descarga un archivo (evidencias de un caso): devuelve el contenido como Blob. */
async function requestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  if (!isSessionless(path)) {
    await sessionReady;
  }
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const response = await send(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (WAKING_UP.has(response.status)) {
    throw new ApiError(response.status, WAKE_UP_MESSAGE);
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractMessage(parseBody(await response.text()), response.status),
    );
  }
  return response.blob();
}

/** Mensaje y evidencias como multipart (campo "files", hasta 5 archivos). */
function caseForm(fields: Record<string, string | undefined>, files: File[]): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value) form.append(key, value);
  }
  for (const file of files) {
    form.append('files', file);
  }
  return form;
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
  verifyMfa(mfaToken: string, code: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, code }),
    });
  },
  mfaSetup(): Promise<{ secret: string; otpauthUrl: string }> {
    return request<{ secret: string; otpauthUrl: string }>('/auth/mfa/setup', { method: 'POST' });
  },
  mfaEnable(code: string): Promise<{ enabled: boolean }> {
    return request<{ enabled: boolean }>('/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  mfaDisable(password: string, code: string): Promise<{ enabled: boolean }> {
    return request<{ enabled: boolean }>('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    });
  },
  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; revokedSessions: number }> {
    return request<{ success: boolean; revokedSessions: number }>('/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
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

  // Estadísticas y notificaciones (empresa)
  getOrganizationStats(months = 12): Promise<OrganizationStats> {
    return request<OrganizationStats>(`/organizations/me/stats?months=${months}`);
  },
  listNotifications(
    params: { page?: number; pageSize?: number; unread?: boolean } = {},
  ): Promise<NotificationList> {
    return request<NotificationList>(
      `/notifications${buildQuery({ ...params, unread: params.unread ? 'true' : undefined })}`,
    );
  },
  unreadNotifications(): Promise<{ unread: number }> {
    return request<{ unread: number }>('/notifications/unread-count');
  },
  markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
  },
  markAllNotificationsRead(): Promise<{ updated: number }> {
    return request<{ updated: number }>('/notifications/read-all', { method: 'POST' });
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

  // Casos de evidencias en los que la empresa ha sido notificada
  listCompanyCases(): Promise<{ items: CompanyCaseSummary[] }> {
    return request<{ items: CompanyCaseSummary[] }>('/organizations/me/cases');
  },
  getCompanyCase(id: string): Promise<CompanyCase> {
    return request<CompanyCase>(`/organizations/me/cases/${id}`);
  },
  sendCompanyCaseMessage(id: string, body: string, files: File[]): Promise<{ ok: boolean }> {
    return requestForm<{ ok: boolean }>(
      `/organizations/me/cases/${id}/messages`,
      caseForm({ body }, files),
    );
  },
  agreeCompanyCase(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/organizations/me/cases/${id}/agree`, { method: 'POST' });
  },
  companyCaseFile(id: string, fileId: string): Promise<Blob> {
    return requestBlob(`/organizations/me/cases/${id}/files/${fileId}`);
  },

  // Perfil público y reseñas (sin sesión)
  listReviewRequests(params: ListParams = {}): Promise<ReviewRequestList> {
    return request<ReviewRequestList>(
      `/organizations/me/review-requests${buildQuery(params)}`,
    );
  },
  createReviewRequest(
    payload: CreateReviewRequestPayload,
  ): Promise<ReviewRequestSummary & { url: string }> {
    return request<ReviewRequestSummary & { url: string }>('/organizations/me/review-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  publicProfile(slug: string): Promise<PublicProfile> {
    return request<PublicProfile>(`/public/organizations/${encodeURIComponent(slug)}`);
  },
  reviewRequestLookup(slug: string, token: string): Promise<ReviewRequestLookup> {
    return request<ReviewRequestLookup>(
      `/public/organizations/${encodeURIComponent(slug)}/review-request?token=${encodeURIComponent(token)}`,
    );
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

  // Caso de evidencias (cliente, enlace del correo; el token va en el cuerpo)
  clientCase(token: string): Promise<ClientCase> {
    return request<ClientCase>('/public/cases/lookup', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  clientCaseMessage(token: string, body: string, files: File[]): Promise<{ ok: boolean }> {
    return requestForm<{ ok: boolean }>('/public/cases/messages', caseForm({ token, body }, files));
  },
  clientCaseAgree(token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/public/cases/agree', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  clientCaseFile(token: string, fileId: string): Promise<Blob> {
    return requestBlob(`/public/cases/files/${fileId}`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  confirmReview(token: string): Promise<{
    status: 'published' | 'under_review';
    /** Reseña de 1 o 2 estrellas: se abre un caso y se pedirán evidencias. */
    evidenceRequired: boolean;
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
  adminListOrganizations(params: ListParams = {}): Promise<Paginated<AdminOrganizationSummary>> {
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
  adminListCases(params: {
    scope?: 'active' | 'closed' | 'all';
    page?: number;
    pageSize?: number;
  }): Promise<AdminCaseList> {
    return request<AdminCaseList>(`/admin/cases${buildQuery(params)}`);
  },
  adminGetCase(id: string): Promise<AdminCase> {
    return request<AdminCase>(`/admin/cases/${id}`);
  },
  /** Pedir evidencias, escribir o validar: todas llevan un mensaje para las partes. */
  adminCaseStep(
    id: string,
    step: 'request-evidence' | 'messages' | 'validate',
    message: string,
  ): Promise<AdminCase> {
    return request<AdminCase>(`/admin/cases/${id}/${step}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  adminDecideCase(id: string, decision: CaseDecision, reason?: string): Promise<AdminCase> {
    return request<AdminCase>(`/admin/cases/${id}/${decision}`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },
  adminCaseFile(id: string, fileId: string): Promise<Blob> {
    return requestBlob(`/admin/cases/${id}/files/${fileId}`);
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

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
