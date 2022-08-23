import * as A from 'fp-ts/lib/Array';
import * as R from 'fp-ts/lib/Record';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';

import { id} from '@utils/index';
import { pipe } from 'fp-ts/lib/function';
import { faker } from '@faker-js/faker';
import { toUUID } from '@lib/decoders';
import { AggregateError } from '@lib/AggregateError';
import { compose, lensProp } from 'ramda';
import { getOnlyResultInQueryResultArr } from '@utils/helpers';
import { idDecoderCreator, QueryBuilderClient } from '../src/db/queryBuilder';
import { Group, GroupDecoder, GroupID, Task, TaskDecoder } from '../src/db/schema';

export type isOptional<Structure, MemberUnion extends keyof Structure> = Omit<
  Structure,
  MemberUnion
> &
  Partial<Pick<Structure, MemberUnion>>;

type Nully<U> = U | null;

export const manualFail = (v: any) => {
  throw new Error(`Manual fail: ${v}`);
};

export const generateUUID = compose(toUUID, faker.datatype.uuid);

function generateGroupCreatorQuery(dbQueryClient: QueryBuilderClient) {
  const queryParams = [faker.lorem.words(4), faker.lorem.text()];

  return () =>
    pipe(
      dbQueryClient(
        `INSERT INTO groups(group_id, title, description) VALUES ($1, $2, $3) RETURNING *`
      )([generateUUID(), ...queryParams])(GroupDecoder),
      TE.map(getOnlyResultInQueryResultArr)
    );
}

function generateTaskCreatorQuery(dbQueryClient: QueryBuilderClient) {
  const queryParams = [
    faker.lorem.words(4),
    faker.lorem.text(),
    faker.date.future(1, Date.now()),
  ];

  return (groupId: GroupID) =>
    pipe(
      dbQueryClient(
        `INSERT INTO tasks(task_id, name, description, due_date, group_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`
      )([generateUUID(), ...queryParams, groupId])(TaskDecoder),
      TE.map(getOnlyResultInQueryResultArr)
    );
}

export function createGroups(dbQueryClient: QueryBuilderClient) {
  const createGroupQuery = generateGroupCreatorQuery(dbQueryClient);

  return async (numOfGroupsToCreate: number) => {
    const queries = A.traverse(TE.ApplicativePar)(createGroupQuery)(
      createArrOfSize(numOfGroupsToCreate)
    );

    const groupIdObjs = await queries();

    const groupIds = pipe(groupIdObjs, E.foldW(id, normalizeRecordObj()));
    if (groupIds instanceof AggregateError) throw groupIds;

    return groupIds as Group[];
  };
}

export function createTasks(dbQueryClient: QueryBuilderClient) {
  const createTaskQuery = generateTaskCreatorQuery(dbQueryClient);

  return async (groupId: GroupID, numOfGroupsToCreate: number) => {
    const queries = A.traverse(TE.ApplicativePar)(() => createTaskQuery(groupId))(
      createArrOfSize(numOfGroupsToCreate)
    );

    const taskObjs = await queries();

    const taskObjOrErr = pipe(taskObjs, E.foldW(id, normalizeRecordObj()));
    if (taskObjOrErr instanceof AggregateError) throw taskObjOrErr;

    return taskObjOrErr as Task[];
  };
}

export async function deleteAllGroupRecords(dbQueryClient: QueryBuilderClient) {
  await dbQueryClient(`DELETE FROM groups`)()(idDecoderCreator<void>())();
}

export async function deleteAllTaskRecords(dbQueryClient: QueryBuilderClient) {
  await dbQueryClient(`DELETE FROM tasks`)()(idDecoderCreator<void>())();
}

export const groupIdLens = lensProp<Pick<Group, 'group_id'>>('group_id');
export const taskIdLens = lensProp<Pick<Task, 'task_id'>>('task_id');

function createArrOfSize(size: number) {
  return Array.from({ length: size }, () => null);
}

function normalizeRecordObj() {
  return A.map(R.map(prop => (prop instanceof Date ? prop.toISOString() : prop)));
}
