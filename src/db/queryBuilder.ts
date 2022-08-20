import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';

import pkg from 'pg';

import { flow, pipe } from 'fp-ts/function';
import { map, sequence } from 'fp-ts/Array';
import { Decoder, draw } from 'io-ts/Decoder';
import { AggregateError, newAggregateError } from '../lib/AggregateError';

type AnyDecoder = Decoder<unknown, any>;

export type QueryParams = unknown[];
export type QueryResult<A = unknown> = E.Either<AggregateError, A>;
export type QueryBuilderClient = ReturnType<typeof queryBuilder>;

export default function queryBuilder(dbConnectionInstance: pkg.Pool) {
  return (query: string) =>
    (queryParams?: unknown[]) =>
    <DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) =>
      pipe(
        TE.tryCatch(
          () => dbConnectionInstance.query(query, queryParams),
          reason => newAggregateError((reason as Error).message)
        ),
        TE.map(queryResult => queryResult.rows),
        TE.chain(refineQueryResults(decoder))
      );
}

function refineQueryResults<DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) {
  return flow(map(parsedQueryResult(decoder)), sequence(E.Applicative), TE.fromEither);
}

function parsedQueryResult<DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) {
  return (queryResult: any) => {
    const decodeResult = decoder.decode(queryResult);

    return pipe(
      decodeResult,
      E.mapLeft(decoderErr => newAggregateError(draw(decoderErr)))
    );
  };
}
