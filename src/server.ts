import Hapi from '@hapi/hapi';
import { GLOBAL_ROUTE_PREFIX } from './utils/constants';

import config from './config/index';

export function generateServer() {
  const server = Hapi.server({
    port: config.PORT,
    host: config.HOST,
  });

  server.realm.modifiers.route.prefix = GLOBAL_ROUTE_PREFIX;
  return server;
}
