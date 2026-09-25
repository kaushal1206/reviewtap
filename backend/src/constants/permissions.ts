import { TeamRole } from '@prisma/client';

export { TeamRole };

export type TeamCapability =
  | 'BUSINESS_VIEW'
  | 'BUSINESS_UPDATE'
  | 'BUSINESS_DELETE'
  | 'BUSINESS_HEALTH_VIEW'
  | 'NFC_VIEW'
  | 'NFC_MANAGE'
  | 'QR_VIEW'
  | 'QR_MANAGE'
  | 'ANALYTICS_VIEW'
  | 'ANALYTICS_EXPORT'
  | 'TEAM_VIEW'
  | 'TEAM_INVITE'
  | 'TEAM_MANAGE'
  | 'BILLING_VIEW'
  | 'BILLING_MANAGE'
  | 'ACTIVITY_VIEW'
  | 'INSIGHTS_VIEW'
  | 'INSIGHTS_MANAGE';

export const ALL_CAPABILITIES: TeamCapability[] = [
  'BUSINESS_VIEW',
  'BUSINESS_UPDATE',
  'BUSINESS_DELETE',
  'BUSINESS_HEALTH_VIEW',
  'NFC_VIEW',
  'NFC_MANAGE',
  'QR_VIEW',
  'QR_MANAGE',
  'ANALYTICS_VIEW',
  'ANALYTICS_EXPORT',
  'TEAM_VIEW',
  'TEAM_INVITE',
  'TEAM_MANAGE',
  'BILLING_VIEW',
  'BILLING_MANAGE',
  'ACTIVITY_VIEW',
  'INSIGHTS_VIEW',
  'INSIGHTS_MANAGE',
];

export const ROLE_CAPABILITIES: Record<TeamRole, TeamCapability[]> = {
  OWNER: [...ALL_CAPABILITIES],
  MANAGER: [
    'BUSINESS_VIEW',
    'BUSINESS_UPDATE',
    'BUSINESS_HEALTH_VIEW',
    'NFC_VIEW',
    'NFC_MANAGE',
    'QR_VIEW',
    'QR_MANAGE',
    'ANALYTICS_VIEW',
    'ANALYTICS_EXPORT',
    'TEAM_VIEW',
    'TEAM_INVITE',
    'TEAM_MANAGE',
    'BILLING_VIEW',
    'ACTIVITY_VIEW',
    'INSIGHTS_VIEW',
    'INSIGHTS_MANAGE',
  ],
  STAFF: [
    'BUSINESS_VIEW',
    'BUSINESS_HEALTH_VIEW',
    'NFC_VIEW',
    'QR_VIEW',
    'ANALYTICS_VIEW',
    'TEAM_VIEW',
    'ACTIVITY_VIEW',
    'INSIGHTS_VIEW',
  ],
};

export function hasCapability(role: TeamRole | 'SUPER_ADMIN', capability: TeamCapability): boolean {
  if (role === 'SUPER_ADMIN') {
    return true;
  }
  const capabilities = ROLE_CAPABILITIES[role] || [];
  return capabilities.includes(capability);
}
