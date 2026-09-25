import { Prisma, ScanSourceType } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface AnalyticsFilter {
  businessIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface DailyTrendPoint {
  date: string;
  qr: number;
  nfc: number;
  total: number;
}

export class AnalyticsRepository {
  /**
   * Database-side aggregation for high-level KPI metrics
   * Never loads individual scan records into memory.
   */
  static async getSummaryKPIs(businessIds?: string[]) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseWhere: Prisma.ScanEventWhereInput = businessIds
      ? { businessId: { in: businessIds } }
      : {};

    const [totalEvents, qrEvents, nfcEvents, todayEvents, last7DaysEvents, last30DaysEvents] =
      await Promise.all([
        prisma.scanEvent.count({ where: baseWhere }),
        prisma.scanEvent.count({ where: { ...baseWhere, sourceType: 'QR' } }),
        prisma.scanEvent.count({ where: { ...baseWhere, sourceType: 'NFC' } }),
        prisma.scanEvent.count({ where: { ...baseWhere, createdAt: { gte: startOfToday } } }),
        prisma.scanEvent.count({ where: { ...baseWhere, createdAt: { gte: sevenDaysAgo } } }),
        prisma.scanEvent.count({ where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo } } }),
      ]);

    return {
      totalEvents,
      qrEvents,
      nfcEvents,
      todayEvents,
      last7DaysEvents,
      last30DaysEvents,
    };
  }

  /**
   * Source breakdown aggregation (QR vs NFC)
   */
  static async getSourceDistribution(businessIds?: string[], startDate?: Date, endDate?: Date) {
    const where: Prisma.ScanEventWhereInput = {
      ...(businessIds ? { businessId: { in: businessIds } } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const grouped = await prisma.scanEvent.groupBy({
      by: ['sourceType'],
      _count: {
        id: true,
      },
      where,
    });

    let qr = 0;
    let nfc = 0;
    for (const item of grouped) {
      if (item.sourceType === 'QR') qr = item._count.id;
      if (item.sourceType === 'NFC') nfc = item._count.id;
    }

    const total = qr + nfc;
    const qrPercentage = total > 0 ? Math.round((qr / total) * 100) : 0;
    const nfcPercentage = total > 0 ? Math.round((nfc / total) * 100) : 0;

    return {
      qr,
      nfc,
      total,
      qrPercentage,
      nfcPercentage,
    };
  }

  /**
   * Daily time series trends for the last N days
   */
  static async getDailyTrends(businessIds?: string[], days: number = 14): Promise<DailyTrendPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const where: Prisma.ScanEventWhereInput = {
      createdAt: { gte: startDate },
      ...(businessIds ? { businessId: { in: businessIds } } : {}),
    };

    const events = await prisma.scanEvent.findMany({
      where,
      select: {
        createdAt: true,
        sourceType: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Bucket into dates
    const dateMap = new Map<string, { qr: number; nfc: number; total: number }>();

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      dateMap.set(dateKey, { qr: 0, nfc: 0, total: 0 });
    }

    for (const e of events) {
      const dateKey = e.createdAt.toISOString().slice(0, 10);
      const entry = dateMap.get(dateKey);
      if (entry) {
        if (e.sourceType === 'QR') entry.qr++;
        else if (e.sourceType === 'NFC') entry.nfc++;
        entry.total++;
      }
    }

    return Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }

  /**
   * Top businesses ranked by scan volume
   */
  static async getTopBusinesses(ownerId?: string, limit: number = 5) {
    return prisma.business.findMany({
      where: {
        deletedAt: null,
        ...(ownerId ? { ownerId } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        status: true,
        _count: {
          select: { scanEvents: true },
        },
      },
      orderBy: {
        scanEvents: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  /**
   * Device & Browser breakdown aggregation
   */
  static async getDeviceBreakdown(businessIds?: string[]) {
    const where: Prisma.ScanEventWhereInput = businessIds
      ? { businessId: { in: businessIds } }
      : {};

    const [byDevice, byOs] = await Promise.all([
      prisma.scanEvent.groupBy({
        by: ['deviceType'],
        _count: { id: true },
        where,
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.scanEvent.groupBy({
        by: ['os'],
        _count: { id: true },
        where,
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      devices: byDevice.map((d) => ({
        device: d.deviceType || 'desktop',
        count: d._count.id,
      })),
      operatingSystems: byOs.map((o) => ({
        os: o.os || 'unknown',
        count: o._count.id,
      })),
    };
  }
}
