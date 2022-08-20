import { Either } from 'fp-ts/Either';
import { isString } from 'fp-ts/string';
import { MonoidAll } from 'fp-ts/lib/boolean';
import { Newtype, iso } from 'newtype-ts';
import { validate as isUUID } from 'uuid';
import { Decoder, DecodeError, success, failure } from 'io-ts/Decoder';

export interface UUID extends Newtype<{ readonly UUID: unique symbol }, string> {}
const isoUUID = iso<UUID>();

export const UUIDDecoder: Decoder<unknown, UUID> = {
  decode: decodeToUUID,
};

function decodeToUUID(inp: unknown): Either<DecodeError, UUID> {
  const isValidUUID = MonoidAll.concat(isString(inp), isUUID(inp as string));
  return isValidUUID
    ? success(isoUUID.wrap(inp as string))
    : failure(inp, `${inp} is not a valid UUID`);
}
