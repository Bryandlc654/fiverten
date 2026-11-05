export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Resuelve URLs de imágenes guardadas en la API (p. ej. /api/media/files/…)
 * contra el backend real, tanto en local (URL absoluta) como en producción
 * con proxy same-origin (/api).
 */
export function resolveAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/api/')) {
    const base = API_URL.replace(/\/api\/?$/, '');
    return `${base}${value}`;
  }
  return value;
}

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
  phone?: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
  isSuperAdmin?: boolean;
  isFivertenStaff?: boolean;
  /** Rol de plataforma para el panel de soporte. */
  isSupportAgent?: boolean;
  isVerifier?: boolean;
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
  sectorId: string | null;
  countryId: string | null;
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
  sampleSize?: number;
  distribution: Record<string, number>;
}

export type ReviewVerificationState = 'identified' | 'confirmed' | 'verified';

export interface PublicProfile {
  slug: string;
  tradeName: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  sector: { slug: string; name: string } | null;
  country: { iso2: string; name: string } | null;
  verified: boolean;
  createdAt: string;
  /** La empresa no muestra las reseñas de 1 y 2 estrellas (siguen en la media). */
  lowRatingsHidden: boolean;
  rating: RatingSummary;
}

export interface PublicOrganizationSummary {
  slug: string;
  tradeName: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  publicId: string;
  sector: { slug: string; name: string } | null;
  country: { iso2: string; name: string } | null;
  verified: boolean;
  verifiedAt: string | null;
  lastVerifiedAt: string | null;
  projectsCount: number;
  documentsCount: number;
  rating: { average: number | null; total: number };
}

export interface PublicDirectory {
  items: PublicOrganizationSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    sectors: { slug: string; name: string; count: number }[];
    countries: { iso2: string; name: string; count: number }[];
    verifiedCount: number;
    withProjects: number;
    withOpinions: number;
    metrics: {
      verifiedCompanies: number;
      verifiedProjects: number;
      identityVerifiedPercent: number;
      countries: number;
    };
  };
}

export interface PublicVerificationProject {
  id: string;
  name: string;
  projectType: string | null;
  city: string | null;
  year: number | null;
  status: string;
  clientStatus: string;
  description: string | null;
  url: string | null;
  verificationScope: string | null;
  methodology: string | null;
  verifiedAt: string | null;
  createdAt: string;
  evidenceCount: number;
  evidenceTypes: string[];
  evidence: {
    id: string;
    kind: 'image' | 'pdf';
    evidenceType?: string | null;
    size: number;
    createdAt: string;
  }[];
}

export interface PublicCertification {
  id: string;
  name: string;
  issuer: string;
  credentialId: string | null;
  credentialUrl: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
}

export interface PublicVerification {
  organization: {
    tradeName: string;
    slug: string;
    publicId: string;
    description: string | null;
    logoUrl: string | null;
    sector: { slug: string; name: string } | null;
    country: { iso2: string; name: string } | null;
  };
  status: VerificationStatus;
  verifiedAt: string | null;
  expiresAt: string | null;
  reviewedAt: string | null;
  documentsCount: number;
  categories: string[];
  certifications: PublicCertification[];
  projects: PublicVerificationProject[];
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
  verificationState: ReviewVerificationState;
  verificationMethodology: string | null;
  verifiedAt: string | null;
  project: {
    id: string;
    name: string;
    projectType: string | null;
    city: string | null;
    year: number | null;
    status: string;
    clientStatus: string;
    evidenceCount: number;
    evidenceTypes: string[];
  } | null;
  publishedAt: string;
  response: ReviewReply | null;
}

export interface ReviewForm {
  slug: string;
  tradeName: string;
  logoUrl: string | null;
  verified: boolean;
  isPublic: boolean;
  projects: { id: string; name: string }[];
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
  /** Proyecto verificado con el que se relaciona la experiencia. */
  projectId?: string;
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

export interface CampaignStats {
  sent: number;
  opened: number;
  completed: number;
  conversion: number;
}

export interface ReviewCampaignSummary {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  sentAt: string | null;
  createdAt: string;
  stats: CampaignStats;
}

export interface ReviewCampaignDetail extends ReviewCampaignSummary {
  requests: ReviewRequestSummary[];
}

export interface CreateCampaignPayload {
  name: string;
  recipients: { name: string; email: string }[];
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
  isSupportAgent: boolean;
  isVerifier: boolean;
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
    reviewRequests: CampaignStats;
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

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  reviewLimit: number | null;
  userLimit: number | null;
  features: Record<string, unknown>;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubscription {
  id: string;
  organizationId: string;
  organization: { id: string; tradeName: string; slug: string; email: string | null };
  plan: AdminPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  events?: SubscriptionEvent[];
}

export interface SubscriptionEvent {
  id: string;
  type: string;
  fromPlanId: string | null;
  toPlanId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  organizationId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  reference: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  organization?: { id: string; tradeName: string; slug: string };
}

export interface BillingStats {
  subscriptions: {
    total: number;
    active: number;
    trialing: number;
    pastDue: number;
    cancelled: number;
    expired: number;
  };
  mrr: number;
  revenue: {
    total: number;
    last30: number;
    series: { month: string; amount: number }[];
  };
}

export interface CompanySubscription {
  subscription: AdminSubscription | null;
  plan: AdminPlan | null;
  usage: { users: number; reviews: number };
}

export interface PlatformSettingItem {
  key: string;
  value: unknown;
  description: string;
}

export interface SectorItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CountryItem {
  id: string;
  iso2: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface LanguageItem {
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface EmailTemplateItem {
  code: string;
  subject: string;
  title: string;
  intro: string;
  action: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ReportReasonItem {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface PublicCatalogs {
  sectors: SectorItem[];
  countries: CountryItem[];
  languages: LanguageItem[];
}

export interface PublicConfig {
  siteName: string;
  supportEmail: string;
  defaultLocale: string;
  defaultCurrency: string;
  registrationsEnabled: boolean;
  maintenanceMode: boolean;
  lowRatingMax: number;
  allowLowRatingResolution: boolean;
}

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory =
  | 'general'
  | 'billing'
  | 'reviews'
  | 'technical'
  | 'account'
  | 'other';

export interface SupportMessage {
  id: string;
  senderType: 'company' | 'support' | 'system';
  senderUserId: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface SupportTicketSummary {
  id: string;
  organizationId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; tradeName: string; slug: string };
  creator: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  assignee: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  messageCount: number;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportMessage[];
}

export interface SupportTicketList extends Paginated<SupportTicketSummary> {
  counts?: Record<string, number>;
  stats?: {
    status: Record<string, number>;
    priority: Record<string, number>;
    unassigned: number;
    mine: number;
  };
}

export interface SupportStats {
  status: Record<string, number>;
  priority: Record<string, number>;
  unassigned: number;
  mine: number;
}

export type VerificationStatus =
  | 'not_verified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

export type VerificationDocumentCategory =
  | 'identity'
  | 'tax'
  | 'address'
  | 'project'
  | 'other';

export interface VerificationDocument {
  id: string;
  category: VerificationDocumentCategory;
  evidenceType?: string | null;
  projectId: string | null;
  filename: string;
  mimeType: string;
  size: number;
  dataOrigin?: string;
  createdAt: string;
}

export interface VerificationProject {
  id: string;
  name: string;
  projectType: string | null;
  city: string | null;
  year: number | null;
  status: string;
  clientStatus: string;
  description: string | null;
  url: string | null;
  dataOrigin?: string;
  verificationScope: string | null;
  methodology: string | null;
  verifiedAt: string | null;
  createdAt: string;
  documents: VerificationDocument[];
}

export interface VerificationEvent {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  source: string | null;
  evidence: string | null;
  dataOrigin: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'revoked';
  submittedAt: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  organization: {
    id: string;
    tradeName: string;
    slug: string;
    publicId: string;
    verificationStatus: string;
    verifiedAt: string | null;
    verificationExpiresAt: string | null;
  };
  documents: VerificationDocument[];
  projects: VerificationProject[];
  events: VerificationEvent[];
}

export interface VerificationStatusResponse {
  organization: {
    id: string;
    tradeName: string;
    slug: string;
    publicId: string;
    verificationStatus: string;
    verifiedAt: string | null;
    verificationExpiresAt: string | null;
  };
  status: VerificationStatus;
  verifiedAt: string | null;
  expiresAt: string | null;
  canSubmit: boolean;
  requirements: {
    requiredDocuments: string[];
    minProjects: number;
    reviewDays: number;
    expiryDays: number;
    renewalDays: number;
  };
  certifications: CompanyCertification[];
  request: VerificationRequest | null;
}

export type CertificationStatus = 'pending' | 'verified' | 'rejected';

export interface CompanyCertification {
  id: string;
  name: string;
  issuer: string;
  credentialId: string | null;
  credentialUrl: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: CertificationStatus;
  decisionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminCertification extends CompanyCertification {
  organization: { id: string; tradeName: string; slug: string; email: string | null };
}

export type VerificationInquiryStatus = 'new' | 'contacted' | 'closed';

export interface VerificationInquiry {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: VerificationInquiryStatus;
  notes: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
}

export interface PublicVerificationInfo {
  reviewDays: number;
  expiryDays: number;
  renewalDays: number;
  minProjects: number;
  requiredDocuments: string[];
}

export interface AdminVerificationSummary {
  id: string;
  status: VerificationRequest['status'];
  submittedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  organization: { id: string; tradeName: string; slug: string; email: string | null };
  documents: number;
  projects: number;
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
  projectType?: string;
  clientStatus?: string;
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

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  avatarUrl?: string | null;
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
  updateProfile(payload: UpdateProfilePayload): Promise<MeResponse> {
    return request<MeResponse>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  uploadAvatar(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return requestForm<{ url: string }>('/media/avatar', form);
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
    const form = new FormData();
    form.append('file', file);
    return requestForm<{ url: string }>('/media/organization-cover', form);
  },
  uploadOrganizationLogo(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return requestForm<{ url: string }>('/media/organization-logo', form);
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
  listReviewCampaigns(params: ListParams = {}): Promise<Paginated<ReviewCampaignSummary>> {
    return request<Paginated<ReviewCampaignSummary>>(
      `/organizations/me/review-requests/campaigns${buildQuery(params)}`,
    );
  },
  createReviewCampaign(payload: CreateCampaignPayload): Promise<ReviewCampaignSummary> {
    return request<ReviewCampaignSummary>('/organizations/me/review-requests/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getReviewCampaign(id: string): Promise<ReviewCampaignDetail> {
    return request<ReviewCampaignDetail>(`/organizations/me/review-requests/campaigns/${id}`);
  },
  publicOrganizations(params: {
    search?: string;
    sector?: string;
    country?: string;
    verified?: boolean;
    hasProjects?: boolean;
    hasOpinions?: boolean;
    sort?: 'relevance' | 'recent' | 'rating';
    page?: number;
    pageSize?: number;
  } = {}): Promise<PublicDirectory> {
    return request<PublicDirectory>(`/public/organizations${buildQuery(params)}`);
  },
  publicVerification(slug: string): Promise<PublicVerification> {
    return request<PublicVerification>(
      `/public/organizations/${encodeURIComponent(slug)}/verification`,
    );
  },
  publicVerificationInfo(): Promise<PublicVerificationInfo> {
    return request<PublicVerificationInfo>('/public/verification-info');
  },
  submitVerificationInquiry(payload: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    message?: string;
    consent: boolean;
  }): Promise<{ received: boolean }> {
    return request<{ received: boolean }>('/public/verification-inquiry', {
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
    payload: {
      isActive?: boolean;
      isVerified?: boolean;
      isSuperAdmin?: boolean;
      isSupportAgent?: boolean;
      isVerifier?: boolean;
    },
  ): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Soporte (empresa)
  myTickets(params: ListParams = {}): Promise<SupportTicketList> {
    return request<SupportTicketList>(`/organizations/me/tickets${buildQuery(params)}`);
  },
  createTicket(payload: {
    subject: string;
    message: string;
    category?: TicketCategory;
    priority?: TicketPriority;
  }): Promise<SupportTicketSummary> {
    return request<SupportTicketSummary>('/organizations/me/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  myTicket(id: string): Promise<SupportTicketDetail> {
    return request<SupportTicketDetail>(`/organizations/me/tickets/${id}`);
  },
  replyMyTicket(id: string, body: string): Promise<SupportMessage> {
    return request<SupportMessage>(`/organizations/me/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  closeMyTicket(id: string): Promise<SupportTicketSummary> {
    return request<SupportTicketSummary>(`/organizations/me/tickets/${id}/close`, {
      method: 'POST',
    });
  },

  // Soporte (staff)
  supportStats(): Promise<SupportStats> {
    return request<SupportStats>('/support/stats');
  },
  supportTickets(
    params: ListParams & { priority?: string; assigned?: string } = {},
  ): Promise<SupportTicketList> {
    return request<SupportTicketList>(`/support/tickets${buildQuery(params)}`);
  },
  supportTicket(id: string): Promise<SupportTicketDetail> {
    return request<SupportTicketDetail>(`/support/tickets/${id}`);
  },
  supportReply(id: string, body: string, isInternal = false): Promise<SupportMessage> {
    return request<SupportMessage>(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, isInternal }),
    });
  },
  supportUpdateTicket(
    id: string,
    payload: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      assignedTo?: string | null;
    },
  ): Promise<SupportTicketSummary> {
    return request<SupportTicketSummary>(`/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  supportAssignMe(id: string): Promise<SupportTicketSummary> {
    return request<SupportTicketSummary>(`/support/tickets/${id}/assign-me`, {
      method: 'POST',
    });
  },

  // Verificación y sello (empresa)
  myVerification(): Promise<VerificationStatusResponse> {
    return request<VerificationStatusResponse>('/organizations/me/verification');
  },
  uploadVerificationDocument(
    category: VerificationDocumentCategory,
    file: File,
  ): Promise<VerificationDocument> {
    const form = new FormData();
    form.append('category', category);
    form.append('file', file);
    return requestForm<VerificationDocument>('/organizations/me/verification/documents', form);
  },
  deleteVerificationDocument(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/organizations/me/verification/documents/${id}`, {
      method: 'DELETE',
    });
  },
  addVerificationProject(payload: {
    name: string;
    description?: string;
    url?: string;
    projectType?: string;
    city?: string;
    year?: number;
    status?: string;
  }): Promise<VerificationProject> {
    return request<VerificationProject>('/organizations/me/verification/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  uploadProjectVerificationDocument(
    projectId: string,
    file: File,
    evidenceType?: string,
  ): Promise<VerificationDocument> {
    const form = new FormData();
    if (evidenceType) form.append('evidenceType', evidenceType);
    form.append('file', file);
    return requestForm<VerificationDocument>(
      `/organizations/me/verification/projects/${projectId}/documents`,
      form,
    );
  },
  deleteVerificationProject(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/organizations/me/verification/projects/${id}`, {
      method: 'DELETE',
    });
  },
  submitVerification(): Promise<VerificationRequest> {
    return request<VerificationRequest>('/organizations/me/verification/submit', {
      method: 'POST',
    });
  },
  addCertification(payload: {
    name: string;
    issuer: string;
    credentialId?: string;
    credentialUrl?: string;
    issuedAt?: string;
    expiresAt?: string;
  }): Promise<CompanyCertification> {
    return request<CompanyCertification>('/organizations/me/verification/certifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteCertification(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `/organizations/me/verification/certifications/${id}`,
      { method: 'DELETE' },
    );
  },

  // Verificación (super admin)
  adminListVerifications(
    params: ListParams = {},
  ): Promise<Paginated<AdminVerificationSummary>> {
    return request<Paginated<AdminVerificationSummary>>(
      `/admin/verifications${buildQuery(params)}`,
    );
  },
  adminGetVerification(id: string): Promise<VerificationRequest> {
    return request<VerificationRequest>(`/admin/verifications/${id}`);
  },
  adminApproveVerification(
    id: string,
    payload: { expiresInDays?: number; note?: string },
  ): Promise<VerificationRequest> {
    return request<VerificationRequest>(`/admin/verifications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminRejectVerification(id: string, reason: string): Promise<VerificationRequest> {
    return request<VerificationRequest>(`/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  adminRevokeVerification(id: string, reason?: string): Promise<VerificationRequest> {
    return request<VerificationRequest>(`/admin/verifications/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },
  adminVerificationDocument(id: string, documentId: string): Promise<Blob> {
    return requestBlob(`/admin/verifications/${id}/documents/${documentId}`);
  },
  adminListCertifications(
    params: ListParams = {},
  ): Promise<Paginated<AdminCertification>> {
    return request<Paginated<AdminCertification>>(
      `/admin/verifications/certifications${buildQuery(params)}`,
    );
  },
  adminApproveCertification(id: string, note?: string): Promise<AdminCertification> {
    return request<AdminCertification>(
      `/admin/verifications/certifications/${id}/approve`,
      { method: 'POST', body: JSON.stringify(note ? { note } : {}) },
    );
  },
  adminRejectCertification(id: string, reason: string): Promise<AdminCertification> {
    return request<AdminCertification>(
      `/admin/verifications/certifications/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    );
  },
  adminListVerificationInquiries(
    params: ListParams = {},
  ): Promise<Paginated<VerificationInquiry>> {
    return request<Paginated<VerificationInquiry>>(
      `/admin/verifications/inquiries${buildQuery(params)}`,
    );
  },
  adminUpdateVerificationInquiry(
    id: string,
    payload: { status: VerificationInquiryStatus; notes?: string },
  ): Promise<VerificationInquiry> {
    return request<VerificationInquiry>(`/admin/verifications/inquiries/${id}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Membresías, suscripciones y pagos (super admin)
  adminBillingStats(): Promise<BillingStats> {
    return request<BillingStats>('/admin/billing/stats');
  },
  adminListPlans(): Promise<{ plans: AdminPlan[] }> {
    return request<{ plans: AdminPlan[] }>('/admin/plans');
  },
  adminCreatePlan(payload: Record<string, unknown>): Promise<AdminPlan> {
    return request<AdminPlan>('/admin/plans', { method: 'POST', body: JSON.stringify(payload) });
  },
  adminUpdatePlan(id: string, payload: Record<string, unknown>): Promise<AdminPlan> {
    return request<AdminPlan>(`/admin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminListSubscriptions(params: ListParams = {}): Promise<Paginated<AdminSubscription>> {
    return request<Paginated<AdminSubscription>>(`/admin/subscriptions${buildQuery(params)}`);
  },
  adminGetOrganizationSubscription(
    orgId: string,
  ): Promise<{ subscription: AdminSubscription | null }> {
    return request<{ subscription: AdminSubscription | null }>(
      `/admin/organizations/${orgId}/subscription`,
    );
  },
  adminUpsertOrganizationSubscription(
    orgId: string,
    payload: Record<string, unknown>,
  ): Promise<AdminSubscription> {
    return request<AdminSubscription>(`/admin/organizations/${orgId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  adminUpdateSubscription(id: string, payload: Record<string, unknown>): Promise<AdminSubscription> {
    return request<AdminSubscription>(`/admin/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminCancelSubscription(
    id: string,
    payload: { immediate?: boolean; note?: string },
  ): Promise<AdminSubscription> {
    return request<AdminSubscription>(`/admin/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminListPayments(
    params: ListParams & { organizationId?: string } = {},
  ): Promise<Paginated<AdminPayment>> {
    return request<Paginated<AdminPayment>>(`/admin/payments${buildQuery(params)}`);
  },
  adminCreatePayment(payload: Record<string, unknown>): Promise<AdminPayment> {
    return request<AdminPayment>('/admin/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminUpdatePayment(id: string, payload: { status: PaymentStatus }): Promise<AdminPayment> {
    return request<AdminPayment>(`/admin/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Configuración de plataforma
  adminListSettings(): Promise<PlatformSettingItem[]> {
    return request<PlatformSettingItem[]>('/admin/settings');
  },
  adminUpdateSettings(settings: Record<string, unknown>): Promise<PlatformSettingItem[]> {
    return request<PlatformSettingItem[]>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
  },
  adminListSectors(): Promise<SectorItem[]> {
    return request<SectorItem[]>('/admin/sectors');
  },
  adminCreateSector(payload: Record<string, unknown>): Promise<SectorItem> {
    return request<SectorItem>('/admin/sectors', { method: 'POST', body: JSON.stringify(payload) });
  },
  adminUpdateSector(id: string, payload: Record<string, unknown>): Promise<SectorItem> {
    return request<SectorItem>(`/admin/sectors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminDeleteSector(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/sectors/${id}`, { method: 'DELETE' });
  },
  adminListCountries(): Promise<CountryItem[]> {
    return request<CountryItem[]>('/admin/countries');
  },
  adminCreateCountry(payload: Record<string, unknown>): Promise<CountryItem> {
    return request<CountryItem>('/admin/countries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminUpdateCountry(id: string, payload: Record<string, unknown>): Promise<CountryItem> {
    return request<CountryItem>(`/admin/countries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminDeleteCountry(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/countries/${id}`, { method: 'DELETE' });
  },
  adminListLanguages(): Promise<LanguageItem[]> {
    return request<LanguageItem[]>('/admin/languages');
  },
  adminCreateLanguage(payload: Record<string, unknown>): Promise<LanguageItem> {
    return request<LanguageItem>('/admin/languages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminUpdateLanguage(code: string, payload: Record<string, unknown>): Promise<LanguageItem> {
    return request<LanguageItem>(`/admin/languages/${code}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminDeleteLanguage(code: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/languages/${code}`, { method: 'DELETE' });
  },
  adminListEmailTemplates(): Promise<EmailTemplateItem[]> {
    return request<EmailTemplateItem[]>('/admin/email-templates');
  },
  adminUpsertEmailTemplate(
    code: string,
    payload: Record<string, unknown>,
  ): Promise<EmailTemplateItem> {
    return request<EmailTemplateItem>(`/admin/email-templates/${code}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminDeleteEmailTemplate(code: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/email-templates/${code}`, { method: 'DELETE' });
  },
  adminListReportReasons(): Promise<ReportReasonItem[]> {
    return request<ReportReasonItem[]>('/admin/report-reasons');
  },
  adminCreateReportReason(payload: Record<string, unknown>): Promise<ReportReasonItem> {
    return request<ReportReasonItem>('/admin/report-reasons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminUpdateReportReason(id: string, payload: Record<string, unknown>): Promise<ReportReasonItem> {
    return request<ReportReasonItem>(`/admin/report-reasons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminDeleteReportReason(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/report-reasons/${id}`, { method: 'DELETE' });
  },

  // Ficha de empresa del super admin
  adminOrganizationReviews(
    id: string,
    params: ListParams = {},
  ): Promise<AdminReviewList> {
    return request<AdminReviewList>(`/admin/organizations/${id}/reviews${buildQuery(params)}`);
  },
  adminOrganizationStats(id: string, months = 12): Promise<OrganizationStats> {
    return request<OrganizationStats>(`/admin/organizations/${id}/stats?months=${months}`);
  },
  adminUpdateOrganizationMember(
    orgId: string,
    membershipId: string,
    payload: { role?: string; isActive?: boolean },
  ): Promise<Member> {
    return request<Member>(`/admin/organizations/${orgId}/members/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  adminRemoveOrganizationMember(orgId: string, membershipId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/admin/organizations/${orgId}/members/${membershipId}`, {
      method: 'DELETE',
    });
  },
  adminInviteOrganizationMember(
    orgId: string,
    payload: { email: string; role?: string; firstName?: string; lastName?: string },
  ): Promise<Invitation> {
    return request<Invitation>(`/admin/organizations/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Catálogos y suscripción de la empresa
  publicCatalogs(): Promise<PublicCatalogs> {
    return request<PublicCatalogs>('/public/catalogs');
  },
  publicConfig(): Promise<PublicConfig> {
    return request<PublicConfig>('/public/config');
  },
  publicPlans(): Promise<{ plans: AdminPlan[] }> {
    return request<{ plans: AdminPlan[] }>('/public/plans');
  },
  mySubscription(): Promise<CompanySubscription> {
    return request<CompanySubscription>('/organizations/me/subscription');
  },
  changeMyPlan(planId: string): Promise<AdminSubscription> {
    return request<AdminSubscription>('/organizations/me/subscription/change', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  },
  myPayments(params: ListParams = {}): Promise<Paginated<AdminPayment>> {
    return request<Paginated<AdminPayment>>(`/organizations/me/payments${buildQuery(params)}`);
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
