import * as IO from 'fp-ts/lib/IO';
import * as TE from 'fp-ts/lib/TaskEither';
import * as NEA from 'fp-ts/lib/NonEmptyArray';

import { pipe } from 'fp-ts/lib/function';
import { UUIDDecoder } from '../lib/decoders';
import { struct, union } from 'io-ts/lib/Decoder';
import { dbQueryClient } from '../db/index';
import { id, randomUUID } from '../utils/index';
import { AggregateError, updateAggregateError } from '../lib/AggregateError';
import { TaskDecoder, GroupDecoder, GroupCreationAttributes, GroupID } from '../db/schema';

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
    IO.map(createGroupQuery),
    TE.fromIO,
    TE.chain(id),
    TE.bimap(onError, getOnlyResultInArr)
  );
}

export function getGroupRecordById(groupId: GroupID) {
  const getGroupInfoQuery = dbQueryClient(`SELECT * FROM groups WHERE group_id = $1`)([
    groupId,
  ])(GroupDecoder);

  const onError = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve information about this group'
  );

  return pipe(getGroupInfoQuery, TE.bimap(onError, getOnlyResultInArr));
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

function generateGeneralQueryErrorMessage(errorMessage?: string) {
  return (aggregateErrorInstance: AggregateError) =>
    updateAggregateError(aggregateErrorInstance)(
      errorMessage ?? `An error occurred while attempting to perform this query`
    );
}

function getOnlyResultInArr<RT extends unknown>(resultArr: RT[]) {
  return pipe(resultArr as NEA.NonEmptyArray<RT>, NEA.head);
}
