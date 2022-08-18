import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import * as RTE from 'fp-ts/lib/ReaderTaskEither';

import pkg from 'pg';
import config from '../config/index';

import { Validation } from 'io-ts';
import { flow, pipe } from 'fp-ts/lib/function';
import { PathReporter } from 'io-ts/PathReporter';
import { map, sequence } from 'fp-ts/lib/Array';
import { RowCodec, RowType } from './schema';
import { AggregateError, newAggregateError } from '../utils/index';

const dbConnectionPool = new pkg.Pool({
  connectionString: generateConnectionURI(),
});

export function generateConnectionURI() {
  const { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, HOST, POSTGRES_PORT } = config;
  return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
}

export function queryDb(dbConnectionInstance: pkg.Pool) {
  return (query: string) =>
    (queryParams?: string[]): RTE.ReaderTaskEither<RowCodec, AggregateError, RowType[]> =>
    (codecToUse: RowCodec) =>
      pipe(
        TE.tryCatch(
          () => dbConnectionInstance.query(query, queryParams),
          reason => newAggregateError((reason as Error).message)
        ),
        TE.map(queryResult => queryResult.rows),
        TE.chain(refineQueryResults(codecToUse))
      );
}

function refineQueryResults(codecToUse: RowCodec) {
  return flow(map(parsedQueryResult(codecToUse)), sequence(E.Applicative), TE.fromEither);
}

function parsedQueryResult(codecToUse: RowCodec) {
  return (queryResult: any) => {
    const decodeResult = codecToUse.decode(queryResult) as Validation<RowType>;
    const errorReports = PathReporter.report(decodeResult);

    return pipe(
      decodeResult,
      E.mapLeft(() => newAggregateError(errorReports))
    );
  };
}

const dbQuery = queryDb(dbConnectionPool);
export default dbQuery;
