import pkg from 'pg';
import queryBuilder from './queryBuilder';

import { generateConnectionURI } from '../config/index';

const dbConnectionPool = new pkg.Pool({
  connectionString: generateConnectionURI(),
});

const dbQuery = queryBuilder(dbConnectionPool);
export default dbQuery;
