// import "../main/pre-start";
import { SubtitlesRemover } from "@app/main/utils/SubtitlesRemover";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { getVideoInfo } from "@app/main/utils/ffmpeg";
import { PassThrough } from "stream";

const videoPath = "https://www.w3schools.com/Html/mov_bbb.mp4";
const outputPath = path.join(__dirname, "output.mp4");
const subtitlesRemover = new SubtitlesRemover();
beforeAll(async () => {
  await subtitlesRemover.initialize();
});
// jest.setTimeout(40000);
describe("Test Subtitles Remover", () => {
  test("simple video", async () => {
    const remover = await subtitlesRemover.generate(videoPath);
    if (!remover) throw new Error("the video is not exist");
    const readers = await remover.seek({
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
      const video = readers.image();
      video.on("error", rej);
      video.on("end", res);
      const [numerator, denominator] = remover.videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;
      ffmpeg(video)
        .inputOptions([
          "-y",
          "-f rawvideo",
          "-vcodec rawvideo",
          "-pix_fmt bgr24",
          `-s ${remover.videoStream!.width}:${remover.videoStream!.height}`,
          "-r",
          String(fps),
        ])
        .output(outputPath)
        .outputOptions([
          "-vcodec libx264",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
        ])
        .outputFormat("mp4")
        .on("error", (e) => {
          rej(e);
        })
        .on("end", res)
        .run();
    });
    const metaData = await getVideoInfo(outputPath);
    const duration = +metaData.streams.find((s) => s.codec_type == "video")!
      .duration!;
    expect(duration).toBeCloseTo(+remover.videoStream!.duration!, 0);
  });
  test("test with a seeking", async () => {
    const remover = await subtitlesRemover.generate(videoPath);
    if (!remover) throw new Error("the video is not exist");

    const readers = await remover.seek({
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
    const video = readers.image();

    await new Promise<void>((res, rej) => {
      const passThrough = new PassThrough();
      video.on("error", rej);
      video.pipe(passThrough);
      const [numerator, denominator] = remover.videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;
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
  test("test kernel", async () => {
    const remover = await subtitlesRemover.generate(videoPath);
    if (!remover) throw new Error("the video is not exist");
    const readers = await remover.seek({
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
      const video = readers.kernel();
      video.on("error", rej);
      video.on("end", res);
      const [numerator, denominator] = remover.videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;
      ffmpeg(video)
        .inputOptions([
          "-y",
          "-f rawvideo",
          "-vcodec rawvideo",
          "-pix_fmt bgr24",
          `-s ${100}:${100}`,
          "-r",
          String(fps),
        ])
        .output(outputPath)
        .outputOptions([
          "-vcodec libx264",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
        ])
        .outputFormat("mp4")
        .on("error", (e) => {
          rej(e);
        })
        .on("end", res)
        .run();
    });
    const metaData = await getVideoInfo(outputPath);
    const duration = +metaData.streams.find((s) => s.codec_type == "video")!
      .duration!;
    expect(duration).toBeCloseTo(+remover.videoStream!.duration!, 0);
  });
});
