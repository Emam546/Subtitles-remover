import {
  generateSubtitlesRemover,
  SeekProps,
  SubtitlesRemover,
} from "@app/main/utils/SubtitlesRemover";
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { Readable, Writable } from "stream";
export class MainWindow extends BrowserWindow {
  public static Window: BrowserWindow | null = null;
  remover?: SubtitlesRemover;
  reader?: Awaited<ReturnType<SubtitlesRemover["generate"]>>;
  currentReader?: Readable;
  public static fromWebContents(
    webContents: Electron.WebContents
  ): MainWindow | null {
    return BrowserWindow.fromWebContents(webContents) as MainWindow;
  }

  seek(props: SeekProps) {
    if (this.currentReader && !this.currentReader.closed)
      this.currentReader.destroy();
    if (!this.reader) throw new Error("unrecognized video path");
    console.log("seek");
    this.currentReader = this.reader.seek(props);
    const write = new Writable({
      write: (chunk: Buffer, _, callback) => {
        this.webContents.send("chunk", chunk);
        callback();
      },
    });
    this.currentReader.on("error", (error) => {
      console.error(error);
      this.webContents.send("error", error);
    });
    this.currentReader.on("close", (error) => {
      console.log("closed");
      this.webContents.send("close", error);
    });
    this.currentReader.pipe(write);
    return write;
  }
  async generate(...params: Parameters<SubtitlesRemover["generate"]>) {
    if (this.currentReader && !this.currentReader.closed)
      this.currentReader.destroy();
    if (!this.remover) throw new Error("Uninitialized page");
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
      if (!this.currentReader?.closed) this.currentReader?.destroy();
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
