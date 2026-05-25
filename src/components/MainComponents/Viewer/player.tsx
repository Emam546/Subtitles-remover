/* eslint-disable react/display-name */
import { Rnd } from "react-rnd";
import { useSyncRefs } from "@src/hooks";
import React, { ComponentProps, useEffect, useState } from "react";
import classNames from "classnames";
import { Dimensions, predictSubtitleBox } from "@src/utils";
export type { Dimensions } from "@src/utils";
import ReactPlayer, { ReactPlayerProps } from "react-player";
type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K];
};
export interface Props extends RemoveIndexSignature<ReactPlayerProps> {
  aspect?: "16:9" | "4:3";
  id: string;
  onBoxResize: (dim: Dimensions) => any;
}

const getVideoElementDimensions = (
  video: HTMLVideoElement,
  data: {
    width: number;
    height: number;
  },
): Dimensions => {
  const videoAspectRatio = data.width / data.height;
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

const AdvancedReactPlayer = React.forwardRef<ReactPlayer, Props>(
  ({ aspect, onBoxResize, id, ...props }, ref) => {
    const [videoElement, setVideoElement] = useState<HTMLVideoElement>();
    const [dimensions, setDimensions] = useState<Dimensions>();
    const [videoState, setVideoState] = useState<{
      width: number;
      height: number;
    }>();
    const [rndDimensions, _setRndDimensions] = useState<Dimensions>();
    useEffect(() => {}, []);
    function setRndDimensions(rndDimensions: Dimensions) {
      onBoxResize?.(rndDimensions);
      _setRndDimensions(rndDimensions);
    }
    useEffect(() => {
      if (!videoElement) return;
      if (!videoState) return;
      const listener = () => {
        setDimensions(
          getVideoElementDimensions(videoElement as any, videoState),
        );
      };
      const observer = new ResizeObserver((entries) => {
        listener();
      });
      observer.observe(document.documentElement);
      observer.observe(videoElement);
      window.addEventListener("resize", listener);
      return () => {
        window.removeEventListener("resize", listener);

        observer.disconnect();
      };
    }, [videoElement, videoState]);
    useEffect(() => {
      if (!videoElement) return;
      const listener = () => {
        const data = {
          height: videoElement.videoHeight,
          width: videoElement.videoWidth,
        };
        setVideoState(data);
        setDimensions(getVideoElementDimensions(videoElement as any, data));
      };
      videoElement.addEventListener("loadedmetadata", listener);
      return () => {
        videoElement.removeEventListener("loadedmetadata", listener);
      };
    }, [videoElement]);
    useEffect(() => {
      setDimensions(undefined);
      _setRndDimensions(undefined);
      const listener = () => {
        if (!videoElement) return;
        if (videoElement.readyState >= 4) {
          const data = {
            height: videoElement.videoHeight,
            width: videoElement.videoWidth,
          };
          setVideoState(data);
          setDimensions(getVideoElementDimensions(videoElement, data));
          _setRndDimensions(
            predictSubtitleBox(
              videoElement.videoWidth,
              videoElement.videoHeight,
            ),
          );
        } else {
          videoElement?.addEventListener("loadedmetadata", listener, {
            once: true,
          });
          return () => {
            videoElement?.removeEventListener("loadedmetadata", listener);
          };
        }
      };
      return listener();
    }, [videoElement, aspect, id]);
    const scaleX =
      dimensions && videoState ? dimensions.width / videoState.width : 0;
    const scaleY =
      dimensions && videoState ? dimensions.height / videoState.height : 0;
    return (
      <div
        className={classNames("relative bg-black/90 w-full", {
          "aspect-video": aspect == "16:9",
          "aspect-[4/3]": aspect == "4:3",
        })}
      >
        <ReactPlayer
          {...props}
          ref={ref}
          className="w-full h-full"
          height="100%"
          width="100%"
          onReady={(ele) => {
            props.onReady?.(ele);
            setVideoElement(ele.getInternalPlayer() as HTMLVideoElement);
          }}
        />
        {dimensions && rndDimensions && (
          <div
            className="absolute bg-red-300/30"
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
                  ...rndDimensions,
                  x: d.x / scaleX,
                  y: d.y / scaleY,
                });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                setRndDimensions({
                  x: position.x / scaleX,
                  y: position.y / scaleY,
                  width: ref.offsetWidth / scaleX,
                  height: ref.offsetHeight / scaleY,
                });
              }}
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
