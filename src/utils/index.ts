import { pipe } from 'fp-ts/lib/function';
import { isString } from 'fp-ts/lib/string';
import { isEmpty, join, lensIndex, over, uniq } from 'ramda';

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

export class AggregateError extends Error {
  #messages: string[] = [];

  constructor(messages: string[] | string) {
    super();
    this.addError(messages);
  }

  get aggregatedMessages() {
    return this.#messages;
  }

  addError(messages: string[] | string) {
    const newMessagesToAdd: string[] = isString(messages) ? [messages] : messages;

    this.#messages = uniq(this.#messages.concat(newMessagesToAdd));
    this.message = `The following errors occurred: ${convertArrToSentence(
      this.#messages
    )}`;
  }
}
export function updateAggregateError(errorInstance: AggregateError) {
  return (message: string | string[]) => errorInstance.addError(message);
}
export function newAggregateError(messages: string | string[]) {
  return new AggregateError(messages);
}

export function convertArrToSentence(arr: string[]) {
  const tailLens = lensIndex<string>(arr.length - 1);

  return pipe(
    over(tailLens, (str: string) => `and ${str}`, arr),
    join(', ')
  );
}
