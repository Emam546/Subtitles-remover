import { DownloadVideoLink } from "@app/main/lib/main/utils/downloadVideoLink";
import type { DownloadFileToDesktop } from "@app/main/lib/main/utils/DownloadFile";
import { ConvertFromIpCMainFunc } from "@shared/api";
import { SubtitlesRemover } from "@app/main/utils/SubtitlesRemover";
import { SeekProps } from "@app/main/utils/isValidProps";
import { MainWindow } from "@app/main/lib/main/window";
import { processVideo } from "@app/main/lib/main/processVideo";
import Ffmpeg from "fluent-ffmpeg";
export interface NavigateVideo {
  videoPath: string;
}
export type Context = NavigateVideo | null;
export namespace ApiRender {
  interface OnMethods {
    "kernel-chunk": (chunk: any) => void;
    "start-video": () => void;
    "open-file": (data: string) => void;
    error: (e: Error) => void;
  }
  interface OnceMethods {}
}
export namespace ApiMain {
  interface OnMethods {}
  interface OnceMethods {}
  interface HandleMethods {
    Download: typeof DownloadFileToDesktop;
    getInfo(videoPath: string): Promise<Ffmpeg.FfprobeStream | undefined>;
    processVideo: typeof processVideo;
  }
  interface HandleOnceMethods {}
}
