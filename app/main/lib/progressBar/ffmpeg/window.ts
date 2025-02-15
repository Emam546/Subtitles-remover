import { BrowserWindowConstructorOptions } from "electron";
import { BaseDownloaderWindow, DownloaderData } from "../window";
import ffmpeg from "fluent-ffmpeg";
import {
  generateSubtitlesRemover,
  SeekProps,
  SubtitlesRemover,
} from "@app/main/utils/SubtitlesRemover";
import { Writable } from "stream";

export interface FfmpegVideoData extends SeekProps {
  path: string;
}
export interface FFmpegDownloaderData extends DownloaderData {
  ffmpegData: FfmpegVideoData;
}

export class FfmpegWindow extends BaseDownloaderWindow {
  readonly ffmpegData: FfmpegVideoData;
  remover?: SubtitlesRemover;
  constructor(
    options: BrowserWindowConstructorOptions,
    data: FFmpegDownloaderData
  ) {
    super(options, data);
    this.ffmpegData = data.ffmpegData;

    if (data.fileStatus.path == data.ffmpegData?.path) {
      this.error(
        new Error("the save path must be different than the video path")
      );
      return;
    }
  }
  async initialize() {
    this.remover = await generateSubtitlesRemover();
  }
  cancel(): void {
    this.close();
    this.on("closed", () => {
      super.cancel();
    });
  }
  async download(num = 0, err?: unknown) {
    if (!this.remover)
      throw new Error("The download function executed too early");
    if (num > FfmpegWindow.MAX_TRIES) return this.error(err);
    try {
      const remover = await this.remover.generate(this.ffmpegData.path);
      const numbOfFrames = Math.round(
        parseInt(remover.videoStream.nb_frames!) *
          (this.ffmpegData.duration && remover.videoStream.duration
            ? this.ffmpegData.duration / parseInt(remover.videoStream.duration)
            : 1)
      );
      this.setCurSize(0);
      this.changeState("connecting");
      this.setResumability(true);
      this.setPauseButton("Pause");
      const reader = remover.seek({ ...this.ffmpegData });
      const [numerator, denominator] = remover.videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;
      const videoReader = reader.image();
      const jpgWriter = reader.jpg().pipe(
        new Writable({
          write: (chunk: Buffer, encoding, callback) => {
            this.webContents.send("chunk", chunk.toString());
            callback();
          },
        })
      );

      videoReader.on("error", this.error);

      const commando = ffmpeg()
        .input(videoReader)
        .inputOptions([
          "-y",
          "-f rawvideo",
          `-r ${fps}`,
          "-vcodec rawvideo",
          "-pix_fmt bgr24",
          `-s ${remover.videoStream!.width}:${remover.videoStream!.height}`,
        ])
        .input(this.ffmpegData.path)
        .setStartTime(this.ffmpegData.startTime)
        .output(this.fileStatus.path)
        .outputFormat("mp4")
        .outputOptions([
          `-t ${this.ffmpegData?.duration || 1000000000000000}`, // Set duration for both video and audio
          "-vcodec libx264",
          "-c:a copy",
          "-map 0:v",
          "-map 1:a",
        ])
        .on("progress", (progress) => {
          const targetSize = progress.targetSize * 1024;
          this.onGetChunk(targetSize - this.curSize);
          if (progress.percent) {
            const totalFileSize = Math.round(
              (targetSize / progress.percent) * 100
            );
            this.setFileSize(totalFileSize);
          } else {
            const totalFileSize = Math.round(
              (numbOfFrames / progress.frames) * targetSize
            );
            this.setFileSize(totalFileSize);
          }
        })
        .on("error", (err) => this.error(err))
        .on("start", () => {
          this.setPauseButton("Pause");
        })
        .on("end", () => this.end());

      this.on("close", () => {
        videoReader.destroy();
        jpgWriter.destroy();
        commando.kill("");
      });
      commando.run();
    } catch (err) {
      this.download(num + 1, err);
    }
    this.setResumability(true);
  }
}
