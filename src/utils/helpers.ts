import { AggregateError } from '../lib/AggregateError';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { BaseError } from './constants';

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
      .response({ err: `Error Trace. ${aggregateErrorInstance.message}` })
      .code(deriveStatusCodeFromErrorTrail(aggregateErrorInstance));
}
