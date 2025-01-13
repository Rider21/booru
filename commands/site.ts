import { Message, TelegramClient } from "@mtcute/node";
import { sites } from "booru";

const data =
  "ДОМЕН - псведонимы\n" +
  Object.values(sites)
    .map((site) => "* " + site.domain + " - " + site.aliases.join(", "))
    .join("\n");

export default {
  commandName: "site",
  execute(client: TelegramClient, msg: Message) {
    client.replyText(msg, data);
  },
};
