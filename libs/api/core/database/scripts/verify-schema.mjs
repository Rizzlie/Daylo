import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required for schema verification.');
}

const client = new Client({ connectionString });
let savepointNumber = 0;

async function expectConstraintViolation(sql, values, expectedConstraint) {
  savepointNumber += 1;
  const savepoint = `expected_violation_${savepointNumber}`;
  await client.query(`SAVEPOINT ${savepoint}`);

  try {
    await client.query(sql, values);
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);

    if (error.constraint !== expectedConstraint) {
      throw new Error(
        `Expected constraint ${expectedConstraint}, received ${error.constraint ?? error.message}`,
        { cause: error },
      );
    }

    return;
  }

  throw new Error(`Expected constraint ${expectedConstraint} to reject the write.`);
}

try {
  await client.connect();
  await client.query('BEGIN');

  const tables = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_type = 'BASE TABLE'
        AND table_name = ANY($1::text[])`,
    [[
      'users',
      'user_preferences',
      'sessions',
      'oauth_transactions',
      'groups',
      'memberships',
      'invitations',
      'tasks',
    ]],
  );

  if (tables.rowCount !== 8) {
    throw new Error(`Expected 8 Daylo tables, found ${tables.rowCount}.`);
  }

  const expectedDeleteRules = new Map([
    ['user_preferences_user_id_fkey', 'CASCADE'],
    ['sessions_user_id_fkey', 'CASCADE'],
    ['groups_owner_id_fkey', 'RESTRICT'],
    ['memberships_group_id_fkey', 'RESTRICT'],
    ['memberships_user_id_fkey', 'RESTRICT'],
    ['invitations_group_id_fkey', 'RESTRICT'],
    ['invitations_invited_by_id_fkey', 'RESTRICT'],
    ['tasks_created_by_id_fkey', 'RESTRICT'],
    ['tasks_group_id_fkey', 'RESTRICT'],
    ['tasks_completed_by_id_fkey', 'RESTRICT'],
  ]);
  const relations = await client.query(
    `SELECT constraint_name, delete_rule
       FROM information_schema.referential_constraints
      WHERE constraint_schema = current_schema()
        AND constraint_name = ANY($1::text[])`,
    [[...expectedDeleteRules.keys()]],
  );

  for (const [constraintName, deleteRule] of expectedDeleteRules) {
    const relation = relations.rows.find(
      (row) => row.constraint_name === constraintName,
    );

    if (!relation || relation.delete_rule !== deleteRule) {
      throw new Error(
        `Expected ${constraintName} with ${deleteRule} deletion, received ${relation?.delete_rule ?? 'no relation'}.`,
      );
    }
  }

  const user = await client.query(
    `INSERT INTO users (google_subject, email, display_name, access_status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id`,
    ['google-subject-1', 'owner@example.test', 'Owner'],
  );
  const userId = user.rows[0].id;

  await expectConstraintViolation(
    `INSERT INTO users (google_subject, email, display_name)
     VALUES ($1, $2, $3)`,
    ['google-subject-1', 'other@example.test', 'Duplicate identity'],
    'users_google_subject_key',
  );

  await expectConstraintViolation(
    `INSERT INTO users (google_subject, email, display_name)
     VALUES ($1, $2, $3)`,
    ['google-subject-2', 'Owner@Example.test', 'Unnormalized email'],
    'users_email_normalized_check',
  );

  await expectConstraintViolation(
    `INSERT INTO users (google_subject, email, display_name)
     VALUES ($1, $2, $3)`,
    ['google-subject-3', 'owner@example.test', 'Duplicate email'],
    'users_email_key',
  );

  await client.query(
    `INSERT INTO sessions (user_id, token_hash, csrf_token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [userId, 'a'.repeat(64), 'b'.repeat(64)],
  );

  await expectConstraintViolation(
    `INSERT INTO sessions (user_id, token_hash, csrf_token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [userId, 'a'.repeat(64), 'c'.repeat(64)],
    'sessions_token_hash_key',
  );

  await expectConstraintViolation(
    `INSERT INTO sessions (user_id, token_hash, csrf_token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [userId, 'c'.repeat(64), 'b'.repeat(64)],
    'sessions_csrf_token_hash_key',
  );

  await client.query(
    `INSERT INTO oauth_transactions (state_hash, browser_binding_hash, nonce, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    ['d'.repeat(64), 'e'.repeat(64), 'nonce-1'],
  );

  await expectConstraintViolation(
    `INSERT INTO oauth_transactions (state_hash, browser_binding_hash, nonce, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    ['d'.repeat(64), 'f'.repeat(64), 'nonce-2'],
    'oauth_transactions_state_hash_key',
  );

  await expectConstraintViolation(
    `INSERT INTO oauth_transactions (state_hash, browser_binding_hash, nonce, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    ['f'.repeat(64), 'g'.repeat(64), 'nonce-1'],
    'oauth_transactions_nonce_key',
  );

  const group = await client.query(
    `INSERT INTO groups (name, owner_id) VALUES ($1, $2) RETURNING id`,
    ['Daylo group', userId],
  );
  const groupId = group.rows[0].id;

  await client.query(
    `INSERT INTO memberships (group_id, user_id) VALUES ($1, $2)`,
    [groupId, userId],
  );

  await expectConstraintViolation(
    `INSERT INTO memberships (group_id, user_id) VALUES ($1, $2)`,
    [groupId, userId],
    'memberships_group_id_user_id_key',
  );

  await expectConstraintViolation(
    `INSERT INTO memberships (group_id, user_id) VALUES ($1, $2)`,
    ['00000000-0000-0000-0000-000000000000', userId],
    'memberships_group_id_fkey',
  );

  await client.query(
    `INSERT INTO tasks (
       created_by_id, group_id, title, scheduled_date, scheduled_time,
       completed_at, completed_by_id
     ) VALUES ($1, $2, $3, $4::date, $5::time, NOW(), $1)`,
    [userId, groupId, 'Verified task', '2026-10-11', '09:30'],
  );

  await expectConstraintViolation(
    `INSERT INTO tasks (
       created_by_id, title, scheduled_date, completed_at, completed_by_id
     ) VALUES ($1, $2, $3::date, NOW(), NULL)`,
    [userId, 'Invalid completion', '2026-10-11'],
    'tasks_completion_check',
  );

  await client.query('ROLLBACK');
  console.log('Prisma schema constraints verified successfully.');
} catch (error) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // The original verification failure is more useful than rollback cleanup.
  }
  throw error;
} finally {
  await client.end();
}
