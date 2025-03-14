import { InputMedia, TelegramClient } from "@mtcute/node";
import { generateThumb, getInfo } from "./ffmpeg.js";
import { customStorage } from "./../storage/type.js";

export interface queue {
  domain: string;
  id: number;
  url: string;
  previewUrl?: string;
}

interface AnalyzeReturnType {
  status: boolean;
  file_type?: 2 | 3;
  width?: number;
  height?: number;
  duration?: number;
  skip?: boolean;
  supportsStreaming?: boolean;
  size?: number;
}

const MaxSize = 2097152000; //2gb
const MinSize = 19.9 * 1024 * 1024; //~20mb

export class Caching {
  client: TelegramClient;
  storage: customStorage;
  queue: queue[] = [];
  exists = new Set();
  count = 0;
  errCount = 0;

  progress = {
    uploaded: 0,
    total: 0,
  };

  constructor(tg: TelegramClient, storage: customStorage) {
    this.client = tg;
    this.storage = storage;
    setTimeout(this.caching.bind(this), 1000 * 10);
  }

  add(item: queue) {
    if (this.exists.has(item.domain + item.id)) return false;
    this.queue.push(item);
    this.exists.add(item.domain + item.id);
    return true;
  }

  async analyzing(queue: queue): Promise<AnalyzeReturnType> {
    const metadata = await getInfo(queue.url);
    if (!metadata.format || !metadata.streams) return { status: false };
    const size = parseInt(metadata.format.size, 10);

    if (size < MinSize || size > MaxSize) return { status: false, skip: true };

    const isAudio =
      metadata.streams.findIndex((stream) => stream.codec_type === "audio") !==
      -1;
    const video = metadata.streams.find(
      (stream) => stream.codec_type === "video",
    );

    return {
      status: true,
      size,
      supportsStreaming: metadata.format.format_name?.includes("mp4"),
      file_type: isAudio ? 2 : 3,
      width: video?.width,
      height: video?.height,
      duration: parseInt(metadata.format.duration, 10),
    };
  }

  async caching() {
    const query = this.queue.pop();
    if (!query) {
      setTimeout(this.caching.bind(this), 1000 * 10);
      return;
    }
    const info = await this.analyzing(query);
    const thumb = query.previewUrl
      ? await fetch(query.previewUrl)
      : await generateThumb(query.url);

    if (info.file_type) {
      const video = InputMedia.video(await fetch(query.url), {
        duration: info.duration,
        //fileMime: '',
        fileSize: info.size,
        supportsStreaming: info.supportsStreaming,
        height: info.height,
        width: info.width,
        thumb,
        isAnimated: info.file_type === 3,
      });

      const progress = this.progress;
      await this.client
        .uploadMedia(video, {
          progressCallback(uploaded, total) {
            progress.uploaded = uploaded;
            progress.total = total;
          },
        })
        .then((media) => {
          this.storage.postCache.set({
            domain: query.domain,
            post_id: query.id,
            file_id: media.fileId,
            file_type: info.file_type || 2,
          });
          this.count++;
          this.exists.delete(query.domain + query.id);
        })
        .catch((err) => {
          console.log(err);
          this.errCount++;
        });
    } else if (!info?.skip) {
      this.errCount++;
    }
    setTimeout(this.caching.bind(this), 1000 * 5);
  }
}
