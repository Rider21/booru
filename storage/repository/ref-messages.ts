import { IReferenceMessagesRepository } from "@mtcute/node";
import { Pool } from "pg";

export class RefMessagesRepository implements IReferenceMessagesRepository {
  pool: Pool;
  constructor(pool: Pool) {
    this.pool = pool;
    pool.query(`create table if not exists message_refs (
peer_id bigint NOT NULL,
chat_id bigint NOT NULL,
msg_id bigint NOT NULL,
primary key (peer_id, chat_id, msg_id)
);
create index if not exists idx_message_refs_peer on message_refs (peer_id);
create index if not exists idx_message_refs on message_refs (chat_id, msg_id);`);
  }

  async store(peerId: number, chatId: number, msgId: number) {
    await this.pool.query(
      `insert into message_refs (peer_id, chat_id, msg_id)
values ($1, $2, $3)
on conflict (peer_id, chat_id, msg_id)
do update set peer_id = excluded.peer_id, chat_id = excluded.chat_id, msg_id = excluded.msg_id;`,
      [peerId, chatId, msgId],
    );
  }

  async getByPeer(peerId: number): Promise<any> {
    const res = await this.pool.query(
      "select chat_id, msg_id from message_refs where peer_id = $1",
      [peerId],
    );

    if (res.rows.length === 0) return null;

    const result = res.rows.map(({ chat_id, msg_id }) => [
      parseInt(chat_id, 10),
      parseInt(msg_id, 10),
    ]);

    return result;
  }

  async delete(chatId: number, msgIds: number[]) {
    await this.pool.query(`delete from message_refs
where (chat_id, msg_id) IN (
${msgIds.map((value) => `(${chatId}, ${value})`).join(",\n")}
)
`);
  }

  async deleteByPeer(peerId: number) {
    await this.pool.query("delete from message_refs where peer_id = $1", [
      peerId,
    ]);
  }

  async deleteAll() {
    await this.pool.query("delete from message_refs");
  }
}
