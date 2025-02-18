import { useEffect, useRef, useState } from "react";
import { RangeTracker, MIN_TIME } from "./range";
import Controls, { AspectsType } from "./controls";
import { ProgressBar } from "./progressBar";
import AdvancedReactPlayer, { Dimensions } from "./player";
import ColorRangeSelector, { ValueProps } from "./colorRange";
export interface Props {
  duration: number;
  start: number;
  end: number;
  setStartEndCut(start: number, end: number): any;
  path: string;
  defaultBox: Dimensions;
}
const videoMimeType =
  'video/mp4; codecs="avc1.f4000c"; profiles="isom,iso2,avc1,iso6,mp41"';
export default function VideoViewer({
  path,
  duration,
  start,
  end,
  defaultBox,
  setStartEndCut,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const kernelVideoRef = useRef<HTMLVideoElement>(null);
  const [aspect, setAspect] = useState<AspectsType>("16:9");
  const [loopState, setLoopState] = useState(false);
  const [curDim, setCurDim] = useState<Dimensions>(defaultBox);
  const [curDuration, setCurDuration] = useState(start);
  const [mediaDuration, setMediaDuration] = useState(curDuration);
  const [loading, setLoading] = useState(false);
  const [colorRange, setColorRange] = useState<ValueProps>({
    colorRange: {
      min: [210, 210, 210],
      max: [255, 255, 255],
    },
    size: 8,
  });
  useEffect(() => {
    setCurDuration(start);
  }, [path]);
  useEffect(() => {
    if (!videoRef.current) return;
    if (!kernelVideoRef.current) return;
    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    videoRef.current.src = url;
    let clear: Function;

    videoRef.current?.addEventListener(
      "loadedmetadata",
      () => {
        videoRef.current!.currentTime = 0;
      },
      { once: true }
    );

    mediaSource.addEventListener("sourceopen", () => {
      const kernelMediaSource = new MediaSource();
      const kernelUrl = (kernelVideoRef.current!.src =
        URL.createObjectURL(kernelMediaSource));
      kernelMediaSource.addEventListener("sourceopen", async () => {
        if (mediaSource.readyState != "open") return;
        mediaSource.duration = Math.max(0, duration - curDuration);
        const videoBuffer = mediaSource.addSourceBuffer(videoMimeType);
        const audioBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        const kernelVideoBuffer =
          kernelMediaSource.addSourceBuffer(videoMimeType);

        let queueVideo: Buffer[] = [];
        let queueKernelVideo: Buffer[] = [];
        let queueAudio: Buffer[] = [];
        await window.api.invoke("seek", {
          startTime: curDuration,
          roi: curDim,
          ...colorRange,
        });
        const f: () => void = window.api.on("chunk", function G(_, chunk) {
          if (mediaSource.readyState != "open") return f();
          if (!videoBuffer.updating) {
            if (queueVideo.length > 0) {
              videoBuffer.appendBuffer(
                Buffer.concat([...queueVideo, chunk] as any)
              );
              queueVideo = [];
            } else videoBuffer.appendBuffer(chunk);
          } else queueVideo.push(chunk);
        });
        const end: () => void = window.api.on("close", function G() {
          if (!videoBuffer.updating) {
            if (queueVideo.length > 0) {
              videoBuffer.appendBuffer(Buffer.concat([...queueVideo] as any));
              queueVideo = [];
            }
          } else
            videoBuffer.addEventListener(
              "updateend",
              () => {
                G();
              },
              { once: true }
            );
        });
        const f3: () => void = window.api.on(
          "kernel-chunk",
          function G(_, chunk) {
            if (!kernelVideoBuffer.updating) {
              if (queueKernelVideo.length > 0) {
                kernelVideoBuffer.appendBuffer(
                  Buffer.concat([...queueKernelVideo, chunk] as any)
                );
                queueKernelVideo = [];
              } else kernelVideoBuffer.appendBuffer(chunk);
            } else queueKernelVideo.push(chunk);
          }
        );
        const end3: () => void = window.api.on("kernel-close", function G() {
          if (!kernelVideoBuffer.updating) {
            if (queueKernelVideo.length > 0) {
              kernelVideoBuffer.appendBuffer(
                Buffer.concat([...queueKernelVideo] as any)
              );
              queueKernelVideo = [];
            }
          } else
            kernelVideoBuffer.addEventListener(
              "updateend",
              () => {
                G();
              },
              { once: true }
            );
        });
        const f2: () => void = window.api.on(
          "audio-chunk",
          function G(_, chunk) {
            if (!audioBuffer.updating) {
              if (queueAudio.length > 0) {
                audioBuffer.appendBuffer(
                  Buffer.concat([...queueAudio, chunk] as any)
                );
                queueAudio = [];
              } else audioBuffer.appendBuffer(chunk);
            } else queueAudio.push(chunk);
          }
        );
        const end2: () => void = window.api.on("audio-close", function G() {
          if (!audioBuffer.updating) {
            if (queueAudio.length > 0) {
              audioBuffer.appendBuffer(Buffer.concat([...queueAudio] as any));
              queueAudio = [];
            }
          } else
            audioBuffer.addEventListener(
              "updateend",
              () => {
                G();
              },
              { once: true }
            );
        });

        clear = () => {
          f();
          end();
          f2();
          end2();
          f3();
          end3();
          if (kernelVideoRef.current) kernelVideoRef.current.src = "";
          URL.revokeObjectURL(kernelUrl);
        };
      });
      clear = () => {
        if (kernelVideoRef.current) kernelVideoRef.current.src = "";
        URL.revokeObjectURL(kernelUrl);
      };
    });

    mediaSource.addEventListener("sourceclose", () => {
      removeListeners();
    });
    const removeListeners = () => {
      URL.revokeObjectURL(url);
      clear?.();
    };
    setMediaDuration(curDuration);
    return () => {
      removeListeners();
    };
  }, [curDim, kernelVideoRef, videoRef, colorRange, path]);
  useEffect(() => {}, []);
  useEffect(() => {
    window.api.on("error", (_, e) => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
    return () => window.api.removeAllListeners("error");
  }, []);
  useEffect(() => {
    if (!videoRef.current) return;
    const isPlayingState =
      videoRef.current.currentTime > 0 &&
      !videoRef.current.paused &&
      !videoRef.current.ended &&
      videoRef.current.readyState > videoRef.current.HAVE_CURRENT_DATA;
    if (playing && !isPlayingState) videoRef.current.play();
    else if (!playing && isPlayingState) videoRef.current.pause();
  }, [playing, videoRef.current]);

  function handelSeek(readDuration: number) {
    // if (!ref.current) return;
    // const player = ref.current;
    // const VideoTime = readDuration - mediaDuration;
    // if (VideoTime < 0) return setCurDim({ ...curDim! });
    // try {
    //   const endVal = player.buffered.end(player.buffered.length - 1);
    //   if (VideoTime > endVal) {
    //     setCurDim({ ...curDim! });
    //   } else player.currentTime = start - mediaDuration;
    // } catch (error) {
    //   setCurDim({ ...curDim! });
    // }

    setCurDim({ ...curDim! });
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        window.api
          .invoke("processVideo", {
            ...colorRange,
            path,
            roi: curDim,
            startTime: start,
            duration: end - start,
          })
          .finally(() => {
            setLoading(false);
          });
      }}
    >
      <div className="px-2">
        <div className="relative">
          <AdvancedReactPlayer
            preload="metadata"
            id={path}
            aspect={aspect}
            height="100%"
            width="100%"
            onPause={() => {
              setPlaying(false);
              kernelVideoRef.current?.pause();
            }}
            onPlay={() => {
              setPlaying(true);
              kernelVideoRef.current?.play();
            }}
            onLoadStart={() => {
              setPlaying(false);
            }}
            onBoxResize={(dim) => {
              setCurDim(dim);
              setPlaying(false);
            }}
            onTimeUpdate={(player) => {
              const playedSeconds = player.currentTarget.currentTime;
              const realDuration = playedSeconds + mediaDuration;
              setCurDuration(realDuration);
              if (realDuration < start) {
                handelSeek(start);
                setCurDuration(start);
              }
              if (realDuration >= end) {
                if (loopState) {
                  handelSeek(start);
                  setCurDuration(start);
                } else setPlaying(false);
              }
            }}
            onSeeked={(player) => {
              const playedSeconds =
                player.currentTarget.currentTime + mediaDuration;
              setCurDuration(playedSeconds);
            }}
            ref={videoRef}
          />

          <div className="absolute bottom-0 left-0 w-full">
            <ProgressBar
              onSetVal={(time) => {
                if (time < start) setStartEndCut(time, end);
                else if (time >= end) setStartEndCut(start, time);
                handelSeek(time);
                setCurDuration(time);
              }}
              curTime={curDuration}
              duration={duration}
            />
          </div>
        </div>
        <div>
          <RangeTracker
            duration={duration}
            end={end}
            setDuration={(newStart, newEnd) => {
              if (!playing) {
                if (newStart != start) {
                  handelSeek(newStart);
                  setCurDuration(newStart);
                } else if (newEnd != end) {
                  handelSeek(newEnd);
                  setCurDuration(newEnd);
                }
              } else {
                if (curDuration < start) {
                  handelSeek(start);
                  setCurDuration(start);
                }
                if (curDuration >= end) {
                  handelSeek(end - MIN_TIME);
                  setCurDuration(end - MIN_TIME);
                }
              }
              setStartEndCut(newStart, newEnd);
            }}
            start={start}
          />
        </div>
      </div>
      <div className="py-2">
        <Controls
          aspect={aspect}
          setAspect={setAspect}
          curTime={curDuration}
          duration={duration}
          end={end}
          loop={loopState}
          onSetLoop={setLoopState}
          play={playing}
          start={start}
          onDuration={(newStart, newEnd) => {
            if (newStart != start) {
              handelSeek(newStart);
              setCurDuration(newStart);
            }
            setStartEndCut(newStart, newEnd);
          }}
          onSeek={(second) => {
            handelSeek(second);
            setCurDuration(second);
          }}
          onSetState={setPlaying}
        />
      </div>
      <div className="py-2">
        <ColorRangeSelector
          onColorParams={setColorRange}
          colorParams={colorRange}
          id={path}
          ref={kernelVideoRef}
        />
      </div>
      <div className="py-2">
        <button
          type="submit"
          className={`px-3 ml-auto py-3 text-white text-lg font-semibold rounded-lg transition-all duration-300 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          } flex items-center justify-center`}
        >
          Process
        </button>
      </div>
    </form>
  );
}
