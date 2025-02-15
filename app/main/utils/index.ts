/* eslint-disable no-console */
import { is } from "@electron-toolkit/utils";
import { app } from "electron";
console.log(process.env.NODE_ENV);
export const isProd =
  app.isPackaged || !is.dev || process.env.NODE_ENV == "production";
export const isDev =
  process.env.NODE_ENV == "development" && is.dev && !app.isPackaged;
console.log("production", isProd);
console.log("development", isDev);
export type VideoDataInfoType = {
  title: string;
  formate: string;
};
export type ClippingDataType<G> =
  | (G & {
      clipped: true;
      start: number;
      end: number;
    })
  | (G & { clipped: false });
export type VideoDataClippedType = ClippingDataType<VideoDataInfoType>;
export function removeUnwantedChars(val: string) {
  return val.replace(/[/\\?%*:|"<>]/g, "-").replace(/#[^\s#]+/g, "");
}
export function getFileName<T extends VideoDataClippedType>(data: T) {
  if (data.clipped) {
    return removeUnwantedChars(
      `Subtitles remover - ${data.title} ${data.start}:${data.end}.${data.formate}`
    );
  } else
    return removeUnwantedChars(
      `Subtitles remover - ${data.title}.${data.formate}`
    );
}
