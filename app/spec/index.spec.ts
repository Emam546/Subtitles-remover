// import "../main/pre-start";
import { SubtitlesRemover } from "@app/main/utils/SubtitlesRemover";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { getVideoInfo } from "@app/main/utils/ffmpeg";
import { PassThrough, Writable } from "stream";

const videoPath = path.join(__dirname, "./example.mp4");
const outputPath = path.join(__dirname, "output.mp4");
describe("Test Subtitles Remover", () => {
  jest.setTimeout(100000);
  const subtitlesRemover = new SubtitlesRemover();
  beforeAll(async () => {
    await subtitlesRemover.initialize();
  });
  test("simple video", async () => {
    const remover = await subtitlesRemover.generate(videoPath);
    const video = remover.seek({
      startTime: 0,
      colorRange: {
        max: [255, 255, 255],
        min: [0, 0, 0],
      },
      size: 8,
      roi: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
    });
    await new Promise<void>((res, rej) => {
      const passThrough = new PassThrough();
      video.on("error", rej);
      // video.on("data", () => console.log(DataTransfer.length));
      video.pipe(passThrough);
      const [numerator, denominator] = remover.videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;
      ffmpeg(passThrough)
        .inputOptions([
          "-y",
          "-f rawvideo",
          `-r ${fps}`,
          "-vcodec rawvideo",
          "-pix_fmt bgr24",
          `-s ${remover.videoStream!.width}:${remover.videoStream!.height}`,
        ])
        .noAudio()
        .output(outputPath)
        .outputFormat("mp4")
        .on("error", (e) => {
          rej(e);
        })
        .outputOptions(["-vcodec libx264"])
        .on("end", () => res())
        .run();
    });
    const metaData = await getVideoInfo(outputPath);
    const duration = +metaData.streams.find((s) => s.codec_type == "video")!
      .duration!;
    expect(duration).toBeCloseTo(+remover.videoStream!.duration!, 0);
  });
  test("test with a seeking", async () => {
    const remover = await subtitlesRemover.generate(videoPath);
    const video = remover.seek({
      startTime: 2,
      colorRange: {
        max: [255, 255, 255],
        min: [0, 0, 0],
      },
      size: 8,
      roi: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
    });
    await new Promise<void>((res, rej) => {
      const passThrough = new PassThrough();
      video.on("error", rej);
      // video.on("data", () => console.log(DataTransfer.length));
      video.pipe(passThrough);
      const [numerator, denominator] = remover.videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;
      console.log(numerator, denominator);
      ffmpeg(passThrough)
        .inputOptions([
          "-y",
          "-f rawvideo",
          "-vcodec rawvideo",
          "-pix_fmt bgr24",
          `-r ${fps}`,
          `-s ${remover.videoStream!.width}:${remover.videoStream!.height}`,
        ])
        .noAudio()

        .output(outputPath)
        .outputFormat("mp4")
        .on("error", (e) => {
          rej(e);
        })
        .outputOptions(["-vcodec libx264"])
        .on("end", () => res())
        .run();
    });
    const metaData = await getVideoInfo(outputPath);
    const duration = +metaData.streams.find((s) => s.codec_type == "video")!
      .duration!;
    expect(duration).toBeLessThan(+remover.videoStream!.duration!);
  });
  test("test for showing", async () => {
    const remover = await subtitlesRemover.generate(videoPath);
    const video = remover.seek({
      startTime: 2,
      colorRange: {
        max: [255, 255, 255],
        min: [0, 0, 0],
      },
      size: 8,
      roi: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
    });
    await new Promise<void>((res, rej) => {
      const write = new Writable({
        write: (chunk: Buffer, _, callback) => {
          callback();
        },
      });
      const videoStream = remover.videoStream;

      const [numerator, denominator] = videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;

      const secondProcess = ffmpeg(video)
        .inputOptions([
          "-y",
          "-f rawvideo",
          `-r ${fps}`,
          "-vcodec rawvideo",
          "-pix_fmt bgr24",
          `-s ${videoStream!.width}:${videoStream!.height}`,
        ])
        .noAudio()
        .output(write)
        .outputFormat("mp4")
        .on("error", (e) => {
          if (!write.closed) write.emit("error", e);
        })
        .outputOptions([
          "-vcodec libx264",
          "-movflags faststart+separate_moof+empty_moov+default_base_moof",
        ]);

      video.on("error", (error) => {
        rej(error);
      });
      write.on("close", () => {
        res();
      });

      write.on("close", () => {
        video.destroy();
        secondProcess.kill("");
      });
      secondProcess.run();
      return write;
    });
    const metaData = await getVideoInfo(outputPath);
    const duration = +metaData.streams.find((s) => s.codec_type == "video")!
      .duration!;
    expect(duration).toBeLessThan(+remover.videoStream!.duration!);
  });
});
