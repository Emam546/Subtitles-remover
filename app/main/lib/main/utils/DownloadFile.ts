import fs from "fs";
import { GetFilePath } from "./downloader";
import { createFinishWindow } from "@app/main/lib/finish";
import { removeUnwantedChars } from "@app/main/utils";
import axios, { AxiosResponse } from "axios";
import internal from "stream";

export async function DownloadFile(
  url: string
): Promise<AxiosResponse<internal.Writable>> {
  return await axios.get<internal.Writable>(url, {
    responseType: "stream",
  });
}

export interface Props {
  fileData: Parameters<typeof DownloadFile>;
  fileName: string;
}
export const DownloadFileToDesktop = async ({
  fileData,
  fileName,
}: Props): Promise<boolean> => {
  const response = await DownloadFile(...fileData);
  const path = await GetFilePath(removeUnwantedChars(fileName));
  if (!path) return true;

  await new Promise<void>((res, rej) => {
    const stream = fs.createWriteStream(path);
    stream.once("error", (err) => {
      rej(err);
    });
    stream.on("finish", () => {
      const file = fs.statSync(path);
      createFinishWindow({
        preloadData: {
          path: path,
          fileSize: file.size,
          link: fileData[0],
        },
      }).then(() => res());
    });
    response.data.once("error", (err) => {
      rej(err);
    });
    response.data.pipe(stream);
  });
  return true;
};
