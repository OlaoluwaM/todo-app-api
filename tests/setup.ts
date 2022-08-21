import pkg from 'pg';
import queryBuilder from '@db/queryBuilder';

import { generateConnectionURI } from '@config/index';

export type DbQuery = ReturnType<typeof queryBuilder>;
export type DbConnectionInstance = pkg.Pool;

export function getDbQueryCreator() {
  const dbConnectionURI = generateConnectionURI();
  const dbConnectionInstance = new pkg.Pool({ connectionString: dbConnectionURI });
  const dbQuery = queryBuilder(dbConnectionInstance);

  return { dbConnectionInstance, dbQuery };
}

export async function closeDbConnection(dbConnectionInstance: pkg.Pool) {
  await dbConnectionInstance.end();
}
