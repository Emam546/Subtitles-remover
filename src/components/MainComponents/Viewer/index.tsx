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
  setDuration,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [curDuration, setCurDuration] = useState(start);
  const ref = useRef<HTMLVideoElement>(null);
  const [aspect, setAspect] = useState<AspectsType>("16:9");
  const [loopState, setLoopState] = useState(false);
  const [curDim, setCurDim] = useState<Dimensions>();
  const [mediaDuration, setMediaDuration] = useState(0);
  useEffect(() => {
    setCurDuration(start);
  }, [path]);
  useEffect(() => {
    if (!ref.current) return;
    const mediaSource = new MediaSource();
    ref.current.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener("sourceopen", () => {
      const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
      console.log(curDim);
      window.api.send("seek", {
        startTime: 0,
        colorRange: { min: [200, 200, 200], max: [255, 255, 255] },
        radius: 2,
        roi: curDim || { x: 0, y: 0, width: 5, height: 5 },
      });
      window.api.on("chunk", (_, chunk) => {
        sourceBuffer.appendBuffer(chunk);
      });
    });
    return () => {
      window.api.removeAllListeners("chunk");
    };
  }, [curDim, ref.current]);
  useEffect(() => {
    window.api.on("error", (_, e) => {
      console.error(e);
    });
    return () => {
      window.api.removeAllListeners("error");
    };
  }, []);
  useEffect(() => {
    return () => {
      window.api.removeAllListeners("error");
    };
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    if (playing) ref.current.play();
    else ref.current.pause();
  }, [playing, ref.current]);
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
            }}
            onProgress={(player) => {
              const playedSeconds = player.currentTarget.currentTime;
              setCurDuration(playedSeconds);
              if (playedSeconds < start) {
                player.currentTarget.currentTime = start;
                setCurDuration(start);
              }
              if (playedSeconds >= end) {
                if (loopState) {
                  player.currentTarget.currentTime = start;
                  setCurDuration(start);
                } else setPlaying(false);
              }
            }}
            onSeeked={(player) => {
              const playedSeconds = player.currentTarget.currentTime;
              setCurDuration(playedSeconds);
            }}
            ref={ref}
          />

          <div className="absolute bottom-0 left-0 w-full">
            <ProgressBar
              onSetVal={(time) => {
                if (time < start) {
                  setDuration(time, end);
                }
                if (time >= end) {
                  setDuration(start, time);
                }
                ref.current!.currentTime = time;
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
                  ref.current!.currentTime = newStart;
                  setCurDuration(newStart);
                } else if (newEnd != end) {
                  ref.current!.currentTime = newStart;

                  setCurDuration(newEnd);
                }
              } else {
                if (curDuration < start) {
                  ref.current!.currentTime = start;

                  setCurDuration(start);
                }
                if (curDuration >= end) {
                  ref.current!.currentTime = end;

                  setCurDuration(end - MIN_TIME);
                }
              }
              setDuration(newStart, newEnd);
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
              ref.current!.currentTime = newStart;
              setCurDuration(newStart);
            }
            setDuration(newStart, newEnd);
          }}
          onSeek={(second) => {
            ref.current!.currentTime = second;

            setCurDuration(second);
          }}
          onSetState={setPlaying}
        />
      </div>
    </div>
  );
}
