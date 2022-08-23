/* global describe, test, beforeAll, afterAll, expect */
import * as A from 'fp-ts/lib/Array';
import * as E from 'fp-ts/lib/Either';

import { pipe } from 'fp-ts/lib/function';
import { faker } from '@faker-js/faker';
import { Server } from '@hapi/hapi';
import { rawTypeOf } from '@utils/index';
import { AxiosError } from 'axios';
import { NonEmptyArray, head } from 'fp-ts/lib/NonEmptyArray';
import { all, includes, omit, propSatisfies, view } from 'ramda';
import {
  Group,
  GroupID,
  GroupDecoder,
  GroupWithTasks,
  GroupCreationAttributes,
} from '@db/schema';
import {
  taskIdLens,
  isOptional,
  groupIdLens,
  createTasks,
  createGroups,
  deleteAllGroupRecords,
} from './helpers';
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

describe(`Tests for GET request to ${ROUTE_PREFIX} for retrieving all created groups`, () => {
  const ENDPOINT = ROUTE_PREFIX;

  test('Should ensure that I can retrieve a list of groups (todo lists)', async () => {
    // Arrange
    const manuallyCreatedGroupObjs = await createGroups(dbQueryClient)(10);

    // Act
    const rawResponse = await axiosInstance.get<Group[]>(ENDPOINT);
    const { data: apiRetrievedGroupObjs, status: statusCode } = rawResponse;

    const isEveryCreatedRecordPresentInResponse = all<Group>(manuallyCreatedGroupObj =>
      includes(manuallyCreatedGroupObj)(apiRetrievedGroupObjs)
    )(manuallyCreatedGroupObjs);

    // Assert
    expect(statusCode).toBe(200);
    expect(apiRetrievedGroupObjs.length).toBeGreaterThanOrEqual(
      manuallyCreatedGroupObjs.length
    );
    expect(isEveryCreatedRecordPresentInResponse).toBeTruthy();
  });

  test('Should ensure that endpoint responds appropriately when there are no groups (todo lists) in DB', async () => {
    // Arrange
    await deleteAllGroupRecords(dbQueryClient);

    // Act
    const rawResponse = await axiosInstance.get<Group[]>(ENDPOINT);
    const { data: groupObjs, status: statusCode } = rawResponse;

    // Assert
    expect(statusCode).toBe(200);
    expect(groupObjs).toEqual([]);
  });

  test.each([
    [true, 'string'],
    [false, 'object'],
  ])(
    'Should ensure that endpoint allows me retrieve groups (todo lists) along with their related tasks (todos)',
    async (idsOnly, type) => {
      // Arrange
      const taskCreatorFn = createTasks(dbQueryClient);
      const createdGroupObjs = await createGroups(dbQueryClient)(10);
      const groupIds = A.map(view(groupIdLens))(createdGroupObjs);

      await Promise.all(groupIds.map(groupId => taskCreatorFn(groupId, 2)));

      // Act
      const rawResponse = await axiosInstance.get<GroupWithTasks[]>(
        `${ENDPOINT}?withTasks=true&idsOnly=${idsOnly}`
      );
      const { data: groupObjs, status: statusCode } = rawResponse;

      const allGroupObjsAreReturnedWithAListOfRelatedTasks = A.map(
        propSatisfies(tasks => tasks.length === 2 && rawTypeOf(tasks[0]) === type)(
          'tasks'
        )
      )(groupObjs);

      // Assert
      expect(allGroupObjsAreReturnedWithAListOfRelatedTasks).toBeTruthy();
      expect(statusCode).toBe(200);
    }
  );
});

describe(`Tests for GET request to ${ROUTE_PREFIX}/:groupId for retrieving a single group (todo list)`, () => {
  const ENDPOINT = (groupId: GroupID) => `${ROUTE_PREFIX}/${groupId}`;

  test('Should ensure that I can retrieve a single group (todo list)', async () => {
    // Arrange
    const createdGroupObjs = await createGroups(dbQueryClient)(5);
    const groupIds = A.map(view(groupIdLens))(createdGroupObjs);

    const randomIndex = faker.datatype.number({ min: 0, max: groupIds.length - 1 });

    // Act
    const rawResponse = await axiosInstance.get<Group>(ENDPOINT(groupIds[randomIndex]));
    const { data: groupObj } = rawResponse;

    // Assert
    expect(rawTypeOf(groupObj)).toBe('object');

    const returnedDataIsGroupObj = GroupDecoder.decode(groupObj);
    expect(E.isRight(returnedDataIsGroupObj)).toBeTruthy();
  });

  test.each([
    ['a 404 status code when supplied a random UUID', faker.datatype.uuid(), 404],
    ['a 400 status code when supplied an invalid uuid', 322, 400],
  ])(
    'Should ensure that endpoint responds with %s',
    async (_, invalidUUID, expectedStatusCode) => {
      // Arrange
      // Act
      try {
        await axiosInstance.get<Group>(ENDPOINT(invalidUUID as unknown as GroupID));
      } catch (error) {
        const { response } = error as AxiosError;

        // Assert
        expect(response!.status).toBe(expectedStatusCode);
      }
    }
  );
});

describe(`Tests for POST request to ${ROUTE_PREFIX} for creating groups (todo lists)`, () => {
  const ENDPOINT = ROUTE_PREFIX;

  test('Should ensure that I can create groups (todo lists)', async () => {
    // Arrange
    const groupCreationAttributes: isOptional<GroupCreationAttributes, 'description'>[] =
      [
        { title: 'Tech todos' },
        { title: faker.lorem.words(), description: faker.lorem.text() },
        { title: faker.lorem.words(), description: faker.lorem.text() },
        { title: faker.lorem.words(), description: faker.lorem.text() },
        { title: faker.lorem.words(), description: faker.lorem.text() },
        { title: 'School todos', description: 'Tasks for the ed' },
      ];

    // Act
    const rawResponse = await Promise.all(
      groupCreationAttributes.map(creationAttributes =>
        axiosInstance.post<Group>(ENDPOINT, creationAttributes)
      )
    );

    const allResponseStatusesArOk = rawResponse.every(
      ({ status: statusCode }) => statusCode === 201
    );

    const createdGroupObjsArr = rawResponse.map(
      ({ data: createdGroupObj }) => createdGroupObj
    );

    // Assert
    expect(allResponseStatusesArOk).toBeTruthy();
    expect(createdGroupObjsArr.length).toEqual(groupCreationAttributes.length);
  });

  test('Should ensure that endpoint responds appropriately when provided an erroneous payload', async () => {
    // Arrange
    const invalidGroupCreationPayload = {
      title: 123,
    };

    // Act
    try {
      await axiosInstance.post<Group>(ENDPOINT, invalidGroupCreationPayload);
    } catch (error) {
      const { response } = error as AxiosError;
      // Assert
      expect(response!.status).toBe(400);
    }
  });
});

describe(`Tests for PUT request to ${ROUTE_PREFIX}/:groupId for updating groups (todo lists)`, () => {
  const ENDPOINT = (groupId: GroupID) => `${ROUTE_PREFIX}/${groupId}`;

  test('Should ensure that I can update a group (todo list)', async () => {
    // Arrange
    const createdGroupObjs = await createGroups(dbQueryClient)(10);
    const groupIds = A.map(view(groupIdLens))(createdGroupObjs);

    const updatedGroupInfo = {
      title: faker.lorem.words(),
      description: faker.lorem.text(),
    };

    // Act
    const rawResponse = await Promise.all(
      groupIds.map(groupId =>
        axiosInstance.put<Group>(ENDPOINT(groupId), updatedGroupInfo)
      )
    );

    const allResponseStatusesArOk = rawResponse.every(
      ({ status: statusCode }) => statusCode === 201
    );

    const wereAllCreatedGroupsUpdated = rawResponse.every(({ data: createdGroupObj }) => {
      const { title, description } = createdGroupObj;

      return (
        title === updatedGroupInfo.title && description === updatedGroupInfo.description
      );
    });

    // Assert
    expect(allResponseStatusesArOk).toBeTruthy();
    expect(wereAllCreatedGroupsUpdated).toBeTruthy();
  });

  test('Should ensure that endpoint is idempotent-ish, not passing a payload should yield the original resource', async () => {
    // Arrange
    const createdGroupObjs = (await createGroups(dbQueryClient)(
      1
    )) as NonEmptyArray<Group>;

    const groupObjWithoutUpdatedAtField = pipe(
      createdGroupObjs,
      head,
      omit(['updated_at'])
    );

    const updatedGroupInfo: Partial<GroupCreationAttributes> = {};

    // Act
    const rawResponse = await axiosInstance.put<Group>(
      ENDPOINT(groupObjWithoutUpdatedAtField.group_id as GroupID),
      updatedGroupInfo
    );

    const { data: apiResponse, status: statusCode } = rawResponse;
    const returnedGroupObj = omit(['updated_at'], apiResponse);

    // Assert
    expect(groupObjWithoutUpdatedAtField).toEqual(returnedGroupObj);
    expect(statusCode).toBe(201);
  });

  test.each([
    ['a 404 status code when supplied a random UUID', faker.datatype.uuid(), 404],
    ['a 400 status code when supplied an invalid uuid', 322, 400],
  ])(
    'Should ensure that endpoint responds with %s',
    async (_, invalidUUID, expectedStatusCode) => {
      // Arrange
      // Act
      try {
        await axiosInstance.put<Group>(ENDPOINT(invalidUUID as unknown as GroupID), {});
      } catch (error) {
        const { response } = error as AxiosError;

        // Assert
        expect(response!.status).toBe(expectedStatusCode);
      }
    }
  );
});

describe(`Tests for DELETE request to ${ROUTE_PREFIX}/:groupId for deleting groups (todo lists) and their related tasks (todos)`, () => {
  const ENDPOINT = (groupId: GroupID) => `${ROUTE_PREFIX}/${groupId}`;

  test('Should ensure that I can delete a group (todo list) along with its tasks', async () => {
    // Arrange
    const createdGroupObjs = await createGroups(dbQueryClient)(10);
    const groupIds = A.map(view(groupIdLens))(createdGroupObjs);

    const groupIdOfGroupToDelete =
      groupIds[faker.datatype.number({ min: 0, max: groupIds.length - 1 })];

    const createdTaskObjs = await createTasks(dbQueryClient)(groupIdOfGroupToDelete, 1);
    const [idOfTaskUnderGroupToDelete] = A.map(view(taskIdLens))(createdTaskObjs);

    // Act
    const rawResponse = await Promise.all(
      groupIds.map(groupId => axiosInstance.delete<Group>(ENDPOINT(groupId)))
    );

    const allResponseStatusesArOk = rawResponse.every(
      ({ status: statusCode }) => statusCode === 200
    );

    // Assert
    expect(allResponseStatusesArOk).toBeTruthy();

    // Act
    try {
      await axiosInstance.get<Group>(ENDPOINT(groupIdOfGroupToDelete));
    } catch (err) {
      // Assert
      const { response } = err as AxiosError;
      expect(response!.status).toBe(404);
    }

    // Act
    try {
      await axiosInstance.get<Group>(`/tasks/${idOfTaskUnderGroupToDelete}`);
    } catch (err) {
      const { response } = err as AxiosError;
      expect(response!.status).toBe(404);
    }
  });

  test.each([
    ['a 404 status code when supplied a random UUID', faker.datatype.uuid(), 404],
    ['a 400 status code when supplied an invalid uuid', 322, 400],
  ])(
    'Should ensure that endpoint responds with %s',
    async (_, invalidUUID, expectedStatusCode) => {
      // Arrange
      // Act
      try {
        await axiosInstance.delete<Group>(ENDPOINT(invalidUUID as unknown as GroupID));
      } catch (error) {
        const { response } = error as AxiosError;

        // Assert
        expect(response!.status).toBe(expectedStatusCode);
      }
    }
  );
});
