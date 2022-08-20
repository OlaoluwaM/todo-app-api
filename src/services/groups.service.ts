import { QueryParams } from '../db/queryBuilder';
import * as S from 'fp-ts/lib/string';
import * as IO from 'fp-ts/lib/IO';
import * as TE from 'fp-ts/lib/TaskEither';
import * as NEA from 'fp-ts/lib/NonEmptyArray';

import { pipe } from 'fp-ts/lib/function';
import { UUIDDecoder } from '../lib/decoders';
import { struct, union } from 'io-ts/lib/Decoder';
import { dbQueryClient } from '../db/index';
import { id, randomUUID, trace } from '../utils/index';
import { struct as monoidStruct } from 'fp-ts/lib/Monoid';
import { RemoveNullFromPropUnion } from '../types';
import { AggregateError, updateAggregateError } from '../lib/AggregateError';
import {
  TaskDecoder,
  GroupDecoder,
  GroupCreationAttributes,
  GroupID,
} from '../db/schema';

export function createNewGroupRecord(groupCreationAttributes: GroupCreationAttributes) {
  const { title, description } = groupCreationAttributes;

  const createGroupQuery = (groupId: GroupID) =>
    dbQueryClient(
      `INSERT INTO groups(group_id, title, description) VALUES($1, $2, $3) RETURNING *`
    )([groupId, title, description])(GroupDecoder);

  const onError = generateGeneralQueryErrorMessage(
    `An error occurred while attempting to perform this query`
  );

  return pipe(
    randomUUID,
    trace(),
    IO.map(createGroupQuery),
    TE.fromIO,
    TE.chain(id),
    TE.bimap(onError, getOnlyResultInArr)
  );
}

export function getGroupRecordById(groupId: GroupID) {
  const getGroupRecordByIdQuery = dbQueryClient(
    `SELECT * FROM groups WHERE group_id = $1`
  )([groupId])(GroupDecoder);

  const onError = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve information about this group'
  );

  return pipe(getGroupRecordByIdQuery, TE.bimap(onError, getOnlyResultInArr));
}

export function getTasksForGroupByGroupId(columnsToRetrieve: '*' | 'task_id') {
  const targetQuery = dbQueryClient(`SELECT $1 FROM tasks WHERE group_id = $2`);
  const onError = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve the tasks for this group'
  );

  return (groupId: GroupID) => {
    const TaskIdOnlyDecoder = struct({ task_id: UUIDDecoder });
    const QueryDecoder = union(TaskDecoder, TaskIdOnlyDecoder);
    const query = targetQuery([columnsToRetrieve, groupId])<typeof QueryDecoder>(
      QueryDecoder
    );

    return pipe(query, TE.bimap(onError, id));
  };
}
export const getTaskIdsForGroupByGroupId = getTasksForGroupByGroupId('task_id');
export const getTaskObjsForGroupByGroupId = getTasksForGroupByGroupId('*');

export function getAllGroupRecords() {
  const targetQuery = dbQueryClient(`SELECT * FROM groups`)()(GroupDecoder);
  const onError = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve all record in the groups table'
  );

  return pipe(targetQuery, TE.bimap(onError, id));
}

export function updateGroupRecordById(
  updatedGroupRecordData: RemoveNullFromPropUnion<GroupCreationAttributes>
) {
  const targetQuery = (queryParams: QueryParams) =>
    dbQueryClient(
      `UPDATE groups SET title = $1, description = $2 WHERE group_id = $3 RETURNING *`
    )(queryParams)(GroupDecoder);

  const groupCreationAttributesMonoid = monoidStruct({
    title: S.Monoid,
    description: S.Monoid,
  });

  return (groupId: GroupID) => {
    const originalRecord = pipe(
      getGroupRecordById(groupId),
      TE.map(record => ({ ...record, description: record.description ?? S.empty })),
      TE.map(r => groupCreationAttributesMonoid.concat(r, updatedGroupRecordData))
    );

    return pipe(
      originalRecord,
      TE.chain(f =>
        targetQuery([f.title, S.isEmpty(f.description) ? null : f.description])
      ),
      TE.map(getOnlyResultInArr)
    );
  };
}

export function deleteGroupRecordById(groupId: GroupID) {
  const targetQuery = dbQueryClient(`DELETE FROM groups WHERE group_id = $1 RETURNING *`)([groupId])(
    GroupDecoder
  );

  const onError = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve all record in the groups table'
  );

  return pipe(targetQuery, TE.bimap(onError, getOnlyResultInArr));
}

function generateGeneralQueryErrorMessage(errorMessage?: string) {
  return (aggregateErrorInstance: AggregateError) =>
    updateAggregateError(aggregateErrorInstance)(
      errorMessage ?? `An error occurred while attempting to perform this query`
    );
}

function getOnlyResultInArr<RT extends unknown>(resultArr: RT[]) {
  return pipe(resultArr as NEA.NonEmptyArray<RT>, NEA.head);
}
