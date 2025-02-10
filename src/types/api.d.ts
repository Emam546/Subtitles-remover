import { getYoutubeData } from "@serv/routes/videoDownloader/api";
import { getSearchData as getSearchData } from "@serv/routes/search/api";
import { getPlayListData } from "@serv/routes/playlist/api";
import { DownloadVideoLink } from "@app/main/lib/main/utils/downloadVideoLink";
import { MergeVideoData } from "@app/main/lib/main/utils/mergeVideo";
import type { DownloadFileToDesktop } from "@app/main/lib/main/utils/DownloadFile";
import type { downloadVideoAndExtractMetadata } from "@app/main/lib/main/getVideoLinkData";
import { ConvertFromIpCMainFunc } from "@shared/api";
import { getVideoLinkData } from "@app/main/lib/main/getVideoLinkData";
import { navigate } from "@app/main/lib/main/lib/navigate";
import { getVideoData } from "@app/main/lib/main/lib/getVideoData";
import { searchData } from "@app/main/lib/main/lib/search";
import { SeekProps, SubtitlesRemover } from "@app/main/utils/SubtitlesRemover";
import { MainWindow } from "@app/main/lib/main/window";
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
    error: (e: Error) => void;
  }
  interface OnceMethods {}
}
export namespace ApiMain {
  interface OnMethods {
    seek(props: SeekProps): void;
    finished(state: boolean): void;
  }
  interface OnceMethods {}
  interface HandleMethods {
    Download: typeof DownloadFileToDesktop;
    insertVideo(
      ...props: Parameters<MainWindow["generate"]>
    ): Promise<Ffmpeg.FfprobeStream>;
  }
  interface HandleOnceMethods {}
}
