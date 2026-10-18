import { maxLength, pattern, required, schema, validate } from '@angular/forms/signals';
import { z } from 'zod';
import type { TaskFields } from '@daylo/web/tasks/data-access';

export const taskEditorSchema = schema<TaskFields>((fields) => {
  required(fields.title, { message: 'Wpisz tytuł zadania.' });
  validate(fields.title, ({ value }) =>
    !value() || value().trim()
      ? undefined
      : { kind: 'whitespace', message: 'Wpisz tytuł zadania.' },
  );
  validate(fields.title, ({ value }) =>
    value().trim().length <= 200
      ? undefined
      : { kind: 'maxLength', message: 'Tytuł może mieć maksymalnie 200 znaków.' },
  );
  required(fields.scheduledDate, { message: 'Wybierz datę.' });
  validate(fields.scheduledDate, ({ value }) =>
    z.iso.date().safeParse(value()).success && !value().startsWith('0000-')
      ? undefined
      : { kind: 'date', message: 'Podaj poprawną datę (rok 0001–9999).' },
  );
  pattern(fields.scheduledTime, /^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/, {
    message: 'Podaj godzinę w formacie HH:mm.',
  });
  maxLength(fields.description, 5000, { message: 'Opis może mieć maksymalnie 5000 znaków.' });
});
