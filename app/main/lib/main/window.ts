import {
  generateSubtitlesRemover,
  SeekProps,
  SubtitlesRemover,
} from "@app/main/utils/SubtitlesRemover";
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { Writable } from "stream";
import ffmpeg from "fluent-ffmpeg";
export class MainWindow extends BrowserWindow {
  public static Window: BrowserWindow | null = null;
  remover?: SubtitlesRemover;
  reader?: Awaited<ReturnType<SubtitlesRemover["generate"]>>;
  clearWriters?: Function;
  public static fromWebContents(
    webContents: Electron.WebContents
  ): MainWindow | null {
    return BrowserWindow.fromWebContents(webContents) as MainWindow;
  }

  seek(props: SeekProps) {
    if (this.clearWriters) this.clearWriters();
    if (!this.reader) throw new Error("unrecognized video path");
    const videoStream = this.reader.videoStream;
    const reader = this.reader.seek(props);
    const [numerator, denominator] = videoStream
      .r_frame_rate!.split("/")
      .map(Number);
    const fps = numerator / denominator;
    const videoWrite = new Writable({
      write: (chunk: Buffer, _, callback) => {
        this.webContents.send("chunk", chunk);
        callback(null);
      },
    });
    const kernelVideoWrite = new Writable({
      write: (chunk: Buffer, _, callback) => {
        this.webContents.send("kernel-chunk", chunk);
        callback(null);
      },
    });
    const audioWriter = new Writable({
      write: (chunk: Buffer, _, callback) => {
        this.webContents.send("audio-chunk", chunk);
        callback(null);
      },
    });

    const videoProcess = ffmpeg(reader.image)
      .inputOptions([
        "-y",
        "-f rawvideo",
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${videoStream!.width}:${videoStream!.height}`,
      ])
      .noAudio()
      .output(videoWrite)
      .outputFormat("mp4")
      .on("error", (e) => {
        if (!videoWrite.closed) videoWrite.emit("error", e);
      })
      .outputOptions([
        "-vcodec libx264",
        "-movflags faststart+separate_moof+empty_moov+default_base_moof",
      ]);
    const kernelVideoProcess = ffmpeg(reader.kernel)
      .inputOptions([
        "-y",
        "-f rawvideo",
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${props.roi.width}:${props.roi.height}`,
      ])
      .noAudio()
      .output(kernelVideoWrite)
      .outputFormat("mp4")
      .on("error", (e) => {
        if (!kernelVideoWrite.closed) kernelVideoWrite.emit("error", e);
      })
      .outputOptions([
        "-vcodec libx264",
        "-movflags faststart+separate_moof+empty_moov+default_base_moof",
      ]);

    const audioProcess = ffmpeg(this.reader.videoPath)
      .setStartTime(props.startTime)
      .noVideo()
      .on("error", (e) => {
        if (!audioWriter.closed) audioWriter.emit("error", e);
      })
      .output(audioWriter)
      .format("mp3")
      .audioCodec("libmp3lame");

    videoWrite.on("error", (error) => {
      this.webContents.send("error", error);
    });
    audioWriter.on("close", () => {
      audioProcess.kill("");
    });
    kernelVideoProcess.on("close", () => {
      reader.kernel.destroy();
      kernelVideoProcess.kill("");
    });
    videoWrite.on("close", (e) => {
      reader.image.destroy();
      this.webContents.emit("close");
      videoProcess.kill("");
    });
    audioProcess.run();
    videoProcess.run();
    kernelVideoProcess.run();
    this.clearWriters = () => {
      if (!videoWrite.closed) videoWrite.destroy();
      if (!audioWriter.closed) audioWriter.destroy();
      if (!kernelVideoWrite.closed) kernelVideoWrite.destroy();
    };
    return videoWrite;
  }
  async generate(...params: Parameters<SubtitlesRemover["generate"]>) {
    if (this.clearWriters) this.clearWriters();
    if (!this.remover) throw new Error("unrecognized video path");
    this.reader = await this.remover.generate(...params);
    return this.reader;
  }
  constructor(options: BrowserWindowConstructorOptions) {
    super(options);
    if (!MainWindow.Window) {
      MainWindow.Window = this;
    }
    this.on("close", () => {
      if (this.id == MainWindow.Window?.id) MainWindow.Window = null;
      if (this.clearWriters) this.clearWriters();
      if (this.remover) this.remover.kill();
    });
    this.on("ready-to-show", async () => {
      if (!this.remover) {
        this.remover = await generateSubtitlesRemover();
        this.show();
      }
    });
  }
}
