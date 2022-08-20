export type Primitive = string | number | boolean | symbol;

export interface AnyObject {
  [key: Exclude<Primitive, boolean>]: any;
}

export type StripNullFromProps<Obj extends AnyObject> = {
  [K in keyof Obj]: Exclude<Obj[K], null>;
};
