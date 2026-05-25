/* eslint-disable react/display-name */
import { useSyncRefs } from "@src/hooks";
import React, { Component, ComponentProps, useEffect, useState } from "react";
export interface ValueProps {
  colorRange: {
    min: [number, number, number];
    max: [number, number, number];
  };
  size: number;
}
export interface ColorRangeSelectorProps extends ComponentProps<"video"> {
  onColorParams(val: ValueProps): any;
  colorParams: ValueProps;
  id: string;
}
const ColorRangeSelector = React.forwardRef<
  HTMLVideoElement,
  ColorRangeSelectorProps
>(({ onColorParams: onChange, id, colorParams: val }, ref) => {
  const [minColor, setMinColor] = useState<[number, number, number]>(
    val.colorRange.min,
  );
  const [maxColor, setMaxColor] = useState<[number, number, number]>(
    val.colorRange.max,
  );
  const [radius, setRadius] = useState(3);

  const handleMinChange = (index: number, value: string) => {
    const updated: [number, number, number] = [...minColor];
    updated[index] = Number(value);
    setMinColor(updated);
  };

  const handleMaxChange = (index: number, value: string) => {
    const updated: [number, number, number] = [...maxColor];
    updated[index] = Number(value);
    setMaxColor(updated);
  };
  useEffect(() => {
    setMinColor(val.colorRange.min);
    setMaxColor(val.colorRange.max);
    setRadius(val.size);
  }, [id]);
  function Update() {
    onChange({
      colorRange: {
        min: minColor,
        max: maxColor,
      },
      size: radius,
    });
  }
  return (
    <div className="w-full p-6 bg-white shadow-lg rounded-xl">
      <h2 className="mb-6 text-2xl font-semibold text-center text-gray-700">
        Color Range Selector
      </h2>
      <div className="grid grid-cols-1 gap-x-5 md:grid-cols-2">
        {/* Min Color Sliders */}
        <div className="mb-6">
          <label className="block mb-2 text-lg font-medium text-gray-600">
            Min Color (RGB)
          </label>
          {["R", "G", "B"].map((label, i) => (
            <div key={label} className="flex items-center mb-2 space-x-2">
              <span className="w-6 text-sm font-semibold">{label}</span>
              <input
                type="range"
                min="0"
                max="255"
                value={minColor[i]}
                onChange={(e) => handleMinChange(i, e.target.value)}
                onMouseUp={(e) => Update()}
                className="w-full"
              />
              <span className="w-10 text-center">{minColor[i]}</span>
            </div>
          ))}
        </div>

        {/* Max Color Sliders */}
        <div className="mb-6">
          <label className="block mb-2 text-lg font-medium text-gray-600">
            Max Color (RGB)
          </label>
          {["R", "G", "B"].map((label, i) => (
            <div key={label} className="flex items-center mb-2 space-x-2">
              <span className="w-6 text-sm font-semibold">{label}</span>
              <input
                type="range"
                min="0"
                max="255"
                value={maxColor[i]}
                onChange={(e) => handleMaxChange(i, e.target.value)}
                onMouseUp={Update}
                className="w-full"
              />
              <span className="w-10 text-center">{maxColor[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Radius Input */}
      <div className="mb-6">
        <label className="block mb-2 text-lg font-medium text-gray-600">
          Radius
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="30"
            value={radius}
            onMouseUp={Update}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
          <span className="w-10 text-center">{radius}</span>
        </div>
      </div>

      {/* Color Preview */}
      <div className="mt-6">
        <label className="block mb-2 text-lg font-medium text-gray-600">
          Color Preview
        </label>
        <KernelVideo
          width="100%"
          height="100%"
          className="w-full mx-auto my-2 rounded max-h-96"
          ref={ref}
        />
        <div
          className="w-full h-24 border rounded-[30px]"
          style={{
            background: `linear-gradient(to right, rgb(${minColor.join(
              ",",
            )}), rgb(${maxColor.join(",")}))`,
          }}
        />
      </div>
    </div>
  );
});
const KernelVideo = React.forwardRef<HTMLVideoElement, ComponentProps<"video">>(
  ({ ...props }, ref) => {
    const [kernel, setKernel] = useState<HTMLVideoElement | null>(null);
    useEffect(() => {
      const video = kernel;
      if (!video) return;
      let curMediaSource: MediaSource | null = null;
      return window.api.on("start-video", () => {
        try {
          if (curMediaSource) curMediaSource.endOfStream();
        } catch (error) {}
        const mediaSource = new MediaSource();
        video.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener("sourceopen", () => {
          const sourceBuffer = mediaSource.addSourceBuffer(
            'video/mp4; codecs="avc1.42E01E"',
          );
          const queue: Uint8Array[] = [];
          let updating = false;
          const appendNext = () => {
            if (updating || sourceBuffer.updating || queue.length === 0) return;
            updating = true;
            const chunk = queue.shift()!;
            sourceBuffer.appendBuffer(chunk);
          };

          sourceBuffer.addEventListener("updateend", () => {
            updating = false;
            appendNext();
          });

          const f = window.api.on("kernel-chunk", (e, chunk) => {
            queue.push(new Uint8Array(chunk));
            appendNext();
          });
          mediaSource.addEventListener("sourceended", f, { once: true });
          mediaSource.addEventListener("sourceclose", f, { once: true });
          sourceBuffer.addEventListener("abort", f);
        });
        curMediaSource = mediaSource;
      });
    }, [kernel]);
    const allRefs = useSyncRefs<HTMLVideoElement>(ref, setKernel);
    return (
      <video
        {...props}
        className="w-full mx-auto my-2 rounded max-h-60 bg-black"
        ref={allRefs}
      />
    );
  },
);
export default ColorRangeSelector;
