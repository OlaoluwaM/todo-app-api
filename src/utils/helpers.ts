import { Request, ResponseToolkit } from '@hapi/hapi';

export function dummyRouteHandler(req: Request, resHandler: ResponseToolkit) {
  return resHandler
    .response({ val: 'Dummy handler. Route not implemented yet' })
    .code(200);
}
