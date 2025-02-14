// import "../main/pre-start";
import { SubtitlesRemover } from "@app/main/utils/SubtitlesRemover";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { getVideoInfo } from "@app/main/utils/ffmpeg";
import { PassThrough, Writable } from "stream";
import { spawn } from "child_process";

const videoPath = path.join(__dirname, "./example.mp4");
const outputPath = path.join(__dirname, "output.mp4");
const subtitlesRemover = new SubtitlesRemover();
beforeAll(async () => {
  await subtitlesRemover.initialize();
});
describe("Test Subtitles Remover", () => {
  jest.setTimeout(10000);
  test("simple video", async () => {
    const remover = await subtitlesRemover.generate(videoPath);
    const readers = remover.seek({
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
      duration: 100000000,
    });
    const video = readers.image;
    readers.kernel.pipe(
      new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      })
    );
    await new Promise<void>((res, rej) => {
      video.on("error", rej);
      video.on("close", res);
      // video.on("data", (data) => console.log(data.length));
      const [numerator, denominator] = remover.videoStream
        .r_frame_rate!.split("/")
        .map(Number);
      const fps = numerator / denominator;
      ffmpeg(video)
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
    const readers = remover.seek({
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
    const video = readers.image;
    readers.kernel.pipe(
      new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      })
    );
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
});
test("test for audio stream", async () => {
  const outputPath = path.join(__dirname, "output.mp3");
  await new Promise<void>((res, rej) => {
    const audioStream = fs.createWriteStream(outputPath);
    ffmpeg(videoPath)
      .noVideo()
      .on("error", (e) => {
        rej(e);
      })
      .format("mp3")
      .output(audioStream)
      .audioCodec("copy")
      .run();

    audioStream.on("close", () => res());
  });
  const metaData = await getVideoInfo(outputPath);
  const duration = +metaData.streams.find((s) => s.codec_type == "audio")!
    .duration!;
  expect(duration).toBeGreaterThan(0);
});
test("Should First", async () => {
  const remover = await subtitlesRemover.generate(videoPath);

  const [numerator, denominator] = remover.videoStream
    .r_frame_rate!.split("/")
    .map(Number);
  const fps = numerator / denominator;
  const reader = remover.seek({
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
  await new Promise((res, rej) => {
    reader.kernel.pipe(
      new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      })
    );
    reader.image.on("error", rej);

    ffmpeg()
      .addInput(reader.image)
      .inputOptions([
        "-y",
        "-f rawvideo",
        `-r ${fps}`,
        "-vcodec rawvideo",
        "-pix_fmt bgr24",
        `-s ${remover.videoStream!.width}:${remover.videoStream!.height}`,
      ])
      .addInput(videoPath)
      .output(outputPath)
      .outputFormat("mp4")
      .outputOptions(["-vcodec libx264", "-c:a copy", "-map 0:v", "-map 1:a"])
      .on("progress", (percent) => {
        const curSize = percent.targetSize * 1024;
      })
      .on("error", rej)
      .on("end", res)
      .run();
  });
  const metaData = await getVideoInfo(outputPath);
  const duration = +metaData.streams.find((s) => s.codec_type == "video")!
    .duration!;
  expect(duration).toBeCloseTo(+remover.videoStream!.duration!, 0);
});
