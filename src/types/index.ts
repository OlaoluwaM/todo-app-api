import { Option } from 'fp-ts/lib/Option';

export type Primitive = string | number | boolean | symbol;

export interface AnyObject {
  [key: Exclude<Primitive, boolean>]: any;
}

export type StripNullFromProps<Obj extends AnyObject> = {
  [K in keyof Obj]: Exclude<Obj[K], null>;
};

export type ToRecordOfOptions<Obj extends AnyObject> = {
  [K in keyof Obj]: Option<Exclude<Obj[K], null>>;
};
