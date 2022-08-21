import Joi from 'joi';

import { map } from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/function';
import { prefixStr } from '../utils/index';
import { ServerRoute } from '@hapi/hapi';
import { lensProp, over } from 'ramda';
import { errorSchema, returnRawErrors, taskSchema } from './common';
import {
  createTask,
  deleteTask,
  updateTask,
  getAllTasks,
  getSingleTask,
} from '../controllers/tasks.controller';

const ROUTE_PREFIX = '/tasks';
const prependRoutePrefix = prefixStr(ROUTE_PREFIX);

export default function generateTaskEndpointRoutes() {
  const routes = getRouteObjects();
  return pipe(routes, map(prependRoutePrefixToPath));
}

function prependRoutePrefixToPath(routeObj: ServerRoute): ServerRoute {
  const pathLens = lensProp<ServerRoute, 'path'>('path');
  return over(pathLens, prependRoutePrefix, routeObj);
}

const taskApiRequestValidationFor = {
  params: Joi.object({
    taskId: Joi.string().uuid().required(),
  }),

  creationParams: Joi.object({
    groupId: Joi.string().uuid(),
  }),

  creationPayload: {
    name: Joi.string().min(4).required(),
    dueDate: Joi.date().optional().min('now'),
    description: Joi.string().optional().min(4),
  },

  get updatePayload() {
    return Joi.object(this.creationPayload)
      .keys({
        completed: Joi.boolean(),
        newGroupId: Joi.string().uuid(),
      })
      .fork(Object.keys(this.creationPayload), schema => schema.optional());
  },
};

function getRouteObjects(): ServerRoute[] {
  return [
    {
      path: '',
      method: 'GET',
      options: {
        handler: getAllTasks,

        // For Documentation
        tags: ['api', 'Tasks (Todos)'],
        description: 'Get all tasks (todos) regardless of group (todo list)',
        response: {
          status: {
            200: Joi.array().items(Joi.object(taskSchema.joiObj)),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '/{taskId}',
      method: 'GET',
      options: {
        handler: getSingleTask,

        // Request Validation
        validate: {
          params: taskApiRequestValidationFor.params,
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Tasks (Todos)'],
        description: 'Get single task (todo) regardless of group (todo list)',
        notes: 'Get information about a single task (todo)',
        response: {
          status: {
            200: Joi.object(taskSchema.joiObj),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'POST',
      options: {
        handler: createTask,

        // Request Validation
        validate: {
          params: taskApiRequestValidationFor.creationParams,
          payload: Joi.object(taskApiRequestValidationFor.creationPayload),
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Tasks (Todos)'],
        description: 'Create task (todo) under the specified group (todo list)',
        notes: 'Get information about a single task (todos)',
        response: {
          status: {
            201: Joi.object(taskSchema.joiObj),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '/{taskId}',
      method: 'PUT',
      options: {
        handler: updateTask,

        // Request Validation
        validate: {
          params: taskApiRequestValidationFor.params,
          payload: taskApiRequestValidationFor.updatePayload,
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Tasks (Todos)'],
        description: 'Update task (todo)',
        notes:
          "Request payload should contain only those properties that have changed relative to the current state of the resource, though sending properties that haven't changed is allowed as well. With this endpoint you can transfer tasks (todos) from one group to another",
        response: {
          status: {
            201: Joi.object(taskSchema.joiObj),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '/{taskId}',
      method: 'DELETE',
      options: {
        handler: deleteTask,

        // Request Validation
        validate: {
          params: taskApiRequestValidationFor.params,
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Tasks (Todos)'],
        description: 'Delete task (todo)',
        response: {
          status: {
            201: Joi.any(),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },
  ];
}
