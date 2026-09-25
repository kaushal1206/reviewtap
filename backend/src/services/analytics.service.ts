import { Role } from '@prisma/client';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { BusinessRepository } from '../repositories/business.repository.js';

export class AnalyticsService {
  /**
   * Helper to resolve the permitted business IDs for the requesting user
   */
  private static async getPermittedBusinessIds(
    user: { id: string; role: Role },
    requestedBusinessId?: string
  ): Promise<string[] | undefined> {
    if (user.role === 'SUPER_ADMIN') {
      return requestedBusinessId ? [requestedBusinessId] : undefined;
    }

    // For Business Owner: fetch all owned business IDs
    const { businesses } = await BusinessRepository.findMany({ ownerId: user.id }, { limit: 1000 });
    const ownedIds = businesses.map((b) => b.id);

    if (requestedBusinessId) {
      if (!ownedIds.includes(requestedBusinessId)) {
        const error: any = new Error('Forbidden: You do not have permission to view analytics for this business');
        error.statusCode = 403;
        throw error;
      }
      return [requestedBusinessId];
    }

    return ownedIds;
  }

  static async getOverview(user: { id: string; role: Role }, businessId?: string) {
    const permittedIds = await this.getPermittedBusinessIds(user, businessId);

    const [kpis, distribution, trends, topBusinesses, devices] = await Promise.all([
      AnalyticsRepository.getSummaryKPIs(permittedIds),
      AnalyticsRepository.getSourceDistribution(permittedIds),
      AnalyticsRepository.getDailyTrends(permittedIds, 14),
      AnalyticsRepository.getTopBusinesses(user.role === 'SUPER_ADMIN' ? undefined : user.id, 5),
      AnalyticsRepository.getDeviceBreakdown(permittedIds),
    ]);

    const businessCounts = await BusinessRepository.countByOwner(
      user.role === 'SUPER_ADMIN' ? undefined : user.id
    );

    return {
      kpis: {
        ...kpis,
        totalBusinesses: businessCounts.total,
        activeBusinesses: businessCounts.active,
        inactiveBusinesses: businessCounts.inactive,
      },
      distribution,
      trends,
      topBusinesses,
      devices,
    };
  }

  static async getTrends(user: { id: string; role: Role }, days: number = 30, businessId?: string) {
    const permittedIds = await this.getPermittedBusinessIds(user, businessId);
    const validDays = Math.min(90, Math.max(7, days));
    const trends = await AnalyticsRepository.getDailyTrends(permittedIds, validDays);
    return { trends };
  }

  static async getSourceDistribution(user: { id: string; role: Role }, businessId?: string) {
    const permittedIds = await this.getPermittedBusinessIds(user, businessId);
    const distribution = await AnalyticsRepository.getSourceDistribution(permittedIds);
    return { distribution };
  }
}
