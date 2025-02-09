import "../main/pre-start";
import { SubtitlesRemover } from "@app/main/utils/SubtitlesRemover/ipc";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { getVideoInfo } from "@app/main/utils/ffmpeg";
const videoPath = path.join(__dirname, "./example.mp4");
describe("Test Subtitles Remover", () => {
  const outputPath = path.join(__dirname, "output.mp4");
  test("simple video", async () => {
    const remover = new SubtitlesRemover({
      path: videoPath,
    });
    await remover.generate();
    const video = remover.seek({
      startTime: 0,
      colorRange: {
        max: [255, 255, 255],
        min: [0, 0, 0],
      },
      radius: 2,

      roi: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
    });
    await new Promise<void>((res, rej) => {
      ffmpeg()
        .input(video)
        .inputFormat("rawvideo")
        .inputOptions([
          "-pix_fmt bgr24",
          `-s ${remover.videoStream!.width}:${remover.videoStream!.height}`,
        ])
        .FPS(parseFloat(remover.videoStream!.r_frame_rate!))

        .output(outputPath)
        .on("end", () => {
          res();
        })
        .on("error", rej)
        .on("progress", () => {
          console.log("progress");
        })
        .run();
    });
    expect(fs.existsSync(videoPath)).toBe(true);
  });
  test("test with a seeking", async () => {
    const remover = new SubtitlesRemover({
      path: videoPath,
    });
    await remover.generate();
    const video = remover.seek({
      startTime: 2,
      colorRange: {
        max: [255, 255, 255],
        min: [0, 0, 0],
      },
      radius: 2,

      roi: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
    });
    await new Promise<void>((res, rej) => {
      ffmpeg()
        .input(video)
        .inputFormat("rawvideo")
        .inputOptions([
          "-pix_fmt bgr24",
          `-s ${remover.videoStream!.width}:${remover.videoStream!.height}`,
        ])
        .FPS(parseFloat(remover.videoStream!.r_frame_rate!))
        .output(outputPath)
        .on("end", () => {
          res();
        })
        .on("error", rej)
        .run();
    });

    expect(fs.existsSync(videoPath)).toBe(true);
    const metaData = await getVideoInfo(outputPath);
    const duration = +metaData.streams.find((s) => s.codec_type == "video")!
      .duration!;
    expect(duration).toBeLessThan(+remover.videoStream!.duration!);
  });
});

// class FixedSizeChunkStream extends Transform {
//   private buffer: Buffer = Buffer.alloc(0);
//   private chunkSize: number;

//   constructor(chunkSize: number) {
//     super();
//     this.chunkSize = chunkSize;
//   }

//   _transform(chunk: Buffer, encoding: BufferEncoding, callback: Function) {
//     this.buffer = Buffer.concat([this.buffer, chunk] as Array<any>);

//     while (this.buffer.length >= this.chunkSize) {
//       this.push(this.buffer.slice(0, this.chunkSize)); // Emit fixed-size chunk
//       this.buffer = this.buffer.slice(this.chunkSize); // Keep the remainder
//     }

//     callback();
//   }

//   _flush(callback: Function) {
//     // Emit the last chunk if there's leftover data
//     if (this.buffer.length > 0) {
//       this.push(this.buffer);
//     }
//     callback();
//   }
// }
// test("one single video", async () => {
//   let num = 0;

//   const metadata = await getVideoInfo(videoPath);
//   const videoStreams = metadata.streams;

//   // Additional info: codec and resolution
//   const videoStream = videoStreams.find(
//     (stream) => stream.codec_type === "video"
//   )!;
//   const height = videoStream.height!;
//   const width = videoStream.width!;
//   console.log(height, width);
//   const frame_size = width * height * 3;
//   await new Promise<void>((res, rej) => {
//     const pythonProcess = spawn("python", ["python"]);
//     const trans = new Writable({
//       highWaterMark: frame_size,
//       write(chunk: Buffer, _, callback) {
//         if (!chunk) return callback();
//         pythonProcess.stdout.once("data", (data) => {
//           ++num;
//           callback(null);
//         });
//         if (num >= 1) {
//           this.end();
//           res();
//           return;
//         }
//         pythonProcess.stdin.write(
//           JSON.stringify({
//             image: chunk.toString("base64"),
//             colorRange: [
//               [255, 255, 255],
//               [0, 0, 0],
//             ],
//             radius: 2,
//             width,
//             height,
//             depth: 3,
//             roi: [0, 0, 10, 10],
//           }) + "\n"
//         );
//       },
//     });
//     pythonProcess.stderr.on("data", (error) => {
//       console.error(error.toString());
//       rej(error.toString());
//     });
//     const fixed = new FixedSizeChunkStream(frame_size);
//     fixed.pipe(trans);
//     ffmpeg(videoPath)
//       .format("image2pipe")
//       .addOption("-pix_fmt bgr24")
//       .videoCodec("rawvideo")
//       .on("error", (e) => rej(e))
//       .pipe(fixed);
//   });
// });
// test("one single video to another video", async () => {
//   let num = 0;

//   const metadata = await getVideoInfo(videoPath);
//   const videoStreams = metadata.streams;

//   // Additional info: codec and resolution
//   const videoStream = videoStreams.find(
//     (stream) => stream.codec_type === "video"
//   )!;
//   const height = videoStream.height!;
//   const width = videoStream.width!;
//   const frame_size = width * height * 3;
//   console.log(videoStream.codec_tag_string, videoStream.codec_tag);
//   await new Promise<void>((res, rej) => {
//     const pythonProcess = spawn("python", ["python"]);
//     const trans = new Transform({
//       transform(chunk: Buffer, _, callback) {
//         if (chunk.length != frame_size) return callback();
//         console.log(num, chunk.length);
//         pythonProcess.stdout.once("data", (data) => {
//           callback(null, data);
//           ++num;
//         });
//         pythonProcess.stdin.write(
//           JSON.stringify({
//             image: chunk.toString("base64"),
//             colorRange: [
//               [255, 255, 255],
//               [0, 0, 0],
//             ],
//             radius: 2,
//             width,
//             height,
//             roi: [0, 0, 10, 10],
//           }) + "\n"
//         );
//       },
//     });
//     pythonProcess.stderr.on("data", (error) => {
//       rej(error.toString());
//     });
//     const fixed = new FixedSizeChunkStream(frame_size);
//     const audioStream = new PassThrough();
//     fixed.pipe(trans);
//     ffmpeg(videoPath)
//       .format("image2pipe")
//       .addOption("-pix_fmt bgr24")
//       .videoCodec("rawvideo")
//       .on("error", (e) => rej(e))
//       .pipe(fixed);
//     ffmpeg(videoPath)
//       .noVideo()
//       .format("adts")
//       .pipe(audioStream, { end: false });
//     ffmpeg()
//       .input(trans)
//       .inputFormat("rawvideo")
//       .inputOptions(["-pix_fmt bgr24", `-s ${width}:${height}`])
//       .FPS(parseFloat(videoStream.r_frame_rate!))

//       .audioCodec("acc")
//       .inputFormat("adts")
//       .outputOptions([
//         "-c:a aac", // Encode audio as AAC
//         "-shortest",
//       ])
//       .output("output.mp4")
//       .on("end", () => {
//         res();
//       })
//       .on("error", (e) => rej(e))
//       .on("progress", () => {
//         console.log("progress");
//       })
//       .run();
//   });
// }, 50000);
// test("Hey", (done) => {
//   const pythonProcess = spawn("python", [path.join(__dirname, "example.py")]);
//   pythonProcess.stdout.on("data", (data) => {
//     console.log(data.toString());
//     done();
//   });
//   pythonProcess.stdin.write("hey");
//   pythonProcess.stdin.write("hey \n");
//   pythonProcess.stdin.write("hey \n");
// });
