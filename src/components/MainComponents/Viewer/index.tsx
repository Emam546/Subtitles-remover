import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { RangeTracker, MIN_TIME } from "./range";
import Controls, { AspectsType } from "./controls";
import classNames from "classnames";
import { ProgressBar } from "./progressBar";
import { ReactPlayerProps } from "react-player";
import AdvancedReactPlayer from "./player";
export interface Props {
  duration: number;
  start: number;
  end: number;
  setDuration(start: number, end: number): any;
  light?: ReactPlayerProps["light"];
  url: string;
}

export default function VideoViewer({
  url,
  duration,
  start,
  end,
  setDuration,
  light,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [curDuration, setCurDuration] = useState(start);
  const ref = useRef<ReactPlayer>(null);
  const [aspect, setAspect] = useState<AspectsType>("16:9");
  const [loopState, setLoopState] = useState(false);
  useEffect(() => {
    setCurDuration(start);
  }, [url]);
  return (
    <div>
      <div className="px-2">
        <div className="relative h-fit">
          <AdvancedReactPlayer
            aspect={aspect}
            height="100%"
            width="100%"
            playing={playing}
            onPause={() => {
              setPlaying(false);
            }}
            onBoxResize={(box) => {
              console.log(box);
            }}
            onProgress={({ playedSeconds }) => {
              setCurDuration(playedSeconds);
              if (playedSeconds < start) {
                ref.current?.seekTo(start);
                setCurDuration(start);
              }
              if (playedSeconds >= end) {
                if (loopState) {
                  ref.current?.seekTo(start);
                  setCurDuration(start);
                } else setPlaying(false);
              }
            }}
            onSeek={(second) => {
              setCurDuration(second);
            }}
            light={light}
            ref={ref}
            url={url}
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
                ref.current?.seekTo(time);
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
                  ref.current?.seekTo(newStart);
                  setCurDuration(newStart);
                } else if (newEnd != end) {
                  ref.current?.seekTo(newEnd);
                  setCurDuration(newEnd);
                }
              } else {
                if (curDuration < start) {
                  ref.current?.seekTo(start);
                  setCurDuration(start);
                }
                if (curDuration >= end) {
                  ref.current?.seekTo(end - MIN_TIME);
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
              ref.current?.seekTo(newStart);
              setCurDuration(newStart);
            }
            setDuration(newStart, newEnd);
          }}
          onSeek={(second) => {
            ref.current?.seekTo(second);
            setCurDuration(second);
          }}
          onSetState={setPlaying}
        />
      </div>
    </div>
  );
}
