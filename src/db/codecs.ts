import * as t from 'io-ts';

import { rawTypeOf } from '@utils/index';
import { validate as isUUID } from 'uuid';

// Date
export const DateCodec = new t.Type<Date, string, unknown>(
  'Date',
  isValidDate,
  decodeToDate as t.Validate<unknown, Date>,
  date => date.toISOString()
);

function isValidDate(potentialDate: unknown): potentialDate is Date {
  const isDateType = rawTypeOf(potentialDate) === 'date';
  const isInvalidDate = Number.isNaN(potentialDate);

  return isDateType && !isInvalidDate;
}

function decodeToDate(input: unknown, context: t.Context) {
  return isValidDateString(input)
    ? t.success(new Date(input))
    : t.failure(input, context);
}

function isValidDateString(potentialDateString: unknown): potentialDateString is string {
  if (isValidDate(potentialDateString)) return true;
  if (typeof potentialDateString !== 'string') return false;

  const epochMilliseconds = Date.parse(potentialDateString);
  return !Number.isNaN(epochMilliseconds);
}

// UUID
interface UUIDBrand {
  readonly UUID: unique symbol;
}

export const uuidCodec = t.brand(
  t.string,
  (s: string): s is t.Branded<string, UUIDBrand> => isUUID(s),
  'UUID'
);
