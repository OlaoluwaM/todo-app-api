import { pipe } from 'fp-ts/lib/function';
import { BaseError } from './constants';
import { AggregateError } from '../lib/AggregateError/index';
import { head, NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Request, ResponseToolkit } from '@hapi/hapi';

export function dummyRouteHandler(req: Request, resHandler: ResponseToolkit) {
  return resHandler
    .response({ val: 'Dummy handler. Route not implemented yet' })
    .code(200);
}

export function deriveStatusCodeFromErrorTrail(aggregateErrorInstance: AggregateError) {
  switch (aggregateErrorInstance.aggregatedMessages[0]) {
    case BaseError.NO_MATCH:
      return 404;

    default:
      return 500;
  }
}

export function generateErrorHandler(responseHandler: ResponseToolkit) {
  return (aggregateErrorInstance: AggregateError) =>
    responseHandler
      .response({ errors: aggregateErrorInstance.aggregatedMessages })
      .code(deriveStatusCodeFromErrorTrail(aggregateErrorInstance));
}

export function getOnlyResultInQueryResultArr<RT extends unknown>(resultArr: RT[]) {
  return pipe(resultArr as NonEmptyArray<RT>, head);
}
