require("dotenv").config();
const Booru = require("booru");

const { Bot, InlineKeyboard, InlineQueryResultBuilder } = require("grammy");
const { autoRetry } = require("@grammyjs/auto-retry");

const bot = new Bot(process.env.tg_token);
bot.api.config.use(autoRetry());

const allSites = Object.values(Booru.sites)
  .map((site) => site.aliases)
  .flat();

bot.on("inline_query", async (ctx) => {
  if (!ctx.inlineQuery.query && !ctx.inlineQuery.query.trim()) {
    return ctx.answerInlineQuery([]);
  }

  const page = parseInt(ctx.inlineQuery.offset || "0", 16) || 0;
  const tags = ctx.inlineQuery.query.split(" ").filter((t) => t);
  const result = [];

  const isSOURCE = allSites.includes(tags[0]);
  const data = await Booru.search(
    isSOURCE ? tags[0] : "safe",
    isSOURCE ? tags.slice(1) : tags,
    { limit: 50, page },
  );

  if (data.posts.length == 0) return ctx.answerInlineQuery([]);

  data.posts.forEach((post, index) => {
    const ext = getExt(post.fileUrl);
    const title = post.tags.join(", ");
    const caption =
      "Загрузил: " +
      post.data.owner +
      "\nОчков: " +
      post.score +
      "\nКомментариев: " +
      post.data.comment_count;

    const keyboard = new InlineKeyboard()
      .url("Пост", post.postView)
      .url(
        "Источник",
        post.source?.startsWith?.("https://")
          ? post.source.trim().split(" ")[0]
          : post.fileUrl,
      )
      .row()
      .switchInlineCurrent(
        "Искать по этим тэгам",
        (isSOURCE ? tags[0] : "safe") + " " + post.tags.join(" "),
      );

    if (!post.previewUrl) post.previewUrl = post.fileUrl;

    if (ext == "animation") {
      result.push(
        InlineQueryResultBuilder.mpeg4gif(
          index,
          post.fileUrl,
          post.previewUrl,
          {
            title,
            caption,
            reply_marup: keyboard,
          },
        ),
      );
    } else if (ext == "video") {
      result.push(
        InlineQueryResultBuilder.videoMp4(
          index,
          post.tags.join(", "),
          post.fileUrl.replace(/.webm|.mkv/, ".mp4"),
          post.previewUrl,
          {
            title,
            caption,
            mime_type: "video/mp4",
            reply_markup: keyboard,
          },
        ),
      );
    } else {
      result.push(
        InlineQueryResultBuilder.photo(index, post.fileUrl, {
          title,
          caption,
          photo_url: post.fileUrl,
          thumbnail_url: post.previewUrl,
          reply_markup: keyboard,
        }),
      );
    }
  });

  ctx
    .answerInlineQuery(result, {
      cache_time: 60 * 60 * 1,
      next_offset: (page + 1).toString(16),
    })
    .catch((err) => console.log(err));
});

const getExt = (url) => {
  switch (url.split(".").pop().toUpperCase()) {
    case "PNG":
    case "JPG":
    case "JPEG":
    case "WEBP":
      return "image";
    case "GIF":
      return "animation";
    case "MP4":
    case "MKV":
    case "MOV":
    case "WEBM":
      return "video";
    default:
      console.log(url);
      return null;
  }
};

const data =
  "ДОМЕН - псведонимы\n" +
  Object.values(Booru.sites)
    .map((site) => "* " + site.domain + " - " + site.aliases.join(", "))
    .join("\n");

bot.command("site", (ctx) => ctx.reply(data));

bot.catch((err) => console.log(err));
bot.start();
