import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __freechessPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const pool =
  global.__freechessPool ??
  new Pool({
    connectionString,
    max: 10,
    ssl: connectionString.includes("localhost")
      ? false
      : {
          rejectUnauthorized: false,
        },
  });

if (!global.__freechessPool) {
  global.__freechessPool = pool;
}

export const sql = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> =>
  pool.query<T>(text, params);

export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
