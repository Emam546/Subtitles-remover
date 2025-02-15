import { DownloadVideoLink } from "@app/main/lib/main/utils/downloadVideoLink";
import type { DownloadFileToDesktop } from "@app/main/lib/main/utils/DownloadFile";
import { ConvertFromIpCMainFunc } from "@shared/api";
import { SeekProps, SubtitlesRemover } from "@app/main/utils/SubtitlesRemover";
import { MainWindow } from "@app/main/lib/main/window";
import { processVideo } from "@app/main/lib/main/processVideo";
import Ffmpeg from "fluent-ffmpeg";
export interface NavigateVideo {
  video: {
    link: string;
  };
}
export interface NavigateSearch {
  video: {
    link: string;
  };
}
export type Context = NavigateVideo | NavigateSearch | null;
export namespace ApiRender {
  interface OnMethods {
    chunk: (data: Buffer) => void;
    close: () => void;
    "audio-chunk": (data: Buffer) => void;
    "audio-close": (data: Buffer) => void;
    "kernel-close": (data: Buffer) => void;
    "kernel-chunk": (data: Buffer) => void;
    error: (e: Error) => void;
  }
  interface OnceMethods {}
}
export namespace ApiMain {
  interface OnMethods {}
  interface OnceMethods {}
  interface HandleMethods {
    seek(props: SeekProps): void;

    Download: typeof DownloadFileToDesktop;
    insertVideo(
      ...props: Parameters<MainWindow["generate"]>
    ): Promise<Ffmpeg.FfprobeStream>;
    processVideo: typeof processVideo;
  }
  interface HandleOnceMethods {}
}
