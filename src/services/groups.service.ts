import * as O from 'fp-ts/lib/Option';
import * as IO from 'fp-ts/lib/IO';
import * as TE from 'fp-ts/lib/TaskEither';
import * as NEA from 'fp-ts/lib/NonEmptyArray';

import { last } from 'fp-ts/lib/Semigroup';
import { pipe } from 'fp-ts/lib/function';
import { UUIDDecoder } from '../lib/decoders';
import { QueryParams } from '../db/queryBuilder';
import { struct, union } from 'io-ts/lib/Decoder';
import { dbQueryClient } from '../db/index';
import { ToRecordOfOptions } from '../types';
import { id, randomUUID, trace } from '../utils/index';
import { AggregateError, updateAggregateError } from '../lib/AggregateError';
import {
  Group,
  GroupID,
  TaskDecoder,
  GroupDecoder,
  GroupCreationAttributes,
} from '../db/schema';

export function createNewGroupRecord(groupCreationAttributes: GroupCreationAttributes) {
  const { title, description } = groupCreationAttributes;

  const queryToCreateGroupRecord = (groupId: GroupID) =>
    dbQueryClient(
      `INSERT INTO groups(group_id, title, description) VALUES($1, $2, $3) RETURNING *`
    )([groupId, title, description])(GroupDecoder);

  const augmentQueryErr = generateGeneralQueryErrorMessage(
    `An error occurred while attempting to perform this query`
  );

  return pipe(
    randomUUID,
    trace(),
    IO.map(queryToCreateGroupRecord),
    TE.fromIO,
    TE.chain(id),
    TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
  );
}

export function getGroupRecordById(groupId: GroupID) {
  const queryToGetGroupRecordById = dbQueryClient(
    `SELECT * FROM groups WHERE group_id = $1`
  )([groupId])(GroupDecoder);

  const augmentQueryErr = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve information about this group'
  );

  return pipe(
    queryToGetGroupRecordById,
    TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
  );
}

export function getTasksRelatedToGroupRecordByGroupId(
  taskColumnsToRetrieve: '*' | 'task_id'
) {
  const queryForTasksRelatedToGroupRecordById = dbQueryClient(
    `SELECT $1 FROM tasks WHERE group_id = $2`
  );

  const augmentQueryErr = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve the tasks for this group'
  );

  return (groupId: GroupID) => {
    const DecoderForTaskIdRecord = struct({ task_id: UUIDDecoder });
    const QueryDecoder = union(TaskDecoder, DecoderForTaskIdRecord);

    const queryToPerform = queryForTasksRelatedToGroupRecordById([
      taskColumnsToRetrieve,
      groupId,
    ])(QueryDecoder);

    return pipe(queryToPerform, TE.mapLeft(augmentQueryErr));
  };
}

// ENHANCEMENT: Add pagination and sorting here
export function getAllGroupRecords() {
  const queryForAllGroupRecordsInDb =
    dbQueryClient(`SELECT * FROM groups`)()(GroupDecoder);

  const augmentQueryErr = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve all record in the groups table'
  );

  return pipe(queryForAllGroupRecordsInDb, TE.mapLeft(augmentQueryErr));
}

export function updateGroupRecordById(
  updatedGroupAttributes: ToRecordOfOptions<GroupCreationAttributes>
) {
  const queryToUpdateGroupRecordById = (queryParams: QueryParams) =>
    dbQueryClient(
      `UPDATE groups SET title = $1, description = $2 WHERE group_id = $3 RETURNING *`
    )(queryParams)(GroupDecoder);

  const monoidGroupCreationAttributesUpdate = O.getMonoid<string>(last<string>());

  const augmentQueryErr = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to update this group'
  );

  return (groupId: GroupID) => {
    const targetGroupRecordInItsOriginalState = getGroupRecordById(groupId);

    const updatedTargetGroupRecord = pipe(
      targetGroupRecordInItsOriginalState,
      TE.map(originalState => ({
        title: O.some(originalState.title),
        description: O.fromNullable(originalState.description),
      })),

      TE.map(normalizedRecord => ({
        newTitle: monoidGroupCreationAttributesUpdate.concat(
          normalizedRecord.title, // this will always be a string
          updatedGroupAttributes.title
        ) as O.Some<string>,

        newDescription: monoidGroupCreationAttributesUpdate.concat(
          normalizedRecord.description,
          updatedGroupAttributes.description
        ),
      }))
    );

    return pipe(
      updatedTargetGroupRecord,

      TE.chain(updatedGroupRecordAttributes =>
        queryToUpdateGroupRecordById([
          updatedGroupRecordAttributes.newTitle.value,
          pipe(
            updatedGroupRecordAttributes.newDescription,
            O.getOrElseW(() => null)
          ),
        ])
      ),

      TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
    );
  };
}

export function deleteGroupRecordById(groupId: GroupID) {
  const queryToDeleteGroupRecordById = dbQueryClient(
    `DELETE FROM groups WHERE group_id = $1 RETURNING *`
  )([groupId])(GroupDecoder);

  const augmentQueryErr = generateGeneralQueryErrorMessage(
    'An error occurred while attempting to retrieve all record in the groups table'
  );

  return pipe(
    queryToDeleteGroupRecordById,
    TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
  );
}

export function includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord(idsOnly: boolean) {
  return (groupData: Group) =>
    pipe(
      getTasksRelatedToGroupRecordByGroupId(idsOnly ? 'task_id' : '*')(
        groupData.group_id
      ),
      TE.map(tasks => ({ ...groupData, tasks }))
    );
}

function generateGeneralQueryErrorMessage(errorMessage?: string) {
  return (aggregateErrorInstance: AggregateError) =>
    updateAggregateError(aggregateErrorInstance)(
      errorMessage ?? `An error occurred while attempting to perform this query`
    );
}

function getOnlyResultInQueryResultArr<RT extends unknown>(resultArr: RT[]) {
  return pipe(resultArr as NEA.NonEmptyArray<RT>, NEA.head);
}
