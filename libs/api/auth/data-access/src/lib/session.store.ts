import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@daylo/api/core/database';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface StoredSession {
  id: string;
  csrfTokenHash: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string;
    accessStatus: 'ACTIVE' | 'PENDING';
  };
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
}

const sessionSelect = {
  id: true,
  csrfTokenHash: true,
  expiresAt: true,
  user: { select: { id: true, email: true, displayName: true, accessStatus: true } },
} as const;

type RenewedSessionRow = Omit<StoredSession, 'user'> & Omit<StoredSession['user'], 'id'> & { userId: string };

function mapRenewedSession(row: RenewedSessionRow): StoredSession {
  return {
    id: row.id,
    csrfTokenHash: row.csrfTokenHash,
    expiresAt: row.expiresAt,
    user: { id: row.userId, email: row.email, displayName: row.displayName, accessStatus: row.accessStatus },
  };
}

const absoluteSessionCutoff = (now: Date) => new Date(now.getTime() - SESSION_MAX_AGE_SECONDS * 1000);

@Injectable()
export class SessionStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: NewSession, previousTokenHash?: string): Promise<void> {
    await this.prisma.client.$transaction(async (client) => {
      if (previousTokenHash) {
        await client.session.deleteMany({ where: { tokenHash: previousTokenHash } });
      }
      await client.session.create({ data });
    });
  }

  async findValid(tokenHash: string, now: Date): Promise<StoredSession | null> {
    return this.prisma.client.session.findFirst({
      where: {
        tokenHash, expiresAt: { gt: now },
        createdAt: { gt: absoluteSessionCutoff(now) },
      },
      select: sessionSelect,
    });
  }

  async renew(tokenHash: string, now: Date, expiresAt: Date): Promise<StoredSession | null> {
    // The expiry check and update are one statement. Revocation cannot be undone,
    // and out-of-order renewals cannot shorten an already extended deadline.
    const rows = await this.prisma.client.$queryRaw<RenewedSessionRow[]>`
      WITH renewed AS (
        UPDATE sessions
        SET expires_at = LEAST(
          GREATEST(expires_at, ${expiresAt}),
          created_at + ${SESSION_MAX_AGE_SECONDS} * INTERVAL '1 second'
        )
        WHERE token_hash = ${tokenHash} AND expires_at > ${now}
          AND created_at > ${absoluteSessionCutoff(now)}
        RETURNING id, user_id, csrf_token_hash, expires_at
      )
      SELECT s.id, s.csrf_token_hash AS "csrfTokenHash", s.expires_at AS "expiresAt",
             u.id AS "userId", u.email, u.display_name AS "displayName",
             UPPER(u.access_status::text) AS "accessStatus"
      FROM renewed s JOIN users u ON u.id = s.user_id
    `;
    const row = rows[0];
    return row ? mapRenewedSession(row) : null;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.client.session.deleteMany({ where: { id } });
  }
}
