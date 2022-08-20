import * as T from 'fp-ts/lib/Task';

import Joi from 'joi';
import Boom from '@hapi/boom';

import { map } from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/function';
import { prefixStr } from '../utils/index';
import { lensProp, over } from 'ramda';
import { dummyRouteHandler } from '../utils/helpers';
import { createGroup, getInfoOnSingleGroup } from '../controllers/groups.controller';
import { Lifecycle, RouteOptionsValidate, ServerRoute } from '@hapi/hapi';

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

const groupRecordSchema = Joi.object({
  title: Joi.string().min(4).required(),
  description: Joi.string().optional().min(4),
});

const returnRawErrors: Lifecycle.Method = async (_, __, err) => err;

function getRouteObjects(): ServerRoute[] {
  return [
    {
      path: '',
      method: 'GET',
      handler: dummyRouteHandler,
    },

    {
      path: '/{groupId}',
      method: 'GET',
      handler: getInfoOnSingleGroup,
      options: {
        validate: {
          params: groupIdValidationObj.params,
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
          payload: groupRecordSchema,
          failAction: returnRawErrors,
        },
      },
    },

    {
      path: '/{groupId}',
      method: 'PUT',
      handler: dummyRouteHandler,
      options: {
        validate: groupIdValidationObj,
      },
    },

    {
      path: '/{groupId}',
      method: 'DELETE',
      handler: dummyRouteHandler,
      options: {
        validate: groupIdValidationObj,
      },
    },
  ];
}
