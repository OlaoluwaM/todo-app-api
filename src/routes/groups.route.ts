import Joi from 'joi';

import { map } from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/function';
import { prefixStr } from '../utils/index';
import { lensProp, over } from 'ramda';
import { Lifecycle, ServerRoute } from '@hapi/hapi';
import {
  createGroup,
  deleteGroup,
  updateGroup,
  getAllGroups,
  getSingleGroup,
} from '../controllers/groups.controller';

const ROUTE_PREFIX = '/groups';
const prependRoutePrefix = prefixStr(ROUTE_PREFIX);

export default function generateGroupRoutes() {
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
    withTasks: Joi.boolean().default(false),
    idsOnly: Joi.boolean()
      .default(false)
      .when('withTasks', {
        is: true,
        then: Joi.valid(true, false),
      })
      .when('withTasks', { is: false, then: Joi.valid(false) }),
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

const returnRawErrors: Lifecycle.Method = async (_, __, err) => err;

function getRouteObjects(): ServerRoute[] {
  return [
    {
      path: '',
      method: 'GET',
      handler: getAllGroups,
      options: {
        validate: {
          query: groupApiRequestValidationFor.query,
          failAction: returnRawErrors,
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'GET',
      handler: getSingleGroup,
      options: {
        validate: {
          params: groupApiRequestValidationFor.params,
          query: groupApiRequestValidationFor.query,
          failAction: returnRawErrors,
        },
      },
    },

    {
      path: '',
      method: 'POST',
      handler: createGroup,
      options: {
        validate: {
          payload: groupApiRequestValidationFor.payload,
          failAction: returnRawErrors,
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'PUT',
      handler: updateGroup,
      options: {
        validate: {
          params: groupApiRequestValidationFor.params,
          payload: groupApiRequestValidationFor.optionalPayload,
          failAction: returnRawErrors,
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'DELETE',
      handler: deleteGroup,
      options: {
        validate: {
          params: groupApiRequestValidationFor.params,
          failAction: returnRawErrors,
        },
      },
    },
  ];
}
