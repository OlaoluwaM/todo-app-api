import * as TE from 'fp-ts/lib/TaskEither';

import pkg from 'pg';

import { traverse } from 'fp-ts/lib/Array';
import { BaseError } from '../utils/constants';
import { flow, pipe } from 'fp-ts/lib/function';
import { Either, Applicative, mapLeft } from 'fp-ts/lib/Either';
import { AggregateError, newAggregateError } from '../lib/AggregateError/index';
import { DecodeError, Decoder, draw, TypeOf, id } from 'io-ts/lib/Decoder';

type AnyDecoder = Decoder<any, any>;

export type QueryParams = unknown[];
export type QueryResult<A = unknown> = Either<AggregateError, A>;
export type QueryBuilderClient = ReturnType<typeof queryBuilder>;

export const idDecoderCreator = <T = any>() => id<T>();

export default function queryBuilder(dbConnectionInstance: pkg.Pool) {
  return (query: string) =>
    (queryParams?: unknown[]) =>
    <DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) =>
      pipe(
        TE.tryCatch(
          () => dbConnectionInstance.query(query, queryParams),
          reason =>
            newAggregateError(BaseError.QUERY_ERROR).addError((reason as Error).message)
        ),
        TE.chain(handleErroneousQueryResults),
        TE.map(queryResult => queryResult.rows),
        TE.chain(refineQueryResults(decoder))
      );
}

function handleErroneousQueryResults(queryResult: pkg.QueryResult<any>) {
  const { rowCount } = queryResult;

  if (rowCount === 0) return TE.left(newAggregateError(BaseError.NO_MATCH));
  return TE.right(queryResult);
}

function refineQueryResults<DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) {
  return flow(traverse(Applicative)(parsedQueryResult(decoder)), TE.fromEither);
}

function parsedQueryResult<DecoderToUse extends AnyDecoder>(decoder: DecoderToUse) {
  return (queryResult: any) => {
    const decodeResult = decoder.decode(queryResult) as Either<
      DecodeError,
      TypeOf<DecoderToUse>
    >;

    return pipe(
      decodeResult,
      mapLeft(decoderErr =>
        newAggregateError(BaseError.DECODER_ERROR).addError(draw(decoderErr))
      )
    );
  };
}
