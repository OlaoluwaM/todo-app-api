import { Newtype } from 'newtype-ts';

export interface UUID extends Newtype<{ readonly UUID: unique symbol }, string> {}
export interface Timestamp extends Newtype<{ readonly Timestamp: unique symbol }, Date> {}
