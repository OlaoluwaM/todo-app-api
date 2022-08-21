/* global describe, test, expect, beforeAll, afterAll */
import * as d from 'io-ts/Decoder';
import * as E from 'fp-ts/Either';

import { pipe } from 'fp-ts/function';
import { toNumber } from '@utils/index';
import { manualFail } from './helpers';
import { QueryResult } from '@db/queryBuilder';
import { AggregateError } from '@lib/AggregateError/index';
import { DateDecoder, toUUID, UUID } from '@lib/decoders';
import { v4 as randomUuidLikeString } from 'uuid';
import { GroupDecoder, RowType, TaskDecoder } from '@db/schema';
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
  let groupID: UUID;
  let nonReturningQuery: QueryResult<RowType[]>;

  beforeAll(async () => {
    groupID = toUUID(randomUuidLikeString());

    nonReturningQuery = await dbQuery(
      `INSERT INTO groups(group_id, title, description) VALUES($1, $2, $3)`
    )([groupID, 'Tech todos', 'Tech todos for my stuff'])(GroupDecoder)();

    const createTasks = (taskID: string, taskName: string) =>
      dbQuery(`INSERT INTO tasks(group_id, task_id, name) VALUES($1, $2, $3)`)([
        groupID,
        ...[taskID, taskName],
      ])(TaskDecoder)();

    await Promise.all([
      createTasks(randomUuidLikeString(), 'Buy Razer Laptop'),
      createTasks(randomUuidLikeString(), 'Buy Razer Mouse'),
    ]);
  });

  test('Should check that query returns correct results for simple queries', async () => {
    // Arrange
    // Act
    const returningQuery = await dbQuery(`SELECT * FROM groups WHERE group_id = $1`)([
      groupID,
    ])(GroupDecoder)();

    const countDecoder = d.struct({ count: pipe(d.string, d.map(toNumber)) });

    const returningQueryTwo = await dbQuery(
      `SELECT COUNT(*) FROM tasks WHERE group_id = $1`
    )([groupID])(countDecoder)();

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

  test('Should check that query returns correct results for relatively complex queries like JOINS', async () => {
    // Arrange
    const ComplexQueryCodec = d.struct({
      grp_creation_date: DateDecoder,
      last_grp_update_time: DateDecoder,
    });

    // Act
    const complexQueryResult = await dbQuery(
      `SELECT *, g.created_at AS grp_creation_date, g.updated_at AS last_grp_update_time FROM tasks JOIN groups AS g USING(group_id) WHERE g.group_id = $1`
    )([groupID])(d.intersect(TaskDecoder)(ComplexQueryCodec))();

    // Assert
    expect(E.isRight(complexQueryResult)).toBeTruthy();

    pipe(
      complexQueryResult,
      E.foldW(manualFail, output => expect(output.length).toBeGreaterThanOrEqual(1))
    );
  });

  test.each([['dwefwef'], [0], [toUUID(randomUuidLikeString())]])(
    'Should check that query builder handles errors appropriately',
    async badGroupId => {
      // Arrange
      // Act
      const possibleQueryResult = await dbQuery(
        `SELECT * FROM groups WHERE group_id = $1`
      )([badGroupId])(GroupDecoder)();

      // Assert
      expect(E.isLeft(possibleQueryResult)).toBeTruthy();

      pipe(
        possibleQueryResult,
        E.foldW(e => expect(e instanceof AggregateError).toBeTruthy(), manualFail)
      );
    }
  );
});
