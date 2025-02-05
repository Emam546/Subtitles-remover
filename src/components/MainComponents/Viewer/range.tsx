/* eslint-disable react/display-name */
import classNames from "classnames";
import React, { ComponentRef, ComponentProps } from "react";
import { Range } from "react-range";

import { IRenderTrackParams, IThumbProps } from "react-range/lib/types";
export interface Props {
  id: string;
  duration: number;
  start: number;
  end: number;
  setDuration(start: number, end: number): any;
}

export interface ThumbProps extends Omit<IThumbProps, "ref"> {
  isDragged: boolean;
}
export const Thumb = React.forwardRef<ComponentRef<"div">, ThumbProps>(
  ({ isDragged, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className="h-full hover:outline-none focus:outline-none -translate-x-[50%]"
      >
        <div aria-grabbed={isDragged} className="h-full w-1 bg-gray-400"></div>
        <div
          aria-grabbed={isDragged}
          className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bg-blue-400 rounded-full h-7 w-7 aria-[grabbed='true']:bg-blue-800"
        ></div>
      </div>
    );
  }
);
export interface TrackerProps extends IRenderTrackParams {
  duration: number;
}
const MaxTiles = 3;
interface MarkProps extends ComponentProps<"div"> {
  skip: boolean;
  time: number;
  tilesNumber: number;
}
export function Mark({
  skip,
  time,
  tilesNumber,
  className,
  ...props
}: MarkProps) {
  return (
    <div {...props} className={classNames("pb-4", className)}>
      <div className="relative h-3">
        <div className="absolute w-0.5 h-3 bg-black top-0 left-0 -translate-x-[50%]"></div>
        <div className="absolute top-full left-0 -translate-x-[50%]">
          {!skip && <span className="">{time}</span>}
        </div>
        <div className="flex justify-between items-start w-full pt-0.5">
          <span></span>
          {new Array(Math.ceil(tilesNumber)).fill(null).map((_, i) => {
            return (
              <span
                key={`${i}`}
                className="w-0.5 h-2 bg-black -translate-x-[50%]"
              ></span>
            );
          })}
          <span></span>
        </div>
      </div>
    </div>
  );
}
export function Tracker({ props, children, duration }: TrackerProps) {
  const tilesNumber = Math.max(MaxTiles - Math.floor(duration / 60 / 10), 0);
  const skip = Math.floor(duration / 60 / 30) + 1;
  const numTiles = Math.floor(duration / 60);
  return (
    <div className="bg-gray-100">
      <div className="h-20" {...props}>
        {children}
      </div>
      <div className="relative ">
        <div className="flex min-h-10">
          {new Array(numTiles).fill(null).map((_, i) => {
            const time = Math.min(i * 60, duration);
            return (
              <Mark
                key={`${duration}-${i}`}
                skip={i % skip != 0}
                time={time}
                style={{
                  width: `${((1 * 60) / duration) * 100}%`,
                }}
                tilesNumber={tilesNumber}
              />
            );
          })}
          <Mark
            skip={numTiles % skip != 0}
            className="flex-1 w-full grow"
            time={numTiles * 60}
            tilesNumber={Math.floor(
              ((duration - numTiles * 60) / 60) * tilesNumber
            )}
          />
          <Mark skip={false} time={duration} tilesNumber={0} />
        </div>
      </div>
    </div>
  );
}
export const MIN_TIME = 5;
export interface RangeProps {
  duration: number;
  start: number;
  end: number;
  setDuration(start: number, end: number): any;
}
export function RangeTracker({
  duration,
  start,
  end,
  setDuration,
}: RangeProps) {
  return (
    <Range
      step={1}
      min={0}
      max={duration}
      values={[start, end]}
      onChange={([newStart, newEnd]) => {
        const MaxStart = Math.max(Math.min(duration, MIN_TIME), end - MIN_TIME);
        const MinEnd = Math.max(Math.min(duration, MIN_TIME), start + MIN_TIME);
        const options = [
          Math.min(newStart, MaxStart),
          Math.min(Math.max(newEnd, MinEnd), duration),
        ] as [number, number];
        setDuration(...options);
      }}
      renderTrack={({ ...props }) => <Tracker {...props} duration={duration} />}
      renderThumb={({ index, isDragged, value, props }) => (
        <Thumb isDragged={isDragged} {...props} />
      )}
    />
  );
}
