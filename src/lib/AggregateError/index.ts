import { isString } from 'fp-ts/lib/string';
import { BaseError } from '../../utils/constants';
import { join, uniq } from 'ramda';

type Messages = [BaseError, ...string[]];
export class AggregateError extends Error {
  #messages: Messages;

  constructor(initialMessage: BaseError) {
    super();
    this.#messages = [initialMessage];
  }

  get aggregatedMessages() {
    return this.#messages;
  }

  addError(messages: string[] | string) {
    const separateByComma = join(', ');
    const newMessagesToAdd = isString(messages) ? [messages] : messages;

    this.#messages = uniq(this.#messages.concat(newMessagesToAdd)) as Messages;
    this.message = `The following errors occurred: ${separateByComma(this.#messages)}`;

    return this;
  }
}

export function newAggregateError(initialMessage: BaseError) {
  return new AggregateError(initialMessage);
}

export function addError(message: string | string[]) {
  return (aggregateErrorInstance: AggregateError) =>
    aggregateErrorInstance.addError(message);
}
