import { Message, TelegramClient } from "@mtcute/node";
import { Caching } from "../caching.js";

export default {
  commandName: "progress",
  async execute(client: TelegramClient, msg: Message, manager: Caching) {
    if (process.env.ADMIN_ID !== msg.sender.id.toString()) return;
    let message = await client.replyText(msg, calculate(manager));

    const int = setInterval(() => {
      const text = calculate(manager);
      if (message.text !== text) {
        client
          .editMessage({ message, text })
          .then((msg) => (message = msg))
          .catch((err) => {
            console.log(err);
            clearTimeout(int);
          });
      }
    }, 1000 * 60);

    setTimeout(() => clearInterval(int), 1000 * 60 * 60);
  },
};

function calculate(cache: Caching) {
  const perv = (cache.progress.uploaded / cache.progress.total || 0) * 100;
  const data =
    `Успешно сохраненно: ${cache.count}\n` +
    `Ошибок: ${cache.errCount}\n` +
    `Прогресс скачивание: ${perv.toFixed(3)}%\n[${cache.progress.uploaded}/${
      cache.progress.total
    }]`;

  return data;
}
