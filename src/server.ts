import Hapi from '@hapi/hapi';

import config from './config/index';

async function serverInit() {
  const server = Hapi.server({
    port: config.PORT,
    host: config.HOST,
  });

  server.route({
    path: '/',
    method: 'GET',
    handler: req => 'Hello Word',
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
}

process.on('unhandledRejection', err => {
  console.log(err);
  process.exit(1);
});

serverInit();
