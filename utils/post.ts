import { Post } from "booru";
import { BotInlineMessage, BotKeyboard } from "@mtcute/node";
import {
  InputInlineResult,
  InputInlineResultPhoto,
  InputInlineResultVideo,
  InputInlineResultGif,
} from "@mtcute/core";
import { postCache } from "./../storage/type.js";
import { chunkArray, getExt } from "./utils.js";
import { Caching } from "./caching.js";

const fileType: Record<number, "photo" | "video" | "gif" | undefined> = {
  1: "photo",
  2: "video",
  3: "gif",
};

interface Site {
  domain: string;
  aliases: string;
}

const generateResults = (
  currentSource: Site,
  posts: Post[],
  caches: Record<number | string, postCache>,
  manager: Caching,
) => {
  const result: InputInlineResult[] = [];
  posts.forEach((post: any) => {
    if (!post.available || !post.fileUrl) return;
    const cache = caches[post.id];
    const ext = fileType[cache?.file_type] || getExt(post.fileUrl, post.tags);

    const description =
      (post.data.owner ? "Загрузил: " + post.data.owner : "") +
        (post.score ? "\nОчков: " + post.score : "") +
        (post.data.comment_count
          ? "\nКомментариев: " + post.data.comment_count
          : "") || "";

    const keyboard = BotKeyboard.inline([
      [
        BotKeyboard.url("Пост", post.postView),
        BotKeyboard.url("Источник", post.fileUrl),
      ],
      [
        BotKeyboard.switchInline(
          "Искать по этим тэгам",
          chunkArray(currentSource.aliases + " ", post.tags).trim(),
          true,
        ),
      ],
    ]);

    const payload:
      | InputInlineResultPhoto
      | InputInlineResultVideo
      | InputInlineResultGif = {
      id: post.id,
      type: ext,
      media: cache?.file_id || post.fileUrl,
      title: post.tags.join(", "),
      description,
      thumb: post.previewUrl || post.sampleUrl || undefined,
      message: BotInlineMessage.media({
        text: description + (cache ? "." : ""),
        replyMarkup: keyboard,
      }),
    };

    if (payload.type === "video") {
      payload.isEmbed = false;
      if (!payload.thumb && !cache) payload.thumb = post.fileUrl;
    }

    if (post.width && post.height) {
      payload.width = post.width;
      payload.height = post.height;
    }

    if (!cache && payload.type !== "photo") {
      manager.add({
        domain: currentSource.domain,
        id: Number(post.id),
        url: post.fileUrl,
        previewUrl: post.previewUrl,
      });
    }

    result.push(payload);
  });

  return result;
};

export { generateResults };
