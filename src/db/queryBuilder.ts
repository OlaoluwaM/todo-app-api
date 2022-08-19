import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import * as RTE from 'fp-ts/lib/ReaderTaskEither';

import pkg from 'pg';

import { flow, pipe } from 'fp-ts/lib/function';
import { PathReporter } from 'io-ts/PathReporter';
import { map, sequence } from 'fp-ts/lib/Array';
import { AggregateError, newAggregateError } from '../utils/index';
import { Validation, Any as AnyCodec, TypeOf } from 'io-ts';

export type QueryParams = unknown[];
export type QueryResult<HappyPathT = unknown> = E.Either<AggregateError, HappyPathT>;
// RTE.ReaderTaskEither<AnyCodec, AggregateError, RowType[]>;

export default function queryBuilder(dbConnectionInstance: pkg.Pool) {
  return (query: string) =>
    (queryParams?: unknown[]) =>
    <CodecToUse extends AnyCodec>(codecToUse: CodecToUse) =>
      pipe(
        TE.tryCatch(
          () => dbConnectionInstance.query(query, queryParams),
          reason => newAggregateError((reason as Error).message)
        ),
        TE.map(queryResult => queryResult.rows),
        TE.chain(refineQueryResults(codecToUse))
      );
}

function refineQueryResults<CodecToUse extends AnyCodec>(codecToUse: CodecToUse) {
  return flow(map(parsedQueryResult(codecToUse)), sequence(E.Applicative), TE.fromEither);
}

function parsedQueryResult<CodecToUse extends AnyCodec>(codecToUse: CodecToUse) {
  return (queryResult: any) => {
    type CodecSchema = TypeOf<CodecToUse>;

    const decodeResult = codecToUse.decode(queryResult) as Validation<CodecSchema>;
    const errorReports = PathReporter.report(decodeResult);

    return pipe(
      decodeResult,
      E.mapLeft(() => newAggregateError(errorReports))
    );
  };
}
