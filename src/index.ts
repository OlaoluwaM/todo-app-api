import pingRoute from './routes/ping';
import pinoPluginConfig from './plugins/pino';
import swaggerPluginConfig from './plugins/swagger';
import generateTaskEndpointRoutes from './routes/tasks.route';
import generateGroupEndpointRoutes from './routes/groups.route';

import { generateServer } from './server';
import { dbConnectionPool } from './db/index';

const server = generateServer();

const groupRoutes = generateGroupEndpointRoutes();
const tasksRoutes = generateTaskEndpointRoutes();

await server.register(swaggerPluginConfig);
await server.register(pinoPluginConfig);

server.route([...groupRoutes, ...tasksRoutes, pingRoute]);

await server.start();
console.log('Server running on %s', server.info.uri);

process.on('unhandledRejection', async err => {
  console.error(err);
  await dbConnectionPool.end();
  process.exit(1);
});
