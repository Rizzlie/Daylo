import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { assertDatabase } from './safety.mjs';

export const accounts = Object.freeze(Object.fromEntries(
  ['owner', 'invited', 'member', 'outsider'].map((role) => [role, {
    subject: `daylo-e2e-${role}`, email: `${role}@example.test`, name: `E2E ${role}`,
  }]),
));

export async function seed(databaseUrl, runId) {
  const pool = new Pool({ connectionString: assertDatabase(databaseUrl, runId) });
  try {
    const owner = randomUUID();
    const member = randomUUID();
    const group = randomUUID();
    for (const [id, role] of [[owner, 'owner'], [member, 'member']]) {
      const account = accounts[role];
      await pool.query(`INSERT INTO users (id,google_subject,email,display_name,access_status)
        VALUES ($1,$2,$3,$4,'active')`, [id, account.subject, account.email, account.name]);
    }
    await pool.query('INSERT INTO groups (id,name,owner_id) VALUES ($1,$2,$3)', [group, 'E2E group', owner]);
    for (const id of [owner, member]) {
      await pool.query('INSERT INTO memberships (id,group_id,user_id) VALUES ($1,$2,$3)', [randomUUID(), group, id]);
    }
    await pool.query(`INSERT INTO invitations (id,group_id,email,invited_by_id,status,expires_at)
      VALUES ($1,$2,$3,$4,'pending',now()+interval '7 days')`, [randomUUID(), group, accounts.invited.email, owner]);
  } finally { await pool.end(); }
}
