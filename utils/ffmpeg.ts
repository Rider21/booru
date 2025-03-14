import { spawn } from "node:child_process";
import { buffer, json } from "node:stream/consumers";
import { Readable } from "node:stream";

async function generateThumb(inputURL: string) {
  if (!inputURL) return undefined;

  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-i",
      inputURL,
      "-frames:v",
      "1",
      "-c:v",
      "mjpeg",
      "-vf",
      "blackframe=0,metadata=select:key=lavfi.blackframe.pblack:value=50:function=less,scale=320:320:force_original_aspect_ratio=decrease",
      "-f",
      "image2pipe",
      "pipe:1",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      windowsVerbatimArguments: true,
    },
  );

  const thumbRaw = buffer(ffmpeg.stdio[1] as Readable);

  ffmpeg.on("error", (e) => console.log("ffmpeg", e));
  //ffmpeg.stderr?.on('data', data => console.log(data.toString()))

  const thumb = await thumbRaw;
  return thumb.length ? thumb : undefined;
}

async function getInfo(inputURL: string) {
  if (!inputURL) return {};

  const ffprobe = spawn("ffprobe", [
    "-of",
    "json",
    "-show_streams",
    "-show_format",
    "-i",
    inputURL,
  ]);

  const info = await json(ffprobe.stdio[1]);
  return info as FfprobeData;
}

interface FfprobeData {
  streams?: { [key: string]: any }[];
  format?: { [key: string]: any };
}

export { generateThumb, getInfo };
