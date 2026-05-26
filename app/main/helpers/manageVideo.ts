import {
  generateSubtitlesRemover,
  SubtitlesRemover,
} from "@app/main/utils/SubtitlesRemover";
import { PassThrough, Transform, Writable } from "stream";
import ffmpeg from "fluent-ffmpeg";
import qs from "qs";
import { protocol, app } from "electron";
import {
  ImageState,
  isValidQueryProps,
  PartialSeekProps,
} from "../utils/isValidProps";
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

function queryToProps(params: string): PartialSeekProps {
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
export async function getThumbnail(
  state: ImageState,
  reader: NonNullable<Awaited<ReturnType<SubtitlesRemover["generate"]>>>,
  props: PartialSeekProps,
) {
  const readerVideo = (
    await reader.seek({
      ...props,
      arr: [state],
    })
  )(0);
  return new Promise((res, rej) => {
    readerVideo.once("error", rej);
    readerVideo.once("data", res);
    readerVideo.once("data", () => readerVideo.destroy());
    readerVideo.pipe(
      new Writable({
        write(chunk, encoding, callback) {
          callback(null);
        },
      }),
    );
  });
}
export async function fileHandler() {
  const remover = await generateSubtitlesRemover();
  let orgFilePath: string = "";
  let reader: Awaited<ReturnType<SubtitlesRemover["generate"]>>;

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
    MainWindow.Window?.webContents.send("start-video");
    const videoStream = reader.videoStream;
    const props = queryToProps(url.search.slice(1));
    if (!isValidQueryProps(props)) return new Response(null, { status: 404 });
    const readerVideo = await reader.seek({
      ...props,
      arr: ["cropped", "kernel"],
    });
    const [numerator, denominator] = videoStream
      .r_frame_rate!.split("/")
      .map(Number);
    const fps = numerator / denominator;
    const videoWrite = new PassThrough({});
    ffmpeg(readerVideo(0))
      .inputOptions([
        "-y",
        "-f rawvideo",
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${props.roi.width}:${props.roi.height}`,
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
    const kernelWriter = new Writable({
      write(chunk, encoding, callback) {
        MainWindow.Window?.webContents.send("kernel-chunk", chunk);
        callback(null);
      },
    });

    ffmpeg(readerVideo(1))
      .inputOptions([
        "-y",
        "-f rawvideo",
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${props.roi.width}:${props.roi.height}`,
      ])
      .output(kernelWriter)
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

  protocol.registerFileProtocol(fileProtocol, async (req, callback) => {
    const url = new URL(req.url);
    const filePath = decodeURI(url.pathname.split("/")[1]);
    callback({
      path: filePath,
    });
  });
}
