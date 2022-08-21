import Joi from 'joi';
import { Group, Task } from '../db/schema';
import { Lifecycle } from '@hapi/hapi';

export const returnRawErrors: Lifecycle.Method = async (_, __, err) => err;

export const groupSchema: {
  joiObj: { [K in keyof Group]: any };
  example: Record<keyof Group, string | boolean>;
} = {
  joiObj: {
    group_id: Joi.string().uuid().required(),
    title: Joi.string().required(),
    description: Joi.string().optional(),
    created_at: Joi.date().required().iso(),
    updated_at: Joi.date().required().iso(),
  },

  example: {
    created_at: '2022-08-21T07:12:51.928Z',
    description: 'Tasks that have been completed',
    group_id: '73a463d4-3964-4c69-b8b4-e22827e14930',
    title: 'Completed todos',
    updated_at: '2022-08-21T07:12:51.928Z',
  },
};

export const taskSchema: {
  joiObj: { [K in keyof Task]: any };
  example: Record<keyof Task, string | boolean>;
} = {
  joiObj: {
    task_id: Joi.string().uuid().required(),
    group_id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    due_date: Joi.date().optional().iso(),
    description: Joi.string().optional(),
    completed: Joi.boolean().default(false),
    completed_at: Joi.date().optional().iso(),
    created_at: Joi.date().required().iso(),
    updated_at: Joi.date().required().iso(),
  },

  example: {
    completed: true,
    completed_at: '2022-08-21T07:11:51.267Z',
    created_at: '2022-08-21T05:45:48.446Z',
    description: 'The Samsung Galaxy S22 Ultra, or the Nothing phone',
    due_date: '2022-08-22T03:06:10.161Z',
    group_id: '73a463d4-3964-4c69-b8b4-e22827e14930',
    name: 'Buy new phone',
    task_id: '5ef37360-328d-4023-a285-8c53f400fb4d',
    updated_at: '2022-08-21T07:25:39.665Z',
  },
};

export const errorSchema = Joi.object({
  errors: Joi.array().items(Joi.string()),
});
