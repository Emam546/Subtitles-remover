import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { app } from "electron";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { Readable, Transform, Writable } from "stream";
import { getVideoInfo } from "@app/main/utils/ffmpeg";

interface Props {
  path: string;
}
interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface SeekProps {
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
  path: string;
  pythonProcess?: ChildProcessWithoutNullStreams;
  videoStream?: ffmpeg.FfprobeStream;
  width?: number;
  height?: number;
  async generate() {
    if (this.pythonProcess?.connected) throw new Error("connected");
    const metadata = await getVideoInfo(this.path);
    const videoStreams = metadata.streams;

    // Additional info: codec and resolution
    this.videoStream = videoStreams.find(
      (stream) => stream.codec_type === "video"
    )!;

    await new Promise<void>((res, rej) => {
      this.pythonProcess = spawn("python", [pythonPath])
        .on("error", (e) => rej(e))
        .on("spawn", () => res());
    });
  }
  seek({ startTime: duration, roi, colorRange, radius }: SeekProps): Readable {
    if (!this.videoStream) throw new Error("unrecognized videostream");
    const transform = new Transform({
      transform: (chunk: Buffer, encoding, callback) => {
        if (!this.pythonProcess) throw new Error("Unrecognized process");
        this.pythonProcess.stdout.once("data", (data: Buffer) => {
          callback(null, data);
        });
        this.pythonProcess.stderr.once("error", (err) => {
          callback(err, null);
        });
        this.pythonProcess.stdin.write(
          JSON.stringify({
            image: chunk.toString("base64"),
            roi: [roi.x, roi.y, roi.width, roi.height],
            color_range: [colorRange.min, colorRange.max],
            radius,
            width: width,
            height: height,
          }) + "\n"
        );
      },
    });
    const height = this.videoStream.height!;
    const width = this.videoStream.width!;
    const frame_size = width * height * 3;
    const fixed = new FixedSizeChunkStream(frame_size);
    fixed.pipe(transform);
    ffmpeg(this.path)
      .setStartTime(duration)
      .outputFormat("image2pipe")
      .addOption("-pix_fmt bgr24")
      .videoCodec("rawvideo")
      .on("error", (e) => transform.emit("error", e))
      .pipe(fixed);
    return transform;
  }
  constructor(data: Props) {
    this.path = data.path;
  }
}
