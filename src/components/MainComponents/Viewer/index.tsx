import { useEffect, useRef, useState } from "react";
import { RangeTracker, MIN_TIME } from "./range";
import Controls, { AspectsType } from "./controls";
import { ProgressBar } from "./progressBar";
import AdvancedReactPlayer, { Dimensions } from "./player";
export interface Props {
  duration: number;
  start: number;
  end: number;
  setDuration(start: number, end: number): any;
  path: string;
}
const mimeType =
  'video/mp4; codecs="avc1.f4000c"; profiles="isom,iso2,avc1,iso6,mp41"';
export default function VideoViewer({
  path,
  duration,
  start,
  end,
  setDuration: setStartEndCut,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const [aspect, setAspect] = useState<AspectsType>("16:9");
  const [loopState, setLoopState] = useState(false);
  const [curDim, setCurDim] = useState<Dimensions>();
  const [curDuration, setCurDuration] = useState(start);
  const [mediaDuration, setMediaDuration] = useState(curDuration);
  useEffect(() => {
    setCurDuration(start);
  }, [path]);
  useEffect(() => {
    if (!ref.current) return;
    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    ref.current.src = url;
    mediaSource.addEventListener("sourceopen", () => {
      if (
        mediaSource.readyState != "open" ||
        mediaSource.sourceBuffers.length > 0
      )
        return;
    mediaSource.duration = duration - curDuration;
      
      const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
      window.api.send("seek", {
        startTime: curDuration,
        colorRange: { min: [200, 200, 200], max: [255, 255, 255] },
        radius: 2,
        roi: curDim || { x: 0, y: 0, width: 5, height: 5 },
      });
      window.api.on("chunk", (_, chunk) => {
        if (!sourceBuffer.updating) sourceBuffer.appendBuffer(chunk);
      });
    });
    setMediaDuration(curDuration);
    return () => {
      URL.revokeObjectURL(url);
      window.api.removeAllListeners("chunk");
    };
  }, [curDim, ref.current, path]);
  useEffect(() => {}, []);
  useEffect(() => {
    window.api.on("error", (_, e) => {
      console.error(e);
    });
    return () => window.api.removeAllListeners("error");
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    if (playing && ref.current.paused) ref.current.play();
    else if (!playing && !ref.current.paused) ref.current.pause();
  }, [playing, ref.current?.src]);
  function handelSeek(readDuration: number) {
    if (!ref.current) return;
    const player = ref.current;
    const VideoTime = readDuration - mediaDuration;
    if (VideoTime < 0) return setCurDim({ ...curDim! });
    try {
      const endVal = player.buffered.end(player.buffered.length - 1);
      if (VideoTime > endVal) {
        setCurDim({ ...curDim! });
      } else player.currentTime = start - mediaDuration;
    } catch (error) {
      setCurDim({ ...curDim! });
    }
  }
  return (
    <div>
      <div className="px-2">
        <div className="relative h-fit">
          <AdvancedReactPlayer
            id={path}
            aspect={aspect}
            height="100%"
            width="100%"
            onPause={() => {
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
            ref={ref}
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
                  handelSeek(newStart);
                  setCurDuration(newEnd);
                }
              } else {
                if (curDuration < start) {
                  handelSeek(start);
                  setCurDuration(start);
                }
                if (curDuration >= end) {
                  handelSeek(end);
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
    </div>
  );
}
