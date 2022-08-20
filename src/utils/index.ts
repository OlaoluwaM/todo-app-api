import * as IO from 'fp-ts/lib/IO';

import { pipe } from 'fp-ts/lib/function';
import { v4 as getUUID } from 'uuid';
import { concat, isEmpty, join, lensIndex, over } from 'ramda';

type RawTypes =
  | 'function'
  | 'object'
  | 'array'
  | 'null'
  | 'undefined'
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'symbol';

export function rawTypeOf(value: unknown): RawTypes {
  return Object.prototype.toString
    .call(value)
    .replace(/\[|\]|object|\s/g, '')
    .toLocaleLowerCase() as RawTypes;
}

export function trace<T>(...logContents: string[]) {
  return (val: T) => {
    const otherLogContents = isEmpty(logContents) ? ['Output: '] : logContents;
    console.log(...otherLogContents, val);
    return val;
  };
}

export function id<T>(value: T) {
  return value;
}

export function unit<T>(val: T): () => T {
  return () => val;
}

export function convertArrToSentence(arr: string[]) {
  const tailLens = lensIndex<string>(arr.length - 1);

  return pipe(
    over(tailLens, (str: string) => `and ${str}`, arr),
    join(', ')
  );
}

export const prefixStr =
  (prefix: string) =>
  (suffix: string): string =>
    concat(prefix, suffix);

export const randomUUID = IO.of(getUUID());

export const toNumber = (value: string) => parseInt(value, 10);
