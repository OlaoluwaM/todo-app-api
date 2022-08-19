/* global describe, test, expect, beforeAll, afterAll */
import * as t from 'io-ts';
import * as E from 'fp-ts/lib/Either';

import { pipe } from 'fp-ts/lib/function';
import { DateCodec } from '@db/codecs';
import { manualFail } from './helpers';
import { QueryResult } from '../src/db/queryBuilder';
import { IntFromString } from 'io-ts-types';
import { AggregateError } from '@utils/index';
import { v4 as randomUUID } from 'uuid';
import { GroupCodec, RowType, TaskCodec } from '@db/schema';
import {
  DbQuery,
  closeDbConnection,
  getDbQueryCreator,
  DbConnectionInstance,
} from './setup';

let dbQuery: DbQuery;
let dbConnectionInstance: DbConnectionInstance;

beforeAll(() => {
  const dbObj = getDbQueryCreator();
  dbQuery = dbObj.dbQuery;
  dbConnectionInstance = dbObj.dbConnectionInstance;
});

afterAll(async () => {
  if (!dbConnectionInstance) return;
  await closeDbConnection(dbConnectionInstance);
});

describe('Tests for query builder tests', () => {
  let groupID: string;
  let nonReturningQuery: QueryResult<RowType[]>;

  beforeAll(async () => {
    groupID = randomUUID();
    nonReturningQuery = await dbQuery(
      `INSERT INTO groups(group_id, title, description) VALUES($1, $2, $3)`
    )([groupID, 'Tech todos', 'Tech todos for my stuff'])(GroupCodec)();

    const createTasks = (taskID: string, taskName: string) =>
      dbQuery(`INSERT INTO tasks(group_id, task_id, name) VALUES($1, $2, $3)`)([
        groupID,
        ...[taskID, taskName],
      ])(TaskCodec)();

    await Promise.all([
      createTasks(randomUUID(), 'Buy Razer Laptop'),
      createTasks(randomUUID(), 'Buy Razer Mouse'),
    ]);
  });

  test('Should check that query returns correct results for simple queries', async () => {
    // Arrange
    // Act
    const returningQuery = await dbQuery(`SELECT * FROM groups WHERE group_id = $1`)([
      groupID,
    ])(GroupCodec)();

    const countCodec = t.type({ count: IntFromString });
    const returningQueryTwo = await dbQuery(
      `SELECT COUNT(*) FROM tasks WHERE group_id = $1`
    )([groupID])(countCodec)();

    // Assert
    expect(E.isRight(nonReturningQuery)).toBeTruthy();
    expect(E.isRight(returningQuery)).toBeTruthy();
    expect(E.isRight(returningQueryTwo)).toBeTruthy();

    pipe(
      nonReturningQuery,
      E.foldW(manualFail, output => expect(output).toHaveLength(0))
    );

    pipe(
      returningQuery,
      E.foldW(manualFail, output => expect(output).toHaveLength(1))
    );

    pipe(
      returningQueryTwo,
      E.foldW(manualFail, output => expect(output[0].count).toBeGreaterThanOrEqual(1))
    );
  });

  test('Should check that query returns correct results for relatively complex queries', async () => {
    // Arrange
    const ComplexQueryCodec = t.type({
      grp_creation_date: DateCodec,
      last_grp_update_time: DateCodec,
    });

    // Act
    const complexQueryResult = await dbQuery(
      `SELECT *, g.created_at AS grp_creation_date, g.updated_at AS last_grp_update_time FROM tasks JOIN groups AS g USING(group_id) WHERE g.group_id = $1`
    )([groupID])(t.intersection([TaskCodec, ComplexQueryCodec]))();

    // Assert

    expect(E.isRight(complexQueryResult)).toBeTruthy();

    pipe(
      complexQueryResult,
      E.foldW(manualFail, output => expect(output.length).toBeGreaterThanOrEqual(1))
    );
  });

  test.each([['dwefwef'], [0]])(
    'Should check that query builder handles errors appropriately',
    async badGroupId => {
      // Arrange
      // Act
      const possibleQueryResult = await dbQuery(
        `SELECT * FROM groups WHERE group_id = $1`
      )([badGroupId])(GroupCodec)();

      // Assert
      expect(E.isLeft(possibleQueryResult)).toBeTruthy();

      pipe(
        possibleQueryResult,
        E.foldW(e => expect(e instanceof AggregateError).toBeTruthy(), manualFail)
      );
    }
  );
});
