import generateGroupRoutes from './routes/groups.route';

import { generateServer } from './server';
import { dbConnectionPool } from './db/index';

const server = generateServer();
const groupRoutes = generateGroupRoutes();

server.route(groupRoutes);

await server.start();

process.on('unhandledRejection', async err => {
  console.error(err);
  await dbConnectionPool.end();
  process.exit(1);
});
