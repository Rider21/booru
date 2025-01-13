import { ITelegramStorageProvider } from "@mtcute/core";

export interface postCache {
  domain: string;
  post_id: number;
  file_id: string;
  file_type: 1 | 2 | 3;
}

export interface Ipeers {
  id: string;
  ismin: boolean;
  hash: string;
  usernames: string[];
  updated: string;
  phone: string;
  complete: Uint8Array;
}

export interface IPostCacheRepository {
  get: (domain: string, postID: number[]) => Promise<Record<number, postCache>>;
  set: (values: postCache) => Promise<void>;
  add: (values: postCache) => Promise<void>;
}

export interface customStorage extends ITelegramStorageProvider {
  postCache: IPostCacheRepository;
}
