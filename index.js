import "dotenv/config";

import Booru from "booru";
import {
  TelegramClient,
  BotInline,
  BotInlineMessage,
  BotKeyboard,
} from "@mtcute/node";
import { Dispatcher, filters } from "@mtcute/dispatcher";

const tg = new TelegramClient({
  apiId: Number.parseInt(process.env.API_ID),
  apiHash: process.env.API_HASH,
  storage: "booruBot",
});

tg.onError((err) => console.error(err));

const dp = Dispatcher.for(tg);

const data =
  "ДОМЕН - псведонимы\n" +
  Object.values(Booru.sites)
    .map((site) => "* " + site.domain + " - " + site.aliases.join(", "))
    .join("\n");

dp.onNewMessage(filters.command("site"), async (msg) => {
  await msg.replyText(data);
});

const getExt = (url) => {
  switch (url.split(".").pop().toUpperCase()) {
    case "PNG":
    case "JPG":
    case "JPEG":
    case "WEBP":
      return "photo";
    case "GIF":
      return "gif";
    case "MP4":
    case "MKV":
    case "MOV":
    case "WEBM":
      return "video";
    default:
      console.log(url);
      return "photo";
  }
};

const allSites = Object.values(Booru.sites)
  .map((site) => site.aliases)
  .flat();
const limit = 50;
const cacheTime = 60 * 60 * 1;

dp.onInlineQuery(async (inlineQuery) => {
  if (!inlineQuery.query || !inlineQuery.query.trim()) {
    return inlineQuery.answer([]);
  }
  const page = parseInt(inlineQuery.offset || "0", 16) || 0;
  const tags = inlineQuery.query.split(" ").filter((t) => t);
  const result = [];

  const isSOURCE = allSites.includes(tags[0]);
  const data = await Booru.search(
    isSOURCE ? tags[0] : "safe",
    isSOURCE ? tags.slice(1) : tags,
    { limit, page },
  );

  if (data.posts.length == 0) return inlineQuery.answer(result);

  data.posts.forEach((post, index) => {
    const ext = getExt(post.fileUrl);
    const description =
      "Загрузил: " +
      post.data.owner +
      "\nОчков: " +
      post.score +
      "\nКомментариев: " +
      post.data.comment_count;

    const keyboard = BotKeyboard.inline([
      [
        BotKeyboard.url("Пост", post.postView),
        BotKeyboard.url(
          "Источник",
          post.source?.startsWith?.("https://")
            ? post.source.trim().split(" ")[0]
            : post.fileUrl,
        ),
      ],
      [
        BotKeyboard.switchInline(
          "Искать по этим тэгам",
          (isSOURCE ? tags[0] : "safe") + " " + post.tags.join(" "),
          true,
        ),
      ],
    ]);

    const payload = {
      title: post.tags.join(", "),
      description,
      thumb: post.previewUrl || undefined,
      message: BotInlineMessage.media({
        text: description,
        replyMarkup: keyboard,
      }),
    };

    if (ext === "video") {
      payload.isEmbed = false;
      payload.mime_type = "video/mp4";
      payload.thumb = post.fileUrl;
    }

    if (post.width && post.height) {
      payload.width = post.width;
      payload.height = post.height;
    }

    result.push(BotInline[ext](index.toString(), post.fileUrl, payload));
  });

  await inlineQuery.answer(result, {
    cacheTime,
    nextOffset:
      limit === data.posts.length ? (page + 1).toString(16) : undefined,
  });
});

const self = await tg.start({
  botToken: process.env.TG_TOKEN,
});

console.log(`✨ зашел в ${self.displayName}`);

(await import("http"))
  .createServer((req, res) => {
    res.write("1");
    res.end();
  })
  .listen(process.env.PORT || 3000, () => console.log("Сервер всети"));
