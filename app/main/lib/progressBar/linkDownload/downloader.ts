import { videoInfo } from "@distube/ytdl-core";
import https from "https";
import http from "http";
import { IncomingMessage } from "http";
import { HttpDownloadAgent, HttpsDownloadAgent } from "../utils";
export interface VideoLink {
  size: string;
  f: string;
  q: string;
  q_text: string;
  k: string;
}

export interface VideoLinks {
  [key: string]: VideoLink;
}

export interface AdditionInfo {
  loudness: number;
}
export interface ServerVideoInfo {
  vid?: string;
  videoDetails: videoInfo["videoDetails"];
  related_videos: videoInfo["related_videos"];
  formats: videoInfo["formats"];
  info: AdditionInfo;
}

export async function WrapResponse<T>(
  fetchData: Promise<Response>
): Promise<T> {
  const res = await fetchData;
  if (res.status >= 300)
    throw new Error(`${res.statusText} With Code Status ${res.status}`);
  return (await res.json()) as T;
}


export function getHttpMethod(dlink: string, range?: string) {
  return new Promise<IncomingMessage>((res) => {
    const headers: Record<string, string> = {
      "User-Agent": "Your User Agent Here",
    };
    if (range) headers["range"] = range;
    if (dlink.startsWith("https"))
      https.get(
        dlink,
        {
          headers,
          rejectUnauthorized: true,
          agent: HttpsDownloadAgent,
        },
        (response) => {
          res(response);
        }
      );
    else
      http.get(
        dlink,
        {
          headers,
          agent: HttpDownloadAgent,
        },
        (response) => {
          res(response);
        }
      );
  });
}

export async function DownloadTheFile(
  link: string,
  range?: string
): Promise<IncomingMessage> {
  const response = await getHttpMethod(link, range);

  if (!response.statusCode || response.statusCode >= 300) {
    switch (response.statusCode) {
      case 302:
        return await DownloadTheFile(response.headers.location!, range);

      default:
        throw new Error(
          `Sever Failed With Status Code:${
            response.statusCode || "unrecognized status code"
          }`
        );
    }
  }

  return response;
}
