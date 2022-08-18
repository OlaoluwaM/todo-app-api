import * as t from 'io-ts';
import * as T from 'io-ts/Type';

import { DateCodec, uuidCodec } from './codecs';

export const GroupCodec = t.type({
  group_id: uuidCodec,
  title: t.string,
  description: T.nullable(t.string),
  created_at: DateCodec,
  updated_at: DateCodec,
});

export type GroupT = t.TypeOf<typeof GroupCodec>;

export const TaskCodec = t.type({
  task_id: uuidCodec,
  group_id: uuidCodec,
  name: t.string,
  description: T.nullable(t.string),
  completed: t.boolean,
  due_date: T.nullable(DateCodec),
  completed_at: T.nullable(DateCodec),
  created_at: DateCodec,
  updated_at: DateCodec,
});

export type TaskT = t.TypeOf<typeof TaskCodec>;

export type RowCodec = typeof GroupCodec | typeof TaskCodec;
export type RowType = GroupT | TaskT;
