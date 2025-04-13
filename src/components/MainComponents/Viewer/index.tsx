import { useEffect, useMemo, useRef, useState } from "react";
import { RangeTracker, MIN_TIME } from "./range";
import Controls, { AspectsType } from "./controls";
import { ProgressBar } from "./progressBar";
import AdvancedReactPlayer, { Dimensions } from "./player";
import ColorRangeSelector, { ValueProps } from "./colorRange";
import qs from "qs";
import { SeekProps } from "@app/main/utils/SubtitlesRemover";
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

  // Replace backslashes with forward slashes
  const url = useMemo(() => {
    return `video://video/${encodeURI(path)}?${qs.stringify({
      startTime: curDuration,
      roi: curDim,
      ...colorRange,
    } as SeekProps)}`;
  }, [curDim, colorRange, path]);
  useEffect(() => {
    setCurDuration(start);
  }, [path]);
  useEffect(() => {
    setMediaDuration(curDuration);
  }, [curDim, colorRange, path]);
  useEffect(() => {
    videoRef.current?.addEventListener("loadedmetadata", () => {
      videoRef.current!.currentTime = 0;
    });
  }, [videoRef.current]);
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
    console.log("handeled");
    // videoRef.current!.currentTime = 0;
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
            src={url}
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
