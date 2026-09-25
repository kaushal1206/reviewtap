import { Role, ScanSourceType } from '@prisma/client';
import { EventRepository } from '../repositories/event.repository.js';
import { BusinessRepository } from '../repositories/business.repository.js';

export interface EventQueryInput {
  businessId?: string;
  sourceType?: ScanSourceType;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class EventService {
  static async getEvents(user: { id: string; role: Role }, query: EventQueryInput) {
    let permittedBusinessIds: string[] | undefined;

    if (user.role !== 'SUPER_ADMIN') {
      const { businesses } = await BusinessRepository.findMany({ ownerId: user.id }, { limit: 1000 });
      const ownedIds = businesses.map((b) => b.id);

      if (query.businessId && !ownedIds.includes(query.businessId)) {
        const error: any = new Error('Forbidden: You do not have permission to view events for this business');
        error.statusCode = 403;
        throw error;
      }

      permittedBusinessIds = ownedIds;
    }

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return EventRepository.findEvents({
      businessIds: permittedBusinessIds,
      businessId: query.businessId,
      sourceType: query.sourceType,
      startDate,
      endDate,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }
}
