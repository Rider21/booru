function mapPeerDto(dto) {
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

export default class IPeersRepository {
  constructor(pool) {
    this.pool = pool;
    pool.query(`create table if not exists peers (
  id bigint primary key,
  hash text not null,
  usernames jsonb not null,
  updated bigint not null,
  phone text,
  complete bytea
);
create index if not exists idx_peers_usernames on peers using gin(usernames jsonb_ops);
create index if not exists idx_peers_phone on peers (phone);
alter table peers add column if not exists ismin bool not null default false;`);
  }

  async store(peer) {
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
        peer.isMin ? true : false,
        JSON.stringify(peer.usernames),
        peer.updated,
        peer.phone ?? null,
        peer.complete,
      ],
    );
  }

  async getById(id, allowMin) {
    const result = await this.pool.query(
      `select * from peers where id = $1 ${allowMin ? "" : "and ismin = false"}`,
      [id],
    );
    return result.rows.length === 0 ? null : mapPeerDto(result.rows[0]);
  }

  async getByUsername(username) {
    const result = await this.pool.query(
      "select * from peers where id in (SELECT id FROM jsonb_array_elements(usernames) where value = $1) and ismin = false",
      [JSON.stringify(username)],
    );
    return result.rows.length === 0 ? null : mapPeerDto(result.rows[0]);
  }

  async getByPhone(phone) {
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