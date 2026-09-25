import { prisma } from '../config/db.js';

export interface TopPerformer {
  id: string;
  label: string;
  identifier: string; // publicId or shortCode
  type: string;
  totalEvents: number;
  percentageOfTotal: number;
  lastEventAt: Date | null;
}

export class ReviewIntelligenceService {
  /**
   * Aggregates comprehensive review performance intelligence
   */
  static async getBusinessIntelligence(businessId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Overall telemetry counts
    const [
      totalScans,
      totalQrScans,
      totalNfcTaps,
      totalDirect,
      current7DayEvents,
      previous7DayEvents,
      current30DayEvents,
      previous30DayEvents,
    ] = await Promise.all([
      prisma.scanEvent.count({ where: { businessId } }),
      prisma.scanEvent.count({ where: { businessId, sourceType: 'QR' } }),
      prisma.scanEvent.count({ where: { businessId, sourceType: 'NFC' } }),
      prisma.scanEvent.count({ where: { businessId, sourceType: 'DIRECT' } }),
      prisma.scanEvent.count({
        where: { businessId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.scanEvent.count({
        where: {
          businessId,
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      prisma.scanEvent.count({
        where: { businessId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.scanEvent.count({
        where: {
          businessId,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
    ]);

    const qrSharePercent = totalScans > 0 ? Number(((totalQrScans / totalScans) * 100).toFixed(1)) : 0;
    const nfcSharePercent = totalScans > 0 ? Number(((totalNfcTaps / totalScans) * 100).toFixed(1)) : 0;
    const directSharePercent = totalScans > 0 ? Number(((totalDirect / totalScans) * 100).toFixed(1)) : 0;

    // 2. Velocity calculations
    const weeklyVelocityChange =
      previous7DayEvents === 0
        ? current7DayEvents > 0
          ? 100
          : 0
        : Number((((current7DayEvents - previous7DayEvents) / previous7DayEvents) * 100).toFixed(1));

    const monthlyVelocityChange =
      previous30DayEvents === 0
        ? current30DayEvents > 0
          ? 100
          : 0
        : Number((((current30DayEvents - previous30DayEvents) / previous30DayEvents) * 100).toFixed(1));

    const weeklyTrendDirection =
      weeklyVelocityChange > 5 ? 'UP' : weeklyVelocityChange < -5 ? 'DOWN' : 'STABLE';

    // 3. Top Performing NFC Cards
    const nfcAggregations = await prisma.scanEvent.groupBy({
      by: ['nfcCardId'],
      where: { businessId, nfcCardId: { not: null } },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const nfcCardIds = nfcAggregations
      .map((a) => a.nfcCardId)
      .filter((id): id is string => Boolean(id));

    const nfcCards = await prisma.nfcCard.findMany({
      where: { id: { in: nfcCardIds } },
      select: { id: true, publicId: true, label: true, status: true },
    });

    const nfcCardMap = new Map(nfcCards.map((c) => [c.id, c]));

    const topNfcCards: TopPerformer[] = nfcAggregations
      .map((item) => {
        const card = item.nfcCardId ? nfcCardMap.get(item.nfcCardId) : null;
        const count = item._count.id;
        return {
          id: item.nfcCardId || '',
          label: card ? card.label : 'Unknown NFC Card',
          identifier: card ? card.publicId : 'N/A',
          type: 'NFC_CARD',
          totalEvents: count,
          percentageOfTotal: totalNfcTaps > 0 ? Number(((count / totalNfcTaps) * 100).toFixed(1)) : 0,
          lastEventAt: item._max.createdAt,
        };
      })
      .filter((p) => p.id);

    // 4. Top Performing QR Sources / Stands
    const qrAggregations = await prisma.scanEvent.groupBy({
      by: ['tapSourceId'],
      where: { businessId, tapSourceId: { not: null }, sourceType: 'QR' },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const qrSourceIds = qrAggregations
      .map((a) => a.tapSourceId)
      .filter((id): id is string => Boolean(id));

    const qrSources = await prisma.tapSource.findMany({
      where: { id: { in: qrSourceIds } },
      select: { id: true, shortCode: true, label: true, type: true },
    });

    const qrSourceMap = new Map(qrSources.map((s) => [s.id, s]));

    const topQrSources: TopPerformer[] = qrAggregations
      .map((item) => {
        const source = item.tapSourceId ? qrSourceMap.get(item.tapSourceId) : null;
        const count = item._count.id;
        return {
          id: item.tapSourceId || '',
          label: source ? source.label : 'Default QR Stand',
          identifier: source ? source.shortCode : 'N/A',
          type: source ? source.type : 'QR_CODE',
          totalEvents: count,
          percentageOfTotal: totalQrScans > 0 ? Number(((count / totalQrScans) * 100).toFixed(1)) : 0,
          lastEventAt: item._max.createdAt,
        };
      })
      .filter((p) => p.id);

    // 5. Daily trend (past 14 days)
    const dailyRaw = await prisma.$queryRaw<Array<{ date: string; qr: bigint; nfc: bigint; total: bigint }>>`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM-DD') AS date,
        COUNT(CASE WHEN "sourceType" = 'QR' THEN 1 END) AS qr,
        COUNT(CASE WHEN "sourceType" = 'NFC' THEN 1 END) AS nfc,
        COUNT(*) AS total
      FROM "scan_events"
      WHERE "businessId" = ${businessId}
        AND "createdAt" >= ${fourteenDaysAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
      ORDER BY date ASC;
    `;

    const dailyTrends = dailyRaw.map((r) => ({
      date: r.date,
      qr: Number(r.qr),
      nfc: Number(r.nfc),
      total: Number(r.total),
    }));

    return {
      summary: {
        totalScans,
        totalRedirects: totalScans, // Every recorded scan event successfully executed 302 redirect
        totalNfcTaps,
        totalQrScans,
        totalDirect,
        nfcSharePercent,
        qrSharePercent,
        directSharePercent,
      },
      velocity: {
        current7Days: current7DayEvents,
        previous7Days: previous7DayEvents,
        weeklyChangePercent: weeklyVelocityChange,
        trendDirection: weeklyTrendDirection,
        current30Days: current30DayEvents,
        previous30Days: previous30DayEvents,
        monthlyChangePercent: monthlyVelocityChange,
      },
      topPerformers: {
        nfcCards: topNfcCards,
        qrSources: topQrSources,
      },
      trends: {
        daily: dailyTrends,
      },
    };
  }
}
