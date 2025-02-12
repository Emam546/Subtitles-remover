/* eslint-disable react/display-name */
import classNames from "classnames";
import React, { ComponentRef, ComponentProps } from "react";
import { Range } from "react-range";

import { IRenderTrackParams, IThumbProps } from "react-range/lib/types";
export interface ProgressBarProps {
  curTime: number;
  duration: number;
  onSetVal: (val: number) => any;
}
export interface ThumbProps extends Omit<IThumbProps, "ref"> {
  isDragged: boolean;
}
export const Thumb = React.forwardRef<ComponentRef<"div">, ThumbProps>(
  ({ isDragged, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          ...style,
          cursor: "pointer",
        }}
        {...props}
        className="h-full hover:outline-none focus:outline-none -translate-x-[50%] cursor-pointer"
      >
        <div
          aria-selected={isDragged}
          className="opacity-0 group-hover:opacity-100 aria-[selected=true]:opacity-100 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full h-3 w-3"
        ></div>
      </div>
    );
  }
);
export function ProgressBar({ curTime, duration, onSetVal }: ProgressBarProps) {
  return (
    <Range
      step={1}
      min={0}
      max={duration}
      values={[curTime]}
      onChange={([time]) => {
        onSetVal(time);
      }}
      renderTrack={({ children, props }) => (
        <div className="relative w-full h-2 group video-time bg-black/25">
          <div
            className={classNames(
              "bg-blue-400 h-full absolute left-0 top-0 outline-none"
            )}
            style={{
              width: `${Math.min(100, (curTime / duration) * 100)}%`,
            }}
          />
          <div className="w-full h-full " {...props}>
            {children}
          </div>
        </div>
      )}
      renderThumb={({ index, isDragged, value, props }) => (
        <Thumb isDragged={isDragged} {...props} />
      )}
    />
  );
}
