import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';

import { flow, pipe } from 'fp-ts/lib/function';
import { traverse } from 'fp-ts/lib/Array';
import { empty as sMempty } from 'fp-ts/lib/string';
import { RemoveNullFromPropUnion } from '../types';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { GroupCreationAttributes, Group, GroupID } from '../db/schema';
import {
  getGroupRecordById,
  getAllGroupRecords,
  createNewGroupRecord,
  getTasksForGroupByGroupId,
  updateGroupRecordById,
  deleteGroupRecordById,
} from '../services/groups.service';
import { unit } from '@utils/index';
import { newAggregateError } from '@lib/AggregateError';

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

export async function getAllGroups(
  request: Request & {
    query: { withTasks: boolean; idsOnly: boolean };
  },
  responseHandler: ResponseToolkit
) {
  const { withTasks, idsOnly } = request.query;

  const queryForAllGroups = getAllGroupRecords();
  const includeTasks = traverse(TE.ApplicativePar)(
    includeTasksObjsOrTaskIdsInGroup(idsOnly)
  );

  const queryForAllGroupsWithTheirTasks = pipe(queryForAllGroups, TE.chain(includeTasks));

  const queryToPerform = withTasks ? queryForAllGroupsWithTheirTasks : queryForAllGroups;
  const queryResult = await queryToPerform();

  return pipe(
    queryResult,
    E.fold(
      err => responseHandler.response(`Internal server Error: ${err.message}`).code(500),
      groupData => responseHandler.response(groupData).code(200)
    )
  );
}

export async function getSingleGroup(
  request: Request & {
    params: { groupId: GroupID };
    query: { withTasks: boolean; idsOnly: boolean };
  },
  responseHandler: ResponseToolkit
) {
  const { groupId } = request.params;
  const { withTasks, idsOnly } = request.query;

  const includeTasks = includeTasksObjsOrTaskIdsInGroup(idsOnly);

  const queryForGroupRecord = pipe(groupId, getGroupRecordById);
  const queryForGroupRecordWithItsTasks = pipe(
    queryForGroupRecord,
    TE.chain(includeTasks)
  );

  const queryToPerform = withTasks
    ? queryForGroupRecordWithItsTasks
    : queryForGroupRecord;

  const queryResults = await queryToPerform();

  return pipe(
    queryResults,
    E.fold(
      err => responseHandler.response(`Internal server Error: ${err.message}`).code(500),
      groupData => responseHandler.response(groupData).code(201)
    )
  );
}

export async function updateGroup(
  req: Request & { params: { groupId: GroupID }; payload: GroupCreationAttributes },
  responseHandler: ResponseToolkit
) {
  const { groupId } = req.params;
  const reqPayload: RemoveNullFromPropUnion<GroupCreationAttributes> = {
    title: req.payload.title ?? sMempty,
    description: req.payload.description ?? sMempty,
  };

  const queryResults = await pipe(groupId, updateGroupRecordById(reqPayload))();

  return pipe(
    queryResults,
    E.fold(
      err => responseHandler.response(`Internal server Error: ${err.message}`).code(500),
      groupData => responseHandler.response(groupData).code(201)
    )
  );
}

export async function deleteGroup(
  req: Request & { params: { groupId: GroupID } },
  responseHandler: ResponseToolkit
) {
  const { groupId } = req.params;

  const queryToPerform = pipe(
    getGroupRecordById(groupId),
    TE.mapLeft(() => E.right('Already deleted') as E.Right<string>),
    TE.chainW(
      flow(
        () => deleteGroupRecordById(groupId),
        TE.mapLeft(e => E.left(e.message) as E.Left<string>)
      )
    )
  );

  const queryResults = await queryToPerform();

  return pipe(
    queryResults,
    E.fold(
      pipe(
        E.match(
          msg => responseHandler.response(msg).code(500),
          msg => responseHandler.response(msg).code(202)
        )
      ),
      () => responseHandler.response('Resource deleted successfully').code(200)
    )
  );
}

// TODO: I think this should be moved into the groups service
function includeTasksObjsOrTaskIdsInGroup(idsOnly: boolean) {
  return (groupData: Group) =>
    pipe(
      getTasksForGroupByGroupId(idsOnly ? 'task_id' : '*')(groupData.group_id),
      TE.map(tasks => ({ ...groupData, tasks }))
    );
}
