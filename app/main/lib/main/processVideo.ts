import { FfmpegVideoData } from "../progressBar/ffmpeg/window";
import { Downloader } from "./utils/downloader";
import { createProgressBarWindow } from "../progressBar/ffmpeg";
import { VideoDataClippedType } from "@app/main/utils";
import { getVideoInfo } from "@app/main/utils/ffmpeg";
import path from "path";
export async function processVideo(process: FfmpegVideoData) {
  const videoData = await getVideoInfo(process.path);
  const duration = parseInt(videoData.streams[0]?.duration!);
  const data: VideoDataClippedType = {
    clipped:
      process.startTime != 0 ||
      (process.duration != undefined && process.duration < duration - 3),
    title: path.basename(process.path).split(".").slice(0, -1).join("."),
    formate: path.extname(process.path),
    start: process.startTime,
    end: process.startTime + (process.duration || duration),
  };
  const state = await Downloader(data);
  if (!state) return false;
  await createProgressBarWindow({
    stateData: state,
    preloadData: {
      path: state.path,
      link: process.path,
      video: {
        title: data.title,
        previewLink: process.path,
      },
    },
    ffmpegData: process,
  });
  return true;
}
