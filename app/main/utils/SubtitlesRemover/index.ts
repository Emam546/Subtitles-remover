import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { app } from "electron";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { PassThrough, Readable, Transform } from "stream";
import { getVideoInfo } from "@app/main/utils/ffmpeg";

export interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SeekProps {
  startTime: number;
  roi: Dimensions;
  duration?: number;
  colorRange: { min: [number, number, number]; max: [number, number, number] };
  size: number;
}
const pythonPath =
  app && app.isPackaged
    ? path.join(path.dirname(app.getPath("exe")), "python")
    : "python";
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
  async generate(videoPath: string) {
    const metadata = await getVideoInfo(videoPath);
    const videoStreams = metadata.streams;

    // Additional info: codec and resolution
    const videoStream = videoStreams.find(
      (stream) => stream.codec_type === "video"
    )!;
    const height = videoStream.height!;
    const width = videoStream.width!;
    const frame_size = width * height * 3;
    return {
      videoPath,
      videoStream,
      seek: ({
        startTime,
        roi,
        colorRange,
        duration,
        size,
      }: SeekProps): {
        image: () => Readable;
        jpg: () => Readable;
        kernel: () => Readable;
      } => {
        if (!this.pythonProcess) throw new Error("Unrecognized process");
        const transform = new Transform({
          transform: (chunk: Buffer, _, callback) => {
            if (!this.pythonProcess) throw new Error("Unrecognized process");
            const process = this.pythonProcess;
            this.pythonProcess.stdout.once("data", function G(data: Buffer) {
              process!.stdout.removeAllListeners("data");
              callback(null, data.toString());
            });
            this.pythonProcess.stdin.write(
              JSON.stringify({
                image: chunk.toString("base64"),
                roi: [roi.x, roi.y, roi.width, roi.height],
                color_range: [colorRange.min, colorRange.max],
                size,
                width,
                height,
              }) + "\n",
              (err) => {
                if (err) callback(err);
              }
            );
          },
        });
        const errCall = (err: Buffer) => {
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
        transform.on("error", (e) => {
          console.error(e);
        });
        transform.on("close", () => {
          process.kill("");
          this.pythonProcess?.stderr.removeListener("data", errCall);
        });

        return {
          image: () =>
            transform.pipe(
              new PassThrough({
                transform(chunk: string, _, callback) {
                  const res = JSON.parse(chunk) as {
                    image: string;
                    kernel: string;
                  };
                  callback(null, Buffer.from(res.image, "base64"));
                },
              })
            ),
          jpg: () =>
            transform.pipe(
              new PassThrough({
                transform(chunk: string, _, callback) {
                  const res = JSON.parse(chunk) as {
                    jpg: string;
                  };
                  callback(null, res.jpg);
                },
              })
            ),
          kernel: () =>
            transform.pipe(
              new PassThrough({
                transform(chunk: string, _, callback) {
                  const res = JSON.parse(chunk) as {
                    image: string;
                    kernel: string;
                  };
                  callback(null, Buffer.from(res.kernel, "base64"));
                },
              })
            ),
        };
      },
    };
  }
  async initialize() {
    await new Promise<void>((res, rej) => {
      this.pythonProcess = spawn("python", [pythonPath]).on("error", (e) => {
        console.error(e);
        rej(e);
      });
      this.pythonProcess.stdout.once("data", () => {
        res();
      });
      this.pythonProcess.stderr.on("data", (e: Buffer) =>
        console.error(e.toString())
      );
      this.pythonProcess.stderr.once("data", rej);
    });
  }
  kill() {
    if (this.pythonProcess && !this.pythonProcess.killed)
      this.pythonProcess.kill();
  }
  constructor() {}
}
export async function generateSubtitlesRemover() {
  const remover = new SubtitlesRemover();
  await remover.initialize();
  return remover;
}
