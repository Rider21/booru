import {
  IMtStorageProvider,
  IStorageDriver,
  ITelegramStorageProvider,
} from "@mtcute/core";
import pg from "pg";

import { AuthKeysRepository } from "./repository/auth-keys.js";
import { KeyValueRepository } from "./repository/kv.js";
import { PeersRepository } from "./repository/peers.js";
import { RefMessagesRepository } from "./repository/ref-messages.js";
import { PostCacheRepository } from "./repository/post-cache.js";
import { IPostCacheRepository } from "./type.js";

export class BasePgStorage
  implements IMtStorageProvider, ITelegramStorageProvider
{
  readonly authKeys: AuthKeysRepository;
  readonly kv: KeyValueRepository;
  readonly refMessages: RefMessagesRepository;
  readonly peers: PeersRepository;
  readonly postCache: IPostCacheRepository;
  driver: IStorageDriver;

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env.POSTGRESQL_ADDON_URI,
      max: 3,
    });
    this.authKeys = new AuthKeysRepository(pool);
    this.kv = new KeyValueRepository(pool);
    this.refMessages = new RefMessagesRepository(pool);
    this.peers = new PeersRepository(pool);
    this.postCache = new PostCacheRepository(pool);
    this.driver = {};
  }
}
