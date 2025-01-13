import { Message, TelegramClient } from "@mtcute/node";
import { Caching } from "../caching.js";

export default {
  commandName: "progress",
  execute(client: TelegramClient, msg: Message, manager: Caching) {
    if (process.env.ADMIN_ID !== msg.sender.id.toString()) return;
    const perv =
      (manager.progress.uploaded / manager.progress.total || 0) * 100;

    const data =
      `Успешно сохраненно: ${manager.count}\n` +
      `Ошибок: ${manager.errCount}\n` +
      `Прогресс скачивание: ${perv.toFixed(3)}% [${manager.progress.uploaded}/${
        manager.progress.total
      }]`;
    client.replyText(msg, data);
  },
};
