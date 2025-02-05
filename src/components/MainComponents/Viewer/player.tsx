/* eslint-disable react/display-name */
import ReactPlayer from "react-player";
import { Rnd } from "react-rnd";
import { ReactPlayerProps } from "react-player";
import { useSyncRefs } from "@src/hooks";
import React, {
  ComponentType,
  CSSProperties,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { minMax } from "@src/utils/time";
import classNames from "classnames";
import { SourceProps, OnProgressProps } from "react-player/base";
interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Props {
  aspect?: "16:9" | "4:3";
  onBoxResize?: (dim: Dimensions) => any;
  url?: string | string[] | SourceProps[] | MediaStream;
  playing?: boolean;
  loop?: boolean;
  controls?: boolean;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
  progressInterval?: number;
  playsinline?: boolean;
  playIcon?: ReactElement;
  previewTabIndex?: number | null;
  pip?: boolean;
  stopOnUnmount?: boolean;
  light?: boolean | string | ReactElement;
  fallback?: ReactElement;
  wrapper?: ComponentType<{ children: ReactNode }>;
  onReady?: (player: ReactPlayer) => void;
  onStart?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onBuffer?: () => void;
  onBufferEnd?: () => void;
  onEnded?: () => void;
  onClickPreview?: (event: any) => void;
  onEnablePIP?: () => void;
  onDisablePIP?: () => void;
  onError?: (
    error: any,
    data?: any,
    hlsInstance?: any,
    hlsGlobal?: any
  ) => void;
  onDuration?: (duration: number) => void;
  onSeek?: (seconds: number) => void;
  onProgress?: (state: OnProgressProps) => void;
}
function predictSubtitleBox(
  videoWidth: number,
  videoHeight: number
): Dimensions {
  const paddingBottom = videoHeight * 0.05; // 5% padding from bottom
  const boxHeight = videoHeight * 0.1; // Subtitle height ~10% of video height
  const boxWidth = videoWidth * 0.8; // Subtitle width ~80% of video width
  const x = (videoWidth - boxWidth) / 2; // Centered horizontally
  const y = videoHeight - boxHeight - paddingBottom; // Positioned above padding

  return { x, y, width: boxWidth, height: boxHeight };
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
const AdvancedReactPlayer = React.forwardRef<ReactPlayer, Props>(
  ({ aspect, onBoxResize, ...props }, ref) => {
    const [videoElement, setVideoElement] = useState<HTMLVideoElement>();
    const [dimensions, setDimensions] = useState<Dimensions>();
    const [rndDimensions, setRndDimensions] = useState<Dimensions>();
    useEffect(() => {
      if (!rndDimensions) return;
      if (!dimensions) return;
      if (!videoElement) return;
      const WRatio = videoElement.videoWidth / dimensions.width;
      const HRatio = videoElement.videoHeight / dimensions.height;
      onBoxResize?.({
        x: rndDimensions.x * WRatio,
        y: rndDimensions.y * HRatio,
        width: rndDimensions.width * WRatio,
        height: rndDimensions.height * HRatio,
      });
    }, [dimensions, rndDimensions, videoElement]);
    useEffect(() => {
      if (!videoElement) return;
      const listener = () =>
        setDimensions(getVideoElementDimensions(videoElement));
      videoElement.addEventListener("resize", listener);
      window.addEventListener("resize", listener);
      listener();
      const dim = getVideoElementDimensions(videoElement);
      setRndDimensions(predictSubtitleBox(dim.width, dim.height));
      return () => {
        videoElement.removeEventListener("resize", listener);
        window.addEventListener("resize", listener);
      };
    }, [videoElement, aspect]);
    // useEffect(() => {
    //   if (!videoElement) return;
    //   const dim = getVideoElementDimensions(videoElement);
    //   setRndDimensions(predictSubtitleBox(dim.width, dim.height));
    // }, [videoElement, aspect]);

    return (
      <div
        className={classNames("relative bg-black/90", {
          "aspect-video": aspect == "16:9",
          "aspect-[4/3]": aspect == "4:3",
        })}
      >
        <ReactPlayer
          {...props}
          ref={ref}
          onReady={(player) => {
            const videoElement = player.getInternalPlayer() as HTMLVideoElement;
            setVideoElement(videoElement);
            props.onReady?.(player);
          }}
        ></ReactPlayer>
        {dimensions && rndDimensions && (
          <div
            className="absolute "
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
                width: rndDimensions.width,
                height: rndDimensions.height,
              }}
              position={{ x: rndDimensions.x, y: rndDimensions.y }}
              onDragStop={(e, d) => {
                setRndDimensions({ ...rndDimensions, x: d.x, y: d.y });
              }}
              onResize={(e, direction, ref, delta, position) => {
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
  }
);
export default AdvancedReactPlayer;
