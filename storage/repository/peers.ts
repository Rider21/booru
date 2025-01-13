import { IPeersRepository } from "@mtcute/node";
import { Pool } from "pg";
import { Ipeers } from "../type.js";

function mapPeerDto(dto: Ipeers): IPeersRepository.PeerInfo {
  return {
    id: parseInt(dto.id, 10),
    accessHash: dto.hash,
    isMin: dto.ismin,
    usernames: dto.usernames,
    updated: parseInt(dto.updated, 10),
    phone: dto.phone || undefined,
    complete: dto.complete,
  };
}

export class PeersRepository implements IPeersRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    pool.query(`create table if not exists peers (
  id bigint primary key,
  hash text not null,
  ismin bool not null default false,
  usernames jsonb not null,
  updated bigint not null,
  phone text,
  complete bytea
);
create index if not exists idx_peers_usernames on peers using gin(usernames jsonb_ops);
create index if not exists idx_peers_phone on peers (phone);`);
  }

  async store(peer: IPeersRepository.PeerInfo) {
    await this.pool.query(
      `insert into peers (id, hash, ismin, usernames, updated, phone, complete)
values ($1, $2, $3, $4, $5, $6, $7)
on conflict (id) do update set
  hash = excluded.hash,
  ismin = excluded.ismin,
  usernames = excluded.usernames,
  updated = excluded.updated,
  phone = excluded.phone,
  complete = excluded.complete`,
      [
        peer.id,
        peer.accessHash,
        Boolean(peer.isMin),
        JSON.stringify(peer.usernames),
        peer.updated,
        peer.phone ?? null,
        peer.complete,
      ],
    );
  }

  async getById(id: number, allowMin: boolean) {
    const result = await this.pool.query(
      `select * from peers where id = $1 ${allowMin ? "" : "and ismin = false"}`,
      [id],
    );
    return result.rows.length === 0 ? null : mapPeerDto(result.rows[0]);
  }

  async getByUsername(username: string) {
    const result = await this.pool.query(
      "select * from peers where id in (SELECT id FROM jsonb_array_elements(usernames) where value = $1) and ismin = false",
      [JSON.stringify(username)],
    );
    return result.rows.length === 0 ? null : mapPeerDto(result.rows[0]);
  }

  async getByPhone(phone: string) {
    const result = await this.pool.query(
      "select * from peers where phone = $1 and ismin = false",
      [phone],
    );
    return result.rows.length === 0 ? null : mapPeerDto(result.rows[0]);
  }

  async deleteAll() {
    await this.pool.query("delete from peers");
  }
}
