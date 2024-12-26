export default class IKeyValueRepository {
  constructor(pool) {
    this.pool = pool;
    pool.query(`create table if not exists key_value ( 
  key text primary key, 
  value bytea not null 
);`);
  }

  async set(key, value) {
    await this.pool.query(
      "insert into key_value (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
      [key, value],
    );
  }

  async get(key) {
    const result = await this.pool.query(
      "select value from key_value where key = $1",
      [key],
    );
    return result.rows.length === 0 ? null : result.rows[0].value;
  }

  async delete(key) {
    await this.pool.query("delete from key_value where key = $1", [key]);
  }

  async deleteAll() {
    await this.pool.query("delete from key_value");
  }
}
