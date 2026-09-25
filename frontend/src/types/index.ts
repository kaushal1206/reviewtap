export type Role = 'SUPER_ADMIN' | 'BUSINESS_OWNER';

export type BusinessStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type TapSourceType = 'QR_CODE' | 'NFC_CARD' | 'COUNTERTOP_STAND' | 'DIRECT_LINK';

export type ScanSourceType = 'QR' | 'NFC' | 'DIRECT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface TapSource {
  id: string;
  businessId: string;
  shortCode: string;
  type: TapSourceType;
  label: string;
  nfcTagUid?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type NfcCardStatus = 'UNASSIGNED' | 'ASSIGNED' | 'ACTIVE' | 'INACTIVE' | 'RETIRED';

export interface NfcCard {
  id: string;
  publicId: string;
  label: string;
  status: NfcCardStatus;
  nfcTagUid?: string | null;
  businessId?: string | null;
  batchNumber?: string | null;
  activatedAt?: string | null;
  deactivatedAt?: string | null;
  retiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  business?: {
    id: string;
    name: string;
    slug: string;
    googleReviewUrl: string;
    status: BusinessStatus;
  } | null;
  totalTaps?: number;
  nfcUrl?: string;
  analytics?: {
    totalTaps: number;
    uniqueVisitors: number;
    recentEvents: EventLog[];
    dailyTaps: { date: string; count: number }[];
  };
}

export interface NfcCardCounts {
  total: number;
  unassigned: number;
  assigned: number;
  active: number;
  inactive: number;
  retired: number;
}

export interface CreateNfcCardDto {
  label?: string;
  businessId?: string;
  nfcTagUid?: string;
  batchNumber?: string;
  activateImmediately?: boolean;
}

export interface UpdateNfcCardDto {
  label?: string;
  nfcTagUid?: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  googlePlaceId?: string | null;
  googleReviewUrl: string;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  category?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  status: BusinessStatus;
  isActive: boolean;
  deletedAt?: string | null;
  brandingSettings?: {
    primaryColor?: string;
    accentColor?: string;
    showDirectRedirect?: boolean;
  } | null;
  createdAt: string;
  updatedAt?: string;
  tapSources?: TapSource[];
  nfcCards?: NfcCard[];
  totalScans?: number;
  publicReviewUrl?: string;
}

export interface BusinessCounts {
  total: number;
  active: number;
  inactive: number;
  archived: number;
}

export interface AnalyticsKPIs {
  totalEvents: number;
  qrEvents: number;
  nfcEvents: number;
  todayEvents: number;
  last7DaysEvents: number;
  last30DaysEvents: number;
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
}

export interface SourceDistribution {
  qr: number;
  nfc: number;
  total: number;
  qrPercentage: number;
  nfcPercentage: number;
}

export interface DailyTrendPoint {
  date: string;
  qr: number;
  nfc: number;
  total: number;
}

export interface AnalyticsOverview {
  kpis: AnalyticsKPIs;
  distribution: SourceDistribution;
  trends: DailyTrendPoint[];
  topBusinesses: {
    id: string;
    name: string;
    slug: string;
    category?: string | null;
    status: BusinessStatus;
    _count: { scanEvents: number };
  }[];
  devices: {
    devices: { device: string; count: number }[];
    operatingSystems: { os: string; count: number }[];
  };
}

export interface EventLog {
  id: string;
  businessId: string;
  sourceType: ScanSourceType;
  deviceType?: string | null;
  os?: string | null;
  browser?: string | null;
  country?: string | null;
  city?: string | null;
  createdAt: string;
  business: {
    id: string;
    name: string;
    slug: string;
    googleReviewUrl: string;
  };
  tapSource?: {
    id: string;
    shortCode: string;
    label: string;
    type: TapSourceType;
  } | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  isActive: boolean;
  isDefault: boolean;
  maxBusinesses: number;
  maxQrSources: number;
  maxNfcCards: number;
  maxMonthlyEvents: number;
  analyticsRetentionDays: number;
  customBranding: boolean;
  exportAnalytics: boolean;
  prioritySupport: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  plan: Plan;
  business?: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    status: BusinessStatus;
  };
}

export interface BusinessUsage {
  activeQrSources: number;
  totalQrSources: number;
  activeNfcCards: number;
  totalNfcCards: number;
  monthlyTotalEvents: number;
  monthlyQrScans: number;
  monthlyNfcTaps: number;
}

export interface SubscriptionDetails {
  subscription: Subscription;
  plan: Plan;
  usage: BusinessUsage;
  limits: {
    maxQrSources: number;
    maxNfcCards: number;
    maxMonthlyEvents: number;
    analyticsRetentionDays: number;
    customBranding: boolean;
    exportAnalytics: boolean;
    prioritySupport: boolean;
  };
  remaining: {
    qrSources: number;
    nfcCards: number;
    monthlyEvents: number;
  };
  isLimitReached: {
    qrSources: boolean;
    nfcCards: boolean;
    monthlyEvents: boolean;
  };
}

export type PaymentOrderStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type InvoiceStatus = 'PAID' | 'PENDING' | 'VOID' | 'REFUNDED';

export interface PaymentOrder {
  id: string;
  orderReference: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  planCode: string;
  planName: string;
  gateway: string;
  checkoutSignature?: string;
  createdAt: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  subscriptionId: string;
  paymentOrderId?: string | null;
  planCode: string;
  planName: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  paidAt?: string | null;
  pdfReceiptUrl?: string | null;
  createdAt: string;
  paymentOrder?: {
    id: string;
    orderReference: string;
    gateway: string;
    status: string;
  } | null;
  business?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface InvoicesResponse {
  invoices: BillingInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Phase 6 SaaS Types
// ==========================================

export type TeamRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface TeamMember {
  id: string;
  userId: string;
  businessId: string;
  role: TeamRole;
  isBusinessOwner: boolean;
  fullName: string;
  email: string;
  joinedAt: string;
  invitedBy?: string | null;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface Invitation {
  id: string;
  businessId: string;
  email: string;
  role: TeamRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  business?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
}

export type NotificationType =
  | 'SUBSCRIPTION'
  | 'USAGE_LIMIT'
  | 'NFC_CARD'
  | 'BUSINESS'
  | 'SYSTEM'
  | 'TEAM';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export interface Notification {
  id: string;
  userId: string;
  businessId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
  business?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ActivityLog {
  id: string;
  businessId: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
  };
}

export type BusinessHealthStatus = 'HEALTHY' | 'WARNING' | 'INACTIVE';

export interface BusinessHealth {
  status: BusinessHealthStatus;
  score: number;
  breakdown: {
    activityScore: number;
    volumeScore: number;
    hardwareScore: number;
    subscriptionScore: number;
  };
  metrics: {
    daysSinceLastScan: number | null;
    lastScanAt: string | null;
    scansLast30Days: number;
    scansLast7Days: number;
    activeNfcCards: number;
    activeQrStands: number;
    hasPlaceId: boolean;
    subscriptionStatus: string;
  };
  factors: string[];
}

export interface BusinessInsight {
  id: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  actionUrl?: string;
  isDismissed: boolean;
  metadata?: Record<string, any>;
  calculatedAt: string;
}

export interface TopPerformer {
  id: string;
  label: string;
  identifier: string;
  type: string;
  totalEvents: number;
  percentageOfTotal: number;
  lastEventAt: string | null;
}

export interface ReviewIntelligence {
  summary: {
    totalScans: number;
    totalRedirects: number;
    totalNfcTaps: number;
    totalQrScans: number;
    totalDirect: number;
    nfcSharePercent: number;
    qrSharePercent: number;
    directSharePercent: number;
  };
  velocity: {
    current7Days: number;
    previous7Days: number;
    weeklyChangePercent: number;
    trendDirection: 'UP' | 'DOWN' | 'STABLE';
    current30Days: number;
    previous30Days: number;
    monthlyChangePercent: number;
  };
  topPerformers: {
    nfcCards: TopPerformer[];
    qrSources: TopPerformer[];
  };
  trends: {
    daily: { date: string; qr: number; nfc: number; total: number }[];
  };
}

export interface PlatformOverview {
  overview: {
    businesses: {
      total: number;
      active: number;
      inactive: number;
    };
    users: {
      total: number;
    };
    telemetry: {
      totalScans: number;
      qrScans: number;
      nfcTaps: number;
      scans30Days: number;
      nfcPercentage: number;
    };
    nfcInventory: {
      total: number;
      active: number;
      unassigned: number;
      utilizationPercent: number;
    };
    subscriptions: {
      totalActive: number;
      mrr: number;
      arr: number;
      distribution: Record<string, number>;
    };
  };
  recentActivity: ActivityLog[];
}

