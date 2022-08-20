import pkg from 'pg';

import { flow, pipe } from 'fp-ts/lib/function';
import { map, sequence } from 'fp-ts/lib/Array';
import { Either, Applicative, mapLeft } from 'fp-ts/lib/Either';
import { tryCatch, map as TEmap, chain, fromEither } from 'fp-ts/lib/TaskEither';
import { AggregateError, newAggregateError } from '../lib/AggregateError';
import { DecodeError, Decoder, draw, TypeOf } from 'io-ts/lib/Decoder';

type AnyDecoder = Decoder<unknown, any>;

export type QueryParams = unknown[];
export type QueryResult<A = unknown> = Either<AggregateError, A>;
export type QueryBuilderClient = ReturnType<typeof queryBuilder>;

export default function queryBuilder(dbConnectionInstance: pkg.Pool) {
  return (query: string) =>
    (queryParams?: unknown[]) =>
    <DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) =>
      pipe(
        tryCatch(
          () => dbConnectionInstance.query(query, queryParams),
          reason => newAggregateError((reason as Error).message)
        ),
        TEmap(queryResult => queryResult.rows),
        chain(refineQueryResults(decoder))
      );
}

function refineQueryResults<DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) {
  return flow(map(parsedQueryResult(decoder)), sequence(Applicative), fromEither);
}

function parsedQueryResult<DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) {
  return (queryResult: any) => {
    const decodeResult = decoder.decode(queryResult) as Either<
      DecodeError,
      TypeOf<DecoderToUse>
    >;

    return pipe(
      decodeResult,
      mapLeft(decoderErr => newAggregateError(draw(decoderErr)))
    );
  };
}
