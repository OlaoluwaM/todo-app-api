import * as d from 'io-ts/lib/Decoder';

import { StripNullFromProps } from '../types';
import { DateDecoder, UUIDDecoder } from '../lib/decoders';

export const GroupDecoder = d.struct({
  group_id: UUIDDecoder,
  title: d.string,
  description: d.nullable(d.string),
  created_at: DateDecoder,
  updated_at: DateDecoder,
});

export type Group = d.TypeOf<typeof GroupDecoder>;
export type GroupID = Pick<Group, 'group_id'>['group_id'];
export type GroupCreationAttributes = Pick<Group, 'title' | 'description'>;
export type NonNullGroupCreationAttributes = StripNullFromProps<GroupCreationAttributes>;

export const TaskDecoder = d.struct({
  task_id: UUIDDecoder,
  group_id: UUIDDecoder,
  name: d.string,
  description: d.nullable(d.string),
  completed: d.boolean,
  due_date: d.nullable(DateDecoder),
  completed_at: d.nullable(DateDecoder),
  created_at: DateDecoder,
  updated_at: DateDecoder,
});

export type Task = d.TypeOf<typeof TaskDecoder>;

export type RowDecoder = typeof GroupDecoder | typeof TaskDecoder;
export type RowType = Group | Task;
