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
        callback(null);
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
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${videoStream!.width}:${videoStream!.height}`,
      ])
      .noAudio()
      .output(write)
      .outputFormat("mp4")
      .on("error", (e) => {
        if (!write.closed) write.emit("error", e);
      })
      .outputOptions([
        "-vcodec libx264",
        "-movflags faststart+separate_moof+empty_moov+default_base_moof",
      ]);

    write.on("error", (error) => {
      this.webContents.send("error", error);
    });
    reader.on("close", () => {
      this.webContents.send("close");
    });

    write.on("close", () => {
      reader.destroy();
      secondProcess.kill("");
    });
    this.currentWriter = write;
    secondProcess.run();
    return write;
  }
  async generate(...params: Parameters<SubtitlesRemover["generate"]>) {
    console.log("generated");
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
