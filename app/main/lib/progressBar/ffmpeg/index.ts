import "./ipc";
import { BrowserWindowConstructorOptions, globalShortcut, shell } from "electron";
import path from "path";
import { Context, ProgressBarState } from "@shared/renderer/progress";
import { convertFunc } from "@utils/app";
import { FfmpegWindow, FfmpegVideoData } from "./window";
import {
  defaultPageData,
  DownloadingStatus,
} from "@app/main/lib/progressBar/window";
import { isDev } from "@app/main/utils";
import { StateType } from "../../main/utils/downloader";

export interface ClippedData {
  start: number;
  end: number;
}
export interface Props {
  preloadData: Omit<ProgressBarState, "status">;
  stateData: StateType;
  downloadingStatus?: DownloadingStatus;
  ffmpegData: FfmpegVideoData;
}
export const createProgressBarWindow = async (
  vars: Props,
  options?: BrowserWindowConstructorOptions
): Promise<FfmpegWindow> => {
  const stateData = vars.preloadData;
  const preloadData: Context = {
    ...stateData,
    status: "connecting",
    throttle: vars.downloadingStatus?.enableThrottle || false,
    downloadSpeed: vars.downloadingStatus?.downloadSpeed || 50 * 1024,
    pageData: defaultPageData,
  };
  const win = new FfmpegWindow(
    {
      icon: "build/icon.ico",
      useContentSize: true,
      show: false,
      autoHideMenuBar: true,
      height: 270,
      width: 550,
      frame: false,
      resizable: true,
      fullscreenable: false,
      ...options,
      webPreferences: {
        ...options?.webPreferences,
        sandbox: false,
        preload: path.join(__dirname, "../preload/index.js"),
        additionalArguments: [
          convertFunc(encodeURIComponent(JSON.stringify(preloadData)), "data"),
        ],
      },
    },
    {
      fileStatus: vars.stateData,
      downloadingStatus: {
        downloadSpeed: preloadData.downloadSpeed,
        enableThrottle: preloadData.throttle,
      },
      videoData: { link: preloadData.link, video: preloadData.video },
      ffmpegData: vars.ffmpegData,
      pageData: preloadData.pageData,
    }
  );
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (isDev) {
    await win.loadURL(
      `${process.env["ELECTRON_RENDERER_URL"] as string}/progress`
    );
    win.webContents.on("did-fail-load", () => {
      win.webContents.reloadIgnoringCache();
    });
    globalShortcut.register("Ctrl+Shift+I", () => {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
    });
  } else await win.loadFile(path.join(__dirname, "../windows/progress.html"));
  await win.initialize();
  await win.download();
  win.show();
  return win;
};
