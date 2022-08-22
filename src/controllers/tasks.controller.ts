import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';

import { pipe } from 'fp-ts/lib/function';
import { BaseError } from '../utils/constants';
import { ToRecordOfOptions } from '../types/index';
import { generateErrorHandler } from '../utils/helpers';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { RequestWithUrlParamGroupId } from './common';
import { TaskUpdateAttributes, TaskCreationAttributes, TaskID } from '../db/schema';
import {
  getAllTaskRecords,
  getTaskRecordById,
  updateTaskRecordById,
  createNewTaskRecordUnderGroupId,
  deleteTaskRecordById,
} from '../services/tasks.service';

interface RequestWithPayload extends Request {
  payload: TaskUpdateAttributes & Request['payload'];
}
interface RequestWithUrlParamTaskId extends Request {
  params: { taskId: TaskID; groupId: never } & Request['params'];
}

export async function createTask(
  req: RequestWithUrlParamGroupId & RequestWithPayload,
  responseHandler: ResponseToolkit
) {
  const { groupId } = req.params;

  const taskCreationAttributes: TaskCreationAttributes = {
    name: req.payload.name,
    dueDate: req.payload.dueDate ?? null,
    description: req.payload.description ?? null,
  };

  const queryResults = await createNewTaskRecordUnderGroupId(
    groupId,
    taskCreationAttributes
  )();

  return pipe(
    queryResults,
    E.fold(
      err =>
        responseHandler
          .response({ errors: ['Internal server Error', ...err.aggregatedMessages] })
          .code(500),
      taskData => responseHandler.response(taskData).code(201)
    )
  );
}

export async function getSingleTask(
  req: RequestWithUrlParamTaskId,
  responseHandler: ResponseToolkit
) {
  const { taskId } = req.params;
  const errorHandler = generateErrorHandler(responseHandler);

  const queryResults = await pipe(taskId, getTaskRecordById)();

  return pipe(
    queryResults,
    E.fold(errorHandler, taskData => responseHandler.response(taskData).code(200))
  );
}

export async function getAllTasks(request: Request, responseHandler: ResponseToolkit) {
  const queryResult = await getAllTaskRecords()();

  return pipe(
    queryResult,
    E.fold(
      aggErrInst => {
        if (aggErrInst.aggregatedMessages[0] === BaseError.NO_MATCH) {
          return responseHandler.response([]).code(200);
        }

        return responseHandler
          .response({ errors: aggErrInst.aggregatedMessages })
          .code(500);
      },
      taskData => responseHandler.response(taskData).code(200)
    )
  );
}

export async function updateTask(
  req: RequestWithUrlParamTaskId & RequestWithPayload,
  responseHandler: ResponseToolkit
) {
  const { taskId } = req.params;
  const errorHandler = generateErrorHandler(responseHandler);

  const optionTaskUpdateAttributes: ToRecordOfOptions<TaskUpdateAttributes> = {
    name: O.fromNullable(req.payload.name),
    dueDate: O.fromNullable(req.payload.dueDate),
    description: O.fromNullable(req.payload.description),
    completed: O.fromNullable(req.payload.completed),
    newGroupId: O.fromNullable(req.payload.newGroupId),
  };

  const queryResults = await pipe(
    taskId,
    updateTaskRecordById(optionTaskUpdateAttributes)
  )();

  return pipe(
    queryResults,
    E.fold(errorHandler, taskData => responseHandler.response(taskData).code(201))
  );
}

export async function deleteTask(
  req: RequestWithUrlParamTaskId,
  responseHandler: ResponseToolkit
) {
  const { taskId } = req.params;
  const errorHandler = generateErrorHandler(responseHandler);

  const doesTaskExist = getTaskRecordById(taskId);

  const queryToPerform = pipe(
    doesTaskExist,
    TE.chainW(() => deleteTaskRecordById(taskId))
  );

  const queryResults = await queryToPerform();

  return pipe(
    queryResults,
    E.fold(errorHandler, () => responseHandler.response().code(200))
  );
}
