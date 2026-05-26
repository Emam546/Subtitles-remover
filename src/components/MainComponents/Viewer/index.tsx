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
  curTime,
  setCurTime,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<ReactPlayer>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const [kernelVideoRef, setKernelVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const [aspect, setAspect] = useState<AspectsType>("16:9");
  const [loopState, setLoopState] = useState(false);
  const [curDim, setCurDim] = useState<Dimensions>(defaultBox);
  const [curDuration, setCurDuration] = useState(curTime);
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
  useEffect(() => {
    setCurDuration(curTime);
    if (videoRef.current) videoRef.current?.seekTo(curTime);
  }, [path, videoRef.current]);
  // const url = `video:///video/${encodeURI(path)}?${qs.stringify({
  //   startTime: curDuration,
  //   roi: curDim,
  //   ...colorRange,
  // } as SeekProps)}`;
  useEffect(() => {
    const video = videoElement;
    if (!video) return;
    const onPausing = () => {
      // video buffering → pause audio
      kernelVideoRef?.pause();
    };
    const onPlaying = () => {
      kernelVideoRef?.play();
      onFinishedLoading();
    };
    const onFinishedLoading = () => {
      setVideoRequesting(false);
    };
    const onStartLoading = () => {
      onPausing();
      setVideoRequesting(true);
    };
    video.addEventListener("play", onPlaying);
    video.addEventListener("pause", onPausing);
    video.addEventListener("loadstart", onStartLoading);
    video.addEventListener("waiting", onStartLoading);
    video.addEventListener("canplay", onFinishedLoading);
    video.addEventListener("playing", onPlaying);
    return () => {
      video.removeEventListener("play", onPlaying);
      video.removeEventListener("pause", onPausing);
      video.removeEventListener("loadstart", onStartLoading);

      video.removeEventListener("waiting", onStartLoading);
      video.removeEventListener("canplay", onFinishedLoading);
      video.removeEventListener("playing", onPlaying);
    };
  }, [kernelVideoRef, videoElement]);
  useEffect(() => {
    return window.api.on("error", (_, e) => {
      window.api.send("log", e);
      setError(e.message);
    });
  }, []);
  useEffect(() => {
    const video = kernelVideoRef;
    if (playing) video?.play().catch();
    else video?.pause();
  }, [playing, kernelVideoRef]);
  useEffect(() => {
    setCurTime(curDuration);
  }, [curDuration]);
  function handelSeek(readDuration: number) {
    setPlaying(false);
    setCurDuration(readDuration);
    videoRef.current?.seekTo(readDuration);
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
            playing={playing && !videoRequesting}
            aspect={aspect}
            onBoxResize={(dim) => {
              setCurDim(dim);
            }}
            onProgress={({ playedSeconds }) => {
              const realDuration = playedSeconds;
              setCurDuration(realDuration);
              if (realDuration < start) handelSeek(start);
              if (realDuration >= end) {
                if (loopState) {
                  handelSeek(start);
                } else setPlaying(false);
              }
              if (videoElement) {
                if (
                  Math.abs(
                    videoElement.currentTime - (playedSeconds - mediaDuration),
                  ) > 0.3
                )
                  videoRef.current?.seekTo(
                    mediaDuration + videoElement.currentTime,
                  );
              }
            }}
            curBox={curDim}
            url={`filo:///${encodeURI(path)}`}
            ref={videoRef}
            croppedProps={{
              url,
              playing,
              onProgress({ playedSeconds }) {
                if (kernelVideoRef)
                  if (
                    Math.abs(kernelVideoRef.currentTime - playedSeconds) > 0.3
                  )
                    kernelVideoRef.currentTime = playedSeconds;
              },
              onReady(ele) {
                setVideoElement(ele.getInternalPlayer() as HTMLVideoElement);
              },
            }}
          />
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
