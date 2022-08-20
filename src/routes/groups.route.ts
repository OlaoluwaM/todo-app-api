import * as T from 'fp-ts/lib/Task';

import Joi from 'joi';
import Boom from '@hapi/boom';

import { map } from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/function';
import { prefixStr } from '../utils/index';
import { lensProp, over } from 'ramda';
import { dummyRouteHandler } from '../utils/helpers';
import { Lifecycle, RouteOptionsValidate, ServerRoute } from '@hapi/hapi';
import {
  createGroup,
  deleteGroup,
  getAllGroups,
  getSingleGroup,
  updateGroup,
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

const groupIdValidationObj: Pick<RouteOptionsValidate, 'params' | 'failAction'> = {
  params: Joi.object({
    groupId: Joi.string().uuid(),
  }),
  failAction: T.of(Boom.badRequest('groupId should be a valid UUID string')),
};

const groupRecordSchema = {
  title: Joi.string().min(4).required(),
  description: Joi.string().optional().min(4),
};

const getEndpointQueryStrValidations = Joi.object({
  withTasks: Joi.boolean().default(false),
  idsOnly: Joi.boolean()
    .default(false)
    .when('withTasks', {
      is: true,
      then: Joi.valid(true, false),
    })
    .when('withTasks', { is: false, then: Joi.valid(false) }),
});

const returnRawErrors: Lifecycle.Method = async (_, __, err) => err;

function getRouteObjects(): ServerRoute[] {
  return [
    {
      path: '',
      method: 'GET',
      handler: getAllGroups,
      options: {
        validate: {
          query: getEndpointQueryStrValidations,
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
          params: groupIdValidationObj.params,
          query: getEndpointQueryStrValidations,
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
          payload: Joi.object(groupRecordSchema),
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
          params: groupIdValidationObj.params,
          payload: Joi.object(groupRecordSchema).fork(
            Object.keys(groupRecordSchema),
            schema => schema.optional()
          ),
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'DELETE',
      handler: deleteGroup,
      options: {
        validate: groupIdValidationObj,
      },
    },
  ];
}
