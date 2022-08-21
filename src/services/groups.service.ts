import * as O from 'fp-ts/lib/Option';
import * as IO from 'fp-ts/lib/IO';
import * as TE from 'fp-ts/lib/TaskEither';

import { map } from 'fp-ts/lib/Array';
import { last } from 'fp-ts/lib/Semigroup';
import { pipe } from 'fp-ts/lib/function';
import { addError } from '../lib/AggregateError/index';
import { UUIDDecoder } from '../lib/decoders/index';
import { struct, union } from 'io-ts/lib/Decoder';
import { dbQueryClient } from '../db/index';
import { lensProp, view } from 'ramda';
import { id, randomUUID } from '../utils/index';
import { ToRecordOfOptions } from '../types/index';
import { struct as monoidStruct } from 'fp-ts/lib/Monoid';
import { getOnlyResultInQueryResultArr } from '../utils/helpers';
import {
  Task,
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

  const augmentQueryErr = addError(
    `An error occurred while attempting to create this group`
  );

  return pipe(
    randomUUID,
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

  const augmentQueryErr = addError(
    'An error occurred while attempting to retrieve information about this group'
  );

  return pipe(
    queryToGetGroupRecordById,
    TE.mapLeft(addError('Target group not found')),
    TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
  );
}

export function getTasksRelatedToGroupRecordByGroupId(idsOnly: boolean) {
  const queryForTaskObjsRelatedToGroupRecordById = dbQueryClient(
    `SELECT * FROM tasks WHERE group_id = $1`
  );

  const queryForTaskIdsRelatedToGroupRecordById = dbQueryClient(
    `SELECT task_id FROM tasks WHERE group_id = $1`
  );

  const queryForTasksRelatedToGroupRecordById = idsOnly
    ? queryForTaskIdsRelatedToGroupRecordById
    : queryForTaskObjsRelatedToGroupRecordById;

  const augmentQueryErr = addError(
    'An error occurred while attempting to retrieve the tasks for this group'
  );

  return (groupId: GroupID) => {
    const DecoderForTaskIdRecord = struct({ task_id: UUIDDecoder });
    const QueryDecoder = union(TaskDecoder, DecoderForTaskIdRecord);

    const queryToPerform = queryForTasksRelatedToGroupRecordById([groupId])(QueryDecoder);

    return pipe(queryToPerform, TE.mapLeft(augmentQueryErr));
  };
}

export function getAllGroupRecords() {
  const queryForAllGroupRecordsInDb =
    dbQueryClient(`SELECT * FROM groups`)()(GroupDecoder);

  const augmentQueryErr = addError(
    'An error occurred while attempting to retrieve all records in the groups table'
  );

  return pipe(queryForAllGroupRecordsInDb, TE.mapLeft(augmentQueryErr));
}

export function updateGroupRecordById(
  groupUpdateAttributes: ToRecordOfOptions<GroupCreationAttributes>
) {
  const queryToUpdateGroupRecordById = (queryParams: [string, string | null, GroupID]) =>
    dbQueryClient(
      `UPDATE groups SET title = $1, description = $2 WHERE group_id = $3 RETURNING *`
    )(queryParams)(GroupDecoder);

  const monoidForGroupRecordAttributesUpdate = monoidStruct<typeof groupUpdateAttributes>(
    {
      title: O.getMonoid<string>(last<string>()),
      description: O.getMonoid<string>(last<string>()),
    }
  );

  const augmentQueryErr = addError(
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

      TE.map(normalizedRecord =>
        monoidForGroupRecordAttributesUpdate.concat(
          normalizedRecord,
          groupUpdateAttributes
        )
      )
    );

    return pipe(
      updatedTargetGroupRecord,

      TE.chain(updatedGroupRecordAttributes =>
        queryToUpdateGroupRecordById([
          (updatedGroupRecordAttributes.title as O.Some<string>).value,

          pipe(
            updatedGroupRecordAttributes.description,
            O.getOrElseW(() => null)
          ),

          groupId,
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

  const augmentQueryErr = addError(
    'An error occurred while attempting to delete group record'
  );

  return pipe(
    queryToDeleteGroupRecordById,
    TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
  );
}

export function includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord(idsOnly: boolean) {
  return (groupData: Group) =>
    pipe(
      getTasksRelatedToGroupRecordByGroupId(idsOnly)(groupData.group_id),
      TE.altW(() => TE.right([])),

      TE.map(tasks => {
        type TaskWithIdOnly = Pick<Task, 'task_id'>;
        const getTaskIdStrFromObj = view(lensProp<Task | TaskWithIdOnly>('task_id'));

        if (idsOnly) return { ...groupData, tasks: map(getTaskIdStrFromObj)(tasks) };
        return { ...groupData, tasks };
      })
    );
}
