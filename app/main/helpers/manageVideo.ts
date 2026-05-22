import {
  generateSubtitlesRemover,
  SubtitlesRemover,
} from "@app/main/utils/SubtitlesRemover";
import { PassThrough, Readable } from "stream";
import ffmpeg from "fluent-ffmpeg";
import qs from "qs";
import { protocol, app } from "electron";
import { isValidQueryProps, SeekProps } from "../utils/isValidProps";
import { MainWindow } from "../lib/main/window";
const videoProtocolName = "video";
const fileProtocol = "filo";
protocol.registerSchemesAsPrivileged([
  {
    scheme: videoProtocolName,
    privileges: {
      bypassCSP: true,
      stream: true,

      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: fileProtocol,
    privileges: {
      bypassCSP: true,
      stream: true,
    },
  },
]);

function queryToProps(params: string): SeekProps {
  const obj: any = qs.parse(params);
  return {
    startTime: parseInt(obj.startTime),
    roi: {
      x: parseInt(obj.roi!.x),
      y: parseInt(obj.roi!.y),
      width: parseInt(obj.roi!.width),
      height: parseInt(obj.roi!.height),
    },
    colorRange: {
      min: [
        parseInt(obj.colorRange!.min[0]),
        parseInt(obj.colorRange!.min[1]),
        parseInt(obj.colorRange!.min[2]),
      ],
      max: [
        parseInt(obj.colorRange!.max[0]),
        parseInt(obj.colorRange!.max[1]),
        parseInt(obj.colorRange!.max[2]),
      ],
    },
    size: parseInt(obj.size),
  };
}
export async function fileHandler() {
  const remover = await generateSubtitlesRemover();
  let orgFilePath: string = "";
  let reader: Awaited<ReturnType<SubtitlesRemover["generate"]>>;
  const previewKernel = new PassThrough({});
  previewKernel.on("data", () => console.log("data"));
  app.on("before-quit", async () => {
    remover.kill();
  });
  protocol.handle(videoProtocolName, async (req) => {
    const url = new URL(req.url);
    const filePath = decodeURI(url.pathname.split("/")[1]);
    if (filePath != orgFilePath) reader = await remover.generate(filePath);

    if (reader == null)
      return new Response("Not found", {
        status: 404,
        statusText: "the video is not exist",
      });
    orgFilePath = filePath;

    const videoStream = reader.videoStream;
    const props = queryToProps(url.search.slice(1));
    if (!isValidQueryProps(props)) return new Response(null, { status: 404 });
    const readerVideo = await reader.seek(props);
    const [numerator, denominator] = videoStream
      .r_frame_rate!.split("/")
      .map(Number);
    const fps = numerator / denominator;
    const videoWrite = new PassThrough({});
    ffmpeg(readerVideo.image())
      .inputOptions([
        "-y",
        "-f rawvideo",
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${videoStream!.width}:${videoStream!.height}`,
      ])
      .output(videoWrite)
      .outputFormat("mp4")
      .on("error", (e) => {
        if (!videoWrite.closed) videoWrite.emit("error", e);
      })
      .outputOptions([
        "-vcodec libx264",
        "-movflags faststart+separate_moof+empty_moov+default_base_moof",
      ])
      .run();

    ffmpeg(readerVideo.kernel())
      .inputOptions([
        "-y",
        "-f rawvideo",
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${videoStream!.width}:${videoStream!.height}`,
      ])
      .output(previewKernel, { end: false })
      .outputFormat("mp4")
      .on("error", (e) => {
        if (!videoWrite.closed) videoWrite.emit("error", e);
      })
      .outputOptions([
        "-vcodec libx264",
        "-movflags faststart+separate_moof+empty_moov+default_base_moof",
      ])
      .run();
    videoWrite.on("error", (e) => {
      if (!videoWrite.closed) MainWindow.Window?.webContents.send("error", e);
    });
    return new Response(videoWrite as any, {
      headers: {
        "Content-Type": "video/mp4",
      },
    });
  });
  protocol.handle("app", async (req) => {
    if (req.url !== "app://kernel") {
      return new Response("Not Found", {
        status: 404,
      });
    }
    console.log("yes");
    previewKernel.unpipe();
    return new Response(previewKernel.pipe(new PassThrough({})) as any, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache",
      },
    });
  });
  protocol.registerFileProtocol(fileProtocol, async (req, callback) => {
    const url = new URL(req.url);
    const filePath = decodeURI(url.pathname.split("/")[1]);
    callback({
      path: filePath,
    });
  });
}
