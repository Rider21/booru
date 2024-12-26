import pg from "pg";

import IAuthKeysRepository from "./repository/auth-keys.js";
import IKeyValueRepository from "./repository/kv.js";
import IPeersRepository from "./repository/peers.js";
import IReferenceMessagesRepository from "./repository/ref-messages.js";

const storage = {};

if (process.env.POSTGRESQL_ADDON_URI) {
  const pool = new pg.Pool({
    connectionString: process.env.POSTGRESQL_ADDON_URI,
    max: 3,
  });

  storage.authKeys = new IAuthKeysRepository(pool);
  storage.driver = {};
  storage.kv = new IKeyValueRepository(pool);
  storage.peers = new IPeersRepository(pool);
  storage.refMessages = new IReferenceMessagesRepository(pool);
}

export default storage;
