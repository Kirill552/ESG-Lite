import { prisma } from '../prisma';

export interface CreditTransaction {
  userId: string;
  orgId: string;
  amount: number;
  type: 'purchase' | 'bonus' | 'deduction' | 'refund';
  description: string;
  referenceId?: string;
  referenceType?: string;
}

export class CreditsService {
  // Получить текущий баланс организации
  async getBalance(orgId: string): Promise<number> {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    return org?.creditBalance || 0;
  }

  // Добавить/списать кредиты
  async addTransaction(transaction: CreditTransaction): Promise<void> {
    const { userId, orgId, amount, type, description, referenceId, referenceType } = transaction;

    // Получаем текущий баланс
    const currentBalance = await this.getBalance(orgId);
    
    // Вычисляем новый баланс
    let newBalance: number;
    if (type === 'purchase' || type === 'bonus' || type === 'refund') {
      newBalance = currentBalance + amount;
    } else {
      newBalance = currentBalance - amount;
      
      // Проверяем, достаточно ли кредитов
      if (newBalance < 0) {
        throw new Error('Недостаточно кредитов');
      }
    }

    // Начинаем транзакцию
    await prisma.$transaction(async (tx) => {
      // Создаем запись о транзакции
      await tx.credit.create({
        data: {
          userId,
          orgId,
          amount: type === 'deduction' ? -amount : amount,
          type,
          description,
          referenceId,
          referenceType,
          balance: newBalance,
        },
      });

      // Обновляем баланс организации
      await tx.organization.update({
        where: { clerkOrgId: orgId },
        data: { creditBalance: newBalance },
      });
    });
  }

  // Проверить, достаточно ли кредитов для операции
  async hasEnoughCredits(orgId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance(orgId);
    return balance >= requiredAmount;
  }

  // Получить историю транзакций
  async getTransactionHistory(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: any = { orgId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const transactions = await prisma.credit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const total = await prisma.credit.count({ where });

    return {
      transactions,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    };
  }

  // Рассчитать стоимость с учетом surge pricing
  async calculateCost(
    orgId: string,
    baseAmount: number,
    checkSurgePricing: boolean = true
  ): Promise<{ amount: number; isSurge: boolean; surgeMultiplier: number }> {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    let surgeMultiplier = 1.0;
    let isSurge = false;

    if (checkSurgePricing) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const day = now.getDate();

      // Проверяем, попадаем ли в период surge pricing (15-30 июня)
      if (month === 6 && day >= 15 && day <= 30) {
        surgeMultiplier = org?.surgeMultiplier || 2.0;
        isSurge = true;
      }
    }

    const amount = Math.ceil(baseAmount * surgeMultiplier);

    return {
      amount,
      isSurge,
      surgeMultiplier,
    };
  }

  // Получить статистику использования кредитов
  async getUsageStats(orgId: string, year: number, month?: number) {
    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = month 
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);

    const stats = await prisma.credit.groupBy({
      by: ['type'],
      where: {
        orgId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const totalUsed = stats
      .filter(s => s.type === 'deduction')
      .reduce((sum, s) => sum + Math.abs(s._sum.amount || 0), 0);

    const totalAdded = stats
      .filter(s => ['purchase', 'bonus', 'refund'].includes(s.type))
      .reduce((sum, s) => sum + (s._sum.amount || 0), 0);

    return {
      period: { year, month },
      totalUsed,
      totalAdded,
      byType: stats.map(s => ({
        type: s.type,
        total: Math.abs(s._sum.amount || 0),
        count: s._count,
      })),
    };
  }
}

export const creditsService = new CreditsService();