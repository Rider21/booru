import "dotenv/config";
import { search, sites } from "booru";
import { TelegramClient } from "@mtcute/node";
import { readdirSync } from "fs";

import storage from "./storage/main.js";
import { generateResults } from "./post.js";
import { parsePost } from "./utils.js";
import { Caching } from "./caching.js";

const tg = new TelegramClient({
  apiId: Number.parseInt(process.env.API_ID || "17349"),
  apiHash: process.env.API_HASH || "344583e45741c457fe1862106095a5eb",
  storage,
});

tg.onError.add((err) => console.error(err));
const manager = new Caching(tg, storage);

interface Command {
  commandName: string;
  execute(...args: any): any;
}
const command = new Map<string, Command>();

const commandFiles = readdirSync(new URL("commands/", import.meta.url)).filter(
  (file) => !file.endsWith(".map"),
);
for (const file of commandFiles) {
  import(new URL("commands/" + file, import.meta.url).toString()).then((cmd) =>
    command.set(cmd.default.commandName, cmd.default),
  );
}

tg.onNewMessage.add((msg) => {
  if (process.env.PASSIVE_CACHING && msg.viaBot?.isSelf) {
    const post = parsePost(msg);
    if (post?.file_id) storage.postCache.add(post);
    return;
  }
  if (!msg.text.startsWith("/")) return;
  const cmd = command.get(msg.text.slice(1));

  if (!cmd) return;
  cmd.execute(tg, msg, manager);
});

const allSites = Object.values(sites).flatMap((site) => site.aliases);
const limit = 50;
const cacheTime =  60 * 60 * 1;

tg.onInlineQuery.add(async (inlineQuery) => {
  if (!inlineQuery.query || !inlineQuery.query.trim()) {
    return tg.answerInlineQuery(inlineQuery, []);
  }
  const page = parseInt(inlineQuery.offset || "0", 16) || 0;
  const tags = inlineQuery.query
    .trim()
    .split(/\s+/)
    .filter((t) => t);

  const isSOURCE = allSites.includes(tags[0]);
  const data = await search(
    isSOURCE ? tags[0] : "safe",
    isSOURCE ? tags.slice(1) : tags,
    { limit, page, showUnavailable: true },
  );

  const caches = await storage.postCache.get(
    data.booru.domain,
    data.posts.map((p) => Number(p.id)),
  );
  const result = await generateResults(
    { domain: data.booru.domain, aliases: data.booru.site.aliases[0] },
    data.posts,
    caches,
    manager,
  );

  await tg.answerInlineQuery(inlineQuery, result, {
    cacheTime,
    nextOffset:
      limit === data.posts.length ? (page + 1).toString(16) : undefined,
  });
});

tg.start({
  botToken: process.env.TG_TOKEN,
}).then((self) => console.log(`✨ зашел в ${self.displayName}`));

import http from "node:http";

http
  .createServer((req, res) => {
    res.write("1");
    res.end();
  })
  .listen(process.env.PORT || 3000, () => console.log("Сервер всети"));
