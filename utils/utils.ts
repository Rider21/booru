import { Message } from "@mtcute/node";
import { postCache } from "./../storage/type.js";

const getExt = (url: string, tags: string[]): "photo" | "gif" | "video" => {
  const ext = (url.split(".").pop() as string).toUpperCase();
  switch (ext) {
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
      for (const tag of tags) {
        switch (tag) {
          case "sound":
            return "video";
          case "animated":
          case "gif":
            return "gif";
        }
      }
      return "photo";
  }
};

const chunkArray = (
  result: string = "",
  words: string[] = [],
  maxLength: number = 1024,
  force: boolean = false,
) => {
  for (let word of words) {
    if (result.length + word.length + 1 <= maxLength) {
      result += word + " ";
    } else if (force) {
      return result;
    }
  }

  return result;
};

const extractLastNumbers = (str: string) => {
  const matches = str.match(/\d+$/);
  return matches ? matches[0] : "";
};

const fileType: Record<string, number> = {
  photo: 1,
  video: 2,
  gif: 3,
};

const supportType = ["photo", "video"];

const parsePost = (msg: Message) => {
  if (
    !msg.media?.type ||
    !supportType.includes(msg.media?.type) || //@ts-ignore
    !msg.markup?.buttons?.[0]?.[0]?.url
  )
    return null;

  // @ts-ignore
  const site = new URL(msg.markup.buttons[0][0].url);
  const post_id = parseInt(
    site.searchParams.get("id") || extractLastNumbers(site.href),
    10,
  );

  if (!isFinite(post_id)) return null;
  //@ts-ignore
  const file_id = msg.media.fileId;

  const file_type =
    msg.media.type === "video" &&
    (msg.media.isAnimation || msg.media.isLegacyGif)
      ? fileType["gif"]
      : fileType[msg.media.type];

  return { domain: site.hostname, post_id, file_id, file_type } as postCache;
};

export { chunkArray, getExt, parsePost };
