/* eslint-disable react/display-name */
import { Rnd } from "react-rnd";
import { useSyncRefs } from "@src/hooks";
import React, { ComponentProps, useEffect, useState } from "react";
import classNames from "classnames";
import { Dimensions, predictSubtitleBox } from "@src/utils";
export type { Dimensions } from "@src/utils";
export interface Props extends ComponentProps<"video"> {
  aspect?: "16:9" | "4:3";
  id: string;
  onBoxResize: (dim: Dimensions) => any;
}

const getVideoElementDimensions = (video: HTMLVideoElement): Dimensions => {
  const videoAspectRatio = video.videoWidth / video.videoHeight;
  const elementAspectRatio = video.clientWidth / video.clientHeight;

  let width, height, x, y;

  if (videoAspectRatio > elementAspectRatio) {
    // Video is wider than the container; it fits by width
    width = video.clientWidth;
    height = width / videoAspectRatio;
    x = 0;
    y = (video.clientHeight - height) / 2; // Centered vertically
  } else {
    // Video is taller than the container; it fits by height
    height = video.clientHeight;
    width = height * videoAspectRatio;
    y = 0;
    x = (video.clientWidth - width) / 2; // Centered horizontally
  }
  return { x, y, width, height };
};
const AdvancedReactPlayer = React.forwardRef<HTMLVideoElement, Props>(
  ({ aspect, onBoxResize, id, ...props }, ref) => {
    const [videoElement, setVideoElement] = useState<HTMLVideoElement>();
    const [dimensions, setDimensions] = useState<Dimensions>();
    const [rndDimensions, _setRndDimensions] = useState<Dimensions>();
    useEffect(() => {}, []);
    function setRndDimensions(rndDimensions: Dimensions) {
      if (!dimensions) return;
      if (!videoElement) return;
      const WRatio = videoElement.videoWidth / dimensions.width;
      const HRatio = videoElement.videoHeight / dimensions.height;
      const dim = {
        x: Math.floor(rndDimensions.x * WRatio),
        y: Math.floor(rndDimensions.y * HRatio),
        width: Math.floor(rndDimensions.width * WRatio),
        height: Math.floor(rndDimensions.height * HRatio),
      };
      onBoxResize?.(dim);
      _setRndDimensions(dim);
    }
    useEffect(() => {
      if (!videoElement) return;
      const listener = () => {
        setDimensions(getVideoElementDimensions(videoElement));
      };
      const observer = new ResizeObserver((entries) => {
        listener();
      });
      observer.observe(document.documentElement);
      window.addEventListener("resize", listener);
      return () => {
        window.removeEventListener("resize", listener);
        observer.disconnect();
      };
    }, [videoElement]);
    useEffect(() => {
      if (!videoElement) return;
      const listener = () => {
        setDimensions(getVideoElementDimensions(videoElement));
        _setRndDimensions(
          predictSubtitleBox(videoElement.videoWidth, videoElement.videoHeight),
        );
      };
      _setRndDimensions(undefined);
      if (videoElement.readyState >= 3) listener();
      else {
        videoElement.addEventListener("loadedmetadata", listener, {
          once: true,
        });
        return () => {
          videoElement.removeEventListener("loadedmetadata", listener);
        };
      }
    }, [videoElement, id]);
    useEffect(() => {
      if (!videoElement) return;
      const listener = () =>
        setDimensions(getVideoElementDimensions(videoElement));
      if (videoElement.readyState >= 3) listener();
    }, [aspect]);
    const allRef = useSyncRefs(
      ref,
      setVideoElement as React.RefCallback<HTMLVideoElement>,
    );
    const scaleX =
      dimensions && videoElement
        ? dimensions?.width / videoElement?.videoWidth
        : 0;
    const scaleY =
      dimensions && videoElement
        ? dimensions?.height / videoElement?.videoHeight
        : 0;
    return (
      <div
        className={classNames("relative bg-black/90 w-full", {
          "aspect-video": aspect == "16:9",
          "aspect-[4/3]": aspect == "4:3",
        })}
      >
        <video {...props} ref={allRef} className="w-full h-full"></video>
        {dimensions && rndDimensions && (
          <div
            className="absolute"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              top: dimensions.y,
              left: dimensions.x,
            }}
          >
            <Rnd
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              size={{
                width: rndDimensions.width * scaleX,
                height: rndDimensions.height * scaleY,
              }}
              position={{
                x: rndDimensions.x * scaleX,
                y: rndDimensions.y * scaleY,
              }}
              onDragStop={(e, d) => {
                setRndDimensions({
                  x: d.x,
                  y: d.y,
                  width: rndDimensions.width * scaleX,
                  height: rndDimensions.height * scaleY,
                });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                setRndDimensions({
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                  ...position,
                });
              }}
              maxHeight={`${dimensions.height}px`}
              maxWidth={`${dimensions.width}px`}
              bounds="parent"
            >
              <div className="absolute top-0 left-0 w-full h-full transition-all border-2 border-blue-500 shadow-lg rounded-xl hover:shadow-blue-500/50">
                {/* Resize Handles */}
                <div className="absolute top-0 left-0 w-3 h-3 transition transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full shadow-md shadow-blue-500 cursor-nwse-resize hover:scale-110"></div>
                <div className="absolute top-0 right-0 w-3 h-3 transition transform translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full shadow-md shadow-blue-500 cursor-nesw-resize hover:scale-110"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 transition transform -translate-x-1/2 translate-y-1/2 bg-blue-500 rounded-full shadow-md shadow-blue-500 cursor-nesw-resize hover:scale-110"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 transition transform translate-x-1/2 translate-y-1/2 bg-blue-500 rounded-full shadow-md shadow-blue-500 cursor-nwse-resize hover:scale-110"></div>
              </div>
            </Rnd>
          </div>
        )}
      </div>
    );
  },
);
export default AdvancedReactPlayer;
