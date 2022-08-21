import pkg from 'pg';
import queryBuilder from './queryBuilder';

import { generateConnectionURI } from '../config/index';

export const dbConnectionPool = new pkg.Pool({
  connectionString: generateConnectionURI(),
});

// To check how many times this module is evaluated as more than once can lead to issues
// Due to the fact that we are creating database connection pools here
console.count('Module Evaluated');

export const dbQueryClient = queryBuilder(dbConnectionPool);
