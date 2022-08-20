export type Primitive = string | number | boolean | symbol;

export interface AnyObject {
  [key: Exclude<Primitive, boolean>]: any;
}

export type AnyFunction<RT = unknown> = (...args: any[]) => RT;

export type RemoveNullFromPropUnion<Obj extends AnyObject> = {
  [K in keyof Obj]: Exclude<Obj[K], null>;
};
