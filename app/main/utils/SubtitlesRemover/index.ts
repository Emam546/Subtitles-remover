import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { app } from "electron";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { PassThrough, Readable, Transform, Writable } from "stream";
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
  colorRange: { min: [number, number, number]; max: [number, number, number] };
  radius: number;
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

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: Function) {
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
      videoStream,
      seek: ({
        startTime: duration,
        roi,
        colorRange,
        radius,
      }: SeekProps): Readable => {
        if (!this.pythonProcess) throw new Error("Unrecognized process");
        const transform = new Transform({
          transform: (chunk: Buffer, _, callback) => {
            if (!this.pythonProcess) throw new Error("Unrecognized process");
            const process = this.pythonProcess;
            this.pythonProcess.stdout.once("data", function G(data: Buffer) {
              callback(null, data);
              console.log(data.length);
              process!.stdout.removeListener("data", G);
            });
            if (transform.closed) return;
            this.pythonProcess.stdin.write(
              JSON.stringify({
                image: chunk.toString("base64"),
                roi: [roi.x, roi.y, roi.width, roi.height],
                color_range: [colorRange.min, colorRange.max],
                radius,
                width,
                height,
              }) + "\n",
              (err) => {
                if (err) callback(err);
              }
            );
          },
        });
        this.pythonProcess.stderr.once("data", (err: Buffer) => {
          if (!resultVideo.closed)
            transform.emit("error", new Error(err.toString()));
        });

        const fixed = new FixedSizeChunkStream(frame_size);
        fixed.pipe(transform);
        const resultVideo = new PassThrough();
        const process = ffmpeg(videoPath)
          .setStartTime(duration)
          .outputFormat("image2pipe")
          .addOption("-pix_fmt bgr24")
          .videoCodec("rawvideo")
          .on("error", (e) => {
            if (!resultVideo.closed) resultVideo.emit("error", e);
          });

        process.pipe(fixed);
        const secondProcess = ffmpeg(transform)
          .inputOptions([
            "-y",
            "-f rawvideo",
            "-vcodec rawvideo",
            "-pix_fmt bgr24",
            `-s ${videoStream!.width}:${videoStream!.height}`,
          ])
          .noAudio()
          .FPS(parseFloat(videoStream!.r_frame_rate!))
          .output(resultVideo)
          .outputFormat("mp4")
          .on("error", (e) => {
            if (!resultVideo.closed) resultVideo.emit("error", e);
          })
          .fpsOutput(parseFloat(videoStream!.r_frame_rate!))
          .outputOptions([
            "-vcodec libx264",
            "-movflags faststart+separate_moof+empty_moov+default_base_moof",
          ]);

        resultVideo.on("close", () => {
          transform.destroy();
          process.kill("");
          secondProcess.kill("");
        });
        secondProcess.run();
        return resultVideo;
      },
    };
  }
  async initialize() {
    await new Promise<void>((res, rej) => {
      this.pythonProcess = spawn("python", [pythonPath]).on("error", (e) => {
        console.error(e);
        rej(e);
      });
      this.pythonProcess.stdout.once("data", (data: Buffer) => {
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
