import { SqliteStorage } from "@mtcute/node";
import { BasePgStorage } from "./storage.js";
import { customStorage } from "./type.js";

import { PostCacheRepository } from "./sqlite3/post-cache.js";

let storage: customStorage;

if (process.env.POSTGRESQL_ADDON_URI) {
  storage = new BasePgStorage();
} else {
  const temp = new SqliteStorage("booruBot");
  storage = {
    ...temp,
    postCache: new PostCacheRepository(temp.driver),
  };
}

export default storage;
