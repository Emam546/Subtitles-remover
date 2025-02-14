import { ProgressBarState, ProgressData } from "@shared/renderer/progress";
import { StateType } from "@app/main/lib/main/utils/downloader";
import fs from "fs-extra";
import { BrowserWindowConstructorOptions } from "electron";
import { DownloaderWindow } from "../donwloading";
import { DownloadTray } from "./tray";
export type FlagType = "w" | "a";
export interface VideoData {
  link: string;
  video: {
    title: string;
    previewLink: string;
  };
}
export interface PipeListener extends NodeJS.EventEmitter {
  pipe<T extends WritableStream>(
    destination: T,
    options?: { end?: boolean | undefined }
  ): T;
}
export interface DownloadingStatus {
  enableThrottle: boolean;
  downloadSpeed: number;
}
export interface DownloaderData {
  fileStatus: StateType;
  videoData: VideoData;
  downloadingStatus: DownloadingStatus;
  pageData: ProgressData;
}
export const defaultPageData: ProgressData = {
  footer: {
    cancel: {
      enabled: true,
      text: "Cancel",
    },
    pause: {
      enabled: false,
      text: "Pause",
    },
  },
  tabs: [
    {
      id: "0",
      title: "Download Status",
      type: "Download",
      enabled: true,
    },
    // {
    //   id: "1",
    //   title: "Speed limiter",
    //   type: "speedLimiter",
    //   enabled: true,
    // },
    {
      id: "2",
      title: "Options on completion",
      type: "Options",
      enabled: true,
    },
  ],
};
export interface BaseDownloaderWindow {
  fromWebContents(
    webContents: Electron.WebContents
  ): BaseDownloaderWindow | null;
}
export class BaseDownloaderWindow extends DownloaderWindow {
  public static readonly MAX_TRIES = 3;
  pageData: ProgressData;
  fileStatus: StateType;
  enableThrottle: boolean;
  downloadSpeed: number;
  public flag: FlagType;
  readonly link: string;
  readonly videoData: VideoData["video"];
  state: ProgressBarState["status"] = "connecting";
  readonly curSize: number;
  constructor(options: BrowserWindowConstructorOptions, data: DownloaderData) {
    super(options);
    this.pageData = data.pageData;
    this.enableThrottle = data.downloadingStatus.enableThrottle;
    this.downloadSpeed = data.downloadingStatus.downloadSpeed;
    this.flag =
      data.fileStatus.continued && fs.existsSync(data.fileStatus.path)
        ? "a"
        : "w";
    this.curSize = this.flag == "a" ? this.getRealSize() : 0;
    this.link = data.videoData.link;
    this.fileStatus = data.fileStatus;

    this.videoData = data.videoData.video;
    DownloadTray.addWindow(this);
  }
  public static fromWebContents(
    webContents: Electron.WebContents
  ): BaseDownloaderWindow | null {
    return DownloaderWindow.fromWebContents(
      webContents
    ) as BaseDownloaderWindow;
  }
  getRealSize() {
    if (fs.existsSync(this.fileStatus.path)) {
      const state = fs.statSync(this.fileStatus.path);
      return state.size;
    }
    return 0;
  }

  trigger(state: boolean) {
    super.trigger(state);
    if (state) this.setPauseButton("Pause");
    else this.setPauseButton("Start");
  }
  setPauseButton(state: "Pause" | "Start", enabled = true) {
    this.pageData.footer.pause.text = state;
    this.pageData.footer.pause.enabled = enabled;
    this.onSetPageData(this.pageData);
  }
  private onSetPageData(pageData: ProgressData) {
    if (this.isDestroyed()) return;
    this.webContents.send("onSetPageData", pageData);
  }
  cancel() {
    if (fs.existsSync(this.fileStatus.path))
      fs.unlinkSync(this.fileStatus.path);
    this.close();
  }
  setThrottleSpeed(speed: number) {
    this.downloadSpeed = speed;
    this.setThrottleState(this.enableThrottle);
  }
  setThrottleState(state: boolean) {
    this.enableThrottle = state;
    this.resetSpeed();
    // this.curStream.setSpeed(
    //   state ? Math.max(1024, this.downloadSpeed) : Number.MAX_SAFE_INTEGER
    // );
  }
}
