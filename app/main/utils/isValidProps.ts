import Validator from "validator-checker-js";
export interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SeekProps {
  startTime: number;
  roi: Dimensions;
  duration?: number;
  colorRange: { min: [number, number, number]; max: [number, number, number] };
  size: number;
}
const validator = new Validator({
  ".": ["required"],
  startTime: ["integer", { min: 0 }, "required"],
  roi: {
    ".": ["required"],
    x: ["integer", { min: 0 }, "required"],
    y: ["integer", { min: 0 }, "required"],
    width: ["integer", { min: 1 }, "required"],
    height: ["integer", { min: 1 }, "required"],
  },
  colorRange: {
    ".": ["required"],

    min: [
      ["integer", { min: 0 }, { max: 255 }],
      "array",
      [{ min: 3 }, { max: 3 }, "required"],
    ],
    max: [
      ["integer", { min: 0 }, { max: 255 }],
      "array",
      [{ min: 3 }, { max: 3 }, "required"],
    ],
  },
  duration: ["integer", { min: 0 }],
  size: ["integer", { min: 0 }, "required"],
});
export function isValidQueryProps(val: unknown): val is SeekProps {
  return validator.passes(val).state;
}
