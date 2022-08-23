import pkg from 'pg';
import axios from 'axios';
import pingRoute from '@routes/ping.route';
import queryBuilder from '@db/queryBuilder';
import generateTaskEndpointRoutes from '@routes/tasks.route';
import generateGroupEndpointRoutes from '@routes/groups.route';

import { Server } from '@hapi/hapi';
import { generateServer } from '../src/server';
import { GLOBAL_ROUTE_PREFIX } from '@utils/constants';
import { default as config, generateConnectionURI } from '@config/index';

export type DbQuery = ReturnType<typeof queryBuilder>;
export type DbConnectionInstance = pkg.Pool;

export const SERVER_URL = `http://${config.HOST}:${config.PORT}${GLOBAL_ROUTE_PREFIX}`;
export const axiosInstance = axios.create({
  baseURL: SERVER_URL,
});

axiosInstance.interceptors.response.use(
  response =>
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    response,
  error =>
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error

    // console.error(error);
    Promise.reject(error)
);

export function getDbQueryCreator() {
  const dbConnectionURI = generateConnectionURI();
  const dbConnectionInstance = new pkg.Pool({ connectionString: dbConnectionURI });
  const dbQuery = queryBuilder(dbConnectionInstance);

  return { dbConnectionInstance, dbQuery };
}

export async function closeDbConnection(dbConnectionInstance: pkg.Pool) {
  await dbConnectionInstance.end();
}

export async function getServerInstance(): Promise<Server> {
  const serverInstance = generateServer();

  const groupRoutes = generateGroupEndpointRoutes();
  const tasksRoutes = generateTaskEndpointRoutes();

  const allRoutes = groupRoutes.concat(tasksRoutes.concat([pingRoute]));

  serverInstance.route(allRoutes);

  await serverInstance.start();
  console.log('Server running on %s', serverInstance.info.uri);

  return serverInstance;
}

export async function destroyServerInstance(serverInstance: Server) {
  await serverInstance.stop();
}
