import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { app } from "electron";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { PassThrough, Readable, Transform } from "stream";
import { getVideoInfo } from "@app/main/utils/ffmpeg";
import { isValidQueryProps, SeekProps } from "../isValidProps";
import { logger } from "@app/main/helpers/logger";

const pythonPath: [string, string[] | undefined] =
  app && app.isPackaged
    ? [
        path.join(path.dirname(app.getPath("exe")), "python", "python.exe"),
        undefined,
      ]
    : ["python", ["python"]];
class FixedSizeChunkStream extends Transform {
  private buffer: Buffer = Buffer.alloc(0);
  private chunkSize: number;

  constructor(chunkSize: number) {
    super();
    this.chunkSize = chunkSize;
  }

  _transform(chunk: Buffer, _: BufferEncoding, callback: Function) {
    this.buffer = Buffer.concat([this.buffer, chunk] as Array<any>);

    while (this.buffer.length >= this.chunkSize) {
      this.push(this.buffer.slice(0, this.chunkSize)); // Emit fixed-size chunk
      this.buffer = this.buffer.slice(this.chunkSize); // Keep the remainder
    }

    callback();
  }

  _flush(callback: Function) {
    // Emit the last chunk if there's leftover data
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }
    callback();
  }
}

export class SubtitlesRemover {
  pythonProcess?: ChildProcessWithoutNullStreams;
  clearWriters?: () => Promise<void>;
  async generate(videoPath: string) {
    await this.clearWriters?.();

    const metadata = await getVideoInfo(videoPath);
    const videoStreams = metadata.streams;

    // Additional info: codec and resolution
    const videoStream = videoStreams.find(
      (stream) => stream.codec_type === "video",
    );
    if (!videoStream) return null;
    const height = videoStream.height!;
    const width = videoStream.width!;
    const frame_size = width * height * 3;
    return {
      videoPath,
      videoStream,
      seek: async (seek: SeekProps): Promise<(index: number) => Readable> => {
        await this.clearWriters?.();
        const { startTime, roi, colorRange, duration, size } = seek;
        if (!this.pythonProcess) throw new Error("Unrecognized process");
        const transform = new Transform({
          objectMode: true,
          transform: (chunk: Buffer, _, callback) => {
            if (!this.pythonProcess) throw new Error("Unrecognized process");
            const process = this.pythonProcess;
            let buffer = Buffer.alloc(0);
            const arr: Buffer[] = [];
            process.stdout.on("data", (chunk: Buffer) => {
              buffer = Buffer.concat([buffer, chunk]);
              while (buffer.length >= 4) {
                const size = buffer.readUInt32BE(0);
                if (buffer.length < 4 + size) return;
                const frame = buffer.subarray(4, 4 + size);
                arr.push(frame);
                buffer = buffer.subarray(4 + size);
              }
              if (arr.length == seek.arr.length) {
                process.stdout.removeAllListeners("data");
                callback(null, arr);
              }
            });

            if (this.pythonProcess.killed) return;
            this.pythonProcess.stdin.write(
              JSON.stringify({
                image: chunk.toString("base64"),
                roi: [roi.x, roi.y, roi.width, roi.height].map(Math.round),
                color_range: [colorRange.min, colorRange.max],
                size,
                width,
                height,
                outputs: seek.arr,
              }) + "\n",
            );
          },
        });
        const errCall = (err: Buffer) => {
          logger.err(err, true);
          if (!transform.closed)
            transform.emit("error", new Error(err.toString()));
        };
        this.pythonProcess.stderr.once("data", errCall);

        const fixed = new FixedSizeChunkStream(frame_size);
        fixed.pipe(transform);

        const process = ffmpeg(videoPath)
          .setStartTime(startTime)
          .outputOption(duration ? [`-t ${duration}`] : [])
          .outputFormat("image2pipe")
          .addOption("-pix_fmt bgr24")
          .videoCodec("rawvideo")
          .on("error", (e) => {
            if (!transform.closed) transform.emit("error", e);
          });
        process.pipe(fixed);
        transform.on("close", () => {
          process.kill("");
          this.pythonProcess?.stderr.removeListener("data", errCall);
        });
        this.clearWriters = () => {
          transform.destroy();
          return new Promise((res) => {
            setTimeout(() => {
              res();
            }, 1);
          });
        };
        return (i) =>
          transform.pipe(
            new Transform({
              objectMode: true,
              transform(chunk: Array<Buffer>, _encoding, callback) {
                callback(null, chunk[i]);
              },
            }),
          );
      },
    };
  }
  async initialize() {
    await new Promise<void>((res, rej) => {
      this.pythonProcess = spawn(...pythonPath).on("error", (e) => {
        logger.err(e);
        rej(e);
      });
      this.pythonProcess.stdout.once("data", () => {
        res();
      });
      this.pythonProcess.stderr.on("data", (e: Buffer) =>
        logger.err(e.toString()),
      );
      this.pythonProcess.stderr.once("data", rej);
    });
  }
  kill() {
    this.clearWriters?.().then(() => {
      if (this.pythonProcess && !this.pythonProcess.killed)
        this.pythonProcess.kill();
    });
  }
  constructor() {}
}
export async function generateSubtitlesRemover() {
  const remover = new SubtitlesRemover();
  await remover.initialize();
  return remover;
}
