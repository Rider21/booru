import { postCache } from "../type.js";
import { ISqliteStatement, BaseSqliteStorageDriver } from "@mtcute/core";

export class PostCacheRepository {
  driver: BaseSqliteStorageDriver;

  constructor(driver: BaseSqliteStorageDriver) {
    this.driver = driver;

    driver.registerMigration("post_cache", 1, (db) => {
      db.exec(`
create table if not exists post_cache (
  domain text not null,
  post_id integer not null,
  file_id text not null,
  file_type tinyint not null,
  isauto bool not null default false,
  primary key (domain, post_id)
);
create index if not exists post_cache_idx on post_cache (domain, post_id);`);
    });

    driver.onLoad((db) => {
      this._get = db.prepare(
        "select * from post_cache where domain = ? and post_id in (select value from json_each(?))",
      );
      this._set = db.prepare(
        "insert or replace into post_cache (domain, post_id, file_id, file_type, isauto) values (?, ?, ?, ?, false)",
      );
      this._add = db.prepare(
        "insert or ignore into post_cache (domain, post_id, file_id, file_type, isauto) VALUES (?, ?, ?, ?, true)",
      );
    });
  }

  private _get!: ISqliteStatement;
  async get(domain: string, postID: number[]) {
    const result = this._get.all(domain, JSON.stringify(postID));
    const cache: Record<number | string, postCache> = {};
    result.forEach((post: any) => (cache[post.post_id] = post));

    return cache;
  }

  private _set!: ISqliteStatement;
  async set(values: postCache) {
    this._set.run(
      values.domain,
      values.post_id,
      values.file_id,
      values.file_type,
    );
  }

  private _add!: ISqliteStatement;
  async add(values: postCache) {
    this._add.run(
      values.domain,
      values.post_id,
      values.file_id,
      values.file_type,
    );
  }
}
