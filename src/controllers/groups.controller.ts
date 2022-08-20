import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';

import { traverse } from 'fp-ts/lib/Array';
import { flow, pipe } from 'fp-ts/lib/function';
import { ToRecordOfOptions } from '../types';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { GroupID, GroupCreationAttributes } from '../db/schema';
import {
  getGroupRecordById,
  getAllGroupRecords,
  createNewGroupRecord,
  updateGroupRecordById,
  deleteGroupRecordById,
  includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord,
} from '../services/groups.service';

interface RequestWithPayload extends Request {
  payload: GroupCreationAttributes & Request['payload'];
}

interface RequestWithQueryStr extends Request {
  query: { withTasks: boolean; idsOnly: boolean } & Request['query'];
}

interface RequestWithUrlParams extends Request {
  params: { groupId: GroupID } & Request['params'];
}

export async function createGroup(
  req: RequestWithPayload,
  responseHandler: ResponseToolkit
) {
  const groupCreationAttributes = {
    title: req.payload.title,
    description: req.payload.description ?? null,
  };

  const queryResults = await pipe(groupCreationAttributes, createNewGroupRecord)();

  return pipe(
    queryResults,
    E.fold(
      err => responseHandler.response(`Internal server Error: ${err.message}`).code(500),
      groupData => responseHandler.response(groupData).code(201)
    )
  );
}

export async function getAllGroups(
  request: RequestWithQueryStr,
  responseHandler: ResponseToolkit
) {
  const { withTasks, idsOnly } = request.query;

  const queryForAllGroups = getAllGroupRecords();
  const includeTasks = traverse(TE.ApplicativePar)(
    includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord(idsOnly)
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
  request: RequestWithUrlParams & RequestWithQueryStr,
  responseHandler: ResponseToolkit
) {
  const { groupId } = request.params;
  const { withTasks, idsOnly } = request.query;

  const includeTasks = includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord(idsOnly);

  const queryForSingleGroupRecord = pipe(groupId, getGroupRecordById);
  const queryForSingleGroupRecordWithItsTasks = pipe(
    queryForSingleGroupRecord,
    TE.chain(includeTasks)
  );

  const queryToPerform = withTasks
    ? queryForSingleGroupRecordWithItsTasks
    : queryForSingleGroupRecord;

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
  req: RequestWithUrlParams & RequestWithPayload,
  responseHandler: ResponseToolkit
) {
  const { groupId } = req.params;

  const nonNullGroupCreationAttributes: ToRecordOfOptions<GroupCreationAttributes> = {
    title: O.fromNullable(req.payload.title),
    description: O.fromNullable(req.payload.description),
  };

  const queryResults = await pipe(
    groupId,
    updateGroupRecordById(nonNullGroupCreationAttributes)
  )();

  return pipe(
    queryResults,
    E.fold(
      err => responseHandler.response(`Internal server Error: ${err.message}`).code(500),
      groupData => responseHandler.response(groupData).code(201)
    )
  );
}

export async function deleteGroup(
  req: RequestWithUrlParams,
  responseHandler: ResponseToolkit
) {
  const { groupId } = req.params;
  const doesTargetGroupExist = getGroupRecordById(groupId);

  const queryToPerform = pipe(
    doesTargetGroupExist,
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
          queryErrMsg => responseHandler.response(queryErrMsg).code(500),
          nothingToDelMsg => responseHandler.response(nothingToDelMsg).code(202)
        )
      ),
      () => responseHandler.response('Resource deleted successfully').code(200)
    )
  );
}
