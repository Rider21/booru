import { IKeyValueRepository } from "@mtcute/node";
import { Pool } from "pg";

export class KeyValueRepository implements IKeyValueRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    pool.query(`create table if not exists key_value ( 
  key text primary key, 
  value bytea not null 
);`);
  }

  async set(key: string, value: Uint8Array) {
    await this.pool.query(
      "insert into key_value (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
      [key, value],
    );
  }

  async get(key: string) {
    const result = await this.pool.query(
      "select value from key_value where key = $1",
      [key],
    );
    return result.rows.length === 0 ? null : result.rows[0].value;
  }

  async delete(key: string) {
    await this.pool.query("delete from key_value where key = $1", [key]);
  }

  async deleteAll() {
    await this.pool.query("delete from key_value");
  }
}
