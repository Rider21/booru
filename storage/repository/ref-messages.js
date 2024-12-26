export default class IReferenceMessagesRepository {
  constructor(pool) {
    this.pool = pool;
    pool.query(`create table if not exists message_refs (
peer_id bigint NOT NULL,
chat_id bigint NOT NULL,
msg_id bigint NOT NULL,
primary key (peer_id, chat_id, msg_id)
);
CREATE INDEX IF NOT EXISTS idx_message_refs_peer ON message_refs (peer_id);
CREATE INDEX IF NOT EXISTS idx_message_refs ON message_refs (chat_id, msg_id);`);
  }

  async store(peerId, chatId, msgId) {
    await this.pool.query(
      `insert into message_refs (peer_id, chat_id, msg_id)
values ($1, $2, $3)
on conflict (peer_id, chat_id, msg_id)
do update set peer_id = excluded.peer_id, chat_id = excluded.chat_id, msg_id = excluded.msg_id;`,
      [peerId, chatId, msgId],
    );
  }

  async getByPeer(peerId) {
    const res = await this.pool.query(
      "select chat_id, msg_id from message_refs where peer_id = $1",
      [peerId],
    );

    if (res.rows.length === 0) return null;

    const result = res.rows.map(({ chat_id, msg_id }) => [
      parseInt(chat_id, 10),
      parseInt(msg_id, 10),
    ]);
    return result.length === 1 ? result[0] : result;
  }

  async delete(chatId, msgIds) {
    await this.pool.query(`delete from message_refs
where (chat_id, msg_id) IN (
${msgIds.map((value) => `(${chatId}, ${value})`).join(",\n")}
)
`);
  }

  async deleteByPeer(peerId) {
    await this.pool.query("delete from message_refs where peer_id = $1", [
      peerId,
    ]);
  }

  async deleteAll() {
    await this.pool.query("delete from message_refs");
  }
}
