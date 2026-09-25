import { Prisma, Plan } from '@prisma/client';
import { prisma } from '../config/db.js';

export class PlanRepository {
  static async findById(id: string): Promise<Plan | null> {
    return prisma.plan.findUnique({
      where: { id },
    });
  }

  static async findByCode(code: string): Promise<Plan | null> {
    return prisma.plan.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  static async findDefault(): Promise<Plan | null> {
    return (
      (await prisma.plan.findFirst({
        where: { isDefault: true, isActive: true },
      })) ||
      (await prisma.plan.findFirst({
        where: { code: 'FREE' },
      })) ||
      (await prisma.plan.findFirst({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      }))
    );
  }

  static async findMany(filter: { isActive?: boolean } = {}): Promise<Plan[]> {
    return prisma.plan.findMany({
      where: {
        ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
      orderBy: { price: 'asc' },
    });
  }

  static async create(data: Prisma.PlanCreateInput): Promise<Plan> {
    return prisma.plan.create({
      data,
    });
  }

  static async update(id: string, data: Prisma.PlanUpdateInput): Promise<Plan> {
    return prisma.plan.update({
      where: { id },
      data,
    });
  }

  static async count(): Promise<number> {
    return prisma.plan.count();
  }
}
