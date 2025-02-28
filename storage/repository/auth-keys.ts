import { IAuthKeysRepository } from "@mtcute/node";
import { Pool } from "pg";

export class AuthKeysRepository implements IAuthKeysRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    pool.query(`create table if not exists auth_keys (
  dc integer primary key,
  key bytea not null
);
create table if not exists temp_auth_keys (
  dc integer not null,
  idx integer not null,
  key bytea not null,
  expires integer not null,
  primary key (dc, idx)
);`);
  }

  async deleteAll() {
    await this.pool.query("delete from auth_keys");
  }

  async deleteByDc(dc: number) {
    await this.pool.query("delete from auth_keys where dc = $1", [dc]);
    await this.pool.query("delete from temp_auth_keys where dc = $1", [dc]);
  }

  async get(dc: number) {
    const result = await this.pool.query(
      "select key from auth_keys where dc = $1",
      [dc],
    );
    return result.rows.length === 0 ? null : result.rows[0].key;
  }

  async getTemp(dc: number, idx: number, now: number) {
    const result = await this.pool.query(
      "select key from temp_auth_keys where dc = $1 and idx = $2 and expires > $3",
      [dc, idx, now],
    );
    return result.rows.length === 0 ? null : result.rows[0].key;
  }

  async set(dc: number, key: Uint8Array | null) {
    if (!key) {
      await this.pool.query("delete from auth_keys where dc = $1", [dc]);
      return;
    }
    await this.pool.query(
      "insert into auth_keys (dc, key) values ($1, $2) on conflict (dc) do update set key = excluded.key",
      [dc, key],
    );
  }

  async setTemp(
    dc: number,
    idx: number,
    key: Uint8Array | null,
    expires: number,
  ) {
    if (!key) {
      await this.pool.query(
        "delete from temp_auth_keys where dc = $1 and idx = $2",
        [dc, idx],
      );
      return;
    }
    await this.pool.query(
      "insert into temp_auth_keys (dc, idx, key, expires) values ($1, $2, $3, $4) on conflict (dc, idx) do update set key = excluded.key, expires = excluded.expires",
      [dc, idx, key, expires],
    );
  }
}
