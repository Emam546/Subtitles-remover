import { VideoDataClippedType, getFileName } from "@app/main/utils/index";
import { dialog } from "electron";
export interface Options {
  title: string;
  quality: string;
  type: string;
}
export interface StateType {
  path: string;
  continued: boolean;
}
export async function GetFilePath(fileName: string) {
  const { canceled, filePath: newpath } = await dialog.showSaveDialog({
    title: "Download Image",
    defaultPath: fileName,
    buttonLabel: "Save",
    properties: ["showOverwriteConfirmation", "createDirectory"],
    showsTagField: false,
  });
  if (canceled || !newpath) return null;
  return newpath;
}
export async function Downloader(data: VideoDataClippedType) {
  const Name = getFileName(data);
  const { canceled, filePath: newpath } = await dialog.showSaveDialog({
    title: "Download Video",
    defaultPath: Name,
    buttonLabel: "Save",
    properties: ["showOverwriteConfirmation", "createDirectory"],
    showsTagField: false,
  });
  if (canceled || !newpath) return;
  let continued = false;
  return {
    path: newpath,
    continued,
  };
}
