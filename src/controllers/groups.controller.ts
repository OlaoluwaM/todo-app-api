import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';

import { pipe } from 'fp-ts/lib/function';
import { traverse } from 'fp-ts/lib/Array';
import { ToRecordOfOptions } from '../types/index';
import { generateErrorHandler } from '../utils/helpers';
import { GroupCreationAttributes } from '../db/schema';
import { Request, ResponseToolkit } from '@hapi/hapi';
import {
  getGroupRecordById,
  getAllGroupRecords,
  createNewGroupRecord,
  updateGroupRecordById,
  deleteGroupRecordById,
  includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord,
} from '../services/groups.service';
import { RequestWithUrlParamGroupId } from './common';

interface RequestWithPayload extends Request {
  payload: GroupCreationAttributes & Request['payload'];
}

interface RequestWithQueryStr extends Request {
  query: { withTasks: boolean; idsOnly: boolean } & Request['query'];
}

type RequestWithUrlParams = RequestWithUrlParamGroupId;

export async function createGroup(
  req: RequestWithPayload,
  responseHandler: ResponseToolkit
) {
  const groupCreationAttributes: GroupCreationAttributes = {
    title: req.payload.title,
    description: req.payload.description ?? null,
  };

  const queryResults = await pipe(groupCreationAttributes, createNewGroupRecord)();

  return pipe(
    queryResults,
    E.fold(
      err =>
        responseHandler
          .response({ errors: ['Internal server Error', ...err.aggregatedMessages] })
          .code(500),
      groupData => responseHandler.response(groupData).code(201)
    )
  );
}

export async function getAllGroups(
  request: RequestWithQueryStr,
  responseHandler: ResponseToolkit
) {
  const { withTasks, idsOnly } = request.query;
  const errorHandler = generateErrorHandler(responseHandler);

  const queryForAllGroups = getAllGroupRecords();
  const includeTasks = traverse(TE.ApplicativePar)(
    includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord(idsOnly)
  );

  const queryForAllGroupsWithTheirTasks = pipe(
    queryForAllGroups,
    TE.chainW(includeTasks)
  );
  const queryToPerform = withTasks ? queryForAllGroupsWithTheirTasks : queryForAllGroups;

  const queryResult = await queryToPerform();

  return pipe(
    queryResult,
    E.fold(
      errorHandler,
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

  const errorHandler = generateErrorHandler(responseHandler);
  const includeTasks = includeArrOfRelatedTaskObjsOrTaskIdsInGroupRecord(idsOnly);

  const queryForSingleGroupRecord = pipe(groupId, getGroupRecordById);
  const queryForSingleGroupRecordWithItsTasks = pipe(
    queryForSingleGroupRecord,
    TE.chainW(includeTasks)
  );

  const queryToPerform = withTasks
    ? queryForSingleGroupRecordWithItsTasks
    : queryForSingleGroupRecord;

  const queryResults = await queryToPerform();

  return pipe(
    queryResults,
    E.fold(errorHandler, groupData => responseHandler.response(groupData).code(200))
  );
}

export async function updateGroup(
  req: RequestWithUrlParams & RequestWithPayload,
  responseHandler: ResponseToolkit
) {
  const { groupId } = req.params;
  const errorHandler = generateErrorHandler(responseHandler);

  const groupUpdateAttributes: ToRecordOfOptions<GroupCreationAttributes> = {
    title: O.fromNullable(req.payload.title),
    description: O.fromNullable(req.payload.description),
  };

  const queryResults = await pipe(
    groupId,
    updateGroupRecordById(groupUpdateAttributes)
  )();

  return pipe(
    queryResults,
    E.fold(errorHandler, groupData => responseHandler.response(groupData).code(201))
  );
}

export async function deleteGroup(
  req: RequestWithUrlParams,
  responseHandler: ResponseToolkit
) {
  const { groupId } = req.params;
  const errorHandler = generateErrorHandler(responseHandler);

  const doesTargetGroupExist = getGroupRecordById(groupId);

  const queryToPerform = pipe(
    doesTargetGroupExist,
    TE.chainW(() => deleteGroupRecordById(groupId))
  );

  const queryResults = await queryToPerform();

  return pipe(
    queryResults,
    E.fold(errorHandler, () => responseHandler.response().code(200))
  );
}
