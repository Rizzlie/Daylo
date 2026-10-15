import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, type Prisma } from '@daylo/api/core/database';
import { TransactionContext } from '@daylo/api/core/transactions/contracts';

export interface PersonalTaskFields {
  title: string;
  description: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
}

const taskSelect = {
  id: true,
  createdById: true,
  title: true,
  description: true,
  scheduledDate: true,
  scheduledTime: true,
  completedAt: true,
  completedById: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PersonalTaskRow = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

function mapTask(row: PersonalTaskRow) {
  return {
    id: row.id,
    createdById: row.createdById,
    groupId: null as null,
    title: row.title,
    description: row.description,
    scheduledDate: row.scheduledDate.toISOString().slice(0, 10),
    scheduledTime: row.scheduledTime?.toISOString().slice(11, 16) ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    completedById: row.completedById,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type PersonalTaskRecord = ReturnType<typeof mapTask>;

function persistenceFields(fields: PersonalTaskFields) {
  return {
    title: fields.title,
    description: fields.description,
    scheduledDate: new Date(`${fields.scheduledDate}T00:00:00.000Z`),
    scheduledTime:
      fields.scheduledTime === null ? null : new Date(`1970-01-01T${fields.scheduledTime}:00.000Z`),
  };
}

@Injectable()
export class PersonalTaskStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, fields: PersonalTaskFields, context: TransactionContext) {
    const row = await this.prisma.getTransactionClient(context).task.create({
      data: { ...persistenceFields(fields), createdById: userId, groupId: null },
      select: taskSelect,
    });
    return mapTask(row);
  }

  async find(userId: string, id: string, context?: TransactionContext) {
    const client = context ? this.prisma.getTransactionClient(context) : this.prisma.client;
    const row = await client.task.findFirst({
      where: { id, createdById: userId, groupId: null },
      select: taskSelect,
    });
    return row ? mapTask(row) : null;
  }

  async list(userId: string, limit: number, after?: string) {
    // UUID keyset ordering is deterministic even when creation timestamps tie.
    // A cursor is only a boundary, never a lookup of another user's resource.
    const rows = await this.prisma.client.task.findMany({
      where: { createdById: userId, groupId: null, ...(after ? { id: { gt: after } } : {}) },
      orderBy: { id: 'asc' },
      take: limit + 1,
      select: taskSelect,
    });
    const items = rows.slice(0, limit).map(mapTask);
    return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
  }

  async lock(userId: string, id: string, context: TransactionContext) {
    const client = this.prisma.getTransactionClient(context);
    // Keep the lock until the use-case transaction ends, including no-op checks.
    // Ownership and personal visibility are checked in SQL before locking.
    await client.$queryRaw`
      SELECT id FROM tasks
      WHERE id = ${id}::uuid AND created_by_id = ${userId}::uuid AND group_id IS NULL
      FOR UPDATE
    `;
    return this.find(userId, id, context);
  }

  async edit(task: PersonalTaskRecord, fields: PersonalTaskFields, context: TransactionContext) {
    const row = await this.prisma.getTransactionClient(context).task.update({
      where: { id: task.id, createdById: task.createdById, groupId: null, version: task.version },
      data: { ...persistenceFields(fields), version: { increment: 1 } },
      select: taskSelect,
    });
    return mapTask(row);
  }

  async setCompletion(
    task: PersonalTaskRecord,
    completed: boolean,
    now: Date,
    context: TransactionContext,
  ) {
    const row = await this.prisma.getTransactionClient(context).task.update({
      where: { id: task.id, createdById: task.createdById, groupId: null, version: task.version },
      data: {
        completedAt: completed ? now : null,
        completedById: completed ? task.createdById : null,
        version: { increment: 1 },
      },
      select: taskSelect,
    });
    return mapTask(row);
  }

  async delete(task: PersonalTaskRecord, context: TransactionContext): Promise<void> {
    await this.prisma.getTransactionClient(context).task.delete({
      where: { id: task.id, createdById: task.createdById, groupId: null, version: task.version },
    });
  }
}
