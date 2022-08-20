import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';

import { id } from '../utils/index';
import { pipe } from 'fp-ts/lib/function';
import { newAggregateError } from '../lib/AggregateError';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { GroupCreationAttributes, Group, GroupID } from '../db/schema';
import {
  createNewGroupRecord,
  getGroupRecordById,
  getTasksForGroupByGroupId,
} from '../services/groups.service';

export async function createGroup(
  req: Request & { payload: GroupCreationAttributes },
  responseHandler: ResponseToolkit
) {
  const incomingReqData = {
    title: req.payload.title,
    description: req.payload.description ?? null,
  };

  const queryResults = await pipe(incomingReqData, createNewGroupRecord)();

  return pipe(
    queryResults,
    E.fold(
      err => responseHandler.response(`Internal server Error: ${err.message}`).code(500),
      groupData => responseHandler.response(groupData).code(201)
    )
  );
}

export async function getInfoOnSingleGroup(
  request: Request & {
    params: { groupId: GroupID };
    query: { withTasks: boolean; idsOnly: boolean };
  },
  responseHandler: ResponseToolkit
) {
  const { groupId } = request.params;
  const { withTasks, idsOnly } = request.query;

  const includeTasksInGroupRecord = includeTasksObjsOrTaskIdsInGroup(groupId, idsOnly);

  const queryForGroupRecordOnly = pipe(groupId, getGroupRecordById);
  const queryForGroupRecordWithTasks = pipe(
    queryForGroupRecordOnly,
    TE.chain(includeTasksInGroupRecord)
  );

  const queryToPerform = withTasks
    ? queryForGroupRecordWithTasks
    : queryForGroupRecordOnly;
  const queryResults = await queryToPerform();

  return pipe(
    queryResults,
    E.fold(
      err => responseHandler.response(`Internal server Error: ${err.message}`).code(500),
      groupData => responseHandler.response(groupData).code(201)
    )
  );
}

function includeTasksObjsOrTaskIdsInGroup(groupId: GroupID, idsOnly: boolean) {
  return (groupData: Group) =>
    pipe(
      getTasksForGroupByGroupId(idsOnly ? 'task_id' : '*')(groupId),
      TE.map(tasks => ({ ...groupData, tasks })),
      TE.bimap(err => newAggregateError(`Internal server Error: ${err.message}`), id)
    );
}
