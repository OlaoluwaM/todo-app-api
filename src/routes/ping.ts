import { ServerRoute, ResponseToolkit } from '@hapi/hapi';

const pingRoute: ServerRoute = {
  path: '/ping',
  method: 'GET',
  options: {
    handler: (req, res: ResponseToolkit) => res.response({ status: 'UP' }).code(200),
  },
};

export default pingRoute
