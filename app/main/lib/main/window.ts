import {
  generateSubtitlesRemover,
  SeekProps,
  SubtitlesRemover,
} from "@app/main/utils/SubtitlesRemover";
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { Readable, Writable } from "stream";
import ffmpeg from "fluent-ffmpeg";
export class MainWindow extends BrowserWindow {
  public static Window: BrowserWindow | null = null;
  remover?: SubtitlesRemover;
  reader?: Awaited<ReturnType<SubtitlesRemover["generate"]>>;
  currentWriter?: Writable;
  public static fromWebContents(
    webContents: Electron.WebContents
  ): MainWindow | null {
    return BrowserWindow.fromWebContents(webContents) as MainWindow;
  }

  seek(props: SeekProps) {
    if (this.currentWriter && !this.currentWriter.closed)
      this.currentWriter.destroy();
    if (!this.reader) throw new Error("unrecognized video path");
    const write = new Writable({
      write: (chunk: Buffer, _, callback) => {
        this.webContents.send("chunk", chunk);
        callback();
      },
    });
    const videoStream = this.reader.videoStream;
    const reader = this.reader.seek(props);
    const [numerator, denominator] = videoStream
      .r_frame_rate!.split("/")
      .map(Number);
    const fps = numerator / denominator;

    const secondProcess = ffmpeg(reader)
      .inputOptions([
        "-y",
        "-f rawvideo",
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${videoStream!.width}:${videoStream!.height}`,
      ])
      .noAudio()
      .FPS(fps)
      .output(write)
      .outputFormat("mp4")
      .on("error", (e) => {
        if (!write.closed) write.emit("error", e);
      })
      .fpsOutput(fps)
      .outputOptions([
        "-vcodec libx264",
        "-movflags faststart+separate_moof+empty_moov+default_base_moof",
      ]);
    secondProcess.run();
    reader.on("error", (error) => {
      console.error(error);
      this.webContents.send("error", error);
    });
    reader.on("close", (error) => {
      this.webContents.send("close", error);
    });

    write.on("close", () => {
      reader.destroy();
      secondProcess.kill("");
      console.log("killed");
    });
    this.currentWriter = write;
    return write;
  }
  async generate(...params: Parameters<SubtitlesRemover["generate"]>) {
    if (this.currentWriter && !this.currentWriter.closed)
      this.currentWriter.destroy();
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
      if (!this.currentWriter?.closed) this.currentWriter?.destroy();
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
