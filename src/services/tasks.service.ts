import * as O from 'fp-ts/lib/Option';
import * as IO from 'fp-ts/lib/IO';
import * as TE from 'fp-ts/lib/TaskEither';

import { last } from 'fp-ts/lib/Semigroup';
import { pipe } from 'fp-ts/lib/function';
import { addError } from '../lib/AggregateError/index';
import { dbQueryClient } from '../db/index';
import { id, randomUUID } from '../utils/index';
import { ToRecordOfOptions } from '../types/index';
import { struct as monoidStruct } from 'fp-ts/lib/Monoid';
import { getOnlyResultInQueryResultArr } from '../utils/helpers';
import {
  TaskID,
  GroupID,
  TaskDecoder,
  TaskUpdateAttributes,
  TaskCreationAttributes,
} from '../db/schema';
import { compose } from 'ramda';

export function createNewTaskRecordUnderGroupId(
  groupId: GroupID,
  taskCreationAttributes: TaskCreationAttributes
) {
  const { name, description, dueDate } = taskCreationAttributes;

  const queryToCreateTaskRecordForGroupId = (taskId: TaskID) =>
    dbQueryClient(
      `INSERT INTO tasks(task_id, group_id, name, description, due_date) VALUES($1, $2, $3, $4, $5) RETURNING *`
    )([taskId, groupId, name, description, dueDate])(TaskDecoder);

  const augmentQueryErr = addError(
    `An error occurred while attempting to create this task`
  );

  return pipe(
    randomUUID,
    IO.map(queryToCreateTaskRecordForGroupId),
    TE.fromIO,
    TE.chain(id),
    TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
  );
}

export function getTaskRecordById(taskId: TaskID) {
  const queryToGetTaskRecordById = dbQueryClient(
    `SELECT * FROM tasks WHERE task_id = $1`
  )([taskId])(TaskDecoder);

  const augmentQueryErr = addError(
    'An error occurred while attempting to retrieve information for this task'
  );

  return pipe(
    queryToGetTaskRecordById,
    TE.bimap(
      compose(augmentQueryErr, addError('Task not found')),
      getOnlyResultInQueryResultArr
    )
  );
}

export function getAllTaskRecords() {
  const queryForAllTaskRecordsInDb = dbQueryClient(`SELECT * FROM tasks`)()(TaskDecoder);

  const augmentQueryErr = addError(
    'An error occurred while attempting to retrieve all records in the tasks table'
  );

  return pipe(queryForAllTaskRecordsInDb, TE.mapLeft(augmentQueryErr));
}

export function updateTaskRecordById(
  taskUpdateAttributes: ToRecordOfOptions<TaskUpdateAttributes>
) {
  const queryToUpdateTaskRecordById = (
    queryParams: [string, Date | null, string | null, boolean, GroupID, TaskID]
  ) =>
    dbQueryClient(
      `UPDATE tasks SET name = $1, due_date = $2, description = $3, completed = $4, group_id = $5 WHERE task_id = $6 RETURNING *`
    )(queryParams)(TaskDecoder);

  const monoidForTaskRecordAttributesUpdate = monoidStruct<typeof taskUpdateAttributes>({
    name: O.getMonoid<string>(last<string>()),
    dueDate: O.getMonoid<Date>(last<Date>()),
    description: O.getMonoid<string>(last<string>()),
    completed: O.getMonoid<boolean>(last<boolean>()),
    newGroupId: O.getMonoid<GroupID>(last<GroupID>()),
  });

  const augmentQueryErr = addError(
    'An error occurred while attempting to update this task'
  );

  return (taskId: TaskID) => {
    const targetTaskRecordInItsOriginalState = getTaskRecordById(taskId);

    const updatedTargetTaskRecord = pipe(
      targetTaskRecordInItsOriginalState,

      TE.map(originalState => ({
        name: O.some(originalState.name),
        dueDate: O.fromNullable(originalState.due_date),
        description: O.fromNullable(originalState.description),
        completed: O.some(originalState.completed),
        newGroupId: O.some(originalState.group_id),
      })),

      TE.map(normalizedRecord =>
        monoidForTaskRecordAttributesUpdate.concat(normalizedRecord, taskUpdateAttributes)
      )
    );

    return pipe(
      updatedTargetTaskRecord,

      TE.chain(updatedGroupRecordAttributes =>
        queryToUpdateTaskRecordById([
          (updatedGroupRecordAttributes.name as O.Some<string>).value,

          pipe(
            updatedGroupRecordAttributes.dueDate,
            O.getOrElseW(() => null)
          ),

          pipe(
            updatedGroupRecordAttributes.description,
            O.getOrElseW(() => null)
          ),

          (updatedGroupRecordAttributes.completed as O.Some<boolean>).value,

          (updatedGroupRecordAttributes.newGroupId as O.Some<GroupID>).value,

          taskId,
        ])
      ),

      TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
    );
  };
}

export function deleteTaskRecordById(taskId: TaskID) {
  const queryToDeleteTaskRecordById = dbQueryClient(
    `DELETE FROM tasks WHERE task_id = $1 RETURNING *`
  )([taskId])(TaskDecoder);

  const augmentQueryErr = addError(
    'An error occurred while attempting to delete group record'
  );

  return pipe(
    queryToDeleteTaskRecordById,
    TE.bimap(augmentQueryErr, getOnlyResultInQueryResultArr)
  );
}
