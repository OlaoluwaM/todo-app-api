/* global describe, test, beforeAll, afterAll */
import { Server } from '@hapi/hapi';
import { getServerInstance, destroyServerInstance } from './setup';

let server: Server;

beforeAll(async () => {
  server = await getServerInstance();
});

afterAll(async () => {
  await destroyServerInstance(server);
});


