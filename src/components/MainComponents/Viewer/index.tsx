import { useEffect, useMemo, useRef, useState } from "react";
import { RangeTracker, MIN_TIME } from "./range";
import Controls, { AspectsType } from "./controls";
import { ProgressBar } from "./progressBar";
import AdvancedReactPlayer, { Dimensions } from "./player";
import ColorRangeSelector, { ValueProps } from "./colorRange";
import qs from "qs";
import VideoLoadingItem from "@src/components/common/Loading/video_loading";
import { useMemoDebounce } from "@src/hooks";
import { SeekProps } from "@app/main/utils/isValidProps";
import ReactPlayer from "react-player";
export interface Props {
  duration: number;
  start: number;
  end: number;
  curTime: number;
  setCurTime(time: number): any;
  setStartEndCut(start: number, end: number): any;
  path: string;
  defaultBox: Dimensions;
}
export default function VideoViewer({
  path,
  duration,
  start,
  end,
  defaultBox,
  setStartEndCut,
  curTime: curDuration,
  setCurTime: setCurDuration,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<ReactPlayer>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [kernelVideoRef, setKernelVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const [aspect, setAspect] = useState<AspectsType>("16:9");
  const [loopState, setLoopState] = useState(false);
  const [curDim, setCurDim] = useState<Dimensions>(defaultBox);
  const [mediaDuration, setMediaDuration] = useState(curDuration);
  const [loading, setLoading] = useState(false);
  const [videoRequesting, setVideoRequesting] = useState(true);
  const [colorRange, setColorRange] = useState<ValueProps>({
    colorRange: {
      min: [210, 210, 210],
      max: [255, 255, 255],
    },
    size: 8,
  });
  const [err, setError] = useState<string>();
  // Replace backslashes with forward slashes
  const audioUrl = `filo:///${encodeURI(path)}`;
  const url = useMemoDebounce(
    () => {
      setError(undefined);
      setMediaDuration(curDuration);
      return `video:///video/${encodeURI(path)}?${qs.stringify({
        startTime: curDuration,
        roi: curDim,
        ...colorRange,
      } as SeekProps)}`;
    },
    [curDim, colorRange, path],
    1000,
  );

  // useEffect(() => {
  //   videoElement?.addEventListener("loadedmetadata", () => {
  //     videoRef.current!.seekTo(0);
  //   });
  // }, [videoElement]);
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoElement;
    if (!kernelVideoRef) return;
    if (!video || !audio) return;
    const onPausing = () => {
      // video buffering → pause audio
      kernelVideoRef.pause();
      audio.pause();
    };
    const onPlaying = () => {
      // video resumed → resume audio
      audio.play();
      kernelVideoRef.play();
      onFinishedLoading();
    };
    const onFinishedLoading = () => {
      setVideoRequesting(false);
    };
    const onStartLoading = () => {
      onPausing();
      setVideoRequesting(true);
    };
    const seeking = () => {};
    video.addEventListener("play", onPlaying);
    video.addEventListener("pause", onPausing);
    video.addEventListener("loadstart", onStartLoading);
    video.addEventListener("canplaythrough", seeking);
    video.addEventListener("timeupdate", seeking);
    video.addEventListener("waiting", onStartLoading);
    video.addEventListener("canplay", onFinishedLoading);
    video.addEventListener("playing", onPlaying);
    audioRef.current!.currentTime = mediaDuration;
    return () => {
      video.removeEventListener("play", onPlaying);
      video.removeEventListener("pause", onPausing);
      video.removeEventListener("loadstart", onStartLoading);
      video.removeEventListener("canplaythrough", seeking);
      video.removeEventListener("timeupdate", seeking);
      video.removeEventListener("waiting", onStartLoading);
      video.removeEventListener("canplay", onFinishedLoading);
      video.removeEventListener("playing", onPlaying);
    };
  }, [mediaDuration, kernelVideoRef, videoElement]);
  useEffect(() => {
    return window.api.on("error", (_, e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      setError(e.message);
    });
  }, []);
  useEffect(() => {
    const video = kernelVideoRef;
    if (playing) video?.play().catch();
    else video?.pause();
  }, [playing, kernelVideoRef]);

  function handelSeek(readDuration: number) {
    setPlaying(false);
    setCurDuration(readDuration);
    setCurDim({ ...curDim });
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
            id={path}
            playing={playing}
            aspect={aspect}
            onBoxResize={(dim) => {
              setCurDim(dim);
            }}
            onReady={(ele) => {
              setVideoElement(ele.getInternalPlayer() as HTMLVideoElement);
            }}
            onProgress={({ playedSeconds }) => {
              const realDuration = playedSeconds + mediaDuration;
              if (playing) setCurDuration(realDuration);
              if (realDuration < start) handelSeek(start);
              if (realDuration >= end) {
                if (loopState) {
                  handelSeek(start);
                } else setPlaying(false);
              }
              if (kernelVideoRef) {
                if (Math.abs(kernelVideoRef.currentTime - playedSeconds) > 0.3)
                  kernelVideoRef.currentTime = playedSeconds;
              }

              const audio = audioRef.current;
              if (audio) {
                const orgTime = playedSeconds + mediaDuration;
                if (Math.abs(orgTime - audio.currentTime) > 0.3)
                  audio.currentTime = orgTime;
              }
            }}
            url={url}
            ref={videoRef}
          />
          <audio ref={audioRef} src={audioUrl} />
          <VideoLoadingItem state={videoRequesting} />
          <div className="absolute bottom-0 left-0 w-full">
            <ProgressBar
              onSetVal={(time) => {
                if (time < start) setStartEndCut(time, end);
                else if (time >= end) setStartEndCut(start, time);
                handelSeek(time);
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
                } else if (newEnd != end) {
                  handelSeek(newEnd);
                }
              } else {
                if (curDuration < start) {
                  handelSeek(start);
                }
                if (curDuration >= end) {
                  handelSeek(end - MIN_TIME);
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
            }
            setStartEndCut(newStart, newEnd);
          }}
          onSeek={(second) => {
            handelSeek(second);
          }}
          onSetState={setPlaying}
        />
      </div>
      {err && <p className="text-lg text-red-600">{err}</p>}

      <div className="py-2">
        <ColorRangeSelector
          onColorParams={setColorRange}
          colorParams={colorRange}
          id={path}
          ref={setKernelVideoElement}
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
