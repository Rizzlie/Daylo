import {
  createPersonalTaskSchema,
  editPersonalTaskSchema,
  deletePersonalTaskQuerySchema,
  listPersonalTasksQuerySchema,
  taskVersionSchema,
} from './personal-task.schema';

describe('Personal task input contracts', () => {
  it('trims required titles and accepts optional clearing values and leap dates', () => {
    expect(
      createPersonalTaskSchema.parse({
        title: '  Plan  ',
        scheduledDate: '2028-02-29',
        scheduledTime: '',
        description: null,
      }),
    ).toEqual({ title: 'Plan', scheduledDate: '2028-02-29', scheduledTime: '', description: null });
    expect(
      createPersonalTaskSchema.parse({
        title: 'a'.repeat(200),
        description: 'x'.repeat(5000),
        scheduledTime: '23:59',
      }).title,
    ).toHaveLength(200);
  });

  it.each([
    { title: ' ' },
    { title: 'a'.repeat(201) },
    { title: 'Plan', description: 'x'.repeat(5001) },
    { title: 'Plan', scheduledDate: '2026-02-29' },
    { title: 'Plan', scheduledDate: '2026-04-31' },
    { title: 'Plan', scheduledDate: '0000-01-01' },
    { title: 'Plan', scheduledDate: '2026-1-01' },
    { title: 'Plan', scheduledTime: '24:00' },
    { title: 'Plan', scheduledTime: '12:30:00' },
    { title: 'Plan', scheduledTime: '9:30' },
    { title: 'Plan', scheduledDate: null },
    { title: 'Plan', groupId: null },
    { title: 'Plan', completedAt: '2026-01-01T00:00:00Z' },
    { title: 'Plan', createdById: 'injected' },
    { title: 'Plan', version: 3 },
  ])('rejects invalid or server-owned creation fields %#', (input) => {
    expect(createPersonalTaskSchema.safeParse(input).success).toBe(false);
  });

  it('requires editable fields and numeric positive versions without body coercion', () => {
    for (const version of [undefined, null, 0, -1, 1.1, '1', 2147483648]) {
      expect(taskVersionSchema.safeParse({ version }).success).toBe(false);
    }
    expect(editPersonalTaskSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(editPersonalTaskSchema.parse({ version: 1, description: '' })).toEqual({
      version: 1,
      description: '',
    });
  });

  it('bounds pagination and coerces numeric query values', () => {
    expect(listPersonalTasksQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(listPersonalTasksQuerySchema.parse({ limit: '100' })).toEqual({ limit: 100 });
    expect(deletePersonalTaskQuerySchema.parse({ version: '1' })).toEqual({ version: 1 });
    for (const limit of ['0', '101', '1.5', 'abc', '', ['1', '2']]) {
      expect(listPersonalTasksQuerySchema.safeParse({ limit }).success).toBe(false);
    }
  });
});
