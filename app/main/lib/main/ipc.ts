import { ConvertToIpCHandleMainFunc, ConvertToIpCMainFunc } from "@shared/api";
import { ApiMain } from "@src/types/api";
import { DownloadFileToDesktop } from "./utils/DownloadFile";
import { ObjectEntries } from "@utils/index";
import { ipcMain } from "electron";
import { MainWindow } from "./window";
import { processVideo } from "./processVideo";
import { getVideoInfo } from "@app/main/utils/ffmpeg";

type OnMethodsType = {
  [K in keyof ApiMain.OnMethods]: ConvertToIpCMainFunc<ApiMain.OnMethods[K]>;
};
type OnceMethodsType = {
  [K in keyof ApiMain.OnceMethods]: ConvertToIpCMainFunc<
    ApiMain.OnceMethods[K]
  >;
};
type HandelMethodsType = {
  [K in keyof ApiMain.HandleMethods]: ConvertToIpCHandleMainFunc<
    ApiMain.HandleMethods[K]
  >;
};
type HandelOnceMethodsType = {
  [K in keyof ApiMain.HandleOnceMethods]: ConvertToIpCHandleMainFunc<
    ApiMain.HandleOnceMethods[K]
  >;
};
export const OnMethods: OnMethodsType = {};
export const OnceMethods: OnceMethodsType = {};
export const HandleMethods: HandelMethodsType = {
  Download(_, ...args) {
    return DownloadFileToDesktop(...args);
  },
  processVideo(_, ...args) {
    return processVideo(...args);
  },
  async getInfo(_, videoPath) {
    const remover = await getVideoInfo(videoPath);
    return remover.streams.find((val) => val.codec_type == "video");
  },
};
export const HandleOnceMethods: HandelOnceMethodsType = {};
// ObjectEntries(OnMethods).forEach(([key, val]) => {
//   ipcMain.on(key, val);
// });
ObjectEntries(HandleMethods).forEach(([key, val]) => {
  ipcMain.handle(key, val);
});
