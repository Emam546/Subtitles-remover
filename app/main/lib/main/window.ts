import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
export class MainWindow extends BrowserWindow {
  public static Window: BrowserWindow | null = null;
  public static fromWebContents(
    webContents: Electron.WebContents,
  ): MainWindow | null {
    return BrowserWindow.fromWebContents(webContents) as MainWindow;
  }

  constructor(options: BrowserWindowConstructorOptions) {
    super(options);
    if (!MainWindow.Window) {
      MainWindow.Window = this;
    }
    this.on("close", async () => {
      if (this.id == MainWindow.Window?.id) MainWindow.Window = null;
    });
  }
}
