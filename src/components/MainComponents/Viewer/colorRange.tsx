/* eslint-disable react/display-name */
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
    val.colorRange.min
  );
  const [maxColor, setMaxColor] = useState<[number, number, number]>(
    val.colorRange.max
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
        <video className="w-full mx-auto my-2 rounded max-h-96" ref={ref} />
        <div
          className="w-full h-24 border rounded-[30px]"
          style={{
            background: `linear-gradient(to right, rgb(${minColor.join(
              ","
            )}), rgb(${maxColor.join(",")}))`,
          }}
        />
      </div>
    </div>
  );
});
export default ColorRangeSelector;
