import * as d from 'io-ts/lib/Decoder';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';

import { id, trace } from '@utils/index';
import { pipe } from 'fp-ts/lib/function';
import { Task } from 'fp-ts/lib/Task';
import { faker } from '@faker-js/faker';
import { toUUID, UUID, UUIDDecoder } from '@lib/decoders';
import { map, traverse } from 'fp-ts/lib/Array';
import { Group, GroupID, TaskID } from '../src/db/schema';
import { compose, lensProp, view } from 'ramda';
import { getOnlyResultInQueryResultArr } from '@utils/helpers';
import { idDecoderCreator, QueryBuilderClient } from '../src/db/queryBuilder';

type Nully<U> = U | null;

export type SeedFn = (queryClient: QueryBuilderClient) => Task<void>;

export const manualFail = (v: any) => {
  throw new Error(`Manual fail: ${v}`);
};

export const generateUUID = compose(toUUID, faker.datatype.uuid);

function generateGroupCreatorQuery(dbQueryClient: QueryBuilderClient) {
  const queryParams = [faker.lorem.words(4), faker.lorem.text()];
  const GroupIdDecoder = d.struct({ group_id: UUIDDecoder });

  return () =>
    pipe(
      dbQueryClient(
        `INSERT INTO groups(group_id, title, description) VALUES ($1, $2, $3) RETURNING group_id`
      )([generateUUID(), ...queryParams])(GroupIdDecoder),
      TE.map(getOnlyResultInQueryResultArr)
    );
}

function generateTaskCreatorQuery(dbQueryClient: QueryBuilderClient) {
  const queryParams = [
    faker.lorem.words(4),
    faker.lorem.text(),
    faker.date.future(1, Date.now()),
  ];
  const TaskIdDecoder = d.struct({ task_id: UUIDDecoder });

  return (groupId: GroupID) =>
    pipe(
      dbQueryClient(
        `INSERT INTO tasks(task_id, name, description, due_date, group_id) VALUES ($1, $2, $3, $4, $5) RETURNING task_id`
      )([generateUUID(), ...queryParams, groupId])(TaskIdDecoder),
      TE.map(getOnlyResultInQueryResultArr)
    );
}

export function createGroups(dbQueryClient: QueryBuilderClient) {
  const createGroupQuery = generateGroupCreatorQuery(dbQueryClient);

  return async (numOfGroupsToCreate: number) => {
    const queries = traverse(TE.ApplicativePar)(createGroupQuery)(
      createArrOfSize(numOfGroupsToCreate)
    );

    const groupIds = await queries();
    const groupIdLens = lensProp<Pick<Group, 'group_id'>>('group_id')

    return pipe(groupIds, E.foldW(id, map(view(groupIdLens))));
  };
}

export function createTasks(dbQueryClient: QueryBuilderClient) {
  const createTaskQuery = generateTaskCreatorQuery(dbQueryClient);

  return async (groupId: GroupID, numOfGroupsToCreate: number) => {
    const queries = traverse(TE.ApplicativePar)(() => createTaskQuery(groupId))(
      createArrOfSize(numOfGroupsToCreate)
    );

    const taskIds = await queries();

    return pipe(taskIds, E.foldW(id, id));
  };
}

export async function deleteAllGroupRecords(dbQueryClient: QueryBuilderClient) {
  await dbQueryClient(`DELETE FROM groups`)()(idDecoderCreator<void>())();
}

export async function deleteAllTaskRecords(dbQueryClient: QueryBuilderClient) {
  await dbQueryClient(`DELETE FROM tasks`)()(idDecoderCreator<void>())();
}

function createArrOfSize(size: number) {
  return Array.from({ length: size }, () => null);
}
