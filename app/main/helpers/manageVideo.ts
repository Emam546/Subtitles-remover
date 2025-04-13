import {
  generateSubtitlesRemover,
  SeekProps,
} from "@app/main/utils/SubtitlesRemover";
import { PassThrough, Readable } from "stream";
import ffmpeg from "fluent-ffmpeg";
import qs from "qs";
import { protocol, net, app } from "electron";
const videoProtocolName = "video";
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
function ReadableToWebStream(stream: Readable) {
  async function* nodeStreamToIterator(stream: Readable) {
    for await (const chunk of stream) {
      yield chunk;
    }
  }
  function iteratorToStream<T, G, S>(iterator: AsyncGenerator<T, G, S>) {
    return new ReadableStream({
      async pull(controller) {
        const { value, done } = await iterator.next();

        if (done) {
          controller.close();
        } else {
          controller.enqueue(new Uint8Array(value as any));
        }
      },
    });
  }
  return iteratorToStream(nodeStreamToIterator(stream));
}
export async function fileHandler() {
  const remover = await generateSubtitlesRemover();
  app.on("before-quit", async () => {
    remover.kill();
  });
  protocol.handle(videoProtocolName, async (req) => {
    const url = new URL(req.url);
    const filePath = decodeURI(url.pathname.split("/")[1]);
    const reader = await remover.generate(filePath);
    // if (this.clearWriters) await this.clearWriters();
    const videoStream = reader.videoStream;
    const props = queryToProps(url.search.slice(1));
    const readerVideo = reader.seek(props);
    const [numerator, denominator] = videoStream
      .r_frame_rate!.split("/")
      .map(Number);
    const fps = numerator / denominator;
    const videoWrite = new PassThrough({});
    const imageReader = readerVideo.image();
    const videoProcess = ffmpeg(imageReader)
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
        console.error(e);
        if (!videoWrite.closed) videoWrite.emit("error", e);
      })
      .outputOptions([
        "-vcodec libx264",
        "-movflags faststart+separate_moof+empty_moov+default_base_moof",
      ]);
    videoWrite.on("close", () => {
      // imageReader.destroy();
      // this.webContents.emit("close");
      videoProcess.kill("");
    });
    videoProcess.run();
    // this.clearWriters = async () => {
    //   if (!videoWrite.closed) videoWrite.destroy();
    //   return await new Promise((res) => {
    //     setTimeout(res, 100);
    //   });
    // };

    return new Response(ReadableToWebStream(videoWrite), {
      headers: {
        "Content-Type": "video/mp4",
      },
    });
  });
}
