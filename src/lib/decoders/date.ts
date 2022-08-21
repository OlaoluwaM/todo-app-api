import { Either } from 'fp-ts/lib/Either';
import { rawTypeOf } from './utils';
import { Decoder, DecodeError, success, failure } from 'io-ts/lib/Decoder';

export const DateDecoder: Decoder<unknown, Date> = {
  decode: decodeToDate,
};

function decodeToDate(input: unknown): Either<DecodeError, Date> {
  return isValidDateString(input)
    ? success(new Date(input))
    : failure(input, `Sorry but we could not decode ${input} into a date`);
}

function isValidDateString(potentialDateString: unknown): potentialDateString is string {
  if (isValidDate(potentialDateString)) return true;
  if (typeof potentialDateString !== 'string') return false;

  const epochMilliseconds = Date.parse(potentialDateString);
  return !Number.isNaN(epochMilliseconds);
}

function isValidDate(potentialDate: unknown): potentialDate is Date {
  const isDateType = rawTypeOf(potentialDate) === 'date';
  const isInvalidDate = Number.isNaN(potentialDate);

  return isDateType && !isInvalidDate;
}
