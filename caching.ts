import { InputFileLike, InputMedia, TelegramClient } from "@mtcute/node";
import ffmpeg from "fluent-ffmpeg";
import { customStorage } from "./storage/type.js";
import { PassThrough } from "node:stream";

export interface queue {
  domain: string;
  id: number;
  url: string;
  thumb?: string;
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
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(queue.url, (err, metadata) => {
        if (err) return { status: false };
        if (
          (metadata.format.size || 0) < MinSize ||
          (metadata.format.size || 0) > MaxSize
        )
          return resolve({ status: false, skip: true });

        const isAudio =
          metadata.streams.findIndex(
            (stream) => stream.codec_type === "audio",
          ) !== -1;
        const video = metadata.streams.find(
          (stream) => stream.codec_type === "video",
        );

        return resolve({
          status: true,
          size: metadata.format.size,
          supportsStreaming: metadata.format.format_name?.includes("mp4"),
          file_type: isAudio ? 2 : 3,
          width: video?.width,
          height: video?.height,
          duration: metadata.format.duration,
        });
      });
    });
  }

  generateThumb(url: string): Promise<InputFileLike | undefined> {
    return new Promise((resolve, reject) => {
      const bufferStream = new PassThrough();

      ffmpeg(url)
        .seekInput(0)
        .frames(1)
        .addOutputOptions(
          "-vf blackframe=0,metadata=select:key=lavfi.blackframe.pblack:value=50:function=less,scale=320:320:force_original_aspect_ratio=decrease",
        )
        .videoCodec("mjpeg")
        .outputFormat("image2pipe")
        .on("end", (stdout, stderr) => {
          this.client
            .uploadFile({
              file: bufferStream,
              fileName: "thumb.jpg",
              fileMime: "image/jpeg",
              requireFileSize: true,
              requireExtension: true,
            })
            .then((file) => resolve(file))
            .catch((err) => {
              console.log(err);
              resolve(undefined);
            });
        })
        .on("error", () => {
          resolve(undefined);
        })
        .pipe(bufferStream, { end: true });
    });
  }

  async caching() {
    const query = this.queue.pop();
    if (!query) {
      setTimeout(this.caching.bind(this), 1000 * 10);
      return;
    }

    const info = await this.analyzing(query);
    if (info?.status) {
      const progress = this.progress;
      const video = InputMedia.video(await fetch(query.url), {
        duration: info.duration,
        //fileMime: '',
        fileSize: info.size,
        supportsStreaming: info.supportsStreaming,
        height: info.height,
        width: info.width,
        thumb: query.thumb
          ? await fetch(query.thumb)
          : await this.generateThumb(query.url),
        isAnimated: info.file_type === 3,
      });
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
