import { Pool } from "pg";
import { postCache } from "../type.js";

export class PostCacheRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    pool.query(`create table if not exists post_cache (
  domain text,
  post_id integer,
  file_id text not null,
  file_type smallserial not null,
  isauto bool not null default false,
  primary key (domain, post_id)
);
create index if not exists post_cache_idx on post_cache (domain, post_id);`);
  }

  async get(domain: string, postID: number[]) {
    const result = await this.pool.query(
      "select * from post_cache where domain = $1 and post_id = ANY ($2)",
      [domain, postID],
    );
    const cache: Record<number | string, postCache> = {};
    result.rows.forEach((file: postCache) => (cache[file.post_id] = file));

    return cache;
  }

  async set(values: postCache) {
    await this.pool.query(
      `
      insert into post_cache (domain, post_id, file_id, file_type)
      values ($1, $2, $3, $4)
      on conflict (domain, post_id)
      do update set file_id = excluded.file_id, file_type = excluded.file_type, isauto = false`,
      [values.domain, values.post_id, values.file_id, values.file_type],
    );
  }

  async add(values: postCache) {
    await this.pool.query(
      `
      insert into post_cache (domain, post_id, file_id, file_type, isauto)
      values ($1, $2, $3, $4, true)
      on conflict do nothing`,
      [values.domain, values.post_id, values.file_id, values.file_type],
    );
  }
}
