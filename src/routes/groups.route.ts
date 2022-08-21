import Joi from 'joi';

import { map } from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/function';
import { prefixStr } from '../utils/index';
import { ServerRoute } from '@hapi/hapi';
import { lensProp, over } from 'ramda';
import { errorSchema, groupSchema, returnRawErrors, taskSchema } from './common';
import {
  createGroup,
  deleteGroup,
  updateGroup,
  getAllGroups,
  getSingleGroup,
} from '../controllers/groups.controller';

const ROUTE_PREFIX = '/groups';
const prependRoutePrefix = prefixStr(ROUTE_PREFIX);

export default function generateGroupEndpointRoutes() {
  const routes = getRouteObjects();
  return pipe(routes, map(prependRoutePrefixToPath));
}

function prependRoutePrefixToPath(routeObj: ServerRoute): ServerRoute {
  const pathLens = lensProp<ServerRoute, 'path'>('path');
  return over(pathLens, prependRoutePrefix, routeObj);
}

const groupApiRequestValidationFor = {
  params: Joi.object({
    groupId: Joi.string().uuid(),
  }),

  query: Joi.object({
    withTasks: Joi.boolean().default(false).optional(),
    idsOnly: Joi.boolean()
      .default(false)
      .when('withTasks', {
        is: true,
        then: Joi.valid(true, false),
      })
      .when('withTasks', { is: false, then: Joi.valid(false) })
      .optional(),
  }),

  payload: {
    title: Joi.string().min(4).required(),
    description: Joi.string().optional().min(4),
  },

  get optionalPayload() {
    return Joi.object(this.payload).fork(Object.keys(this.payload), schema =>
      schema.optional()
    );
  },
};

function getRouteObjects(): ServerRoute[] {
  return [
    {
      path: '',
      method: 'GET',
      options: {
        handler: getAllGroups,

        // Request Validation
        validate: {
          query: groupApiRequestValidationFor.query,
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Groups (Todo Lists)'],
        description: 'Get all groups (todo lists)',
        notes:
          'Get all groups (todo lists) optionally with their corresponding tasks (todos) either as full objects or ids',
        response: {
          status: {
            200: Joi.array().items(
              Joi.object(groupSchema.joiObj).keys({
                tasks: Joi.array()
                  .items(Joi.object(taskSchema.joiObj), taskSchema.joiObj.task_id)
                  .optional(),
              })
            ),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'GET',
      options: {
        handler: getSingleGroup,

        // Request Validation
        validate: {
          params: groupApiRequestValidationFor.params,
          query: groupApiRequestValidationFor.query,
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Groups (Todo Lists)'],
        description: 'Get single group (todo list)',
        notes:
          'Get single group (todo list) optionally with corresponding tasks (todos) either as full objects or ids',
        response: {
          status: {
            200: Joi.object(groupSchema.joiObj).keys({
              tasks: Joi.array()
                .items(Joi.object(taskSchema.joiObj), taskSchema.joiObj.task_id)
                .optional(),
            }),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '',
      method: 'POST',
      options: {
        handler: createGroup,

        // Request Validation
        validate: {
          payload: Joi.object(groupApiRequestValidationFor.payload),
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Groups (Todo Lists)'],
        description: 'Create group (todo list)',
        response: {
          status: {
            201: Joi.object(groupSchema.joiObj),
            500: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'PUT',
      options: {
        handler: updateGroup,

        // Request Validation
        validate: {
          params: groupApiRequestValidationFor.params,
          payload: groupApiRequestValidationFor.optionalPayload,
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Groups (Todo Lists)'],
        description: 'Update group (todo list)',
        notes:
          "Request payload should contain only those properties that have changed relative to the current state of the resource, though sending properties that haven't changed is allowed as well",
        response: {
          status: {
            201: Joi.object(groupSchema.joiObj),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'DELETE',
      options: {
        handler: deleteGroup,

        // Request Validation
        validate: {
          params: groupApiRequestValidationFor.params,
          failAction: returnRawErrors,
        },

        // For Documentation
        tags: ['api', 'Groups (Todo Lists)'],
        description: 'Delete a group (todo list)',
        notes: 'Delete a group (todo list) along with all its accompanying tasks (todos)',
        response: {
          status: {
            200: Joi.any(),
            500: errorSchema,
            404: errorSchema,
          },
          failAction: 'ignore',
        },
      },
    },
  ];
}
