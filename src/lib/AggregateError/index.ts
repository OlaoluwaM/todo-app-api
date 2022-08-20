import { isString } from 'fp-ts/lib/string';
import { join, uniq } from 'ramda';

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
    const separateByComma = join(', ');
    const newMessagesToAdd: string[] = isString(messages) ? [messages] : messages;

    this.#messages = uniq(this.#messages.concat(newMessagesToAdd));
    this.message = `The following errors occurred: ${separateByComma(this.#messages)}`;
    return this
  }
}

export function updateAggregateError(errorInstance: AggregateError) {
  return (message: string | string[]) => errorInstance.addError(message);
}

export function newAggregateError(messages: string | string[]) {
  return new AggregateError(messages);
}
