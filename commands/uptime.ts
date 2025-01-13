import { Message, TelegramClient } from "@mtcute/node";

export default {
  commandName: "uptime",
  execute(client: TelegramClient, msg: Message) {
    const uptime = Math.floor(process.uptime());

    const d = Math.floor(uptime / 86400);
    const h = Math.floor(uptime / 3600) % 24;
    const m = Math.floor(uptime / 60) % 60;
    const s = uptime % 60;

    const info =
      (d < 1 ? "" : d.toString().padStart(2, "0") + " д, ") +
      (h < 1 ? "" : h.toString().padStart(2, "0") + " ч, ") +
      (m < 1 ? "" : m.toString().padStart(2, "0") + " мин, ") +
      (s < 1 ? "" : s.toString().padStart(2, "0") + " секунд");

    client.replyText(msg, info);
  },
};
