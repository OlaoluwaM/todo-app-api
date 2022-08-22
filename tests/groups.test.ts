/* global describe, test, beforeAll, afterAll, expect, afterEach */

import { Group } from '@db/schema';
import { Server } from '@hapi/hapi';
import { AggregateError } from '@lib/AggregateError';
import { all, includes } from 'ramda';
import { createGroups, deleteAllGroupRecords, deleteAllTaskRecords } from './helpers';
import {
  DbQuery,
  axiosInstance,
  getServerInstance,
  getDbQueryCreator,
  closeDbConnection,
  destroyServerInstance,
  DbConnectionInstance,
} from './setup';

let server: Server;
let dbQueryClient: DbQuery;
let dbConnectionInstance: DbConnectionInstance;

const ROUTE_PREFIX = `/groups`;

beforeAll(async () => {
  const dbObj = getDbQueryCreator();

  dbQueryClient = dbObj.dbQuery;
  dbConnectionInstance = dbObj.dbConnectionInstance;

  // Start test server
  server = await getServerInstance();
});

afterAll(async () => {
  if (dbConnectionInstance) await closeDbConnection(dbConnectionInstance);
  if (server) await destroyServerInstance(server);
});

afterEach(async () => {
  await deleteAllGroupRecords(dbQueryClient);
  // await deleteAllTaskRecords(dbQueryClient);
});

describe(`Tests for GET request to ${ROUTE_PREFIX}`, () => {
  const ENDPOINT = ROUTE_PREFIX;

  test('Should ensure that I can retrieve a list of groups (todo lists)', async () => {
    // Arrange
    const groupIds = await createGroups(dbQueryClient)(10);
    if (groupIds instanceof AggregateError) throw groupIds;

    // Act
    const rawResponse = await axiosInstance.get<Group[]>(ENDPOINT);
    const { data: groupObjs } = rawResponse;

    // Assert
    const isEveryCreatedRecordPresentInResponse = all<Group>(({ group_id: groupId }) =>
      includes(groupId)(groupIds)
    )(groupObjs);

    expect(groupIds).toHaveLength(groupObjs.length);
    expect(isEveryCreatedRecordPresentInResponse).toBeTruthy();
  });

  test('Should ensure that endpoint responds appropriately when there are no  groups (todo lists) in DB', async () => {
    // Arrange

    // Act
    const rawResponse = await axiosInstance.get<Group[]>(ENDPOINT);
    const { data: groupObjs } = rawResponse;

    // Assert
    expect(groupObjs).toEqual([]);
  });
});
